#!/usr/bin/env node
// ORDER 049 §3.1 — the knowledge-question generation script.
//
// Reads TRIAD-analysed articles from Supabase (gusto.science) and
// generates, per article, up to three questions — one per register
// (episteme / techne / phronesis). Output is a JSON file in the
// repo that the Vision Owner reviews (§3.2). Approved questions
// are then packaged into the game's local bank (§3.3); the running
// game never talks to Supabase (§3 architecture).
//
// **Faithfulness contract (§3.1, the whole point of this order):**
// a generated question may never claim more than the article claims.
// Enforced by:
//   1. The prompt shows the model only ONE article and its exact
//      TRIAD section for the register being generated. No external
//      corpus, no cross-article synthesis.
//   2. Every question carries a `justification` field with a
//      near-verbatim quote from the article. The reviewer sees the
//      quote and can veto if it doesn't support the answer.
//   3. Post-generation sanity check: the justification quote must
//      substring-match the article's TRIAD section (or a fuzzy
//      match past a threshold). Failures land as `status: 'held'`
//      for the reviewer, not silently accepted.
//   4. Phronesis questions have no key by design (§5 order). Schema
//      violation if a phronesis question tries to declare a correct
//      answer.
//   5. When the abstract does not support a determinate answer for a
//      register, the model is instructed to emit
//      `{skip: true, reason: '<why>'}` rather than invent one.
//
// **Re-runnable:** existing entries in the output JSON (keyed by
// article_id + register) are preserved on rerun unless --force.
//
// Usage:
//   node scripts/knowledge-generate.mjs                       # generate for all unseen articles
//   node scripts/knowledge-generate.mjs --limit 20            # cap to N articles (for the sample gate)
//   node scripts/knowledge-generate.mjs --article <uuid>      # single article
//   node scripts/knowledge-generate.mjs --force               # regenerate even if entry exists
//   node scripts/knowledge-generate.mjs --dry-run             # print prompt + first article, don't call LLM
//   node scripts/knowledge-generate.mjs --out <path>          # override output path
//
// Env (via scripts/.env or repo-root .env):
//   SUPABASE_URL                       - required
//   SUPABASE_SERVICE_ROLE_KEY          - required (read-only permissions on articles table suffice)
//   SUPABASE_ARTICLES_TABLE            - required (table holding TRIAD articles)
//   ANTHROPIC_API_KEY                  - required if OPENAI_API_KEY not set
//   OPENAI_API_KEY                     - fallback if ANTHROPIC_API_KEY not set
//   KNOWLEDGE_MODEL                    - optional; defaults to
//                                        "claude-3-5-sonnet-latest" or
//                                        "gpt-4o" depending on provider

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Direct REST call against Supabase — matches the other scripts' zero-
// dep style. No @supabase/supabase-js needed; the JS client is a thin
// wrapper on this endpoint.

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DEFAULT_OUT = join(REPO_ROOT, 'reports', 'knowledge', 'questions.json');

// -------- env + args --------------------------------------------------

function loadEnv() {
  // Support both scripts/.env and repo-root .env; scripts/.env wins.
  const candidates = [join(__dirname, '.env'), join(REPO_ROOT, '.env')];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, k, raw] = m;
      const v = raw.replace(/^"(.*)"$|^'(.*)'$/, '$1$2');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

function parseArgs(argv) {
  const args = { limit: null, article: null, force: false, dryRun: false, out: DEFAULT_OUT };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (a === '--article') args.article = argv[++i];
    else if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8')
        .split('\n').filter(l => l.startsWith('//')).slice(0, 60).join('\n'));
      process.exit(0);
    }
  }
  return args;
}

// -------- Supabase read ----------------------------------------------
//
// **DATA-SHAPE ASSUMPTIONS (awaiting Vision Owner confirmation before
// first real run).** The column names below are placeholders; adjust
// after the Vision Owner confirms the schema:
//
//   id            - article uuid
//   title         - article title
//   citation      - author, year, journal, volume (already formatted on gusto.science)
//   role          - primary role tag (e.g. "Chef", "Sommelier", "Servitör")
//   role_score    - numeric score attached to the role (e.g. 9 in "9/10 · Chef").
//                   INTERPRETATION PENDING: relevance vs difficulty vs combined.
//                   Treated as advisory in this cycle; not gating.
//   episteme      - the ε EPISTEME body (markdown or plain text)
//   techne        - the τ TECHNE body
//   phronesis     - the φ PHRONESIS body (scene, no key)
//
// Adjust SELECT + the article-shape reader once the real schema lands.

async function fetchArticles({ url, key, table, article, limit }) {
  const select = 'id,title,citation,role,role_score,episteme,techne,phronesis';
  const qs = new URLSearchParams({ select });
  if (article) qs.set('id', `eq.${article}`);
  if (limit) qs.set('limit', String(limit));
  const endpoint = `${url}/rest/v1/${table}?${qs.toString()}`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) ?? [];
}

// -------- prompt ------------------------------------------------------
//
// Kept in this file so it's diffable alongside the code that ships
// it to the model. The system prompt is deliberately declarative +
// negative — "do not do X" is often more reliable than "do Y" for
// this class of task.

const SYSTEM_PROMPT = `Du är en generator för professionella kunskapsfrågor för spelet Nexus, en gastronomiutbildning i spelform.

För ARTIKEL nedan ska du producera EN fråga för REGISTER som anges. Reglerna är absoluta:

1. Frågan får ALDRIG påstå mer än artikeln påstår. Om artikeln säger "ingen exakt siffra" så får din fråga inte tillhandahålla en. Om artikeln flaggar osäkerhet så måste din fråga göra det också.

2. Alla svarsalternativ — det korrekta OCH distraktorerna — måste kunna spåras till artikelns text. Distraktorer får inte hitta på egen kunskap som artikeln inte diskuterar; de ska vara plausibla FEL som artikeln själv nämner eller som en yrkesutövare skulle överväga innan de läser texten.

3. Registret bestämmer frågans form:
   - ε EPISTEME: faktafråga med exakt ett korrekt alternativ. Justification måste vara ett nästan ordagrant citat från EPISTEME-avsnittet.
   - τ TECHNE: metod/protokoll-fråga med exakt ett korrekt alternativ. Justification citerar TECHNE-avsnittet. OM artikeln explicit säger att inget bestämt protokoll finns för denna fråga: skriv "{\\"skip\\": true, \\"reason\\": \\"artikeln stöder inget bestämt protokoll\\"}".
   - φ PHRONESIS: en scen med rollen inbäddad, en avvägning, INGEN nyckel. correct-fältet ska vara null. Justification citerar PHRONESIS-scenen.

4. Om du inte kan formulera en fråga vars svar entydigt stöds av artikeln: skriv "{\\"skip\\": true, \\"reason\\": \\"<kort skäl>\\"}" istället för att chansa.

5. Alla frågor och alternativ på svenska. Yrkessvenska, inte skoltyska. Inga känslostyrda ord. Neutralt, precist.

6. Formulera för den person i restaurangen som skulle behöva veta detta — inte för en tentamen. Frågan ska passa i ett scenariomoment där någon står bredvid en gäst.

Output: ett JSON-objekt eller ett skip-objekt. Inga kommentarer, ingen markdown, ingen prolog.`;

const USER_TEMPLATE = ({ article, register, section }) => `ARTIKEL
Titel: ${article.title}
Källa: ${article.citation}
Roll: ${article.role} (${article.role_score}/10)

${register.toUpperCase()}-AVSNITT (exakt text från artikeln):
"""
${section}
"""

Generera EN fråga för registret ${register}. Output-schema (om skip=false):

{
  "register": "${register}",
  "sender_role": "<en av: kock, servitör, sommelier, värd, lärling — vald efter vem som skulle ställa frågan>",
  "question": "<frågan på svenska>",
  ${register === 'phronesis'
    ? '"options": [{"label": "<alternativ 1>"}, {"label": "<alt 2>"}, {"label": "<alt 3>"}],\n  "correct": null,'
    : '"options": [{"label": "<alt 1>", "correct": true|false}, ...],\n  "correct_index": <index på det korrekta>,'}
  "justification": "<nära-ordagrant citat från artikelavsnittet ovan som stöder svaret>",
  "difficulty_hint": "<en av: introducerande, yrkes-standard, specialist — din bedömning från artikelns nivå>"
}

Om skip=true: {"skip": true, "reason": "<kort skäl på svenska>"}.

Endast JSON. Ingen förklaring runt om.`;

// -------- LLM call ----------------------------------------------------

async function callAnthropic({ apiKey, model, system, user }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1600,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callOpenAI({ apiKey, model, system, user }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function pickProvider() {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      name: 'anthropic',
      model: process.env.KNOWLEDGE_MODEL ?? 'claude-3-5-sonnet-latest',
      call: (opts) =>
        callAnthropic({ ...opts, apiKey: process.env.ANTHROPIC_API_KEY })
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      model: process.env.KNOWLEDGE_MODEL ?? 'gpt-4o',
      call: (opts) =>
        callOpenAI({ ...opts, apiKey: process.env.OPENAI_API_KEY })
    };
  }
  throw new Error(
    'No LLM provider available: set ANTHROPIC_API_KEY (preferred) or OPENAI_API_KEY.'
  );
}

// -------- sanity checks -----------------------------------------------

function parseModelOutput(raw) {
  const trimmed = raw.trim();
  // Some providers wrap JSON in ```json ... ``` even under a response_format
  // hint; strip that safely.
  const cleaned = trimmed.replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    return { error: `parse_failed`, raw: cleaned.slice(0, 400) };
  }
}

// Faithfulness gate: the justification must appear (near-verbatim) in
// the article's TRIAD section. A simple normalised-substring test
// catches the common failure mode of hallucinated quotes.
function justificationGrounded(justification, section) {
  if (!justification || typeof justification !== 'string') return false;
  const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const jNorm = norm(justification);
  const sNorm = norm(section);
  if (jNorm.length < 20) return false; // too short to be a real quote
  if (sNorm.includes(jNorm)) return true;
  // Fuzzy fallback: at least 60 % of 8-grams from justification appear
  // in the section. Catches "near-verbatim" quotes that differ only by
  // punctuation or a dropped word.
  const grams = new Set();
  const toks = jNorm.split(' ');
  for (let i = 0; i + 7 < toks.length; i++) {
    grams.add(toks.slice(i, i + 8).join(' '));
  }
  if (grams.size === 0) return false;
  let hits = 0;
  for (const g of grams) if (sNorm.includes(g)) hits++;
  return hits / grams.size >= 0.6;
}

// Schema shape check per register. Returns null if OK, or an error string.
function validateShape(entry, register) {
  if (typeof entry !== 'object' || entry === null) return 'not an object';
  if (entry.skip === true) return null; // valid skip
  if (entry.register !== register) return `register mismatch: ${entry.register} vs ${register}`;
  if (typeof entry.question !== 'string' || entry.question.length < 10) return 'missing/short question';
  if (!Array.isArray(entry.options) || entry.options.length < 2) return 'missing options';
  if (register === 'phronesis') {
    if (entry.correct !== null && entry.correct !== undefined) return 'phronesis must not have a key';
  } else {
    const correctIdx = entry.correct_index;
    if (typeof correctIdx !== 'number' || correctIdx < 0 || correctIdx >= entry.options.length) {
      return 'missing/invalid correct_index';
    }
    const marked = entry.options.filter((o) => o?.correct === true).length;
    if (marked !== 1) return `expected exactly one correct option, got ${marked}`;
  }
  if (typeof entry.justification !== 'string' || entry.justification.length < 20) {
    return 'missing/short justification';
  }
  return null;
}

// -------- output writer -----------------------------------------------
//
// Structure of the output file:
//   {
//     "generated_at": "<iso>",
//     "model": "<provider/model>",
//     "entries": [
//       {
//         "article_id": "<uuid>",
//         "citation": "<...>",
//         "role": "Chef",
//         "role_score": 9,
//         "register": "episteme|techne|phronesis",
//         "status": "pending|approved|rejected|held|skipped",
//         "reason": "<optional; for held/skipped/rejected>",
//         "question": "...",
//         "sender_role": "kock",
//         "options": [...],
//         "correct_index": 0,        // absent for phronesis
//         "correct": null,           // present + null for phronesis
//         "justification": "<verbatim quote from article>",
//         "difficulty_hint": "..."
//       }
//     ]
//   }
//
// Re-runs preserve existing (article_id, register) entries unless
// --force. Reviewer's approve/reject flow (§3.2) mutates `status`
// and `reason` in place.

function loadExisting(path) {
  if (!existsSync(path)) return { entries: [] };
  return JSON.parse(readFileSync(path, 'utf8'));
}

function saveOutput(path, doc) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(doc, null, 2));
}

function keyOf(articleId, register) {
  return `${articleId}::${register}`;
}

// -------- main ------------------------------------------------------

async function main() {
  loadEnv();
  const args = parseArgs(process.argv);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  const table = process.env.SUPABASE_ARTICLES_TABLE;
  if (!url || !key || !table) {
    console.error(
      'Missing env. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), SUPABASE_ARTICLES_TABLE.'
    );
    process.exit(2);
  }

  const provider = args.dryRun ? null : pickProvider();

  const articles = await fetchArticles({
    url, key, table,
    article: args.article,
    limit: args.limit
  });
  console.log(`fetched ${articles.length} article(s) from ${table}.`);

  const existing = loadExisting(args.out);
  const existingKeys = new Set(existing.entries.map((e) => keyOf(e.article_id, e.register)));

  const REGISTERS = /** @type {const} */ (['episteme', 'techne', 'phronesis']);
  const emitted = [...existing.entries];
  let generated = 0, skipped = 0, held = 0;

  for (const article of articles) {
    for (const register of REGISTERS) {
      const k = keyOf(article.id, register);
      if (!args.force && existingKeys.has(k)) continue;

      const section =
        register === 'episteme' ? article.episteme :
        register === 'techne'   ? article.techne   :
                                  article.phronesis;
      if (!section || section.length < 30) {
        emitted.push({
          article_id: article.id, citation: article.citation, role: article.role,
          role_score: article.role_score, register, status: 'skipped',
          reason: `no ${register} section in article`, generated_at: new Date().toISOString()
        });
        skipped++;
        continue;
      }

      const user = USER_TEMPLATE({ article, register, section });

      if (args.dryRun) {
        console.log('\n--- SYSTEM ---\n' + SYSTEM_PROMPT);
        console.log('\n--- USER ---\n' + user);
        console.log('\n(dry-run — exiting after first prompt.)');
        return;
      }

      let raw;
      try {
        raw = await provider.call({ system: SYSTEM_PROMPT, user, model: provider.model });
      } catch (err) {
        console.error(`  ${article.id} ${register}: LLM error — ${err.message}`);
        emitted.push({
          article_id: article.id, citation: article.citation, role: article.role,
          role_score: article.role_score, register, status: 'held',
          reason: `llm_error: ${err.message}`, generated_at: new Date().toISOString()
        });
        held++;
        continue;
      }

      const parsed = parseModelOutput(raw);

      if (parsed.error) {
        emitted.push({
          article_id: article.id, citation: article.citation, role: article.role,
          role_score: article.role_score, register, status: 'held',
          reason: `parse_failed: ${parsed.raw ?? ''}`.slice(0, 400),
          generated_at: new Date().toISOString()
        });
        held++;
        continue;
      }

      if (parsed.skip === true) {
        emitted.push({
          article_id: article.id, citation: article.citation, role: article.role,
          role_score: article.role_score, register, status: 'skipped',
          reason: parsed.reason ?? 'model declined',
          generated_at: new Date().toISOString()
        });
        skipped++;
        continue;
      }

      const shapeErr = validateShape(parsed, register);
      if (shapeErr) {
        emitted.push({
          article_id: article.id, citation: article.citation, role: article.role,
          role_score: article.role_score, register, status: 'held',
          reason: `shape: ${shapeErr}`,
          raw: parsed,
          generated_at: new Date().toISOString()
        });
        held++;
        continue;
      }

      const grounded = justificationGrounded(parsed.justification, section);
      const entry = {
        article_id: article.id,
        citation: article.citation,
        role: article.role,
        role_score: article.role_score,
        register,
        status: grounded ? 'pending' : 'held',
        reason: grounded ? undefined : 'justification not found in article section',
        question: parsed.question,
        sender_role: parsed.sender_role,
        options: parsed.options,
        correct_index: register === 'phronesis' ? undefined : parsed.correct_index,
        correct: register === 'phronesis' ? null : undefined,
        justification: parsed.justification,
        difficulty_hint: parsed.difficulty_hint,
        generated_at: new Date().toISOString()
      };
      if (grounded) generated++; else held++;
      emitted.push(entry);
    }
  }

  const out = {
    generated_at: new Date().toISOString(),
    model: provider ? `${provider.name}/${provider.model}` : null,
    entries: emitted
  };
  saveOutput(args.out, out);
  console.log(
    `wrote ${args.out}: ${emitted.length} total (${generated} new pending, ${held} held, ${skipped} skipped).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
