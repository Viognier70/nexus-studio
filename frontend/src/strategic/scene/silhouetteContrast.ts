// ORDER 123 §5 — silhuett-kontraktets kontrastband, i kod.
//
// SD-004 §3.3-preciseringen 2026-08-29 gjorde palettens ljushet till
// en del av kontraktet. Nästa gång någon lägger till en figurfärg ska
// bandet kunna hävdas i test — därför ligger måttet i kod, inte som en
// siffra i en rapport.
//
// Metod: WCAG relativ luminans + kontrastförhållande. Kontrast anges
// som (L1 + 0.05) / (L2 + 0.05) med L1 ≥ L2. Måttet är standardiserat,
// snabbt att räkna, och läses samma sätt oavsett hue — vilket är det
// silhuett-läsbarheten faktiskt kräver.
//
// Roll-distinktion mäts med CIE 76 ΔE. Enklaste väl-etablerade måttet
// för "syns rollerna åt vid strategisk kameraavstånd". Under bandet
// kollapsar två roller till samma silhuett.

// -------- band + referens ---------------------------------------------

/**
 * Legacy-golvreferens från ORDER 123. Pekar på `Restaurant.tsx` rad
 * 108 (`meshStandardMaterial color="#a89577"`) — som **inte** är
 * spelarens interiörsgolv utan skyltblocket ovanför entrén. ORDER 123
 * kalibrerade paletten mot detta värde av misstag; den verkliga
 * kontrasten som spelaren ser mäts nu mot `FLOOR_ZONES_BY_BUSINESS`
 * per ORDER 127 §3.1. Konstanten behålls så äldre grep-referenser inte
 * bryter, men nya tester ska INTE använda den.
 *
 * @deprecated Använd `FLOOR_ZONES_BY_BUSINESS[businessClass]` per
 *   ORDER 127 §3.1.
 */
export const FLOOR_COLOUR = '#a89577';

/**
 * ORDER 127 §3.1 — golvfärger per verksamhetsklass, som data.
 *
 * Källor:
 * - `restaurant`: `PlayerBusiness.tsx:75` `INTERIOR_FLOOR_COLOUR`
 *   (interiörens stub-golv, det spelaren faktiskt ser figurerna stå på)
 * - `värdshus`: samma byggnadsstub som restaurangen tills egen
 *   scen byggs
 * - `foodtruck`: tom — SVG-sidovyn har ingen 3D-golvton att kontrastera
 *   mot; figurer läses mot vagnens bakgrund vilket är ett eget kontrakt
 * - `ölkrogen`: `brewpubRoom.ts` COLOR-tabellens tre golvzoner
 *   (dining/brew/kitchen), Design-leverans
 *
 * En figurfärg måste hålla `[MIN_FLOOR_CONTRAST_RATIO,
 * MAX_FLOOR_CONTRAST_RATIO]`-bandet mot **varje** zon i den klass den
 * kan förekomma i. Att en färg passerar mot en zon räcker inte om den
 * faller mot en annan — bandet är zonmedvetet.
 */
export const FLOOR_ZONES_BY_BUSINESS: Record<
  'restaurant' | 'foodtruck' | 'värdshus' | 'ölkrogen',
  readonly string[]
> = {
  restaurant: ['#a08462'],
  foodtruck: [],
  värdshus: ['#a08462'],
  ölkrogen: ['#a49b8a', '#7d776c', '#948f84']
};

/**
 * Minsta kontrastförhållande mellan en figurfärg och golvet. Under
 * detta band blir figuren en fläck som blandas med golvet — silhuetten
 * går förlorad.
 */
export const MIN_FLOOR_CONTRAST_RATIO = 1.8;

/**
 * Största kontrastförhållande. Över detta band kollapsar kroppen till
 * en ren skugga (SD-004 §3.3-preciseringen: "kroppen blir en skugga
 * oavsett hur hjässan löses"). Silhuetten är då läsbar men INTE
 * kroppen — inget internt färgdjup går fram.
 */
export const MAX_FLOOR_CONTRAST_RATIO = 3.6;

/**
 * Minsta CIE 76 ΔE mellan två personalroller. Under detta band går
 * rollerna att skilja åt i närbild men INTE i strategisk kamera —
 * spelaren läser båda som samma figur.
 */
export const MIN_ROLE_DISTINCTION_DELTA_E = 12;

// -------- hex → RGB → linear ------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length !== 6) throw new Error(`hexToRgb: expected #rrggbb, got "${hex}"`);
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    throw new Error(`hexToRgb: invalid hex "${hex}"`);
  }
  return [r, g, b];
}

/** sRGB → linear per WCAG-formeln. */
function srgbToLinear(channel: number): number {
  const c = channel / 255;
  if (c <= 0.03928) return c / 12.92;
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

// -------- WCAG kontrast -----------------------------------------------

/**
 * WCAG relativ luminans i [0, 1]. 0 = svart, 1 = vitt.
 * L = 0.2126·R + 0.7152·G + 0.0722·B, med sRGB→linear-konvertering.
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/**
 * WCAG kontrastförhållande mellan två färger. Alltid ≥ 1 (identiska
 * färger ger 1, svart mot vitt ger 21).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * True om färgens kontrast mot golvet ligger inom
 * [`MIN_FLOOR_CONTRAST_RATIO`, `MAX_FLOOR_CONTRAST_RATIO`].
 *
 * @deprecated Kontrasterar mot legacy-`FLOOR_COLOUR`. Använd
 *   `paletteZoneCheck` per ORDER 127 §3.2 för uttömmande kontroll
 *   mot alla golvzoner i den klass figuren kan förekomma i.
 */
export function isInFloorContrastBand(hex: string): boolean {
  const c = contrastRatio(hex, FLOOR_COLOUR);
  return c >= MIN_FLOOR_CONTRAST_RATIO && c <= MAX_FLOOR_CONTRAST_RATIO;
}

/**
 * ORDER 127 §3.2 — uttömmande kontroll: prövar en figurfärg mot
 * varje golv i en verksamhetsklass. Returnerar per-zon-resultat
 * så en färg som klarar en zon men faller på en annan **fångas**
 * (inte döljs bakom ett medelvärde).
 *
 * En färg passerar bara om kontrasten mot **alla** zoner i klassen
 * ligger i bandet — samma logik som `AND` över zonerna.
 */
export interface ZoneCheckResult {
  zone: string;
  contrast: number;
  inBand: boolean;
}

export function paletteZoneCheck(
  figureHex: string,
  businessClass: keyof typeof FLOOR_ZONES_BY_BUSINESS
): { allInBand: boolean; perZone: ZoneCheckResult[] } {
  const zones = FLOOR_ZONES_BY_BUSINESS[businessClass];
  const perZone: ZoneCheckResult[] = zones.map((zoneHex) => {
    const contrast = contrastRatio(figureHex, zoneHex);
    const inBand = contrast >= MIN_FLOOR_CONTRAST_RATIO && contrast <= MAX_FLOOR_CONTRAST_RATIO;
    return { zone: zoneHex, contrast, inBand };
  });
  const allInBand = perZone.length > 0 && perZone.every((r) => r.inBand);
  return { allInBand, perZone };
}

// -------- CIE Lab ΔE (för roll-distinktion) ---------------------------
//
// Enkel implementering: sRGB → linear → XYZ (D65) → Lab → ΔE 76.
// Precis nog för att skilja "samma färg" från "olika färg" — inte en
// perceptuellt jämn skala för finjustering, men det är inte vad
// bandet mäter.

function linearRgbToXyz(r: number, g: number, b: number): [number, number, number] {
  // D65-viktade koefficienter (sRGB primärer → CIE XYZ, matris från
  // W3C/Bruce Lindbloom).
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
  return [x, y, z];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  // D65-vitpunkt (CIE 1931 2° observer).
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;
  const f = (t: number): number => {
    return t > 0.008856
      ? Math.pow(t, 1 / 3)
      : (7.787 * t) + (16 / 116);
  };
  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bb = 200 * (fy - fz);
  return [L, a, bb];
}

function hexToLab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const [xr, xg, xb] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const [x, y, z] = linearRgbToXyz(xr, xg, xb);
  return xyzToLab(x, y, z);
}

/**
 * CIE 76 ΔE — Euklidiskt avstånd i Lab-rummet. Enkel formel med
 * begränsad perceptuell jämnhet men tillräcklig som distinktionsband.
 */
export function deltaE76(hex1: string, hex2: string): number {
  const [L1, a1, b1] = hexToLab(hex1);
  const [L2, a2, b2] = hexToLab(hex2);
  const dL = L1 - L2;
  const da = a1 - a2;
  const db = b1 - b2;
  return Math.sqrt(dL * dL + da * da + db * db);
}
