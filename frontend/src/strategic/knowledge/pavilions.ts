// ORDER 104 §2.1 — de fem paviljongerna. Namn och profiler avlästa
// ur Miro-tavlan 2026-08-15. Yrkesspår-märkning per ORDER 105.
//
// Datan här är ren och deklarativ. Exam-mekaniken (examMechanic.ts)
// och coverage-verktyget (questionCoverage.ts) läser den; UI-panelen
// när den byggs (egen framtida order) läser samma.

import type { KnowledgeAxis, YrkesSpar } from '../types';

// Paviljong-id:n används både som React-nycklar och som `pavilion`-fält
// på frågor. Snake_case-liknande utan diakritiska tecken för säker
// grep + fil-referens; player-visible namn är svenska med å/ö och
// hanteras separat via M7b-scenen (inte i R2).
export type PavilionId =
  | 'maltidbiblioteket'      // Måltidbiblioteket
  | 'kalastorget'            // Kalastorget
  | 'stensota'               // Stensöta
  | 'metodkoket'             // Metodköket
  | 'gastronomiskateatern';  // Gastronomiska Teatern

// Vilken axel en paviljong tilldelar krediter på. 'all' = alla tre
// (Gastronomiska Teatern), som per §2.2 är den enda vägen till
// `readProfile → 'balanced'` utan att övra manuellt jämnt i tre
// separata paviljonger.
export type PavilionAxis = KnowledgeAxis | 'all';

// Konfiguration per paviljong. `tracks` är listan över spår som
// paviljongen övar; en fråga inuti paviljongen kan bära ett av dem
// (eller vara spårlös = null i BaseQuestion). Två-spårs-paviljonger
// (Stensöta = sommellerie, Metodköket = kok, Gastronomiska Teatern
// = båda) dispatchar ACCUMULATE_KNOWLEDGE per spår när frågan är
// märkt för det spåret. `[]` = spårlöst (Måltidbiblioteket, Kalastorget).
export interface PavilionConfig {
  id: PavilionId;
  displayName: string;    // för dev-panel/log, inte spelar-UI (M7b-scope)
  axis: PavilionAxis;
  tracks: YrkesSpar[];
}

// Källa: Miro-tavlan 2026-08-15 avläst i ORDER 104 §2.1. Ordning
// avspeglar §2.1-tabellen; kan sorteras godtyckligt utan att
// funktion påverkas — inga tester eller kod förlitar sig på ordning.
export const PAVILION_CONFIGS: Record<PavilionId, PavilionConfig> = {
  maltidbiblioteket: {
    id: 'maltidbiblioteket',
    displayName: 'Måltidbiblioteket',
    axis: 'episteme',
    tracks: []   // "alla områden" per §2.1 = spårlöst
  },
  kalastorget: {
    id: 'kalastorget',
    displayName: 'Kalastorget',
    axis: 'phronesis',
    tracks: []   // "alla områden"
  },
  stensota: {
    id: 'stensota',
    displayName: 'Stensöta',
    axis: 'techne',
    // "sommellerie och måltidskreatör" per §2.1. Måltidskreatör läses
    // inte som eget spår (ORDER 105 har bara 2 spår) utan uppstår som
    // 'both'-utfall i readSpar när spelaren övat både Stensöta och
    // Metodköket. Stensöta dispatchar därför bara `track: 'sommellerie'`.
    tracks: ['sommellerie']
  },
  metodkoket: {
    id: 'metodkoket',
    displayName: 'Metodköket',
    axis: 'techne',
    tracks: ['kok']
  },
  gastronomiskateatern: {
    id: 'gastronomiskateatern',
    displayName: 'Gastronomiska Teatern',
    axis: 'all',           // §2.2 — enda paviljongen som matar alla tre axlarna
    tracks: ['sommellerie', 'kok']   // "båda spåren" per §2.1
  }
};

// Lista av alla ids i deklarations-ordning. Används av coverage-
// verktyget och tester som "byggda paviljonger".
export const ALL_PAVILION_IDS: readonly PavilionId[] = [
  'maltidbiblioteket',
  'kalastorget',
  'stensota',
  'metodkoket',
  'gastronomiskateatern'
] as const;
