// ORDER 270 — händelsebanken som data (Vision Owner 2026-09-26: "Händelsebanken
// är data, som frågebanken").
//
// Datan ligger i `src/content/incidents/`, en klass per fil och metadata
// skild från spelartext, som frågebanken:
//   <klass>.meta.json            — spår, bågens fas, raketens tre steg med
//                                  svarens kvalitet, konsekvenser och kedjor
//   <klass>.text.sv.draft.json   — rubrik, berättelse, stegens frågor, svarens
//                                  text, vad som syns i rummet och förklaringen
//                                  (lärdomen)
//
// Metadata och spelartext möts bara här, via id. Ingen annan modul läser
// JSON-filerna direkt. Klasser utan bank har inga händelser; deras service
// behåller scenarierna vid dörren tills banken är skriven.

import type { KnowledgeAxis, PavilionKey, YrkesSpar } from '../strategic/types';
import { INCIDENTS, type BusinessClassId, type Weekday } from './balance';
import vinbarMeta from '../content/incidents/vinbar.meta.json';
// ORDER 273 — spelet läser den engelska texten; den svenska sparas.
import vinbarText from '../content/incidents/vinbar.text.en.json';
// ORDER 279 — raketer om kvällens meny och dryckeslista (engelska i spelet,
// svenska sparas bredvid).
import menuMeta from '../content/incidents/menu.meta.json';
import menuText from '../content/incidents/menu.text.en.json';
// ORDER 283 — kriskorten ur Vision Owners tidigare spel (Sommelier
// Championship) som raketutkast, inte i spelet förrän de är granskade.
import crisesMeta from '../content/incidents/crises.meta.json';
import crisesText from '../content/incidents/crises.text.en.json';

export type ArcPhase = 'opening' | 'rush' | 'crisis' | 'closing';
export const ARC_PHASES: readonly ArcPhase[] = ['opening', 'rush', 'crisis', 'closing'];
export type AnswerQuality = 'best' | 'ok' | 'wrong';

// Effekterna. cash i enheter (SCENARIO_CASH, en andel av klassens normala
// veckointäkt), satisfaction och stamina som förändring på 0–1,
// reputation i poäng på ryktets skala.
export interface IncidentEffects {
  cash: number;
  satisfaction: number;
  stamina: number;
  reputation: number;
  // Krediter på händelsens axel (utöver bästa svarets och personalens).
  credit?: number;
}

// ORDER 270 (provspel 2026-09-27) — kvällens läge. Klockslag i speltid
// ("HH:MM", servicen är 18–23), gäster i kön och gäster vid borden.
export interface IncidentCondition {
  from?: string;
  to?: string;
  minWaiting?: number;
  maxWaiting?: number;
  minSeated?: number;
  maxSeated?: number;
}

// ORDER 270 — ett fel val låser: följden pågår synligt i rummet tills
// nästa händelse. Per spelminut (en simulerad minut) på nöjdhet och ork,
// och personalens tempo (1 = som vanligt, 1,3 = uppgifterna tar 30 % längre).
export interface IncidentOngoingMeta {
  satisfactionPerMinute: number;
  staminaPerMinute: number;
  tempoFactor: number;
  target: 'table' | 'room';
}

// ORDER 270 — referens bakom frågan eller händelsen (titel och länk).
// Tom tills Vision Owner levererar referenserna.
export interface Reference {
  title: string;
  // ORDER 283 — null tills Vision Owner levererar länken (inga länkar
  // hittas på); titeln visas då utan länk.
  url: string | null;
}

export interface IncidentOutcomeMeta {
  effects: IncidentEffects;
  // 'table' = kvällens bord (sällskapet händelsen gäller), 'room' = alla.
  target: 'table' | 'room';
  room?: { arrive?: number; leave?: number };
  triggers?: string[];
  prevents?: string[];
  ongoing?: IncidentOngoingMeta;
}

// Ett svar i ett visst läge: kvaliteten byts.
export interface IncidentSituationalOption {
  quality: AnswerQuality;
}

// ORDER 270 (Vision Owner 2026-09-27) — ett svar i ett steg. `fail`
// ersätter stegets konsekvens när just det felet har en egen följd (kedjor).
export interface StepOptionMeta {
  id: string;
  quality: AnswerQuality;
  // Läge → annan kvalitet (händelsens `situations`).
  in?: Record<string, IncidentSituationalOption>;
  fail?: IncidentOutcomeMeta;
}

export interface StepMeta {
  axis: KnowledgeAxis;
  options: StepOptionMeta[];
  // Stegets konsekvens när svaret är fel eller uteblir.
  fail: IncidentOutcomeMeta;
}

// ORDER 270 (Vision Owner 2026-09-27) — varje händelse är en raket med tre
// frågor i samma sammanhang: episteme (vad), techne (hur), phronesis (när
// och varför). Nästa steg nås bara genom att klara det förra. Techne-
// stegets paviljong följer spåret: kök → Metodköket, sommellerie → Stensöta.
export interface IncidentMeta {
  id: string;
  track: YrkesSpar;
  arc: ArcPhase;
  // Kommer bara som följd av ett val (kedja), aldrig av sig själv.
  chainOnly: boolean;
  weekdays?: Weekday[];
  // Kommer bara när kvällens läge stämmer.
  when?: IncidentCondition;
  // Lägen där rätt svar är ett annat; det första som stämmer gäller.
  situations?: { id: string; when: IncidentCondition }[];
  // Händelsen gäller ett bord och kommer bara när en gäst sitter där.
  needsTable: boolean;
  reference: Reference | null;
  steps: StepMeta[];
  // ORDER 279 — raketen gäller kvällens meny: den kan komma när minst en
  // av de här rätterna eller dryckerna står på menyn eller dryckeslistan.
  requiresOnMenu?: string[];
  // Hela raketen klarad: bästa utfall.
  success: IncidentOutcomeMeta;
  // Personalen tar över resten efter ett fel (skalat efter stegen som
  // återstod, `INCIDENTS.staffShareByFailedStep`).
  staff: IncidentOutcomeMeta;
  placeholder: boolean;
}

export interface OutcomeText {
  outcome: string;
  // Följden som pågår i rummet (IncidentOngoingMeta).
  ongoing?: string;
}

export interface StepOptionText {
  label: string;
  explanation: string;
  // Förklaringen i ett visst läge.
  explanationIn?: Record<string, string>;
  fail?: OutcomeText;
}

export interface StepText {
  question: string;
  options: Record<string, StepOptionText>;
  fail: OutcomeText;
}

export interface IncidentText {
  title: string;
  body: string;
  steps: StepText[];
  success: { outcome: string };
  staff: OutcomeText;
  // Läget i ord, efter berättelsen.
  situations?: Record<string, string>;
}

// Ett steg med sin paviljong och sin text.
export interface IncidentStep extends StepMeta {
  pavilion: PavilionKey;
  track: YrkesSpar | null;
  text: StepText;
}

export interface Incident extends Omit<IncidentMeta, 'steps'> {
  steps: IncidentStep[];
  text: IncidentText;
}

interface MetaFile { schemaVersion: number; businessClass: string; incidents: IncidentMeta[] }
interface TextFile { language: string; status: string; texts: Record<string, IncidentText> }

// Stegets paviljong: episteme → Måltidsbiblioteket, techne → spårets
// paviljong, phronesis → Kalastorget.
export function stepPavilion(axis: KnowledgeAxis, track: YrkesSpar): PavilionKey {
  if (axis === 'episteme') return 'maltidbiblioteket';
  if (axis === 'phronesis') return 'kalastorget';
  return track === 'kok' ? 'metodkoket' : 'stensota';
}

function outcomeErrors(where: string, o: IncidentOutcomeMeta, t: OutcomeText | undefined, refs: string[]): string[] {
  const errors: string[] = [];
  if (!t?.outcome) errors.push(`${where}: saknar text`);
  if (o.ongoing && !t?.ongoing) errors.push(`${where}: följden saknar text`);
  refs.push(...(o.triggers ?? []), ...(o.prevents ?? []));
  return errors;
}

export function validateIncidentBank(meta: MetaFile, text: TextFile): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const refs: { from: string; to: string[] }[] = [];
  for (const m of meta.incidents) {
    if (ids.has(m.id)) errors.push(`${m.id}: dubblett`);
    ids.add(m.id);
    if (m.track !== 'kok' && m.track !== 'sommellerie') errors.push(`${m.id}: okänt spår ${m.track}`);
    if (!ARC_PHASES.includes(m.arc)) errors.push(`${m.id}: okänd fas ${m.arc}`);
    const axes = m.steps.map((s) => s.axis).join(',');
    if (axes !== INCIDENTS.stepAxes.join(',')) errors.push(`${m.id}: stegen ska vara ${INCIDENTS.stepAxes.join(', ')}`);
    const t = text.texts[m.id];
    if (!t) { errors.push(`${m.id}: saknar text`); continue; }
    for (const x of m.situations ?? []) if (!t.situations?.[x.id]) errors.push(`${m.id}: läget ${x.id} saknar text`);
    const out: string[] = [];
    m.steps.forEach((step, i) => {
      const where = `${m.id}/steg ${i + 1}`;
      const st = t.steps?.[i];
      if (!st) { errors.push(`${where}: saknar text`); return; }
      if (!st.question) errors.push(`${where}: saknar fråga`);
      if (step.options.length < INCIDENTS.optionsMin || step.options.length > INCIDENTS.optionsMax) {
        errors.push(`${where}: ${step.options.length} svar`);
      }
      for (const sit of [null, ...(m.situations ?? []).map((x) => x.id)]) {
        const qs = step.options.map((o) => optionQuality(o, sit));
        const w = sit ? ` (läget ${sit})` : '';
        if (qs.filter((q) => q === 'best').length !== 1) errors.push(`${where}${w}: ett bästa svar krävs`);
        if (!qs.includes('wrong')) errors.push(`${where}${w}: minst ett fel svar krävs`);
      }
      errors.push(...outcomeErrors(`${where}/fel`, step.fail, st.fail, out));
      for (const o of step.options) {
        for (const sit of Object.keys(o.in ?? {})) {
          if (!(m.situations ?? []).some((x) => x.id === sit)) errors.push(`${where}/${o.id}: okänt läge ${sit}`);
        }
        const ot = st.options[o.id];
        if (!ot?.label || !ot.explanation) { errors.push(`${where}/${o.id}: saknar text`); continue; }
        if (o.fail) errors.push(...outcomeErrors(`${where}/${o.id}/fel`, o.fail, ot.fail, out));
      }
    });
    errors.push(...outcomeErrors(`${m.id}/klarad`, m.success, t.success, out));
    errors.push(...outcomeErrors(`${m.id}/personalen`, m.staff, t.staff, out));
    refs.push({ from: m.id, to: out });
    if (m.reference !== null && (!m.reference.title || m.reference.url === '')) errors.push(`${m.id}: referensen saknar titel, eller länken är tom (null när den saknas)`);
  }
  for (const r of refs) for (const to of r.to) if (!ids.has(to)) errors.push(`${r.from}: kedjan pekar på okänd händelse ${to}`);
  for (const id of Object.keys(text.texts)) if (!ids.has(id)) errors.push(`${id}: text utan metadata`);
  return errors;
}

// Svarets kvalitet i kvällens läge.
export function optionQuality(o: StepOptionMeta, situation: string | null): AnswerQuality {
  return (situation && o.in?.[situation]?.quality) || o.quality;
}

function build(meta: MetaFile, text: TextFile): Incident[] {
  const errors = validateIncidentBank(meta, text);
  if (errors.length > 0) throw new Error(`Händelsebanken ${meta.businessClass}: ${errors.join('; ')}`);
  return meta.incidents.map((m) => {
    const t = text.texts[m.id];
    const steps = m.steps.map((s, i): IncidentStep => ({
      ...s,
      pavilion: stepPavilion(s.axis, m.track),
      track: s.axis === 'techne' ? m.track : null,
      text: t.steps[i]
    }));
    return { ...m, steps, text: t };
  });
}

const BANKS: Partial<Record<BusinessClassId, Incident[]>> = {
  vinbar: [
    ...build(vinbarMeta as unknown as MetaFile, vinbarText as unknown as TextFile),
    ...build(menuMeta as unknown as MetaFile, menuText as unknown as TextFile)
  ]
};

// ORDER 283 — utkasten: validerade och byggda som banken, men inte med i
// någon klass bank. En raket blir spelbar när den flyttas till klassens
// bankfil utan status 'utkast'.
export const CRISIS_DRAFTS: Incident[] = build(crisesMeta as unknown as MetaFile, crisesText as unknown as TextFile);
export const CRISIS_DRAFT_FILES = { meta: crisesMeta as unknown as MetaFile, text: crisesText as unknown as TextFile };

export function incidentBankFor(cls: BusinessClassId | null | undefined): Incident[] {
  return (cls && BANKS[cls]) || [];
}

export function incidentById(cls: BusinessClassId | null | undefined, id: string): Incident | undefined {
  return incidentBankFor(cls).find((i) => i.id === id);
}

// ORDER 279 — kan raketen komma med kvällens meny? Raketer utan krav kan
// alltid komma.
export function fitsMenu(incident: Pick<IncidentMeta, 'requiresOnMenu'>, menuDishIds: readonly string[]): boolean {
  return !incident.requiresOnMenu || incident.requiresOnMenu.some((id) => menuDishIds.includes(id));
}
