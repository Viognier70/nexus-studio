// ORDER 306b.4 (Anders 2026-10-09) — "Jämna ut så att det längsta svaret är fel ungefär så ofta som slumpen ger
// (inom ±0,1)", i vinbarens bank, foodtruckens steg 1–2 och de nyfikna gästernas frågor.
//
// Måttet per steg: andelen fel bland de längsta svaren (lika långa delar på valet) mot andelen fel bland alla
// svar (slumpens väntevärde), i ord eller tecken, på svenska eller engelska. Ordningskorten (vb40) har inga
// svar att läsa och är inte med. Kvaliteten 'wrong' är fel; 'best', 'ok' och de nyfiknas 'right' är inte fel.

import vinbarMeta from '../../content/incidents/vinbar.meta.json';
import vinbarSv from '../../content/incidents/vinbar.text.sv.draft.json';
import vinbarEn from '../../content/incidents/vinbar.text.en.json';
import menuMeta from '../../content/incidents/menu.meta.json';
import menuSv from '../../content/incidents/menu.text.sv.draft.json';
import menuEn from '../../content/incidents/menu.text.en.json';
import crisesMeta from '../../content/incidents/crises.meta.json';
import crisesSv from '../../content/incidents/crises.text.sv.draft.json';
import crisesEn from '../../content/incidents/crises.text.en.json';
import ftBasMeta from '../../content/incidents/foodtruck/bas.meta.json';
import ftBasSv from '../../content/incidents/foodtruck/bas.text.sv.draft.json';
import ftBasEn from '../../content/incidents/foodtruck/bas.text.en.json';
import ft320Meta from '../../content/incidents/foodtruck/situationer320.meta.json';
import ft320Sv from '../../content/incidents/foodtruck/situationer320.text.sv.draft.json';
import ft320En from '../../content/incidents/foodtruck/situationer320.text.en.json';
import { CURIOUS_FILES } from '../../sim/curiousBank';

export type Lang = 'sv' | 'en';
export type LengthUnit = 'words' | 'chars';
export interface AnswerStep { id: string; step: number; options: { id: string; wrong: boolean; label: Record<Lang, string> }[] }

type Meta = { incidents: { id: string; form?: string; steps: { form?: string; options: { id: string; quality: string }[] }[] }[] };
type Texts = { texts: Record<string, { steps: { options: Record<string, { label: string }> }[] }> };

function incidentSteps(meta: unknown, sv: unknown, en: unknown, keep: (form: string | undefined, step: number) => boolean): AnswerStep[] {
  const out: AnswerStep[] = [];
  const t = { sv: sv as Texts, en: en as Texts };
  for (const inc of (meta as Meta).incidents) inc.steps.forEach((st, k) => {
    if (st.form === 'sequence' || !keep(inc.form, k)) return;
    out.push({ id: inc.id, step: k, options: st.options.map((o) => ({ id: o.id, wrong: o.quality === 'wrong', label: { sv: t.sv.texts[inc.id].steps[k].options[o.id].label, en: t.en.texts[inc.id].steps[k].options[o.id].label } })) });
  });
  return out;
}

const all = () => true;
const vinbarOld = () => incidentSteps(vinbarMeta, vinbarSv, vinbarEn, (f) => f !== 'triad');
const vinbarNew = () => incidentSteps(vinbarMeta, vinbarSv, vinbarEn, (f) => f === 'triad');
const menu = () => incidentSteps(menuMeta, menuSv, menuEn, all);
const ft = (keep: (f: string | undefined, k: number) => boolean) => [...incidentSteps(ftBasMeta, ftBasSv, ftBasEn, keep), ...incidentSteps(ft320Meta, ft320Sv, ft320En, keep)];
const lastStep = 2;
const curious = (): AnswerStep[] => CURIOUS_FILES.meta.questions.map((q) => ({
  id: q.id, step: 0, options: q.options.map((o) => ({ id: o.id, wrong: o.quality === 'wrong', label: { sv: CURIOUS_FILES.sv.texts[q.id].options[o.id], en: CURIOUS_FILES.en.texts[q.id].options[o.id] } }))
}));

/** Delarna som ska ligga inom marginalen (checked) och de som bara rapporteras. */
export const LENGTH_PARTS: { name: string; checked: boolean; steps: () => AnswerStep[] }[] = [
  { name: 'vinbaren, gamla formen', checked: true, steps: vinbarOld },
  { name: 'vinbaren, nya formen', checked: true, steps: vinbarNew },
  { name: 'menyn', checked: true, steps: menu },
  { name: 'vinbarens bank (de tre ovan)', checked: true, steps: () => [...vinbarOld(), ...vinbarNew(), ...menu()] },
  { name: 'foodtrucken, steg 1–2', checked: true, steps: () => ft((_, k) => k < lastStep) },
  { name: 'foodtrucken, alla steg', checked: true, steps: () => ft(all) },
  { name: 'de nyfikna', checked: true, steps: curious },
  { name: 'foodtrucken, steg 3', checked: false, steps: () => ft((_, k) => k === lastStep) },
  { name: 'kriserna (utkast, inte i spelet)', checked: false, steps: () => incidentSteps(crisesMeta, crisesSv, crisesEn, all) }
];

const size = (s: string, unit: LengthUnit) => (unit === 'words' ? s.trim().split(/\s+/).length : s.trim().length);

export function longestWrong(steps: AnswerStep[], lang: Lang, unit: LengthUnit) {
  let longest = 0, random = 0;
  for (const st of steps) {
    const max = Math.max(...st.options.map((o) => size(o.label[lang], unit)));
    const tied = st.options.filter((o) => size(o.label[lang], unit) === max);
    longest += tied.filter((o) => o.wrong).length / tied.length;
    random += st.options.filter((o) => o.wrong).length / st.options.length;
  }
  const n = Math.max(1, steps.length);
  return { steps: steps.length, longestWrong: +(longest / n).toFixed(3), randomWrong: +(random / n).toFixed(3), diff: +((longest - random) / n).toFixed(3) };
}
