// staffColour — kanoniska personalfärger per sim-roll.
//
// ORDER 155 — flyttat ut ur `InteriorStaff.tsx` per ORDER 152 §3 så
// rumsfilerna kan importera utan cirkulärt beroende. Detta är den
// enda källan för personalens uniformsfärger; rumsfilerna hade
// tidigare egna `STAFF_UNIFORMS`-tabeller som var Designs förslag och
// aldrig prövades mot silhuettbandet — de tas bort i samma ordning.
//
// Nycklarna är sim-lagrets `StaffRole` (`värd|servitör|kock|lärling`,
// types.ts:10) — det spelaren SER på personalen ska stämma med det
// simuleringen SÄGER personalen är. Rummets stationer heter något
// annat (`host, server, chef` i restaurangen; `barkeep, brewer` i
// ölkrogen; …); mappningen sim-roll → station hör hemma i
// businessRoom-kontraktet (ORDER 152 §2 + kommande ORDER 154), inte i
// färgpaletten.
//
// ── Kalibrering ──────────────────────────────────────────────────
// ORDER 123 §2.2 (SD-004 §3.3 2026-08-29): paletten ljusas från det
// tidigare bandet #2a2f3a–#4a4744, som gav "kroppen blir en skugga
// oavsett hur hjässan löses" mot golvets #a89577. Kontrastförhållandet
// var 4,5–6:1 = ren silhuett utan internt färgdjup. Nya färger ligger
// i bandet [1,8, 3,6]:1 mot golvet, per `silhouetteContrast.ts`, med
// bevarad roll-distinktion ≥ 12 ΔE.
//
// ORDER 127 §3.3 — servitör bytt från #6b6260 till #454a52. Tidigare
// warm-neutral kollapsade mot ölkrogens `floorBrew #7d776c` (kontrast
// 1.33:1 — ORDER 125 §7-fynd). Ny mörkare cool grey ligger i L 0.069,
// klarar bandet [1.8, 3.6]:1 mot alla golvzoner: restaurant #a08462
// = 2.52, ölkrogen dining #a49b8a = 3.24, brew #7d776c = 1.99,
// kitchen #948f84 = 2.76. Parvis ΔE mot övriga roller > 12 bevarad.
//
// Rollerna sprids över FYRA distinkta hue-familjer (djup marinblå,
// varm-neutral, burgundy, kall-grå) så parvis ΔE 76 ≥ 12 uppfylls
// utan att någon uniform hamnar utanför [1,8, 3,6]:1-kontrastbandet.
// Ett tidigare försök med fyra mörka neutraler (#4a5464, #565b64,
// #605852, #6b6660) föll på §4.4: pair-wise ΔE 5,6–11,1 — spelaren
// kunde inte skilja rollerna åt.

import type { StaffRole } from '../types';

export const ROLE_COLOUR: Record<StaffRole, string> = {
  'värd':     '#2f4a68',   // host — deep navy (cool, doorway)
  'servitör': '#454a52',   // server — dark cool grey
  'kock':     '#7a3e3a',   // cook — burgundy (warm, kitchen)
  'lärling':  '#d8d3ce'    // apprentice — light warm-grey (muted, junior)
};

/** De fyra värdena i en platt array — för silhuett-kontrast-checkar
 *  som iterera över alla personalfärger. Ersätter rumsfilernas
 *  `Object.values(STAFF_UNIFORMS)`-mönster. */
export const ROLE_COLOUR_VALUES: string[] = Object.values(ROLE_COLOUR);
