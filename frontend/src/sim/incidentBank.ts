// ORDER 270 — händelsebanken som data (Vision Owner 2026-09-26: "Händelsebanken
// är data, som frågebanken").
//
// Datan ligger i `src/content/incidents/`, en klass per fil och metadata
// skild från spelartext, som frågebanken:
//   <klass>.meta.json            — paviljong, axel, spår, bågens fas, svar
//                                  med kvalitet och utfall, kedjor
//   <klass>.text.sv.draft.json   — rubrik, berättelse, svarens text, vad som
//                                  syns i rummet och förklaringen (lärdomen)
//
// Metadata och spelartext möts bara här, via id. Ingen annan modul läser
// JSON-filerna direkt. Klasser utan bank har inga händelser; deras service
// behåller scenarierna vid dörren tills banken är skriven.

import type { KnowledgeAxis, PavilionKey, YrkesSpar } from '../strategic/types';
import { PAVILION_CONFIGS } from '../strategic/knowledge/pavilions';
import { INCIDENTS, type BusinessClassId, type Weekday } from './balance';
import vinbarMeta from '../content/incidents/vinbar.meta.json';
import vinbarText from '../content/incidents/vinbar.text.sv.draft.json';

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
}

export interface IncidentOutcomeMeta {
  effects: IncidentEffects;
  // 'table' = kvällens bord (sällskapet händelsen gäller), 'room' = alla.
  target: 'table' | 'room';
  room?: { arrive?: number; leave?: number };
  triggers?: string[];
  prevents?: string[];
}

export interface IncidentOptionMeta extends IncidentOutcomeMeta {
  id: string;
  quality: AnswerQuality;
}

export interface IncidentMeta {
  id: string;
  pavilion: PavilionKey;
  axis: KnowledgeAxis;
  track: YrkesSpar | null;
  arc: ArcPhase;
  // Kommer bara som följd av ett val (kedja), aldrig av sig själv.
  chainOnly: boolean;
  weekdays?: Weekday[];
  options: IncidentOptionMeta[];
  // Utfallet när spelaren inte svarar och personalen beslutar själv.
  staff: IncidentOutcomeMeta;
  placeholder: boolean;
}

export interface IncidentOptionText {
  label: string;
  outcome: string;
  explanation: string;
}

export interface IncidentText {
  title: string;
  body: string;
  options: Record<string, IncidentOptionText>;
  staff: { outcome: string };
}

export interface Incident extends IncidentMeta {
  text: IncidentText;
}

interface MetaFile { schemaVersion: number; businessClass: string; incidents: IncidentMeta[] }
interface TextFile { language: string; status: string; texts: Record<string, IncidentText> }

export function validateIncidentBank(meta: MetaFile, text: TextFile): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const m of meta.incidents) {
    if (ids.has(m.id)) errors.push(`${m.id}: dubblett`);
    ids.add(m.id);
    const cfg = PAVILION_CONFIGS[m.pavilion];
    if (!cfg) errors.push(`${m.id}: okänd paviljong ${m.pavilion}`);
    else {
      if (cfg.axis !== 'all' && cfg.axis !== m.axis) errors.push(`${m.id}: axeln ${m.axis} hör inte till ${m.pavilion}`);
      const tracks = cfg.tracks as readonly string[];
      if (m.track !== null && !tracks.includes(m.track)) errors.push(`${m.id}: spåret ${m.track} hör inte till ${m.pavilion}`);
    }
    if (!ARC_PHASES.includes(m.arc)) errors.push(`${m.id}: okänd fas ${m.arc}`);
    if (m.options.length < INCIDENTS.optionsMin || m.options.length > INCIDENTS.optionsMax) {
      errors.push(`${m.id}: ${m.options.length} svar`);
    }
    if (m.options.filter((o) => o.quality === 'best').length !== 1) errors.push(`${m.id}: ett bästa svar krävs`);
    if (!m.options.some((o) => o.quality === 'wrong')) errors.push(`${m.id}: minst ett fel svar krävs`);
    const t = text.texts[m.id];
    if (!t) { errors.push(`${m.id}: saknar text`); continue; }
    for (const o of m.options) if (!t.options[o.id]) errors.push(`${m.id}/${o.id}: saknar text`);
  }
  for (const m of meta.incidents) {
    for (const o of [...m.options, m.staff]) {
      for (const ref of [...(o.triggers ?? []), ...(o.prevents ?? [])]) {
        if (!ids.has(ref)) errors.push(`${m.id}: kedjan pekar på okänd händelse ${ref}`);
      }
    }
  }
  for (const id of Object.keys(text.texts)) if (!ids.has(id)) errors.push(`${id}: text utan metadata`);
  return errors;
}

function build(meta: MetaFile, text: TextFile): Incident[] {
  const errors = validateIncidentBank(meta, text);
  if (errors.length > 0) throw new Error(`Händelsebanken ${meta.businessClass}: ${errors.join('; ')}`);
  return meta.incidents.map((m) => ({ ...m, text: text.texts[m.id] }));
}

const BANKS: Partial<Record<BusinessClassId, Incident[]>> = {
  vinbar: build(vinbarMeta as unknown as MetaFile, vinbarText as unknown as TextFile)
};

export function incidentBankFor(cls: BusinessClassId | null | undefined): Incident[] {
  return (cls && BANKS[cls]) || [];
}

export function incidentById(cls: BusinessClassId | null | undefined, id: string): Incident | undefined {
  return incidentBankFor(cls).find((i) => i.id === id);
}
