// silhouetteContrast.zones — golvzoner per verksamhet, och bandet
// prövat mot var och en.
//
// Tillägg till frontend/src/strategic/scene/silhouetteContrast.ts.
// Uppföljning på ORDER 123 §5.
//
// REVIDERAD efter Vision Owners svar 2026-08-30. Tre rättningar mot
// första utkastet, alla begärda:
//   1. Nycklarna är BESTÄMD FORM, per ORDER 139 — 'kvarterskrogen',
//      'ölkrogen', 'vinbaren', 'gästgiveriet', 'foodtrucken'. Utkastet
//      hade 'ölkrog' och 'gästgiveri'.
//   2. 'kvarterskrogen' och 'foodtrucken' saknades helt trots att båda
//      finns i BusinessClass. En klass utan post får inte kunna se ut
//      som godkänd — och det gäller åt båda hållen.
//   3. paletteZoneCheck är ITERATIV, (figureHex, businessClass), som
//      alla nuvarande anropare bygger på. Batch-varianten ligger
//      ovanpå och heter paletteZoneCheckAll.
//
// ── Varför filen finns ────────────────────────────────────────────
// Fem rumsfiler bär i dag var sin kopia av WCAG-formlerna och sin egen
// checkPaletteAgainstFloors(). Det var rätt när den första skrevs:
// bandet var inte zonmedvetet. Nu är det fem kopior av en sanning som
// bara får finnas på ett ställe — ändras MIN/MAX i
// silhouetteContrast.ts följer kopiorna inte med, och fem rum
// fortsätter rapportera "0 par utanför bandet" mot ett band som inte
// längre gäller.
//
// Städningen är en del av leveransen. Se avsnittet längst ned.

import {
  MIN_FLOOR_CONTRAST_RATIO,
  MAX_FLOOR_CONTRAST_RATIO,
  MIN_ROLE_DISTINCTION_DELTA_E,
  contrastRatio,
  deltaE76
} from './silhouetteContrast';

export interface FloorZone {
  id: string;
  colour: string;
  note: string;
}

export interface ZoneFailure {
  business: string;
  zone: string;
  floor: string;
  figure: string;
  ratio: number;
  /** 'low' = går ihop med golvet, 'high' = skriker mot det. */
  side: string;
}

/**
 * Golvzoner per verksamhetsklass. Nycklarna följer BusinessClass i
 * bestämd form (ORDER 139).
 *
 * REGELN SOM INTE SYNS I TALEN: det är inte ANTALET zoner som kostar,
 * det är SPRIDNINGEN i luminans. Figurfönstret är snittet av bandet
 * mot varje zon — undre gränsen sätts av den ljusaste zonen, övre av
 * den mörkaste. En klass med åtta zoner inom 0,01 har bredare fönster
 * än en med två som spänner 0,08.
 *
 * Uppmätt per klass mot bandet [1,8 · 3,6]:
 *   vinbaren        5 zoner, spann 0,065 → fönster L 0,051–0,115
 *   ölkrogen        3 zoner, spann 0,000 → fönster L 0,033–0,116
 *   gästgiveriet    5 zoner, spann 0,008 → fönster L 0,033–0,112
 *   kvarterskrogen  3 zoner, spann 0,026 → fönster L 0,056–0,148
 *   foodtrucken     1 zon                → se noten nedan
 *
 * Gästgiveriet har lika många zoner som vinbaren och nästan dubbelt så
 * brett fönster. Spridningen, inte antalet.
 */
export const FLOOR_ZONES_BY_BUSINESS: { [business: string]: FloorZone[] } = {
  kvarterskrogen: [
    { id: 'dining', colour: '#a49b8a', note: 'Matsalen och servicegången. Restaurant.tsx eget golv. L 0,3317.' },
    { id: 'barRunway', colour: '#999690', note: 'Bakom disken. Rummets enda avvikande yta. L 0,3060.' },
    { id: 'kitchen', colour: '#97999b', note: 'Pentryt. Kallare, gråare. L 0,3173.' }
  ],
  ölkrogen: [
    { id: 'dining', colour: '#a49b8a', note: 'Matsalen.' },
    { id: 'brewery', colour: '#7d776c', note: 'Bryggeriet. Sätter fönstrets övre gräns i den klassen.' },
    { id: 'kitchen', colour: '#948f84', note: 'Köket.' }
  ],
  vinbaren: [
    { id: 'main', colour: '#a89577', note: 'Mittstråk och tvåor.' },
    { id: 'lounge', colour: '#a49075', note: 'Loungen.' },
    { id: 'barRunway', colour: '#a08d74', note: 'Bakom disken.' },
    { id: 'dj', colour: '#97866f', note: 'DJ-zonen. Sätter fönstrets övre gräns i den klassen.' },
    { id: 'kitchen', colour: '#a09786', note: 'Köket.' }
  ],
  gästgiveriet: [
    { id: 'hall', colour: '#a08462', note: 'Salen, lilla salen, frukostfickan, längornas korridorer. L 0,2486.' },
    { id: 'kitchen', colour: '#9d8362', note: 'Köket. Skurad yta, svalare. L 0,2428.' },
    { id: 'courtyard', colour: '#8d8679', note: 'Gårdens grus. L 0,2409.' },
    { id: 'lawn', colour: '#64935b', note: 'Gräsmattan. Full kroma, L 0,2433 — kulören är fri, ljusheten är låst.' },
    { id: 'boule', colour: '#8f887a', note: 'Boulebanans krossgrus. L 0,2485.' }
  ],
  /**
   * FOODTRUCKEN ÄGER INTE SIN MARK. Vagnen står på gatan, och gatan är
   * byns geometri. Den enda yta klassen levererar är serveringsmattan,
   * och den är vald ur bandet BAKLÄNGES: garment ligger på L ≈ 0,083,
   * bandet tillåter då ett golv mellan L 0,188 och 0,432, och mattan
   * siktar på mitten.
   *
   * Posten finns här så att klassen inte kan se ut som godkänd genom
   * att saknas. När gatans yta är stabil — polygon-guarden i OsmRoads
   * är beställd men inte byggd — läggs den till som en andra zon, och
   * DÅ krymper fönstret. Klassen har därför sin egen kontrollfunktion
   * i foodTruckRoom.ts (checkPaletteAgainstGround), som tar gatans
   * färger som argument. Den normaliseras INTE hit: att klassen inte
   * äger sitt golv är en verklig skillnad och ska synas i signaturen.
   */
  foodtrucken: [
    { id: 'apron', colour: '#999791', note: 'Serveringsmattan. Vald ur bandet baklänges, L 0,3095. Enda ytan klassen äger.' }
  ]
};

/** WCAG relativ luminans. Om silhouetteContrast redan exporterar en
 *  sådan: använd den och ta bort denna. */
export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const ch = function (v: number): number {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(parseInt(h.substring(0, 2), 16)) +
         0.7152 * ch(parseInt(h.substring(2, 4), 16)) +
         0.0722 * ch(parseInt(h.substring(4, 6), 16));
}

function zonesFor(business: string): FloorZone[] {
  const zones = FLOOR_ZONES_BY_BUSINESS[business];
  if (!zones) {
    throw new Error(
      'silhouetteContrast.zones: okänd verksamhet "' + business + '". ' +
      'Lägg till zonerna i FLOOR_ZONES_BY_BUSINESS först — en klass utan ' +
      'zoner får inte tyst räknas som godkänd. Nycklarna är bestämd form ' +
      '(ORDER 139): kvarterskrogen, ölkrogen, vinbaren, gästgiveriet, ' +
      'foodtrucken.'
    );
  }
  return zones;
}

/**
 * ITERATIV, en figurfärg i taget — samma form som nuvarande anropare
 * använder. Returnerar de zoner färgen faller mot; tom lista = godkänd.
 *
 * Ersätter de lokala checkPaletteAgainstFloors() i rumsfilerna.
 */
export function paletteZoneCheck(
  figureHex: string,
  business: string
): ZoneFailure[] {
  const zones = zonesFor(business);
  const fails: ZoneFailure[] = [];
  for (let z = 0; z < zones.length; z++) {
    const r = contrastRatio(figureHex, zones[z].colour);
    if (r < MIN_FLOOR_CONTRAST_RATIO || r > MAX_FLOOR_CONTRAST_RATIO) {
      fails.push({
        business: business,
        zone: zones[z].id,
        floor: zones[z].colour,
        figure: figureHex,
        ratio: r,
        side: r < MIN_FLOOR_CONTRAST_RATIO ? 'low' : 'high'
      });
    }
  }
  return fails;
}

/** Batch ovanpå den iterativa. Bekvämlighet, inte ny sanning. */
export function paletteZoneCheckAll(
  figureColours: string[],
  business: string
): ZoneFailure[] {
  let out: ZoneFailure[] = [];
  for (let i = 0; i < figureColours.length; i++) {
    out = out.concat(paletteZoneCheck(figureColours[i], business));
  }
  return out;
}

/** Kontrastintervallet över alla figurfärger och alla zoner. */
export function paletteZoneRange(
  figureColours: string[],
  business: string
): { min: number; max: number } {
  const zones = zonesFor(business);
  let lo = Infinity;
  let hi = 0;
  for (let i = 0; i < figureColours.length; i++) {
    for (let z = 0; z < zones.length; z++) {
      const r = contrastRatio(figureColours[i], zones[z].colour);
      if (r < lo) lo = r;
      if (r > hi) hi = r;
    }
  }
  return { min: lo, max: hi };
}

/**
 * Figurfönstret för en klass: det luminansintervall en figurfärg måste
 * ligga i för att klara bandet mot SAMTLIGA zoner.
 *
 * Det här är poängen med filen. Utan den upptäcks en för mörk ny
 * golvzon först när någon lägger till en figurfärg som faller — alltså
 * långt efter att zonen committades, och av någon som inte vet att
 * zonen är orsaken. Med den kan en ny zon prövas direkt: krymper
 * fönstret, är zonen fel.
 *
 * `widthLost` säger hur mycket zonspridningen kostade jämfört med den
 * ljusaste zonen ensam. Noll betyder att zonerna är gratis.
 */
export function figureLuminanceWindow(
  business: string
): { min: number; max: number; widthLost: number } {
  const zones = zonesFor(business);
  let lightest = 0;
  let darkest = 1;
  for (let z = 0; z < zones.length; z++) {
    const L = relativeLuminance(zones[z].colour);
    if (L > lightest) lightest = L;
    if (L < darkest) darkest = L;
  }
  const min = (lightest + 0.05) / MAX_FLOOR_CONTRAST_RATIO - 0.05;
  const max = (darkest + 0.05) / MIN_FLOOR_CONTRAST_RATIO - 0.05;
  const soloMax = (lightest + 0.05) / MIN_FLOOR_CONTRAST_RATIO - 0.05;
  return { min: min, max: max, widthLost: soloMax - max };
}

/** Minsta parvisa roll-ΔE i en uniformsuppsättning. */
export function minRoleDelta(uniforms: { [role: string]: string }): number {
  const keys = Object.keys(uniforms);
  let lo = Infinity;
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const d = deltaE76(uniforms[keys[i]], uniforms[keys[j]]);
      if (d < lo) lo = d;
    }
  }
  return lo;
}

/** Klarar uniformsuppsättningen rollkravet? */
export function rolesAreDistinct(uniforms: { [role: string]: string }): boolean {
  return minRoleDelta(uniforms) >= MIN_ROLE_DISTINCTION_DELTA_E;
}

// ── Att lägga i paletteContrast.test.ts ───────────────────────────
//
//   for (const business of Object.keys(FLOOR_ZONES_BY_BUSINESS)) {
//     test(business + ': paletten ligger i bandet mot varje zon', () => {
//       expect(paletteZoneCheckAll(figuresFor(business), business)).toEqual([]);
//     });
//     test(business + ': figurfönstret är inte stängt', () => {
//       const w = figureLuminanceWindow(business);
//       expect(w.max).toBeGreaterThan(w.min);
//     });
//   }
//   test('okänd klass kastar i stället för att se godkänd ut', () => {
//     expect(() => paletteZoneCheck('#52505d', 'krog')).toThrow();
//   });
//
// Det andra testet fångar en ny mörk golvzon DAGEN den läggs till, i
// stället för månader senare. Det tredje är lika viktigt: en klass som
// saknas i registret ska bli ett fel, inte en tom lista.
//
// ── Efter merge: städningen är en del av leveransen ───────────────
//
//   wineBarRoom.ts     ta bort ZONE_FLOORS, checkPaletteAgainstFloors,
//                      paletteContrastRange, luminance, contrast
//   innRoom.ts         samma, plus deltaE/minRoleDeltaE och de lokala
//                      srgb-hjälparna
//   restaurantRoom.ts  samma som vinbaren
//   figureProps.ts     luminance, contrast, checkPropPalette,
//                      propContrastRange
//   brewpubRoom.ts     inget — den bär bara zonfärger, ingen formelkod
//   foodTruckRoom.ts   BEHÅLL checkPaletteAgainstGround. Klassen äger
//                      inte sin mark och tar gatans färger som
//                      argument; den skillnaden ska synas i signaturen.
//
// GUEST_GARMENTS och STAFF_UNIFORMS STANNAR i rumsfilerna. De är
// klassens innehåll, inte bandets.
//
// En delvis genomförd migration är strikt sämre än ingen: då finns
// både registret och kopiorna, och nästa läsare vet inte vilken som
// gäller.
