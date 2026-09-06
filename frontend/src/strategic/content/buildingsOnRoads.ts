// ORDER 176 — byggnads-guard mot väg-envelope.
//
// Motsatt riktning till ORDER 158:s `clipRoadForEnvelope` (i OsmRoads.tsx).
// ORDER 158 klipper VÄGEN där mittlinjen kommer inom halfEnvelope från en
// byggnad. Men OSM-datan har ~19 strukturella fall (ORDER 136 §2.2) där en
// byggnad-polygon står FYSISKT över vägens mittlinje — där klipps vägen så
// att den "slutar vid gaveln" istället för att korsa byggnaden. Från
// spelarvyn syns detta som "byggnad tvärs korsning + väg som slutar i
// tomt intet".
//
// Denna modul räknar per byggnad hur många av vägens 1-metersamples på
// mittlinjen som ligger INUTI byggnadens polygon (samma sampling som
// `clipPolylineForVehicles` i procgen/geom.ts). Om ≥ MIDLINE_INSIDE_THRESHOLD
// samples ligger inuti polygonen räknas byggnaden som "på vägen" och
// exkluderas från OsmBuildings + ProceduralFacades.
//
// Tröskel MIDLINE_INSIDE_THRESHOLD=2 (dvs byggnaden täcker minst ~2 m av
// mittlinjen): fångar de strukturella fall där byggnaden är >2 m djup i
// vägens riktning, missar små hörn-vidröringar där byggnaden bara petar
// in ett par decimeter över mittlinjen.
//
// Konsekvens: vägen fortsätter klippas av ORDER 158-guarden runt den
// (nu osynliga) byggnaden — visuell effekt blir "väg med gap där
// osynlig byggnad var". En vidare fix som skulle låta vägen flöda
// obruten skulle kräva att `clipPolylineForVehicles` tar en exclude-set;
// den blir egen order när vi vet om gapet stör mer än den nuvarande
// "byggnad över korsning"-observationen.

import { WORLD } from './world';
import { specFor } from './roadRoles';
import { inside } from '../procgen/geom';

const MIDLINE_INSIDE_THRESHOLD = 2;
const SAMPLE_STEP_M = 1.0;

function computeBuildingsOnRoads(): Set<string> {
  const out = new Set<string>();
  for (const b of WORLD.buildings) {
    if (!b.poly || b.poly.length < 3) continue;
    // OBB-bounds för snabb bbox-filter av roads
    let bMinX = Infinity, bMaxX = -Infinity, bMinZ = Infinity, bMaxZ = -Infinity;
    for (const [x, z] of b.poly) {
      if (x < bMinX) bMinX = x;
      if (x > bMaxX) bMaxX = x;
      if (z < bMinZ) bMinZ = z;
      if (z > bMaxZ) bMaxZ = z;
    }
    // Marginal så vägar som passerar nära räknas
    const margin = 5;

    let insideSampleCount = 0;
    outer: for (const road of WORLD.roads) {
      if (!road.poly || road.poly.length < 2) continue;
      const spec = specFor(road);
      // Ignorera icke-motoriserade roller helt (footpath/cycleway/track).
      // ORDER 158-noten: "envelope through a wall reads wrong regardless
      // of tier", men här handlar det om att SKIPPA BYGGNADEN vilket är
      // för aggressivt för smala gångstigar där ett vardagligt hörn kan
      // överlappa några centimeter.
      if (spec.role === 'footpath' || spec.role === 'cycleway' || spec.role === 'track') continue;

      // road bbox
      let rMinX = Infinity, rMaxX = -Infinity, rMinZ = Infinity, rMaxZ = -Infinity;
      for (const [x, z] of road.poly) {
        if (x < rMinX) rMinX = x;
        if (x > rMaxX) rMaxX = x;
        if (z < rMinZ) rMinZ = z;
        if (z > rMaxZ) rMaxZ = z;
      }
      if (rMaxX < bMinX - margin || rMinX > bMaxX + margin
       || rMaxZ < bMinZ - margin || rMinZ > bMaxZ + margin) continue;

      // Sampla mittlinjen SAMPLE_STEP_M-avstånd, räkna hur många
      // ligger inuti byggnadens polygon
      for (let i = 0; i < road.poly.length - 1; i++) {
        const [ax, az] = road.poly[i];
        const [bx, bz] = road.poly[i + 1];
        const segLen = Math.hypot(bx - ax, bz - az);
        if (segLen < 0.1) continue;
        const steps = Math.max(1, Math.ceil(segLen / SAMPLE_STEP_M));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = ax + t * (bx - ax);
          const z = az + t * (bz - az);
          if (inside(b.poly, x, z)) {
            insideSampleCount++;
            if (insideSampleCount >= MIDLINE_INSIDE_THRESHOLD) {
              out.add(b.id);
              break outer;
            }
          }
        }
      }
    }
  }
  return out;
}

/**
 * Byggnads-ID:n som ligger strukturellt över en motoriserad vägs mittlinje.
 * Läses av OsmBuildings och ProceduralFacades som filter — dessa byggnader
 * renderas inte.
 *
 * Beräknas en gång vid module-load (WORLD är statiskt data). Storleken är
 * en fingeravtryck av datakvaliteten: om den växer efter en OSM-import
 * är det ett tecken på nya strukturella konflikter.
 */
export const BUILDINGS_ON_ROADS: ReadonlySet<string> = computeBuildingsOnRoads();
