#!/usr/bin/env node
// ORDER 272 — utkast till raketer och provfrågor ur gusto.science.
//
// Körs manuellt, aldrig i spelet (Vision Owner 2026-09-28):
//
//   node scripts/order272-gusto-drafts.mjs --topic culinary_science --limit 5
//   node scripts/order272-gusto-drafts.mjs --topic sensory_evaluation --limit 10 --yes
//
// Flödet:
//   1. Läser frontend/.env.local (committas inte): GUSTO_SUPABASE_URL,
//      GUSTO_SUPABASE_ANON_KEY, GUSTO_EMAIL, GUSTO_PASSWORD och
//      ANTHROPIC_API_KEY. Inga VITE_-namn: de skulle bakas in i spelets bygge.
//   2. Loggar in på gusto.science med det egna kontot (anon-nyckeln +
//      inloggning, aldrig service_role). Betalväggen står kvar: texterna
//      hämtas via get_articles_full, som kräver ett Pro-konto.
//   3. Hämtar artiklar per ämne ur articles_public (metadata) och deras tre
//      avsnitt ur get_articles_full: episteme ("What the research
//      supports", samma text oavsett roll), techne och phronesis per roll
//      enligt fördelningen nedan.
//   4. Visar uppskattad kostnad och frågar innan Claude anropas.
//   5. Per artikel skriver Claude en raket (tre steg) och tre provfrågor
//      (en per paviljong), på svenska. Den engelska originaltexten sparas i
//      fältet `source`, för en engelsk version senare.
//   6. Skriver utkasten med status "utkast":
//        src/content/incidents/gusto.draft.json   (raketerna)
//        src/content/questions/gusto.draft.json   (provfrågorna)
//      Spelet läser inte filerna. Vision Owner granskar den svenska texten.
//      En artikel som redan finns i utkasten hoppas över.

import { createInterface } from 'node:readline/promises';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');

// ---------------------------------------------------------------------
// Konstanter
// ---------------------------------------------------------------------

// Modellen (Vision Owner: claude-opus-5-5, i en konstant så att den går att
// byta). Priserna i USD per miljon token hör till modellen och används bara
// för uppskattningen.
export const MODEL = 'claude-opus-5-5';
const PRICE_USD_PER_MTOK = { input: 4, output: 20 };
// Kronor per dollar i uppskattningen. Ungefärligt, inte en kurs.
const SEK_PER_USD = 10;
// Utdata per artikel (tänkande + JSON) i uppskattningen, innan något mätts.
const EST_OUTPUT_TOKENS = 9000;
const MAX_TOKENS = 32000;
const EFFORT = 'high';

// Fördelningen (Vision Owner 2026-09-28).
const KITCHEN_TOPICS = ['culinary_science', 'fermentation_science', 'food_science'];
const WINE_TOPICS = ['sommellerie', 'sensory_evaluation', 'flavor_science'];
const TECHNE_ROLE = { kok: 'culinary_pro', sommellerie: 'sensory_pro' };
const PHRONESIS_ROLE = 'hospitality_mgmt';
const EPISTEME_COLUMNS = ['episteme_culinary_pro', 'episteme_sensory_pro', 'episteme_gastronomy_culture', 'episteme_hospitality_mgmt', 'episteme_educator_researcher'];
const PAVILION = { episteme: 'maltidbiblioteket', phronesis: 'kalastorget', kok: 'metodkoket', sommellerie: 'stensota' };
// Vem som ställer frågan (frågebankens `asker`).
const ASKER = { maltidbiblioteket: 'gäst', metodkoket: 'kock', stensota: 'sommelier', kalastorget: 'värd' };

// Raketens utfall i utkastet: medelvärden i vinbarens bank, i samma enheter
// (sim/incidentBank.ts). Vision Owner sätter dem vid granskningen.
const DEFAULT_OUTCOMES = {
  success: { effects: { cash: 0.3, satisfaction: 0.12, stamina: 0, reputation: 0 }, target: 'table' },
  staff: { effects: { cash: -0.2, satisfaction: -0.08, stamina: -0.02, reputation: 0 }, target: 'table' },
  fail: { effects: { cash: -0.1, satisfaction: -0.06, stamina: 0, reputation: 0 }, target: 'table' }
};

// Frågebanken kräver ett ankare (när frågan hör hemma i dagen). Utkastet
// sätter servicen; Vision Owner ändrar vid granskningen.
const DRAFT_ANCHOR = { phase: 'service', rawText: 'under servicen' };

const GUSTO_ARTICLE_URL = (id) => `https://gusto.science/?article=${id}`;
const OUT_ROCKETS = resolve(FRONTEND, 'src/content/incidents/gusto.draft.json');
const OUT_QUESTIONS = resolve(FRONTEND, 'src/content/questions/gusto.draft.json');
const AXES = ['episteme', 'techne', 'phronesis'];
const OPTION_IDS = ['a', 'b', 'c', 'd'];

// ---------------------------------------------------------------------
// Argument och miljö
// ---------------------------------------------------------------------

function parseArgs(argv) {
  const out = { topic: null, limit: 5, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--topic') out.topic = argv[++i];
    else if (a === '--limit') out.limit = Number(argv[++i]);
    else if (a === '--yes') out.yes = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function trackFor(topic) {
  if (KITCHEN_TOPICS.includes(topic)) return 'kok';
  if (WINE_TOPICS.includes(topic)) return 'sommellerie';
  return null;
}

function loadEnv() {
  const file = resolve(FRONTEND, '.env.local');
  if (!existsSync(file)) throw new Error('frontend/.env.local saknas (se huvudet i skriptet).');
  process.loadEnvFile(file);
  const need = ['GUSTO_SUPABASE_URL', 'GUSTO_SUPABASE_ANON_KEY', 'GUSTO_EMAIL', 'GUSTO_PASSWORD', 'ANTHROPIC_API_KEY'];
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Saknas i .env.local: ${missing.join(', ')}`);
  if (Object.keys(process.env).some((k) => k.startsWith('VITE_GUSTO') || k === 'VITE_ANTHROPIC_API_KEY')) {
    throw new Error('Inloggningen får inte ligga i VITE_-variabler: de bakas in i spelets bygge.');
  }
}

// ---------------------------------------------------------------------
// gusto.science
// ---------------------------------------------------------------------

async function fetchArticles(topic, limit, skipIds) {
  const supabase = createClient(process.env.GUSTO_SUPABASE_URL, process.env.GUSTO_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: authError } = await supabase.auth.signInWithPassword({ email: process.env.GUSTO_EMAIL, password: process.env.GUSTO_PASSWORD });
  if (authError) throw new Error(`Inloggningen på gusto.science misslyckades: ${authError.message}`);
  const track = trackFor(topic);
  const { data: meta, error } = await supabase
    .from('articles_public')
    .select('id, title, authors, journal, year, topic, url, citation_count')
    .eq('topic', topic)
    .eq(`has_episteme_${TECHNE_ROLE[track]}`, true)
    .order('citation_count', { ascending: false, nullsFirst: false })
    .limit(limit + skipIds.size);
  if (error) throw new Error(`articles_public: ${error.message}`);
  const picked = (meta ?? []).filter((a) => !skipIds.has(a.id)).slice(0, limit);
  if (picked.length === 0) return [];
  const { data: full, error: rpcError } = await supabase.rpc('get_articles_full', { article_ids: picked.map((a) => a.id) });
  if (rpcError) throw new Error(`get_articles_full: ${rpcError.message}`);
  if (!full || full.length === 0) throw new Error('get_articles_full gav inga rader: kontot saknar Pro (profiles.is_pro).');
  const byId = new Map(full.map((r) => [r.id, r]));
  const articles = [];
  for (const a of picked) {
    const r = byId.get(a.id);
    if (!r) continue;
    const episteme = EPISTEME_COLUMNS.map((c) => r[c]).find((v) => typeof v === 'string' && v.trim());
    const techne = r[`techne_${TECHNE_ROLE[track]}`];
    const phronesis = r[`phronesis_${PHRONESIS_ROLE}`];
    if (!episteme || !techne || !phronesis) {
      console.log(`  hoppar över ${a.id}: saknar ett av de tre avsnitten`);
      continue;
    }
    const doi = (a.url ?? '').match(/doi\.org\/(.+)$/i)?.[1] ?? null;
    articles.push({
      id: a.id, title: a.title, authors: a.authors, journal: a.journal, year: a.year, topic: a.topic,
      url: a.url, doi, gustoUrl: GUSTO_ARTICLE_URL(a.id), track,
      episteme, techne, techneRole: TECHNE_ROLE[track], phronesis, phronesisRole: PHRONESIS_ROLE
    });
  }
  return articles;
}

// ---------------------------------------------------------------------
// Claude
// ---------------------------------------------------------------------

const STEP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['question', 'options', 'fail_outcome'],
  properties: {
    question: { type: 'string' },
    options: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'explanation', 'correct'],
        properties: { label: { type: 'string' }, explanation: { type: 'string' }, correct: { type: 'boolean' } }
      }
    },
    fail_outcome: { type: 'string' }
  }
};
const QUESTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['prompt', 'options', 'correct_index', 'explanation'],
  properties: {
    prompt: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    correct_index: { type: 'integer' },
    explanation: { type: 'string' }
  }
};
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rocket', 'questions'],
  properties: {
    rocket: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'body', 'steps', 'success_outcome', 'staff_outcome'],
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        steps: {
          type: 'object',
          additionalProperties: false,
          required: AXES,
          properties: { episteme: STEP_SCHEMA, techne: STEP_SCHEMA, phronesis: STEP_SCHEMA }
        },
        success_outcome: { type: 'string' },
        staff_outcome: { type: 'string' }
      }
    },
    questions: {
      type: 'object',
      additionalProperties: false,
      required: AXES,
      properties: { episteme: QUESTION_SCHEMA, techne: QUESTION_SCHEMA, phronesis: QUESTION_SCHEMA }
    }
  }
};

// Fast systemprompt (cachas): spelet, formen och språket.
const SYSTEM = `Du skriver spelinnehåll till Nexus, ett lärospel på svenska om gastronomi och service. Spelaren driver en vinbar i Grythyttan och lär sig i Måltidens hus, där fyra paviljonger övar var sin kunskapsform:
- Måltidsbiblioteket: episteme, vad forskningen visar (fakta, begrepp).
- Metodköket (köket) och Stensöta (vin och sensorik): techne, hur man gör (hantverket).
- Kalastorget: phronesis, när och varför (omdömet i en situation med gäster och kollegor).

Du får en vetenskaplig artikel från gusto.science med tre avsnitt på engelska: EPISTEME (vad studien visar), TECHNE (hantverket för en yrkesroll) och PHRONESIS (omdömet för en yrkesroll). Skriv ur dem, på svenska:

1. En RAKET: en händelse under kvällens service i vinbaren, med tre frågor i samma sammanhang. "title" är en kort rubrik (2–4 ord). "body" är 1–3 meningar om vad som händer i rummet just nu (vem, vid vilket bord, vad som syns), utan att avslöja svaret.
   - steps.episteme: vad (fakta ur EPISTEME). Kort fråga, korta alternativ (högst ca 8 ord). Spelaren har 15 sekunder.
   - steps.techne: hur (hantverket ur TECHNE). Alternativ högst ca 14 ord. 20 sekunder.
   - steps.phronesis: när och varför (omdömet ur PHRONESIS, i händelsens läge). Alternativ högst ca 20 ord. 30 sekunder.
   Varje steg: "question" slutar med "?", exakt fyra alternativ, exakt ett med "correct": true. "explanation" på varje alternativ (1–3 meningar): varför det är rätt eller fel. "fail_outcome": en mening om vad som syns i rummet när spelaren svarar fel på steget.
   "success_outcome": en mening om vad som syns när hela raketen klarats. "staff_outcome": en mening som börjar "Personalen tar över:" och beskriver ett sämre utfall när personalen får avgöra resten.
2. Tre PROVFRÅGOR till Måltidens hus, en per avsnitt: questions.episteme (Måltidsbiblioteket), questions.techne (Metodköket eller Stensöta enligt artikeln), questions.phronesis (Kalastorget). Varje fråga: "prompt" (en fråga som står på egen hand, utan raketens berättelse), exakt fyra alternativ i "options", "correct_index" (0–3) och "explanation" (2–4 meningar som lär ut varför).

Regler:
- Allt ska gå att spåra till artikelns text. Hitta aldrig på siffror, temperaturer, tider, mängder, namn på studier, platser eller referenser. Saknar texten ett tal, skriv utan tal.
- Säger artikeln att abstraktet inte räcker för en roll, skriv frågan på den nivå texten bär (vad en yrkesperson ska vara uppmärksam på), inte ett påhittat recept.
- Felaktiga alternativ är rimliga missförstånd, inte skämt, och ungefär lika långa som det rätta.
- Förklara fackord i en bisats första gången.
- Enkel, konkret restaurangsvenska, korta meningar, inga anglicismer där svenska finns. Skriv "gästen" eller omformulera; gissa inte kön.
- Nämn inte artikeln, forskarna eller gusto.science i spelartexten.`;

function userContent(a) {
  const pavilion = a.track === 'kok' ? 'Metodköket' : 'Stensöta';
  return `Artikel: ${a.title}
Tidskrift: ${a.journal ?? 'okänd'} (${a.year ?? 'okänt år'})
Ämne: ${a.topic}. Techne-steget och techne-frågan hör till ${pavilion}.

EPISTEME (What the research supports):
${a.episteme}

TECHNE (roll: ${a.techneRole}):
${a.techne}

PHRONESIS (roll: ${a.phronesisRole}):
${a.phronesis}`;
}

function requestFor(a) {
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userContent(a) }],
    output_config: { effort: EFFORT, format: { type: 'json_schema', schema: OUTPUT_SCHEMA } }
  };
}

async function estimate(client, articles) {
  let input = 0;
  for (const a of articles) {
    const { system, messages } = requestFor(a);
    const c = await client.messages.countTokens({ model: MODEL, system, messages });
    input += c.input_tokens;
  }
  const output = EST_OUTPUT_TOKENS * articles.length;
  const usd = (input * PRICE_USD_PER_MTOK.input + output * PRICE_USD_PER_MTOK.output) / 1e6;
  return { input, output, usd, sek: usd * SEK_PER_USD };
}

function validate(out) {
  const errs = [];
  for (const axis of AXES) {
    const s = out.rocket.steps[axis];
    if (!s.question.trim().endsWith('?')) errs.push(`${axis}: frågan slutar inte med ?`);
    if (s.options.length !== 4) errs.push(`${axis}: ${s.options.length} alternativ`);
    if (s.options.filter((o) => o.correct).length !== 1) errs.push(`${axis}: inte exakt ett rätt`);
    const q = out.questions[axis];
    if (q.options.length !== 4) errs.push(`fråga ${axis}: ${q.options.length} alternativ`);
    if (!(q.correct_index >= 0 && q.correct_index < q.options.length)) errs.push(`fråga ${axis}: correct_index ${q.correct_index}`);
  }
  if (!out.rocket.staff_outcome.startsWith('Personalen tar över')) errs.push('staff_outcome börjar inte med "Personalen tar över"');
  return errs;
}

async function draftFor(client, a) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await client.beta.messages.create({
      ...requestFor(a),
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default'
    });
    if (response.stop_reason === 'refusal') throw new Error(`avböjdes (${response.stop_details?.category ?? 'okänd kategori'})`);
    if (response.stop_reason === 'max_tokens') throw new Error('svaret kapades vid max_tokens');
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const out = JSON.parse(text);
    const errs = validate(out);
    if (errs.length === 0) return { out, usage: response.usage, servedBy: response.model };
    console.log(`  försök ${attempt} ogiltigt: ${errs.join('; ')}`);
  }
  throw new Error('två ogiltiga svar i rad');
}

// ---------------------------------------------------------------------
// Utkasten
// ---------------------------------------------------------------------

// Samma artikel ger alltid samma ordning; det rätta svaret hamnar inte
// alltid först.
function seededOrder(seed, n) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const j = h % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

function readDraft(file, emptyNote) {
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  return { schemaVersion: 1, language: 'sv', status: 'utkast', reviewedBy: null, source: 'gusto.science', note: emptyNote, entries: [] };
}

function buildEntries(a, out, meta) {
  const shortId = a.id.slice(0, 8);
  const rocketId = `gusto-${shortId}`;
  const reference = { title: a.title, url: a.gustoUrl, doi: a.doi, source: a.url };
  const source = {
    language: 'en', title: a.title, authors: a.authors, journal: a.journal, year: a.year, topic: a.topic,
    doi: a.doi, url: a.url, gustoUrl: a.gustoUrl,
    episteme: a.episteme, techne: a.techne, techneRole: a.techneRole, phronesis: a.phronesis, phronesisRole: a.phronesisRole
  };
  const steps = AXES.map((axis) => {
    const s = out.rocket.steps[axis];
    const order = seededOrder(`${a.id}:${axis}`, s.options.length);
    const opts = order.map((i) => s.options[i]);
    return {
      meta: { axis, options: opts.map((o, k) => ({ id: OPTION_IDS[k], quality: o.correct ? 'best' : 'wrong' })), fail: DEFAULT_OUTCOMES.fail },
      text: {
        question: s.question,
        options: Object.fromEntries(opts.map((o, k) => [OPTION_IDS[k], { label: o.label, explanation: o.explanation }])),
        fail: { outcome: s.fail_outcome }
      }
    };
  });
  const rocket = {
    id: rocketId,
    status: 'utkast',
    articleId: a.id,
    meta: {
      id: rocketId, track: a.track, arc: 'rush', chainOnly: false, needsTable: true, placeholder: false, reference,
      steps: steps.map((s) => s.meta), success: DEFAULT_OUTCOMES.success, staff: DEFAULT_OUTCOMES.staff
    },
    text: {
      title: out.rocket.title, body: out.rocket.body, steps: steps.map((s) => s.text),
      success: { outcome: out.rocket.success_outcome }, staff: { outcome: out.rocket.staff_outcome }
    },
    source,
    generated: meta
  };
  const questions = AXES.map((axis) => {
    const q = out.questions[axis];
    const pavilion = axis === 'techne' ? PAVILION[a.track] : PAVILION[axis];
    const order = seededOrder(`${a.id}:q:${axis}`, q.options.length);
    const options = order.map((i) => q.options[i]);
    const correctIndex = order.indexOf(q.correct_index);
    const id = `gusto-${shortId}-${axis}`;
    return {
      id,
      status: 'utkast',
      articleId: a.id,
      meta: { id, pavilion, level: 'brons', asker: ASKER[pavilion], axis, track: axis === 'techne' ? a.track : null, correctIndex, anchor: DRAFT_ANCHOR, placeholder: false, reference },
      text: { prompt: q.prompt, options, explanation: q.explanation },
      source,
      generated: meta
    };
  });
  return { rocket, questions };
}

// ---------------------------------------------------------------------
// Körningen
// ---------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.topic) {
    console.log(`Användning: node scripts/order272-gusto-drafts.mjs --topic <ämne> [--limit N] [--yes]
Ämnen: kök ${KITCHEN_TOPICS.join(', ')}; Stensöta ${WINE_TOPICS.join(', ')}.`);
    process.exit(args.help ? 0 : 1);
  }
  if (!trackFor(args.topic)) throw new Error(`Ämnet ${args.topic} hör inte till fördelningen (kök: ${KITCHEN_TOPICS.join(', ')}; Stensöta: ${WINE_TOPICS.join(', ')}).`);
  if (!(args.limit > 0)) throw new Error('--limit måste vara ett positivt tal');
  loadEnv();

  const rockets = readDraft(OUT_ROCKETS, 'Raketer ur gusto.science (ORDER 272), en per artikel med ett steg ur vart och ett av artikelns tre avsnitt. Skrivna av Claude och översatta till svenska; den engelska originaltexten står i `source`. Spelet läser inte filen förrän Vision Owner har granskat den. `meta` och `text` har samma form som vinbarens bank (sim/incidentBank.ts); utfallen är medelvärden tills Vision Owner sätter dem.');
  const questions = readDraft(OUT_QUESTIONS, 'Provfrågor till Måltidens hus ur gusto.science (ORDER 272): episteme till Måltidsbiblioteket, techne till Metodköket eller Stensöta enligt ämnet, phronesis till Kalastorget. Skrivna av Claude och översatta till svenska; den engelska originaltexten står i `source`. Spelet läser inte filen förrän Vision Owner har granskat den. `meta` och `text` har samma form som frågebanken (strategic/content/questions).');
  const done = new Set(rockets.entries.map((e) => e.articleId));

  console.log(`Hämtar ${args.limit} artiklar i ${args.topic} från gusto.science …`);
  const articles = await fetchArticles(args.topic, args.limit, done);
  if (articles.length === 0) { console.log('Inga nya artiklar att skriva utkast till.'); return; }
  for (const a of articles) console.log(`  ${a.year ?? '—'}  ${a.title}`);

  const client = new Anthropic();
  const est = await estimate(client, articles);
  console.log(`\nModell ${MODEL}. ${articles.length} artiklar: ca ${est.input.toLocaleString('sv-SE')} token in och ${est.output.toLocaleString('sv-SE')} ut (uppskattat).`);
  console.log(`Uppskattad kostnad: ${est.usd.toFixed(2)} USD, ungefär ${Math.round(est.sek)} kr.`);
  if (!args.yes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question('Fortsätta? [j/N] ')).trim().toLowerCase();
    rl.close();
    if (answer !== 'j' && answer !== 'ja' && answer !== 'y') { console.log('Avbrutet. Inga anrop gjordes.'); return; }
  }

  let used = { input: 0, output: 0, cacheRead: 0 };
  for (const a of articles) {
    process.stdout.write(`  ${a.title.slice(0, 70)} … `);
    try {
      const { out, usage, servedBy } = await draftFor(client, a);
      used = { input: used.input + usage.input_tokens, output: used.output + usage.output_tokens, cacheRead: used.cacheRead + (usage.cache_read_input_tokens ?? 0) };
      const { rocket, questions: qs } = buildEntries(a, out, { model: servedBy, at: new Date().toISOString(), order: 'ORDER 272' });
      rockets.entries.push(rocket);
      questions.entries.push(...qs);
      // Skriv efter varje artikel, så att ett avbrott inte kostar det som redan är gjort.
      mkdirSync(dirname(OUT_ROCKETS), { recursive: true });
      mkdirSync(dirname(OUT_QUESTIONS), { recursive: true });
      writeFileSync(OUT_ROCKETS, JSON.stringify(rockets, null, 2) + '\n');
      writeFileSync(OUT_QUESTIONS, JSON.stringify(questions, null, 2) + '\n');
      console.log(`klar (${rocket.id})`);
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) console.log('hastighetsgränsen, försök igen senare');
      else if (e instanceof Anthropic.APIError) console.log(`API-fel ${e.status}: ${e.message}`);
      else console.log(`fel: ${e.message}`);
    }
  }
  const usd = (used.input * PRICE_USD_PER_MTOK.input + used.output * PRICE_USD_PER_MTOK.output) / 1e6;
  console.log(`\nFaktiskt: ${used.input} token in (${used.cacheRead} ur cachen), ${used.output} ut, ca ${usd.toFixed(2)} USD.`);
  console.log(`Utkast: ${OUT_ROCKETS}\n        ${OUT_QUESTIONS}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`FEL: ${e.message}`); process.exit(1); });
}

export { buildEntries, seededOrder, validate, trackFor, OUTPUT_SCHEMA };
