// ORDER 114 — sex gästarketyper för food truckens skepnad.
//
// Auktoritativ spec: `documentation/content/TOLV_GASTARKETYPER.md`
// (VO-utkast 2026-08-17). Där föreslås tolv arketyper; denna leverans
// bygger de sex enskilda som INTE kräver ändringar i sim-lagret:
//
//   barnet, affärsgästen, efter-skiftet, turisten, stamgästen, nattarbetaren
//
// **Väntar egen order:**
//   * Paret + festsällskapet — kräver Guest.groupId + arrivals-spawn
//     som atom-grupper + kögate-räkning per grupphuvud. Sim-nivå-ändring.
//   * Rullstolsgästen — kräver tillgänglighets-yta i kögeometrin som
//     inte finns idag. Kosmetisk rullstol utan spelvärlds-krav bryter
//     mot utkastets intention.
//   * Tonåringen, kritikern, hundägaren — mätfrågan om sex räcker för
//     olikformig kö beslutas mot bild innan dessa byggs.
//
// **Fantom-referenser i utkastet som INTE följs:**
//   * "Sex toner ur prototypen" — StaffPuck.dc.html:48 har fyra
//     puck-KROPPS-färger, inte hudtoner. Ansiktshuden är fast
//     `#c8b39a`. Sex hudtoner författas här; öppna för korrigering.
//   * "Silhuettprovet Yrkesroller §01" — dokument-avsnittet finns inte.
//     Utkastets slutsats om huvudbonadens vikt bevaras ändå.
//   * "Mönster 13/14/20" — numrering finns inte i prototypen. Vi
//     refererar direkt till funktionsnamnen `idlePose`/`walkPose`.
//   * "Mikro-yaw ±12°" (turisten m.fl.) — SVG-huvudet stödjer inte
//     Y-axel-yaw. Släppt; hela-figur-vändning täcker turistens
//     omkringtittande i en framtida wire (utanför denna order).
//
// Design-principer (från utkastet):
//   * Hudton och arketyp fördelas OBEROENDE — två separata FNV-hashar.
//     Affärsgästen är inte en hudton; nattarbetaren är inte en
//     kroppsbyggnad.
//   * Kroppsbyggnad är DELVIS arketyp-bunden — bara där arketypen
//     kräver det för silhuett-igenkänning (barnet = kort). Övriga
//     får kroppsvariation via separat hash.

// -----------------------------------------------------------------------------
// Arketyp-katalog
// -----------------------------------------------------------------------------

// Interna nyckelnamn (kod-stabila). Spelartext på svenska i `label`.
// De sex nycklarna är grep-verifierbara för DoD 4 — literalen står
// oförvanskad i denna fil.
export type FoodtruckArchetypeId =
  | 'barnet'
  | 'affarsgasten'
  | 'efter_skiftet'
  | 'turisten'
  | 'stamgasten'
  | 'nattarbetaren';

export const FOODTRUCK_ARCHETYPE_IDS: readonly FoodtruckArchetypeId[] = [
  'barnet',
  'affarsgasten',
  'efter_skiftet',
  'turisten',
  'stamgasten',
  'nattarbetaren'
];

// Huvud-topping-nyckel — påverkar SVG-rendering i Figure.tsx:s Head.
// Skiljer arketyp-igenkänning på håll (halva silhuetten per utkastet).
export type HeadTopping =
  | 'ruffled'     // barnet: rufsigt hår, ingen huvudbonad
  | 'shortCut'    // affärsgästen: kortklippt, ingen huvudbonad
  | 'workCap'     // efter-skiftet: keps
  | 'sunHat'      // turisten: solhatt
  | 'grayHair'    // stamgästen: grått hår, ingen huvudbonad
  | 'hoodRaised'; // nattarbetaren: huva uppe

// Prop-nyckel — objekt i handen. Kan vara `null` (efter-skiftet:
// händerna i fickorna; stamgästen: ingen).
export type HandProp =
  | 'iceCream'    // barnet: glass eller pappmugg
  | 'briefcase'   // affärsgästen: portfölj / axelväska
  | 'camera'      // turisten: kamera / karta
  | 'thermos'     // nattarbetaren: termos / mugg
  | null;         // efter-skiftet, stamgästen

// Hållnings-modifikatorer — appliceras på grundposen (idlePose /
// walkPose) via `applyArchetypeMod`. Signaler efter utkastets
// beskrivning per arketyp.
export interface ArchetypePosture {
  // Multiplikator på hipDrop-amplitud (bob). 1.0 = grundvokabulär,
  // ×1.4 = barnet (ojämn), ×0.5 = efter-skiftet (låg), ×0.3 = stamgästen
  // (minst av alla), ×1.5-i-gång/×0.4-i-vila = nattarbetaren.
  bobMult: number;
  bobMultWalking?: number;   // valfri överstyrning under walkPose
  // Grundlutning i grader. Positivt = framåt (efter-skiftet 4°,
  // nattarbetaren 5°). Negativt = bakåt (tonåringen -2°, kritikern -3°).
  leanOffset: number;
  // Tempo-multiplikator — påverkar walkPose:s fas-ökning per sekund.
  // Efter-skiftet 0.85×, övriga 1.0.
  tempoMult: number;
  // Head-tilt i vila (i grader). Positivt = huvudet upp/bakåt
  // (kritikern), negativt = huvudet ner (tonåringen, telefon-blick).
  headTiltRest: number;
}

// Kroppsbyggnad — skala på figuren själv. Barnet 0.72 höjd (kort),
// smal bredd. Övriga vuxna nära 1.0 med små variationer per utkastet.
// **Utkastet: "Kroppsbyggnad ska inte korrelera med arketyp" — men
// utkastet självt kopplar barn=kort och rullstol=sittande. Vi följer
// utkastets faktiska föreskrifter: kropp följer arketyp där silhuett
// kräver, annars neutral (1.0/1.0).**
export interface ArchetypeBody {
  heightMult: number;   // 0.72 = barnet, 1.0 = vuxen normal, 1.05 = kritikern/nattarbetaren (lång)
  widthMult: number;    // 0.85 = smal, 1.0 = normal, 1.15 = efter-skiftet (tung)
}

export interface FoodtruckArchetype {
  id: FoodtruckArchetypeId;
  label: string;               // spelartext / debug (svenska)
  body: ArchetypeBody;
  headTopping: HeadTopping;
  prop: HandProp;
  posture: ArchetypePosture;
}

// De sex definierade. Attributen är författade från
// TOLV_GASTARKETYPER.md §1-7 + §11 (nummer 1, 3, 4, 5, 6, 11 i utkastet).
export const FOODTRUCK_ARCHETYPES: Record<FoodtruckArchetypeId, FoodtruckArchetype> = {
  barnet: {
    id: 'barnet',
    label: 'Barnet',
    body: { heightMult: 0.72, widthMult: 0.85 },
    headTopping: 'ruffled',
    prop: 'iceCream',
    posture: {
      bobMult: 1.4,             // "rör sig ojämnt, stannar och startar"
      leanOffset: 0,
      tempoMult: 1.0,
      headTiltRest: 0
    }
  },
  affarsgasten: {
    id: 'affarsgasten',
    label: 'Affärsgästen',
    body: { heightMult: 1.0, widthMult: 1.0 },
    headTopping: 'shortCut',
    prop: 'briefcase',
    posture: {
      bobMult: 0.7,             // upprätt, minimalt bob
      leanOffset: 0,            // "rakast av alla"
      tempoMult: 1.0,
      headTiltRest: 0
    }
  },
  efter_skiftet: {
    id: 'efter_skiftet',
    label: 'Efter skiftet',
    body: { heightMult: 1.0, widthMult: 1.15 },  // "medellång, tung"
    headTopping: 'workCap',
    prop: null,                                    // händerna i fickorna
    posture: {
      bobMult: 0.5,             // "låg bob"
      leanOffset: 4,            // "lutning 4° framåt"
      tempoMult: 0.85,          // "tempo 0,85×"
      headTiltRest: 2           // huvudet något ner (trött)
    }
  },
  turisten: {
    id: 'turisten',
    label: 'Turisten',
    body: { heightMult: 1.0, widthMult: 1.0 },
    headTopping: 'sunHat',
    prop: 'camera',
    posture: {
      bobMult: 1.15,            // rör sig lite (nyfiket omkringtittande)
      leanOffset: -1,           // huvudet något upp
      tempoMult: 0.95,          // "stannar oftare på väg fram"
      headTiltRest: -2
    }
  },
  stamgasten: {
    id: 'stamgasten',
    label: 'Stamgästen',
    body: { heightMult: 0.98, widthMult: 1.08 },  // "medellång, satt"
    headTopping: 'grayHair',
    prop: null,
    posture: {
      bobMult: 0.3,             // "minst bob av alla"
      leanOffset: 0,
      tempoMult: 1.0,
      headTiltRest: 0
    }
  },
  nattarbetaren: {
    id: 'nattarbetaren',
    label: 'Nattarbetaren',
    body: { heightMult: 1.05, widthMult: 0.9 },   // "lång, smal"
    headTopping: 'hoodRaised',
    prop: 'thermos',
    posture: {
      bobMult: 0.4,             // "lägst i vila"
      bobMultWalking: 1.5,      // "störst bob-amplitud i gång"
      leanOffset: 5,            // "lutning 5° framåt"
      tempoMult: 1.15,          // "rör sig snabbt, står stilla"
      headTiltRest: 3
    }
  }
};

// -----------------------------------------------------------------------------
// Hudtoner — författade, oberoende av arketyp
// -----------------------------------------------------------------------------

// Sex breda neutrala toner. Fördelas via separat FNV-hash från arketyp
// så en arketyp inte får en typologisk hudton-bindning. Rekommenderas
// för VO-korrigering — dessa värden är inte kalibrerade mot något
// externt underlag (StaffPuck.dc.html:16 har `#c8b39a` som enda fasta
// ansiktshud, ingen tabell av toner finns i prototypen).
export const SKIN_TONES: readonly string[] = [
  '#f0d6b8',  // 0 — ljusaste, varm beige
  '#e0be99',  // 1 — mellanljus
  '#c9a37b',  // 2 — mellanmörk beige
  '#a67c5c',  // 3 — brun mellanton
  '#7d5a3f',  // 4 — mörk brun
  '#5a3d29'   // 5 — mörkaste, djup brun
];

// -----------------------------------------------------------------------------
// Deterministisk tilldelning per gäst-id
// -----------------------------------------------------------------------------

// FNV-1a hash på strängen. Samma familj som `variantForId` i rig.ts —
// men separata seeds så arketyp och hudton inte korrelerar.
function fnv1a(id: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Två olika seeds så en gäst som råkar hasha till index 3 för arketyp
// inte hashar till index 3 för hudton också.
const HASH_SEED_ARCHETYPE = 2166136261;
const HASH_SEED_SKIN = 3735928559; // 0xDEADBEEF

// Tid-på-dygnet-viktning per utkastets fördelnings-tabell.
// Lunch: affärsgästen, efter-skiftet, turisten vanligare.
// Eftermiddag: barnet (paret/hundägaren senare order).
// Kväll: nattarbetaren (festsällskapet/tonåringen senare order).
// Stamgästen sällsynt i alla lägen.
// Kritikern är inte med i denna leverans.
//
// Viktvektorer per period. Summeras och index-plockas via hash-mod-sum.
// Detta ersätter enkel `hash % 6` med en viktad fördelning.
type PeriodKey = 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening' | 'breakfast';

const ARCHETYPE_WEIGHTS_BY_PERIOD: Record<PeriodKey, Record<FoodtruckArchetypeId, number>> = {
  morning: {
    barnet: 2, affarsgasten: 3, efter_skiftet: 2, turisten: 2, stamgasten: 1, nattarbetaren: 1
  },
  lunch: {
    barnet: 2, affarsgasten: 5, efter_skiftet: 4, turisten: 4, stamgasten: 1, nattarbetaren: 1
  },
  afternoon: {
    barnet: 5, affarsgasten: 2, efter_skiftet: 2, turisten: 3, stamgasten: 1, nattarbetaren: 2
  },
  dinner: {
    barnet: 2, affarsgasten: 2, efter_skiftet: 3, turisten: 3, stamgasten: 1, nattarbetaren: 4
  },
  evening: {
    barnet: 1, affarsgasten: 1, efter_skiftet: 2, turisten: 2, stamgasten: 1, nattarbetaren: 6
  },
  breakfast: {
    barnet: 2, affarsgasten: 3, efter_skiftet: 3, turisten: 2, stamgasten: 1, nattarbetaren: 1
  }
};

// Deterministisk arketyp-tilldelning. Samma guest.id + samma period ger
// alltid samma arketyp — viktigt för fixed-seed-harnessen och för att
// samma gäst inte byter identitet mellan render-cykler.
//
// Period kan sakna vikt (t.ex. exotiska period-nycklar); fall tillbaka
// till 'lunch'-vikterna som säker default.
export function assignArchetype(
  guestId: string,
  period: string | null | undefined = null
): FoodtruckArchetypeId {
  const periodKey: PeriodKey = (
    period === 'morning' || period === 'lunch' || period === 'afternoon' ||
    period === 'dinner' || period === 'evening' || period === 'breakfast'
  ) ? period : 'lunch';
  const weights = ARCHETYPE_WEIGHTS_BY_PERIOD[periodKey];
  const total = FOODTRUCK_ARCHETYPE_IDS.reduce((s, id) => s + weights[id], 0);
  const pick = fnv1a(guestId, HASH_SEED_ARCHETYPE) % total;
  let cum = 0;
  for (const id of FOODTRUCK_ARCHETYPE_IDS) {
    cum += weights[id];
    if (pick < cum) return id;
  }
  return FOODTRUCK_ARCHETYPE_IDS[0];  // ska inte nås; defensivt
}

// Deterministisk hudton via SEPARAT hash-seed så arketyp och hudton
// inte får korrelation. Utkastet: "Fördela oberoende, annars byggs
// en typologi ingen bad om."
export function assignSkinTone(guestId: string): string {
  return SKIN_TONES[fnv1a(guestId, HASH_SEED_SKIN) % SKIN_TONES.length];
}

// -----------------------------------------------------------------------------
// Pose-modifikator per arketyp
// -----------------------------------------------------------------------------

import type { Pose } from './rig';

// Applicera arketyp-postur på grundpose. Skalar bob (hipDrop) med
// per-arketyp-multiplikator, adderar lean-offset, adderar head-tilt.
// isWalking gör att nattarbetaren växlar bobMult (låg i vila, hög i gång).
export function applyArchetypeMod(basePose: Pose, archetype: FoodtruckArchetype, isWalking = false): Pose {
  const { posture } = archetype;
  const bobMult = isWalking && posture.bobMultWalking !== undefined
    ? posture.bobMultWalking
    : posture.bobMult;
  return {
    ...basePose,
    hipDrop: basePose.hipDrop * bobMult,
    lean: basePose.lean + posture.leanOffset,
    head: basePose.head + posture.headTiltRest
  };
}
