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
//                                        "claude-sonnet-4-6" or
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
// The gusto.science `articles` table stores TRIAD content per
// professional role. First pilot runs only the `culinary_pro`
// dimension; other roles will run as separate passes.
//
// Columns used (all others in the table are ignored by this script):
//   id                        - article uuid
//   title, authors, year, journal, url
//                             - composed into `citation` below; no
//                               pre-formatted citation column exists
//   episteme_culinary_pro     - the ε EPISTEME body for chefs
//   techne_culinary_pro       - the τ TECHNE body for chefs
//   phronesis_culinary_pro    - the φ PHRONESIS body for chefs (used
//                               only when scenario_chef is null)
//   scenario_chef             - a pre-written phronesis scene with
//                               role embedded. When present, we use
//                               it verbatim and skip LLM generation
//                               for phronesis (per Vision Owner).
//   study_type                - "experimental" | "review" | ... —
//                               maps to a difficulty hint the model
//                               would otherwise have to guess.
//   limit_type                - stored on entry for reviewer context;
//                               not currently used for difficulty.
//   relevance_sci_culinary_pro
//                             - the 0-10 relevance score (previously
//                               mistaken for a role difficulty score;
//                               kept in entry for reviewer, not gating)
//   triad_completed_at, irrelevant
//                             - filters: only completed, not-flagged
//                               articles enter generation

const ROLE_DIMENSION = {
  key: 'culinary_pro',
  senderRole: 'chef',
  scenarioColumn: 'scenario_chef',
  epistemeColumn: 'episteme_culinary_pro',
  techneColumn: 'techne_culinary_pro',
  phronesisColumn: 'phronesis_culinary_pro',
  relevanceColumn: 'relevance_sci_culinary_pro'
};

const ARTICLE_SELECT = [
  'id', 'title', 'authors', 'year', 'journal', 'url',
  'study_type', 'limit_type',
  ROLE_DIMENSION.epistemeColumn,
  ROLE_DIMENSION.techneColumn,
  ROLE_DIMENSION.phronesisColumn,
  ROLE_DIMENSION.scenarioColumn,
  ROLE_DIMENSION.relevanceColumn
].join(',');

// study_type is a controlled-vocabulary field on gusto.science but
// often blank. When present it lets the model skip its own
// difficulty guess; when absent the model's own hint stands.
const STUDY_TYPE_TO_DIFFICULTY = {
  'review': 'introductory',
  'qualitative': 'professional-standard',
  'observational': 'professional-standard',
  'mixed methods': 'professional-standard',
  'experimental': 'specialist',
  'quasi-experimental': 'specialist',
  'quantitative': 'specialist',
  'meta-analysis': 'specialist'
};

function unescapeHtml(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function composeCitation(a) {
  const parts = [];
  if (a.authors) parts.push(unescapeHtml(a.authors));
  if (a.year) parts.push(`(${a.year})`);
  if (a.title) parts.push(unescapeHtml(a.title));
  if (a.journal) parts.push(unescapeHtml(a.journal));
  if (a.url) parts.push(a.url);
  return parts.join('. ');
}

async function fetchArticles({ url, key, table, article, limit }) {
  const qs = new URLSearchParams({ select: ARTICLE_SELECT });
  if (article) {
    qs.set('id', `eq.${article}`);
  } else {
    // Only pull articles that actually have TRIAD content for this
    // role dimension, and haven't been rejected as irrelevant.
    qs.set('triad_completed_at', 'not.is.null');
    qs.set('irrelevant', 'eq.false');
    qs.set(ROLE_DIMENSION.epistemeColumn, 'not.is.null');
    qs.set(ROLE_DIMENSION.techneColumn, 'not.is.null');
  }
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
  const rows = (await res.json()) ?? [];
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    citation: composeCitation(a),
    role: ROLE_DIMENSION.senderRole,
    role_score: a[ROLE_DIMENSION.relevanceColumn],
    episteme: a[ROLE_DIMENSION.epistemeColumn],
    techne: a[ROLE_DIMENSION.techneColumn],
    phronesis: a[ROLE_DIMENSION.phronesisColumn],
    scenario: a[ROLE_DIMENSION.scenarioColumn],
    study_type: a.study_type || null,
    limit_type: a.limit_type || null
  }));
}

// -------- prompt ------------------------------------------------------
//
// Kept in this file so it's diffable alongside the code that ships
// it to the model. The system prompt is deliberately declarative +
// negative — "do not do X" is often more reliable than "do Y" for
// this class of task.

const SYSTEM_PROMPT = `You generate professional knowledge questions for the game Nexus, a gastronomy education in game form. The game is played in English by an international audience; Swedish place names (Grythyttan, Torget, Kyrkbacken) are preserved as they appear.

For the ARTICLE below produce ONE question for the REGISTER specified. These rules are absolute:

1. The question may NEVER claim more than the article claims. If the article says "no exact figure", your question must not supply one. If the article flags uncertainty, your question must flag it too.

2. Every option — the correct one AND the distractors — must be traceable to the article's text. Distractors may not invent knowledge the article does not discuss; they should be plausible ERRORS the article itself mentions, or that a practitioner would consider before reading the text.

3. The register determines the question's form:
   - ε EPISTEME: fact question with exactly one correct option. Justification must be a near-verbatim quote from the EPISTEME section.
   - τ TECHNE: method/protocol question with exactly one correct option. Justification quotes the TECHNE section. IF the article explicitly says no definite protocol exists for this question: emit "{\\"skip\\": true, \\"reason\\": \\"article supports no definite protocol\\"}".
   - φ PHRONESIS: a scene with the role embedded, a genuine tradeoff, NO answer key. The correct field is null. Justification quotes the PHRONESIS scene.

4. If you cannot formulate a question whose answer is unambiguously supported by the article: emit "{\\"skip\\": true, \\"reason\\": \\"<brief reason>\\"}" rather than guess.

5. All questions and options in English. Professional English, not academic register. No emotive language. Neutral, precise.

6. Write for the person in the restaurant who would need to know this — not for an exam. The question must fit a scenario moment where someone is standing next to a guest.

Output: a single JSON object or a skip object. No comments, no markdown, no prologue.`;

const USER_TEMPLATE = ({ article, register, section }) => `ARTICLE
Title: ${article.title}
Source: ${article.citation}
Professional role: ${article.role}
Scientific relevance to the role: ${article.role_score ?? 'unknown'}/10${
  article.study_type ? `\nStudy type: ${article.study_type}` : ''
}${
  article.limit_type ? `\nDominant limitation type: ${article.limit_type}` : ''
}

${register.toUpperCase()} SECTION (exact text from the article):
"""
${section}
"""

Generate ONE question for the ${register} register. Output schema (if skip=false):

{
  "register": "${register}",
  "sender_role": "<one of: chef, waiter, sommelier, host, apprentice — chosen by who would ask the question>",
  "question": "<the question in English>",
  ${register === 'phronesis'
    ? '"options": [{"label": "<option 1>"}, {"label": "<option 2>"}, {"label": "<option 3>"}],\n  "correct": null,'
    : '"options": [{"label": "<option 1>", "correct": true|false}, ...],\n  "correct_index": <index of the correct one>,'}
  "justification": "<near-verbatim quote from the article section above that supports the answer>",
  "difficulty_hint": "<one of: introductory, professional-standard, specialist — your assessment of the article's level>"
}

If skip=true: {"skip": true, "reason": "<brief reason in English>"}.

JSON only. No prose around it.`;

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
      model: process.env.KNOWLEDGE_MODEL ?? 'claude-sonnet-4-6',
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
  let generated = 0, skipped = 0, held = 0, prewritten = 0;

  for (const article of articles) {
    const studyDifficulty = STUDY_TYPE_TO_DIFFICULTY[article.study_type] ?? null;

    for (const register of REGISTERS) {
      const k = keyOf(article.id, register);
      if (!args.force && existingKeys.has(k)) continue;

      // Phronesis short-circuit: if the article has a pre-written
      // role-specific scenario, use it verbatim. Same review flow
      // (§3.2) still applies — status stays 'pending' — but no LLM
      // call, no fabrication risk, and the scene keeps its author's
      // narrative voice.
      if (register === 'phronesis' && article.scenario && article.scenario.length >= 30) {
        emitted.push({
          article_id: article.id,
          citation: article.citation,
          role: article.role,
          role_score: article.role_score,
          study_type: article.study_type,
          limit_type: article.limit_type,
          register,
          status: 'pending',
          source: 'scenario_prewritten',
          sender_role: article.role,
          question: article.scenario,
          options: [],
          correct: null,
          justification: `Pre-written scene from articles.${ROLE_DIMENSION.scenarioColumn} — used verbatim, not LLM-generated.`,
          difficulty_hint: studyDifficulty,
          generated_at: new Date().toISOString()
        });
        prewritten++;
        continue;
      }

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
        study_type: article.study_type,
        limit_type: article.limit_type,
        register,
        status: grounded ? 'pending' : 'held',
        reason: grounded ? undefined : 'justification not found in article section',
        source: 'llm',
        question: parsed.question,
        sender_role: parsed.sender_role,
        options: parsed.options,
        correct_index: register === 'phronesis' ? undefined : parsed.correct_index,
        correct: register === 'phronesis' ? null : undefined,
        justification: parsed.justification,
        difficulty_hint: studyDifficulty ?? parsed.difficulty_hint,
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
    `wrote ${args.out}: ${emitted.length} total (${generated} new pending, ${prewritten} prewritten phronesis, ${held} held, ${skipped} skipped).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
