// ORDER 319b del 2 (Anders 2026-10-08) — de nyfikna gästernas egna frågor, i gästens röst
// (documentation/blueprints/NYFIKNA_FRAGOR_319.md, "Ersätter kunskapsfrågorna ur banken i den nyfikna
// gästens kort"). Filerna i src/content/curious/: nyfikna.meta.json (utlösaren, axeln, svarens kvalitet
// och ⚖), nyfikna.text.sv.json och nyfikna.text.en.json (repliken, svaren och förklaringen).
//
// Utlösaren är vad gästen gör i bild: läser skylten, luktar på röken, fryser, ser på priset eller
// kommer med barn. En fråga märkt ⚖ (legal) är dold tills den är granskad; ingen annan fråga påverkas.

import metaFile from '../content/curious/nyfikna.meta.json';
import svFile from '../content/curious/nyfikna.text.sv.json';
import enFile from '../content/curious/nyfikna.text.en.json';
import { getLanguage } from '../content/language';
import type { KnowledgeAxis } from '../strategic/types';
import { CURIOUS } from './balance';

export type CuriousTrigger = 'sign' | 'smell' | 'cold' | 'price' | 'child';
export const CURIOUS_TRIGGERS: readonly CuriousTrigger[] = ['sign', 'smell', 'cold', 'price', 'child'];
export type CuriousQuality = 'right' | 'ok' | 'wrong';

export interface CuriousQuestionMeta {
  id: string;
  trigger: CuriousTrigger;
  axis: KnowledgeAxis;
  options: { id: string; quality: CuriousQuality }[];
  legal?: { legalReviewed: boolean };
}

export interface CuriousQuestionText {
  q: string;
  /** Vem som säger repliken, när det inte är gästen själv: en förälder eller ett barn. */
  speaker?: 'parent' | 'child';
  options: Record<string, string>;
  why: string;
}

interface MetaFile { schemaVersion: number; questions: CuriousQuestionMeta[] }
interface TextFile { language: string; texts: Record<string, CuriousQuestionText> }

export const CURIOUS_FILES = { meta: metaFile as unknown as MetaFile, sv: svFile as unknown as TextFile, en: enFile as unknown as TextFile };

/** Fel i frågebanken (tom lista = giltig). Testet order319bNyfiknaFragor.test.ts kör den. */
export function validateCuriousBank(meta: MetaFile, texts: TextFile[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const q of meta.questions) {
    if (ids.has(q.id)) errors.push(`${q.id}: finns två gånger`);
    ids.add(q.id);
    if (!CURIOUS_TRIGGERS.includes(q.trigger)) errors.push(`${q.id}: okänd utlösare ${q.trigger}`);
    if (q.options.length !== CURIOUS.answersPerQuestion) errors.push(`${q.id}: ska ha ${CURIOUS.answersPerQuestion} svar`);
    if (q.options.filter((o) => o.quality === 'right').length !== 1) errors.push(`${q.id}: ska ha exakt ett rätt svar`);
    if (!q.options.some((o) => o.quality === 'wrong')) errors.push(`${q.id}: ska ha minst ett fel svar`);
    for (const t of texts) {
      const x = t.texts[q.id];
      if (!x?.q || !x.why) { errors.push(`${q.id}: saknar text (${t.language})`); continue; }
      for (const o of q.options) if (!x.options[o.id]) errors.push(`${q.id}.${o.id}: saknar text (${t.language})`);
    }
  }
  for (const t of texts) for (const id of Object.keys(t.texts)) if (!ids.has(id)) errors.push(`${id}: text utan fråga (${t.language})`);
  return errors;
}

const ERRORS = validateCuriousBank(CURIOUS_FILES.meta, [CURIOUS_FILES.sv, CURIOUS_FILES.en]);
if (ERRORS.length > 0) throw new Error(`De nyfiknas frågor: ${ERRORS.join('; ')}`);

/** Granskad, eller utan ⚖. */
export function curiousCleared(q: Pick<CuriousQuestionMeta, 'legal'>): boolean {
  return !q.legal || q.legal.legalReviewed;
}

/** Frågorna som kan komma i spelet (⚖ dolda tills de är granskade). */
export const CURIOUS_QUESTIONS: readonly CuriousQuestionMeta[] = CURIOUS_FILES.meta.questions.filter(curiousCleared);

export function curiousQuestion(id: string): CuriousQuestionMeta | undefined {
  return CURIOUS_FILES.meta.questions.find((q) => q.id === id);
}

export function curiousText(id: string): CuriousQuestionText | undefined {
  return (getLanguage() === 'sv' ? CURIOUS_FILES.sv : CURIOUS_FILES.en).texts[id];
}
