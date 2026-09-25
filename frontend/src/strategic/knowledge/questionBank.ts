// ORDER 262 (Nexus v1 etapp 0) — frågebanken som data.
//
// Speldesign `NEXUS_SPELDESIGN_V1.md` > Kunskapen > Frågebanken:
// "Frågorna är data, inte kod. Varje fråga har paviljong, nivå, vem som
// ställer den, frågetext, fyra alternativ, rätt svar och förklaring."
// Språk och målgrupp: "Frågorna skrivs med spelartext och metadata
// separerade, så att engelska kan läggas till senare."
//
// Datan ligger i `../content/questions/`:
//   bank.meta.json          — metadata per fråga (paviljong, nivå,
//                             frågeställare, axel, spår, rätt svar, ankare)
//   bank.text.<språk>.json  — spelartext per fråga (fråga, fyra
//                             alternativ, förklaring), en fil per språk
//
// Metadata och spelartext möts bara här, via id. Ingen annan modul läser
// JSON-filerna direkt.
//
// Språkval: den engelska texten är källan (bronsbanken är författad på
// engelska). Den svenska texten är ett utkast tills Vision Owner har
// granskat den (`status: 'reviewed'`); fram till dess används engelska.
//
// Nivåer utan egna frågor (silver–platina i dag) fylls med paviljongens
// bronsfrågor, märkta `placeholder: true` (speldesign > Frågebanken:
// "Tills de finns används bronsbankens 40 frågor på alla nivåer, tydligt
// märkta som platshållare").

import type { KnowledgeAxis, YrkesSpar } from '../types';
import type { AnchorId } from '../simulation/anchors';
import { ANCHOR_IDS } from '../simulation/anchors';
import type { FlervalQuestion, QuestionAnchor, QuestionAsker, QuestionLevel } from './questionFormats';
import type { PavilionId } from './pavilions';
import { ALL_PAVILION_IDS } from './pavilions';
import { OPTIONS_PER_QUESTION } from '../../sim/balance';
import metaJson from '../content/questions/bank.meta.json';
import textEnJson from '../content/questions/bank.text.en.json';
import textSvJson from '../content/questions/bank.text.sv.draft.json';

export type BankLanguage = 'en' | 'sv';

// Metadata — allt som inte är spelartext.
export interface BankQuestionMeta {
  id: string;
  pavilion: PavilionId;
  level: QuestionLevel;
  asker: QuestionAsker;
  axis: KnowledgeAxis;
  track: YrkesSpar | null;
  correctIndex: number;
  anchor: QuestionAnchor;
  // Sant för frågor som står i för en nivå som saknar eget innehåll.
  placeholder: boolean;
}

// Spelartext — det enda som översätts.
export interface BankQuestionText {
  prompt: string;
  options: string[];
  explanation: string;
}

export interface BankTextFile {
  language: BankLanguage;
  // 'source' = författad text; 'draft' = ogranskad översättning;
  // 'reviewed' = översättning granskad av Vision Owner.
  status: 'source' | 'draft' | 'reviewed';
  texts: Record<string, BankQuestionText>;
}

export interface BankQuestion extends BankQuestionMeta, BankQuestionText {
  language: BankLanguage;
  // Id på den fråga vars innehåll lånas när `placeholder` är sant.
  sourceId: string;
}

const LEVELS: readonly QuestionLevel[] = ['brons', 'silver', 'guld', 'platina'];
const ASKERS: readonly QuestionAsker[] = ['kock', 'sommelier', 'gäst', 'värd', 'servitör', 'lärling'];
const AXES: readonly KnowledgeAxis[] = ['episteme', 'techne', 'phronesis'];
const TRACKS: readonly (YrkesSpar | null)[] = ['kok', 'sommellerie', null];
const PHASES: readonly QuestionAnchor['phase'][] = ['service', 'morning', 'evening'];

// Validerar en metadatapost. Returnerar en lista med fel (tom = giltig).
export function validateMeta(q: unknown): string[] {
  const errs: string[] = [];
  const r = q as Record<string, unknown>;
  const id = typeof r?.id === 'string' ? r.id : '(saknar id)';
  const fail = (msg: string) => errs.push(`${id}: ${msg}`);
  if (typeof r?.id !== 'string' || r.id.length === 0) fail('id saknas');
  if (!ALL_PAVILION_IDS.includes(r?.pavilion as PavilionId)) fail(`okänd paviljong ${String(r?.pavilion)}`);
  if (!LEVELS.includes(r?.level as QuestionLevel)) fail(`okänd nivå ${String(r?.level)}`);
  if (!ASKERS.includes(r?.asker as QuestionAsker)) fail(`okänd frågeställare ${String(r?.asker)}`);
  if (!AXES.includes(r?.axis as KnowledgeAxis)) fail(`okänd axel ${String(r?.axis)}`);
  if (!TRACKS.includes(r?.track as YrkesSpar | null)) fail(`okänt spår ${String(r?.track)}`);
  if (!Number.isInteger(r?.correctIndex) || (r.correctIndex as number) < 0 || (r.correctIndex as number) >= OPTIONS_PER_QUESTION) {
    fail(`rätt svar utanför 0..${OPTIONS_PER_QUESTION - 1}`);
  }
  if (typeof r?.placeholder !== 'boolean') fail('placeholder saknas');
  const a = r?.anchor as Record<string, unknown> | undefined;
  if (!a || !PHASES.includes(a.phase as QuestionAnchor['phase'])) fail('ankare saknar giltig fas');
  else {
    if (typeof a.rawText !== 'string') fail('ankare saknar rawText');
    if (a.anchorId !== undefined && !ANCHOR_IDS.includes(a.anchorId as AnchorId)) fail(`okänt anchorId ${String(a.anchorId)}`);
    if (a.station !== undefined && typeof a.station !== 'string') fail('station ska vara text');
  }
  return errs;
}

// Validerar spelartexten för en fråga.
export function validateText(id: string, t: unknown): string[] {
  const errs: string[] = [];
  const r = t as Record<string, unknown> | undefined;
  if (!r) return [`${id}: spelartext saknas`];
  if (typeof r.prompt !== 'string' || r.prompt.trim() === '') errs.push(`${id}: frågetext saknas`);
  if (!Array.isArray(r.options) || r.options.length !== OPTIONS_PER_QUESTION ||
      r.options.some((o) => typeof o !== 'string' || o.trim() === '')) {
    errs.push(`${id}: ska ha exakt ${OPTIONS_PER_QUESTION} alternativ`);
  }
  if (typeof r.explanation !== 'string' || r.explanation.trim() === '') errs.push(`${id}: förklaring saknas`);
  return errs;
}

// Validerar hela banken: varje metadatapost och dess text i varje
// språkfil. Används av testet och kan köras i harnessen.
export function validateBank(
  meta: readonly unknown[],
  textFiles: readonly BankTextFile[]
): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const m of meta) {
    errs.push(...validateMeta(m));
    const id = (m as { id?: string }).id ?? '';
    if (ids.has(id)) errs.push(`${id}: dubblett`);
    ids.add(id);
    for (const f of textFiles) errs.push(...validateText(id, f.texts[id]).map((e) => `[${f.language}] ${e}`));
  }
  for (const f of textFiles) {
    for (const id of Object.keys(f.texts)) {
      if (!ids.has(id)) errs.push(`[${f.language}] ${id}: text utan metadata`);
    }
  }
  return errs;
}

export const BANK_META: readonly BankQuestionMeta[] = metaJson.questions as BankQuestionMeta[];
export const BANK_TEXT_FILES: readonly BankTextFile[] = [
  textEnJson as BankTextFile,
  textSvJson as BankTextFile
];

function textFile(language: BankLanguage): BankTextFile {
  const f = BANK_TEXT_FILES.find((x) => x.language === language);
  if (!f) throw new Error(`Ingen frågetext för språket ${language}`);
  return f;
}

// Språket spelet läser frågorna på. Svenska först när utkastet är granskat.
export function activeBankLanguage(): BankLanguage {
  return textFile('sv').status === 'reviewed' ? 'sv' : 'en';
}

function join(meta: BankQuestionMeta, language: BankLanguage): BankQuestion {
  const t = textFile(language).texts[meta.id];
  if (!t) throw new Error(`${meta.id}: spelartext saknas på ${language}`);
  return { ...meta, ...t, options: [...t.options], language, sourceId: meta.id };
}

// Alla författade frågor (inga platshållare) på valt språk.
export function authoredQuestions(language: BankLanguage = activeBankLanguage()): BankQuestion[] {
  return BANK_META.filter((m) => !m.placeholder).map((m) => join(m, language));
}

// Frågorna för en paviljong och nivå. Saknar nivån egna frågor lånas
// paviljongens bronsfrågor och märks som platshållare.
export function questionsFor(
  pavilion: PavilionId,
  level: QuestionLevel,
  language: BankLanguage = activeBankLanguage()
): BankQuestion[] {
  const own = authoredQuestions(language).filter((q) => q.pavilion === pavilion && q.level === level);
  if (own.length > 0 || level === 'brons') return own;
  return authoredQuestions(language)
    .filter((q) => q.pavilion === pavilion && q.level === 'brons')
    .map((q) => ({ ...q, id: `${q.id}@${level}`, level, placeholder: true, sourceId: q.id }));
}

// Brygga till den befintliga flervalsformen (ORDER 107/229) som
// ankarpickern och proven läser.
export function toFlerval(q: BankQuestion): FlervalQuestion {
  return {
    id: q.id,
    format: 'flerval',
    axis: q.axis,
    spar: q.track,
    pavilion: q.pavilion,
    level: q.level,
    askerRole: q.asker,
    prompt: q.prompt,
    options: [...q.options],
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    anchor: { ...q.anchor }
  };
}
