#!/usr/bin/env node
// ORDER 049 §7 step 3 — package the approved bank into a TS module
// the game can import. Reads:
//   reports/knowledge/questions.json      (bank; status === 'approved' only)
//   reports/knowledge/article-topics.json (per-article topic + title + url)
// Writes:
//   frontend/src/content/knowledgeBank.ts
//
// Topic → sender mapping fixes who plausibly asks each question when
// the frame is a live-service prefix. Per Vision Owner 2026-08-10:
//   - kitchen-technical topics → kock
//   - wine (sommellerie)       → servitör (no dedicated sommelier role)
//   - guest-reading topics     → värd
//   - uncategorized            → kock (default; flagged for retag)
// Per-article overrides handle edge cases where the topic-level route
// misclassifies. Add IDs to ARTICLE_SENDER_OVERRIDE as they surface.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = resolve(process.argv[1], '../..');
const BANK_PATH   = resolve(REPO, 'reports/knowledge/questions.json');
const TOPICS_PATH = resolve(REPO, 'reports/knowledge/article-topics.json');
const OUT_PATH    = resolve(REPO, 'frontend/src/content/knowledgeBank.ts');

const TOPIC_SENDER = {
  food_science:         'kock',
  fermentation_science: 'kock',
  nutritional_science:  'kock',
  flavor_science:       'kock',
  sensory_evaluation:   'kock',
  culinary_science:     'kock',
  sommellerie:          'servitör',
  food_psychology:      'värd',
  gastronomy:           'värd',
  food_anthropology:    'värd',
  hospitality:          'värd',
  art_science:          'värd',
  multisensory:         'värd',
  uncategorized:        'kock'
};

// Per-article overrides. Same shape as TOPIC_SENDER but keyed by
// article_id. Reason field is kept for the record only — the code
// reads .sender.
const ARTICLE_SENDER_OVERRIDE = {
  // "HYGIENE STATUS OF KITCHEN PRODUCTION AREAS OF HOSPITALITY FACILITIES"
  // — hospitality topic, but kitchen hygiene is köksansvar per Vision
  // Owner 2026-08-10.
  '8dad487d-b02d-4b20-af10-5cf289e5f075': { sender: 'kock', reason: 'kitchen-hygiene routes to kock, not the default värd for hospitality' }
};

// Articles whose topic is 'uncategorized' get the flag so a future
// pass can retag them and refine the sender routing.
const RETAG_TOPICS = new Set(['uncategorized']);

function loadJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function jsString(s) {
  // Emit a TS single-quoted string with escaping. Bank text can
  // contain single quotes, backslashes, and multi-byte characters —
  // template literals would need backtick escaping too. Simpler:
  // JSON.stringify (double-quoted) and let TypeScript take it.
  return JSON.stringify(String(s));
}

function main() {
  const bank   = loadJson(BANK_PATH);
  const topics = loadJson(TOPICS_PATH);
  const approved = bank.entries.filter((e) => e.status === 'approved');

  const packaged = [];
  const missingTopic = [];
  const unknownTopic = new Set();

  for (const e of approved) {
    const meta = topics[e.article_id];
    if (!meta) {
      missingTopic.push(e.article_id);
      continue;
    }
    const topic = meta.topic || 'uncategorized';
    const override = ARTICLE_SENDER_OVERRIDE[e.article_id];
    let sender;
    if (override) {
      sender = override.sender;
    } else {
      sender = TOPIC_SENDER[topic];
      if (!sender) { unknownTopic.add(topic); sender = 'kock'; }
    }
    packaged.push({
      id: `${e.article_id}::${e.register}::${packaged.length}`,
      register: e.register,
      sender,
      question: e.question,
      options: e.options,
      correctIndex: e.correct_index,
      citation: e.citation,
      articleId: e.article_id,
      articleTitle: meta.title || '',
      articleUrl: meta.url || '',
      topic,
      needsRetag: RETAG_TOPICS.has(topic)
    });
  }

  if (missingTopic.length) {
    console.warn('Warning:', missingTopic.length, 'entries missing topic (article not in article-topics.json)');
  }
  if (unknownTopic.size) {
    console.warn('Warning: unknown topics defaulted to kock:', [...unknownTopic].join(', '));
  }

  // Distribution report.
  const bySender = new Map();
  const byRegister = new Map();
  for (const q of packaged) {
    bySender.set(q.sender, (bySender.get(q.sender) || 0) + 1);
    byRegister.set(q.register, (byRegister.get(q.register) || 0) + 1);
  }
  console.log(`Packaged ${packaged.length} approved entries.`);
  console.log('  By sender:  ', [...bySender.entries()].map(([k,v]) => `${k}=${v}`).join('  '));
  console.log('  By register:', [...byRegister.entries()].map(([k,v]) => `${k}=${v}`).join('  '));
  console.log('  Needs retag:', packaged.filter((q) => q.needsRetag).length);

  const header = [
    '// GENERATED — do not edit by hand.',
    '// Source: reports/knowledge/questions.json (status === \'approved\')',
    '// Generator: scripts/knowledge-package.mjs',
    '// Approved bank per ORDER 049 §3–§7 (2026-08-10). Frame contract in',
    '// ORDER 049 §3.3.a: bank question is fixed; frame varies by context',
    '// (bank meeting / service / morning). Sender comes from topic per',
    '// the mapping approved 2026-08-10.',
    '//',
    `// Regenerate: node scripts/knowledge-package.mjs`,
    ''
  ].join('\n');

  const types = [
    "import type { StaffRole } from '../strategic/types';",
    '',
    "export type BankRegister = 'episteme' | 'techne' | 'phronesis';",
    '',
    '// Bank sender is the staff role that plausibly asks the question',
    '// during a service frame. Bank does not attribute to lärling (the',
    '// apprentice asks about things, not from expertise).',
    "export type BankSender = Exclude<StaffRole, 'lärling'>;",
    '',
    "export type BankContext = 'bank_meeting' | 'service' | 'morning';",
    '',
    'export interface BankOption {',
    '  readonly label: string;',
    '  // Episteme and techne have exactly one correct option; phronesis',
    "  // options are judgement calls with no single right answer, so",
    '  // `correct` is undefined on those.',
    '  readonly correct?: boolean;',
    '}',
    '',
    'export interface BankQuestion {',
    '  readonly id: string;',
    '  readonly register: BankRegister;',
    '  readonly sender: BankSender;',
    '  readonly question: string;',
    '  readonly options: readonly BankOption[];',
    '  // Undefined for phronesis (see BankOption).',
    '  readonly correctIndex?: number;',
    '  readonly citation: string;',
    '  readonly articleId: string;',
    '  readonly articleTitle: string;',
    '  readonly articleUrl: string;',
    '  readonly topic: string;',
    '  readonly needsRetag: boolean;',
    '}',
    ''
  ].join('\n');

  const bankLines = ['export const KNOWLEDGE_BANK: readonly BankQuestion[] = ['];
  for (const q of packaged) {
    const opts = q.options.map((o) => {
      const parts = [`label: ${jsString(o.label)}`];
      if (typeof o.correct === 'boolean') parts.push(`correct: ${o.correct}`);
      return `    { ${parts.join(', ')} }`;
    }).join(',\n');
    bankLines.push('  {');
    bankLines.push(`    id: ${jsString(q.id)},`);
    bankLines.push(`    register: ${jsString(q.register)},`);
    bankLines.push(`    sender: ${jsString(q.sender)},`);
    bankLines.push(`    question: ${jsString(q.question)},`);
    bankLines.push(`    options: [\n${opts}\n    ],`);
    if (typeof q.correctIndex === 'number') {
      bankLines.push(`    correctIndex: ${q.correctIndex},`);
    }
    bankLines.push(`    citation: ${jsString(q.citation)},`);
    bankLines.push(`    articleId: ${jsString(q.articleId)},`);
    bankLines.push(`    articleTitle: ${jsString(q.articleTitle)},`);
    bankLines.push(`    articleUrl: ${jsString(q.articleUrl)},`);
    bankLines.push(`    topic: ${jsString(q.topic)},`);
    bankLines.push(`    needsRetag: ${q.needsRetag}`);
    bankLines.push('  },');
  }
  bankLines.push('];');
  bankLines.push('');

  const helpers = [
    '// Split by register for O(1) filtering in the reducer.',
    'export const KNOWLEDGE_BANK_BY_REGISTER: Record<BankRegister, readonly BankQuestion[]> = {',
    "  episteme:  KNOWLEDGE_BANK.filter((q) => q.register === 'episteme'),",
    "  techne:    KNOWLEDGE_BANK.filter((q) => q.register === 'techne'),",
    "  phronesis: KNOWLEDGE_BANK.filter((q) => q.register === 'phronesis')",
    '};',
    '',
    '// Deterministic pick: pass an integer index; caller derives it from',
    '// (seed, tick, register, sender) so the same fire replays the same',
    '// question. Filters by sender when provided; falls back to any',
    '// sender in the register when the filtered pool is empty.',
    'export function pickBankQuestion(',
    '  register: BankRegister,',
    '  sender: BankSender | null,',
    '  index: number',
    '): BankQuestion | null {',
    '  const pool = KNOWLEDGE_BANK_BY_REGISTER[register];',
    '  if (pool.length === 0) return null;',
    '  const filtered = sender ? pool.filter((q) => q.sender === sender) : pool;',
    '  const chosen = filtered.length > 0 ? filtered : pool;',
    '  const i = ((index % chosen.length) + chosen.length) % chosen.length;',
    '  return chosen[i];',
    '}',
    '',
    '// Frame the bank question for a given context. Contract per',
    "// ORDER 049 §3.3.a: frame is a leading sentence, not a rewrite.",
    "// The question body is verbatim; only the wrapping varies.",
    '//',
    '//   bank_meeting: banker prefix + question',
    '//   service:      role prefix + question (via SENDER_PREFIX in caller)',
    '//   morning:      standalone question',
    '//',
    '// The service frame is left to the caller because it needs',
    '// SENDER_PREFIX from scenarios.ts (which knows the game-facing',
    '// English labels). This helper covers the two contexts that have',
    '// a fixed leader.',
    "export function frameBankQuestion(q: BankQuestion, context: BankContext): string {",
    "  if (context === 'bank_meeting') return `Before we go to numbers — ${q.question}`;",
    "  if (context === 'morning') return q.question;",
    "  // 'service' — caller applies SENDER_PREFIX.",
    "  return q.question;",
    '}',
    ''
  ].join('\n');

  const out = header + '\n' + types + '\n' + bankLines.join('\n') + '\n' + helpers;
  writeFileSync(OUT_PATH, out);
  console.log(`\nWrote ${OUT_PATH}`);
}

main();
