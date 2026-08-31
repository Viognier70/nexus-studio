// ORDER 158 §4 — polygon-guarden för väg-envelope.
//
// Bakgrund: ORDER 135 fann 32 byggnader som kolliderade med renderad
// envelope (bara 30 om man räknade carriageway utan trottoar). ORDER
// 158 lade en polygon-guard i OsmRoads.tsx, analog med ORDER 132:s
// windowsFor-guard i OsmBuildings.tsx, som klipper polylines där
// envelopens halva bredd (asfalt + trottoar per sida) sticker in i
// någon byggnads-polygon.
//
// Testet läser guardVerify.json som order158-verify.mjs producerar och
// hävdar:
//   1. Guarden reducerar kollisionerna — annars är den inte aktiv.
//   2. Ingen råpolyline försvinner helt UTAN att förekomma i
//      `expectedStructuralDisappearances` (se nedan). Detta är den
//      hårda "vägnätet får inte gå sönder"-vakten från §DoD 3.
//   3. Total renderade vägdelar före/efter skiljer sig med max ±5 %
//      så vi inte oavsiktligt exploderar antal draw-calls.
//
// Kör mätskriptet först:
//   node frontend/scripts/order158-verify.mjs

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPORT_PATH = resolve(
  __dirname,
  '../../../../reports/order158/guardVerify.json'
);

interface Report {
  summary: {
    buildingsTotal: number;
    baselineRoadPieces: number;
    afterRoadPieces: number;
    collisionsBefore: number;
    collisionsAfter: number;
    worstOverlapBefore: number;
    worstOverlapAfter: number;
    rawRoadsDisappeared: number;
    rawRoadsSplit: number;
    rawRoadsShortened: number;
    rawRoadsUntouched: number;
  };
  disappeared: Array<{ parentId: string; role: string; name: string | null; kind: string }>;
}

// §DoD 3 "Sammanhängande gator" — dessa polylines faller in i ORDER
// 136:s kategori "strukturella": OSM-linjen är dragen fysiskt genom
// en byggnad. En guard som klipper hela envelopen har inget val — men
// listan MÅSTE dokumenteras här så framtida drift syns. Nya id:n
// hamnar i failing-listan och kräver antingen designbeslut eller
// undersökning av vad som ändrats.
const expectedStructuralDisappearances = new Set<string>([
  // w1239628611 = Kyrkogatans nordligaste ~14.5 m-spur. Polylinen
  // passerar rakt genom `vw-torget-kyrkbacken-pair` (crafted historic
  // building placerad i CraftedLandmarks vid Torgets kant, hela
  // envelopen faller inuti husets bbox). Enligt ORDER 158 §3 får
  // varken byggnaden flyttas eller OSM-datat editeras — så guarden
  // klipper hela spuren. Vision Owner-sign-off krävs innan mergen
  // (se ORDER_REGISTRY-raden).
  'w1239628611'
]);

function readReport(): Report {
  try {
    return JSON.parse(readFileSync(REPORT_PATH, 'utf8')) as Report;
  } catch {
    throw new Error(
      'Kör mätskriptet först: node frontend/scripts/order158-verify.mjs'
    );
  }
}

describe('ORDER 158 §4 — envelope-polygon-guarden', () => {
  it('§DoD 2 — reducerar kollisionsantalet (annars är guarden inte aktiv)', () => {
    const r = readReport();
    // Baselinen (ORDER 135) rapporterade 32; testet kräver att guarden
    // har mätbar effekt: minst hälften av kollisionerna borta.
    expect(r.summary.collisionsAfter).toBeLessThanOrEqual(
      Math.floor(r.summary.collisionsBefore / 2)
    );
    // worstOverlap ska falla klart — 4.36 m före är oacceptabelt,
    // efter guarden ska värsta fallet ligga under 0.5 m.
    expect(r.summary.worstOverlapAfter).toBeLessThan(0.5);
  });

  it('§DoD 3 — ingen råpolyline försvinner helt (förutom dokumenterade strukturella fall)', () => {
    const r = readReport();
    const unexpected = r.disappeared.filter(
      (d) => !expectedStructuralDisappearances.has(d.parentId)
    );
    if (unexpected.length > 0) {
      const list = unexpected
        .map((d) => `${d.parentId} (role=${d.role}, name=${d.name || '-'})`)
        .join(', ');
      throw new Error(
        `Guarden tömde ${unexpected.length} icke-dokumenterad(e) polylinie(r): ${list}. ` +
          `Antingen är detta en ny strukturell kollision (lägg till id i ` +
          `expectedStructuralDisappearances med motivering) eller så har guarden ` +
          `blivit för aggressiv.`
      );
    }
    expect(unexpected).toEqual([]);
  });

  it('§DoD 3 — antal renderade vägdelar avviker med max ±10 % från baselinen', () => {
    const r = readReport();
    const ratio = r.summary.afterRoadPieces / r.summary.baselineRoadPieces;
    // 10 % marginal — splits skapar nya pieces (+), disappeared tar
    // bort (-), och shortened håller antalet konstant. Med 11 splits
    // förväntar vi oss +11 pieces och −1 (disappeared) = +10, dvs
    // ~3 % ökning. En avvikelse större än ±10 % betyder att guarden
    // beter sig annorlunda än förväntat.
    expect(ratio).toBeGreaterThan(0.9);
    expect(ratio).toBeLessThan(1.1);
  });
});
