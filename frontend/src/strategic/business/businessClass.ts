// ORDER 110 — R4: Verksamhetsklassen som begrepp.
//
// Tre klasser realiserar bankmötets tilldelning (M7b, ORDER 109).
// Restaurangen är omdöme och rum; food trucken är hantverk och tempo;
// Värdshuset är att bära hela måltiden inklusive att gästen sover över.
// `noLoan` / `nearEpisteme` från bankmötet ger ingen verksamhet — spelaren
// stannar i sin nuvarande (default 'kvarterskrogen' vid start).
//
// **Scope-not** (§7 avgränsning + §5 "omfattningen får hållas nere"):
// den här filen definierar strukturen och de flaggor som simulationen
// läser för att branch:a per verksamhet. Full realisering av foodtruck-
// scen/kö/väder och värdshusets dygns-mekanik är fortsatt arbete —
// den strukturella grunden här låser upp den, i den ordning som §7 DoD
// 7 (load-remeasurement per verksamhet) kräver för att kunna mätas.
//
// **Namn-konvention:** interna nycklar (`restaurant`, `foodtruck`,
// `värdshus`) är stabila för kod. Spelartext läses via
// `strings.sv.ts:business.classNames`; `'balanced'` från bankmötets
// KnowledgeClass mappas till `'gästgiveriet'` här och läcker aldrig till
// spelaren (grep-testet i ORDER 109 §5 DoD 6 fångar det).

import type { BankMeetingKlass, SimulationState } from '../types';
import { TOTAL_SEATS } from './interiorLayout';

export type BusinessClass = 'kvarterskrogen' | 'foodtrucken' | 'gästgiveriet' | 'ölkrogen' | 'vinbaren';

// Flaggor som reducern och kringliggande system läser för att branch:a
// per verksamhet. Additiva — nya flaggor kan läggas till utan att existerande
// verksamheter måste ändras.
export interface BusinessClassConfig {
  id: BusinessClass;
  // Sittande gäster. Restaurangen + Värdshuset har matsal; food trucken
  // saknar den. Guests i en verksamhet med `hasSeats: false` når aldrig
  // guest.state === 'seated' (guard i service.ts).
  hasSeats: boolean;
  // Mise en place-fönstret som skickas i sitt eget prep-fas. Food trucken
  // öppnar direkt (ingen mise en place som spelmekanik); restaurangen
  // och Värdshuset har den.
  hasMiseEnPlace: boolean;
  // Gäst kan stanna över natten. Värdshusets särdrag — dygnsbågen som
  // sträcker sig över middag → övernattning → frukost. Restaurangen och
  // food trucken har korta bågar (en kväll respektive en order).
  hasOvernight: boolean;
  // Kapacitet vid en given bemanning. `staffCount` = state.policies.staffCount
  // (2/3/4). Formuleringen är enkel och konstant per verksamhet — kalibrering
  // hör till R3 §§4–7 kreditekonomi + svårighetskurva; här är strukturen.
  //
  // - Restaurangen: TOTAL_SEATS (16, det befintliga golvet). Bemanning
  //   påverkar inte antalet stolar; den påverkar hur många av dem som
  //   kan tas hand om samtidigt — men det är load-fördelningen, inte
  //   kapacitet.
  // - Food trucken: 3 × staffCount = kö-golv. Två i luckan hanterar ~6
  //   köande på ett rimligt sätt; en operatör försvinner i tempot.
  // - Värdshuset: TOTAL_SEATS + 6 rum. Rummen är strukturellt tillägget
  //   som gör verksamheten en dygns-plats. Bemanning påverkar inte
  //   antalet rum lika lite som antalet stolar.
  capacityFor: (staffCount: number) => number;
}

// Konfigurationskatalogen. Ändringar här ska följas av tester i
// __tests__/businessClass.test.ts (rimlighetsassertions) + registerpost
// om §-flaggorna ändras.
export const BUSINESS_CLASS_CONFIG: Record<BusinessClass, BusinessClassConfig> = {
  kvarterskrogen: {
    id: 'kvarterskrogen',
    hasSeats: true,
    hasMiseEnPlace: true,
    hasOvernight: false,
    capacityFor: () => TOTAL_SEATS
  },
  foodtrucken: {
    id: 'foodtrucken',
    hasSeats: false,
    hasMiseEnPlace: false,
    hasOvernight: false,
    capacityFor: (staffCount) => Math.max(3, staffCount * 3)
  },
  gästgiveriet: {
    id: 'gästgiveriet',
    hasSeats: true,
    hasMiseEnPlace: true,
    hasOvernight: true,
    capacityFor: () => TOTAL_SEATS + 6
  },
  // ORDER 125 §3 — ölkrogen. Ny verksamhetsklass som rum (brewpub med
  // bryggeri i samma lokal). Beter sig som restaurangen per ordertext §4
  // (`hasSeats: true`, `hasMiseEnPlace: true`, ingen övernattning).
  // Kapaciteten är fast 20 (åtta barstolar + åtta långbords + fyra tvåor)
  // per handoff/brewpubRoom.ts `TOTAL_SEATS = 20`. Bemanning påverkar inte
  // antalet stolar; ståplatser (`STANDING_SPOTS = 8` i handoff) räknas
  // inte i kapaciteten per Design-flagga `standing`.
  ölkrogen: {
    id: 'ölkrogen',
    hasSeats: true,
    hasMiseEnPlace: true,
    hasOvernight: false,
    capacityFor: () => 20
  },
  // ORDER 166 — vinbaren som klass-nyckel så COMPETITORS kan bära
  // `businessClass: 'vinbaren'` i data-listan. Ingen scen är monterad
  // för klassen än (WineBarScene är egen order per ORDER 165), och
  // ingen kod branch:ar på klassen — inget körs som konsekvens av
  // att spelaren skulle stå i vinbaren. Konfig-shape följer ölkrogen
  // (samma 20-kuvert-klass per handoff/wineBarRoom.ts TOTAL_SEATS).
  vinbaren: {
    id: 'vinbaren',
    hasSeats: true,
    hasMiseEnPlace: true,
    hasOvernight: false,
    capacityFor: () => 20
  }
};

// Mappning från bankmötets utfall till verksamhet. `noLoan` och
// `nearEpisteme` ger ingen verksamhet — spelaren stannar där hen är.
// Motivering per ORDER 110 §2: `balanced` → Värdshuset (bär hela måltiden),
// `phronesis` → restaurang (omdöme + rum), `techne` → food truck (hantverk
// + tempo).
export function businessFromBankKlass(klass: BankMeetingKlass): BusinessClass | null {
  switch (klass) {
    case 'kvarterskrogen':
      return 'kvarterskrogen';
    case 'foodtrucken':
      return 'foodtrucken';
    case 'balanced':
      return 'gästgiveriet';
    case 'nearEpisteme':
    case 'noLoan':
      return null;
  }
}

// Publik hjälpare för anropande kod (reducern) — läser konfig-tabellen
// och beräknar kapacitet. Håller reducern fri från import av catalog:en.
export function capacityForBusiness(business: BusinessClass, staffCount: number): number {
  return BUSINESS_CLASS_CONFIG[business].capacityFor(staffCount);
}

// Publik hjälpare — läser flagg-fältet `hasSeats`. Används av service.ts
// för att short-circuit:a 'seated'-transitionen när verksamheten inte har
// matsal (food truck). Utpekat som separat helper så anropssidan inte
// behöver importera hela config-tabellen.
export function businessHasSeats(business: BusinessClass): boolean {
  return BUSINESS_CLASS_CONFIG[business].hasSeats;
}

// ORDER 111 §3 + DoD 4 — helper-getters för hasMiseEnPlace och
// hasOvernight. Följer samma mönster som businessHasSeats: en helper
// per flagga håller anropssidorna oberoende av config-tabellens form.
// Grep över src/ visar att båda flaggorna nu har konsumenter i sim
// (reducer.ts:openService läser hasMiseEnPlace; day-rollover +
// stayingOvernight-vägen läser hasOvernight) — inte längre död metadata.
export function businessHasMiseEnPlace(business: BusinessClass): boolean {
  return BUSINESS_CLASS_CONFIG[business].hasMiseEnPlace;
}

export function businessHasOvernight(business: BusinessClass): boolean {
  return BUSINESS_CLASS_CONFIG[business].hasOvernight;
}

// ORDER 113 fel 1 uppföljning — per-verksamhet räknare för "hur många
// fler gäster får plats?". Ersätter tidigare implicita antagande att
// `layout.seats.length - seatedIds.length` gäller alla verksamheter.
//
// Restaurant/Värdshus: fysiska stolar minus sittande.
//   `capacity - seatedIds.length`
//
// Food truck: kön ÄR verksamheten (SD-003 §3). "Fri plats" betyder
// "kön är inte full än", inte "stol ledig". Foodtruck har `hasSeats
// === false`, ingen matsal, ingen `seatedIds` att räkna.
//   `capacity - waitingIds.length`
//
// Alla returer är klämpade ≥ 0 så anropssidan slipper värja mot
// negativa värden när waiting/seated råkar överstiga capacity (kan
// hända om capacity sänks mid-service via policy-ändring).
export function seatsFree(state: SimulationState): number {
  const cap = state.policies.capacity;
  if (!businessHasSeats(state.businessClass)) {
    // Foodtruck-kön: hur många fler platser i kön finns kvar
    return Math.max(0, cap - state.waitingIds.length);
  }
  return Math.max(0, cap - state.seatedIds.length);
}
