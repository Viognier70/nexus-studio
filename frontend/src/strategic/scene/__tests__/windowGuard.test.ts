// ORDER 132 §4-punkt 4 — polygon-guarden får inte tömma byggnader
// på alla sina fönster.
//
// Bakgrund: ORDER 130 mätte 3 156 fönster som hängde utanför fasaden;
// ORDER 132 lade en guard i `windowsFor()` (OsmBuildings.tsx) som
// kasserar fönster vars XZ-position inte ligger inuti polygonen. En
// för aggressiv guard som tar bort alla fönster (kollapsad OBB, buggig
// inside-test) passerar DoD-punkt 3 (noll utanför polygon) men lämnar
// husen fönstertomma. Detta test hävdar att så inte skett.
//
// Ordertexten §5: "Om guarden tar bort fönster från hus som borde ha
// dem — punkt 4 faller — är det ett fynd." Testet är den vakten.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Läser guardVerify.json som ORDER 132-mätskriptet producerat. Testet
// FALTAR om filen saknas — då är verifieringen inte körd innan test.
// Kör `node frontend/scripts/order132-verify.mjs` först.

const REPORT_PATH = resolve(__dirname, '../../../../reports/order132/guardVerify.json');

describe('ORDER 132 §4-punkt 4 — polygon-guarden lämnar inte hus fönstertomma', () => {
  it('inget WINDOW_KINDS-hus har alla fönster droppade av guarden', () => {
    let report: {
      summary: { buildingsWithAllDropped: number; totalBuildings: number };
      perBuilding: Array<{ id: string; kind: string; generated: number; kept: number; dropped: number }>;
    };
    try {
      report = JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
    } catch (err) {
      throw new Error(
        `Testet läser guardVerify.json som produceras av order132-verify.mjs. ` +
        `Kör: node frontend/scripts/order132-verify.mjs`
      );
    }
    // Ingen byggnad ska ha alla fönster droppade.
    const emptied = report.perBuilding.filter((b) => b.kept === 0);
    if (emptied.length > 0) {
      const list = emptied.map((b) => `${b.id} (${b.kind}, ${b.dropped} fönster)`).join(', ');
      throw new Error(`Guarden tömde ${emptied.length} byggnad(er): ${list}. Se ORDER 132 §5.`);
    }
    expect(report.summary.buildingsWithAllDropped).toBe(0);
  });

  it('representativa hustyper (house/residential/apartments/hotel/school/university) har ≥ 1 fönster kvar per exemplar', () => {
    const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8')) as {
      perBuilding: Array<{ id: string; kind: string; generated: number; kept: number; dropped: number }>;
    };
    const representativeKinds = [
      'house', 'residential', 'apartments', 'hotel', 'school', 'university'
    ];
    // För varje kind: hitta minst ett exempel i rapporten och verifiera
    // kept > 0. Om ingen entry finns för en kind är den redan filtrerad
    // (0 dropped över hela byn, vilket är helt OK — inte alla kinds
    // triggar guarden).
    for (const kind of representativeKinds) {
      const examples = report.perBuilding.filter((b) => b.kind === kind);
      // Om guarden hade tömt något exempel skulle det synas här.
      const emptied = examples.filter((b) => b.kept === 0);
      expect(
        emptied,
        `kind=${kind}: ${emptied.length} exemplar tömda av guarden — se ${emptied.map((b) => b.id).join(', ')}`
      ).toEqual([]);
      // Om typen ens finns i rapporten (dvs. någon byggnad av den typen
      // hade en dropped-avvikelse), måste medeltalet kvarvarande vara > 0.
      if (examples.length > 0) {
        const meanKept = examples.reduce((s, b) => s + b.kept, 0) / examples.length;
        expect(meanKept, `kind=${kind} meanKept`).toBeGreaterThan(0);
      }
    }
  });

  it('totalen droppade är > 1000 (annars är guarden inte alls aktiv)', () => {
    const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8')) as {
      summary: { droppedTotal: number };
    };
    // Sanity-check: guarden ska ha effekt. ORDER 130-baslinjen fann
    // 3 156 utanför-fönster; efter WINDOW_KINDS-filter är siffran
    // ~1381. Tröskeln 1000 är säkerhetsmarginal — mätningen får
    // varierar med data-uppdateringar men inte kollapsa till 0.
    expect(report.summary.droppedTotal).toBeGreaterThan(1000);
  });
});
