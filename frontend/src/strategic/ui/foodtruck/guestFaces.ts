// ORDER 114 §3.2 — tio gäst-ansiktsuttryck + MIMIK-tabell + derivering.
//
// Auktoritativ spec: `documentation/content/TOLV_GASTARKETYPER.md` +
// ordertext ORDER 114 §3.2 (uppräkningen av tio uttryck).
//
// **Ordertexten §7 säger "deriveFaces utökas inte från tio till tjugo".**
// Vi respekterar detta genom att lägga uttrycken HÄR, inte i
// `RoomCardPanel/deriveFaces.ts`. deriveFaces.ts har 10 STAFF-uttryck
// (`neutral`, `focused`, `smiling`, ...) och rörs inte. Foodtruck-
// vokabulären är parallell och egen.
//
// **Kopierad geometri från StaffFace.dc.html** — face-parametrar
// (browTopL/R, browRotL/R, eyeTopL/R, eyeHL/R, mouth, mouthW, mouthRot,
// drop, badge). Prototypens FACES-tabell har staff-uttryck; VÄRDENA
// nedan är författade för gäst-vokabulären enligt utkastet.

// -----------------------------------------------------------------------------
// FaceKey — de tio gäst-uttrycken (interna nycklar; svensk etikett i
// MIMIK-tabellen nedan)
// -----------------------------------------------------------------------------

export type GuestFaceKey =
  | 'forvantansfull'   // pre-arrival, first-in-queue, ordering
  | 'nojd'             // successful pickup, leaving happy
  | 'otalig'           // long wait
  | 'besviken'         // declined, leaving unhappy
  | 'imponerad'        // stamgästen at ordering, high satisfaction
  | 'nyfiken'          // arriving, turisten default
  | 'uttrakad'         // medium wait
  | 'tacksam'          // paying, stamgästen at leaving
  | 'skeptisk'         // affärsgästen at long wait
  | 'generad';         // pay-transition friction (currently unused)

export const ALL_GUEST_FACE_KEYS: readonly GuestFaceKey[] = [
  'forvantansfull', 'nojd', 'otalig', 'besviken',
  'imponerad', 'nyfiken', 'uttrakad', 'tacksam',
  'skeptisk', 'generad'
];

// -----------------------------------------------------------------------------
// Face-parametrar — samma struktur som StaffFace.dc.html:36-47
// -----------------------------------------------------------------------------

export type MouthKind = 'line' | 'smile' | 'frown' | 'box' | 'o';

export interface FaceParams {
  browTopL: number;   // vänster ögonbryns y-position (px)
  browTopR: number;
  browRotL: number;   // vänster ögonbryns rotation i grader
  browRotR: number;
  eyeTopL: number;    // ögonlockets y-position
  eyeTopR: number;
  eyeHL: number;      // ögonhöjd (större = vidöppen, mindre = trött)
  eyeHR: number;
  mouth: MouthKind;
  mouthW: number;
  mouthRot: number;   // munens lutning i grader (positiv = ledsen, negativ = glad)
  drop?: boolean;     // svettdroppe (stressad)
  badge?: boolean;    // stolt-markör
}

// Författade parametrar per gäst-uttryck. Värdena är valda för
// läsbarhet vid figur-scale 1.0 (~140 px bred figur) och kalibrerade
// mot varandra så förvantansfull tydligt skiljer sig från uttrakad
// osv. Bör iterativt kalibreras mot bild.
// **Kalibrerat 2026-08-17 (rev 4)** — VO-fynd: fyra positiva uttryck
// använde alla `smile` med bara marginell mouthW-variation → såg
// identiska ut vid CSS-scale. Nu större spread över alla parametrar:
//   * mouthW variation 22-46 (nästan 2× spread bland smile-varianter)
//   * mouthRot lägger asymmetrisk lutning för imponerad + skeptisk
//   * ögon-höjd (eyeH) varieras 6-18 för att skilja "öppen förvåning"
//     från "trött uttrakad" från "vidöppen imponerad"
//   * ögonbryn-position + rotation för olika "affekt" i pannan
export const GUEST_FACES: Record<GuestFaceKey, FaceParams> = {
  forvantansfull: {
    // subtilt hopp — små ögonbryn upp, smalt leende, ögon halvöppna
    browTopL: 28, browTopR: 28, browRotL: -8, browRotR: 8,
    eyeTopL: 50, eyeTopR: 50, eyeHL: 12, eyeHR: 12,
    mouth: 'smile', mouthW: 28, mouthRot: 0
  },
  nojd: {
    // bred glädje — brett leende, ögon halvslutna av leendets tryck
    browTopL: 34, browTopR: 34, browRotL: -4, browRotR: 4,
    eyeTopL: 54, eyeTopR: 54, eyeHL: 8, eyeHR: 8,
    mouth: 'smile', mouthW: 46, mouthRot: 0
  },
  otalig: {
    // rynkiga ögonbryn ner-inåt, sneda ögon, hopdragen mun med
    // uppåt-vänster lutning (typ "skit också")
    browTopL: 40, browTopR: 40, browRotL: 18, browRotR: -18,
    eyeTopL: 58, eyeTopR: 58, eyeHL: 9, eyeHR: 9,
    mouth: 'line', mouthW: 42, mouthRot: 6
  },
  besviken: {
    // rakt-ner-mun, ögonbryn ovan-utåt, ögon halvslutna
    browTopL: 32, browTopR: 32, browRotL: -12, browRotR: 12,
    eyeTopL: 56, eyeTopR: 56, eyeHL: 7, eyeHR: 7,
    mouth: 'frown', mouthW: 36, mouthRot: 0
  },
  imponerad: {
    // "oh!" — höga ögonbryn, VIDÖPPNA ögon, litet smile med asymmetri
    browTopL: 22, browTopR: 22, browRotL: -2, browRotR: 2,
    eyeTopL: 46, eyeTopR: 46, eyeHL: 18, eyeHR: 18,
    mouth: 'smile', mouthW: 30, mouthRot: -3
  },
  nyfiken: {
    // asymmetrisk — ett ögonbryn högre än det andra, lite skev mun
    browTopL: 24, browTopR: 34, browRotL: -14, browRotR: 6,
    eyeTopL: 48, eyeTopR: 52, eyeHL: 15, eyeHR: 11,
    mouth: 'line', mouthW: 24, mouthRot: 0
  },
  uttrakad: {
    // släta ögonbryn, VÄLDIGT slutna ögon (halvsov), rak mun
    browTopL: 38, browTopR: 38, browRotL: 0, browRotR: 0,
    eyeTopL: 60, eyeTopR: 60, eyeHL: 4, eyeHR: 4,
    mouth: 'line', mouthW: 32, mouthRot: 0
  },
  tacksam: {
    // varmt leende, mjuka ögonbryn, avslappnade ögon (motsats till
    // nojd:s bredare, tacksam är mer "innerlig")
    browTopL: 30, browTopR: 30, browRotL: -8, browRotR: 8,
    eyeTopL: 52, eyeTopR: 52, eyeHL: 10, eyeHR: 10,
    mouth: 'smile', mouthW: 38, mouthRot: 0
  },
  skeptisk: {
    // TYDLIG asymmetri — ett ögonbryn högt uppe med skarp vinkel,
    // andra normal. Ögon-skillnad. Mun med negativ rotation.
    browTopL: 20, browTopR: 40, browRotL: -18, browRotR: 14,
    eyeTopL: 46, eyeTopR: 58, eyeHL: 13, eyeHR: 7,
    mouth: 'line', mouthW: 34, mouthRot: -6
  },
  generad: {
    // små ögonbryn ner-inåt, hopdragna ögon, smal mun + svettdroppe
    browTopL: 36, browTopR: 36, browRotL: 6, browRotR: -6,
    eyeTopL: 58, eyeTopR: 58, eyeHL: 6, eyeHR: 6,
    mouth: 'line', mouthW: 20, mouthRot: 0, drop: true
  }
};

// -----------------------------------------------------------------------------
// MIMIK-tabellen — sexton rader (uttryck → roll → orsak)
// -----------------------------------------------------------------------------

// Tolkning av "uttryck → roll → orsak" per ordertexten §3.3:
//   uttryck = GuestFaceKey
//   roll    = guest sim-state (arriving/waiting/ordering/paying/leaving/declined)
//   orsak   = human-läsbar förklaring (använd i tester + debug + framtida tooltip)
//
// Sexton rader per specifikationen — täcker de vanligaste roll×orsak-
// kombinationerna. Ej uttömmande; deriveringen (nedan) mappar även
// arketyp + väntetid till uttryck som INTE står i MIMIK-tabellen
// (t.ex. barnet-vid-lång-väntetid → uttrakad, inte otalig).

import type { Guest } from '../../types';
import type { FoodtruckArchetype, FoodtruckArchetypeId } from './archetypes';

export interface MimikRow {
  face: GuestFaceKey;
  role: Guest['state'];
  cause: string;
}

export const MIMIK_TABLE: readonly MimikRow[] = [
  // Arriving — förväntan innan man ser kön
  { face: 'forvantansfull', role: 'arriving', cause: 'Går fram mot luckan, hungrig' },
  { face: 'nyfiken',        role: 'arriving', cause: 'Turisten läser skylten på vägen fram' },

  // Waiting — pipelinen genom kötid
  { face: 'forvantansfull', role: 'waiting',  cause: 'Just anländ, kort väntetid' },
  { face: 'nyfiken',        role: 'waiting',  cause: 'Barnet tittar på vagnen' },
  { face: 'uttrakad',       role: 'waiting',  cause: 'Medellång väntetid, tempot avstannat' },
  { face: 'otalig',         role: 'waiting',  cause: 'Lång väntetid, kön rör sig inte' },
  { face: 'skeptisk',       role: 'waiting',  cause: 'Affärsgästen kollar tiden' },

  // Ordering — vid luckan
  { face: 'forvantansfull', role: 'ordering', cause: 'Framme vid luckan, beställer' },
  { face: 'imponerad',      role: 'ordering', cause: 'Stamgästen ser att laget känner igen hen' },
  { face: 'nojd',           role: 'ordering', cause: 'Bra dag, order tas snabbt' },

  // Paying — betalning
  { face: 'tacksam',        role: 'paying',   cause: 'Får sin mat, betalar' },
  { face: 'generad',        role: 'paying',   cause: 'Kortet nekas, försöker igen' },

  // Leaving — går bort
  { face: 'nojd',           role: 'leaving',  cause: 'Går iväg med maten, hög satisfaction' },
  { face: 'besviken',       role: 'leaving',  cause: 'Nöjd nog men förväntade sig mer' },

  // Declined — turned back
  { face: 'besviken',       role: 'declined', cause: 'Såg kön och gick vidare' },
  { face: 'otalig',         role: 'declined', cause: 'Väntade för länge, gav upp' }
];

// -----------------------------------------------------------------------------
// Derivering — sim-tillstånd + kötid + arketyp → GuestFaceKey
// -----------------------------------------------------------------------------

// Tröskelvärden för väntetid-baserat uttryck. Sekunder i sim-tid.
// Kalibrerat mot foodtruck-flödet (staff-pipelinen serverar ~11-15 s
// per gäst; kön är sällan djupare än 3-4 vid current arrival-rate).
const WAIT_THRESHOLD_FORVANTAN_SEC = 5;   // < 5s = förvantansfull
const WAIT_THRESHOLD_NYFIKEN_SEC = 15;    // 5-15s = nyfiken
const WAIT_THRESHOLD_UTTRAKAD_SEC = 30;   // 15-30s = uttrakad
// > 30s = otalig

// Överstyrningar per arketyp — några arketyper har karaktärsdrag som
// bryter default-mappningen. Från utkastets beskrivning:
//   * stamgästen: "Nickar mot luckan vid ankomst" → imponerad vid
//     ordering, tacksam vid paying (inte generad).
//   * barnet: alltid förvantansfull tills otålig sätter in (rör sig
//     ojämnt = otålig först vid längre väntan)
//   * turisten: nyfiken som default, inte förvantansfull
//   * affärsgästen: skeptisk vid längre väntan (istället för otalig
//     som är mer "affekt")
//   * efter_skiftet: aldrig otalig — de är för trötta för det, går
//     mot uttrakad istället
//   * nattarbetaren: mest neutral, nöjd vid ordering (van vid rutin)
const ARCHETYPE_FACE_OVERRIDES: Partial<Record<FoodtruckArchetypeId, Partial<Record<Guest['state'], GuestFaceKey>>>> = {
  stamgasten: {
    ordering: 'imponerad',
    paying: 'tacksam',
    leaving: 'nojd'
  },
  turisten: {
    arriving: 'nyfiken',
    waiting: 'nyfiken'      // basen — kötid-tröskel överstyr för lång väntan
  },
  affarsgasten: {
    ordering: 'nojd'
  },
  efter_skiftet: {
    ordering: 'nojd'
  },
  nattarbetaren: {
    ordering: 'nojd',
    leaving: 'nojd'
  }
};

// Väntetid i sim-sekunder = simTime - guest.stateTime.
// Guest.stateTime uppdateras vid varje state-transition.
export function guestWaitTime(guest: Guest, simTime: number): number {
  return Math.max(0, simTime - guest.stateTime);
}

// Kärnderiveringen — kombinerar sim-state, kötid och arketyp till en
// GuestFaceKey. Ren funktion: samma indata ger samma FaceKey.
export function deriveFoodtruckGuestFace(
  guest: Guest,
  simTime: number,
  archetype: FoodtruckArchetype
): GuestFaceKey {
  const waitSec = guestWaitTime(guest, simTime);

  // Waiting-state — kötid dikterar via trösklar, men affärsgästen och
  // efter_skiftet får arketyp-specifika mappningar för lång väntan.
  if (guest.state === 'waiting') {
    if (archetype.id === 'affarsgasten' && waitSec > WAIT_THRESHOLD_NYFIKEN_SEC) {
      return 'skeptisk';
    }
    if (archetype.id === 'efter_skiftet' && waitSec > WAIT_THRESHOLD_UTTRAKAD_SEC) {
      return 'uttrakad';   // trött, inte otålig
    }
    if (archetype.id === 'turisten' && waitSec < WAIT_THRESHOLD_UTTRAKAD_SEC) {
      return 'nyfiken';
    }
    if (archetype.id === 'barnet' && waitSec < WAIT_THRESHOLD_NYFIKEN_SEC) {
      return 'forvantansfull';  // barn tröttnar långsammare på förväntan
    }
    // Default trösklar
    if (waitSec < WAIT_THRESHOLD_FORVANTAN_SEC) return 'forvantansfull';
    if (waitSec < WAIT_THRESHOLD_NYFIKEN_SEC)   return 'nyfiken';
    if (waitSec < WAIT_THRESHOLD_UTTRAKAD_SEC)  return 'uttrakad';
    return 'otalig';
  }

  // Övriga states — arketyp-överstyrning först, sedan MIMIK-fallback
  const override = ARCHETYPE_FACE_OVERRIDES[archetype.id]?.[guest.state];
  if (override) return override;

  // MIMIK-fallback per state
  switch (guest.state) {
    case 'arriving':
      return 'forvantansfull';
    case 'ordering':
      return 'forvantansfull';
    case 'paying':
      // Låg satisfaction → generad (kortet nekas etc), annars tacksam
      return guest.satisfaction < 0.35 ? 'generad' : 'tacksam';
    case 'leaving':
      return guest.satisfaction > 0.55 ? 'nojd' : 'besviken';
    case 'declined':
      return 'besviken';
    default:
      return 'forvantansfull';  // seated/dining/sleeping ritas inte i foodtruck
  }
}
