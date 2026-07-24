#!/usr/bin/env node
// Grythyttan world data ingestion.
//
// Fetches OSM data via Overpass, projects to the local metric frame
// used by the strategic scene, and writes a canonical world.json.
//
// Usage:
//   node scripts/fetch-grythyttan-osm.mjs
//   node scripts/fetch-grythyttan-osm.mjs --out frontend/src/strategic/data/grythyttan-world.json
//
// Design notes:
//   - Preserves raw OSM geometry exactly. No decimation, smoothing or
//     coordinate rounding beyond 2 decimals of metres (0.01 m = 1 cm).
//   - Captures every OSM tag we currently rely on plus `ref`,
//     `surface`, `width`, `maxspeed`, `lanes`, so downstream role
//     assignment can key on real-world classification instead of a
//     hardcoded way-id table.
//   - Multipolygon water relations are resolved to outer rings.
//   - The output layout matches `frontend/src/strategic/content/world.ts`
//     RawRoad / RawBuilding / RawPolygon / Landmark interfaces. Change
//     both places together if you extend the schema.
//
// Attribution: © OpenStreetMap contributors, ODbL.

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { argv } from 'node:process';

const OVERPASS = 'https://overpass.kumi.systems/api/interpreter';
const USER_AGENT = 'nexus-studio-ingest/1.0';

// Grythyttan world centre and bbox — identical to the previous export
// so downstream code (camera anchors, landmark coords) doesn't shift.
const CENTRE_LAT = 59.70575;
const CENTRE_LON = 14.53723;
const BBOX = [59.68, 14.5, 59.725, 14.57];   // [south, west, north, east]

// mPerDeg matches cos(centre lat) at Grythyttan.
const M_PER_DEG_LAT = 111132.9;
const M_PER_DEG_LON = 56060.0;

const OUT_PATH_DEFAULT =
  'frontend/src/strategic/data/grythyttan-world.json';

function parseArgs() {
  const args = { out: OUT_PATH_DEFAULT, cache: null, previous: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--from-cache') args.cache = argv[++i];
    else if (argv[i] === '--previous') args.previous = argv[++i];
  }
  return args;
}

function toLocal(lat, lon) {
  return [
    round2((lon - CENTRE_LON) * M_PER_DEG_LON),
    round2(-(lat - CENTRE_LAT) * M_PER_DEG_LAT)
  ];
}
function round2(n) { return Math.round(n * 100) / 100; }

async function overpass(query, attempts = 3) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(OVERPASS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT
        },
        body: 'data=' + encodeURIComponent(query)
      });
      if (!r.ok) {
        lastErr = new Error(`Overpass ${r.status} ${r.statusText}`);
        if (r.status !== 504 && r.status !== 429) throw lastErr;
      } else {
        return r.json();
      }
    } catch (e) {
      lastErr = e;
    }
    // Back off before retry
    if (i < attempts - 1) {
      const waitMs = 5000 * (i + 1);
      console.error(`  overpass attempt ${i + 1} failed (${lastErr.message}); retrying in ${waitMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr ?? new Error('overpass unknown failure');
}

// --- Extractors ------------------------------------------------------

function extractBuildings(els) {
  const out = [];
  for (const e of els) {
    if (e.type !== 'way' || !e.tags?.building) continue;
    const g = e.geometry;
    if (!g || g.length < 3) continue;
    const poly = g.map((n) => toLocal(n.lat, n.lon));
    out.push({
      id: 'w' + e.id,
      poly,
      name: e.tags.name ?? null,
      kind: e.tags.building === 'yes' ? 'yes' : e.tags.building,
      amenity: e.tags.amenity ?? null,
      tourism: e.tags.tourism ?? null,
      religion: e.tags.religion ?? null,
      historic: e.tags.historic ?? null,
      // Optional structural detail. Present on only a small fraction of
      // Grythyttan buildings today (roof:shape on ~14/274), but the
      // downstream renderer prefers the OSM signal when it exists and
      // falls back to kind-driven inference otherwise. Capturing the
      // full set means a future OSM survey improves the render without
      // an ingest change.
      roofShape: e.tags['roof:shape'] ?? null,
      roofLevels: e.tags['roof:levels'] ? Number(e.tags['roof:levels']) : null,
      buildingLevels: e.tags['building:levels']
        ? Number(e.tags['building:levels'])
        : null,
      height: e.tags.height ? Number(e.tags.height) : null,
      roofMaterial: e.tags['roof:material'] ?? null,
      roofColour: e.tags['roof:colour'] ?? null,
      wallMaterial: e.tags['building:material'] ?? null,
      wallColour: e.tags['building:colour'] ?? null
    });
  }
  return out;
}

const CAR_HIGHWAYS = new Set([
  'motorway', 'motorway_link', 'trunk', 'trunk_link',
  'primary', 'primary_link', 'secondary', 'secondary_link',
  'tertiary', 'tertiary_link', 'unclassified', 'residential',
  'living_street', 'service', 'track'
]);
const PED_HIGHWAYS = new Set([
  'footway', 'path', 'cycleway', 'steps', 'pedestrian', 'platform',
  'track', 'living_street', 'residential', 'unclassified', 'tertiary'
]);

function extractRoads(els) {
  const out = [];
  for (const e of els) {
    if (e.type !== 'way' || !e.tags?.highway) continue;
    const g = e.geometry;
    if (!g || g.length < 2) continue;
    const kind = e.tags.highway;
    const poly = g.map((n) => toLocal(n.lat, n.lon));
    out.push({
      id: 'w' + e.id,
      poly,
      kind,
      name: e.tags.name ?? null,
      ref: e.tags.ref ?? null,
      surface: e.tags.surface ?? null,
      width: e.tags.width ? Number(e.tags.width) : null,
      maxspeed: e.tags.maxspeed ? Number(e.tags.maxspeed) : null,
      lanes: e.tags.lanes ? Number(e.tags.lanes) : null,
      car: CAR_HIGHWAYS.has(kind),
      ped: PED_HIGHWAYS.has(kind)
    });
  }
  return out;
}

function extractSimplePoly(els, filter) {
  const out = [];
  for (const e of els) {
    if (e.type !== 'way') continue;
    if (!filter(e.tags ?? {})) continue;
    const g = e.geometry;
    if (!g || g.length < 3) continue;
    out.push({
      id: 'w' + e.id,
      poly: g.map((n) => toLocal(n.lat, n.lon)),
      name: e.tags?.name ?? null
    });
  }
  return out;
}

// Resolve multipolygon water relations to a single outer ring per
// relation, stitching adjacent outer-role member ways end-to-end.
// The previous export encoded each relation as one big RawPolygon
// (r67579_r0 for Sör-Älgen with 2773 points, r1297105_r0 for
// Torrvarpen with 2079 points); we preserve that layout so
// downstream `inside()` / bounds tests behave identically. Inner
// rings (islands) are still dropped per the RawPolygon schema.
function stitchRing(outerWays) {
  // Each outer way is [[lat,lon],[lat,lon]...]. Walk from the first
  // way and repeatedly find another way whose start or end matches
  // the current tail. Reverse segments if needed. Stop when we come
  // back to the starting point or run out of matches.
  if (outerWays.length === 0) return null;
  const remaining = outerWays.map((w) => w.slice());
  const first = remaining.shift();
  const ring = first.slice();
  const eq = (a, b) => Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;
  let safety = 0;
  while (remaining.length && safety++ < 10000) {
    const tail = ring[ring.length - 1];
    let matchIdx = -1;
    let reversed = false;
    for (let i = 0; i < remaining.length; i++) {
      if (eq(remaining[i][0], tail)) { matchIdx = i; reversed = false; break; }
      if (eq(remaining[i][remaining[i].length - 1], tail)) { matchIdx = i; reversed = true; break; }
    }
    if (matchIdx < 0) break;
    const seg = remaining.splice(matchIdx, 1)[0];
    if (reversed) seg.reverse();
    for (let i = 1; i < seg.length; i++) ring.push(seg[i]);
    if (eq(ring[0], ring[ring.length - 1])) break;   // closed
  }
  return ring;
}

function extractWaterFromRelations(els) {
  const out = [];
  for (const e of els) {
    if (e.type !== 'relation') continue;
    if (e.tags?.natural !== 'water' && e.tags?.water == null) continue;
    const outerWays = [];
    for (const m of e.members ?? []) {
      if (m.type !== 'way' || m.role !== 'outer' || !m.geometry) continue;
      if (m.geometry.length < 2) continue;
      outerWays.push(m.geometry.map((n) => [n.lat, n.lon]));
    }
    if (outerWays.length === 0) continue;
    const stitched = stitchRing(outerWays);
    if (!stitched || stitched.length < 3) continue;
    out.push({
      id: 'r' + e.id + '-r0',
      poly: stitched.map(([lat, lon]) => toLocal(lat, lon)),
      name: e.tags?.name ?? null
    });
  }
  return out;
}

// --- Landmarks -------------------------------------------------------
//
// Landmark records are project curation, not something OSM provides
// directly. They live in the previous world.json's `landmarks` array
// with `id`, `displayName`, `kind`, `source.osmType`/`osmId`,
// `verification` and `note`. The fetcher preserves those records
// verbatim and only refreshes `position` when the recorded OSM id
// still resolves in the current fetch (positions can drift a metre
// or two between OSM revisions).
//
// OSM node IDs are recycled aggressively — several of the 2026-07-02
// landmark node ids have since been reassigned to unrelated features
// elsewhere in the world. We do not treat that as a fatal error: if
// the OSM id no longer resolves in the current bbox, we keep the
// previous position rather than dropping the landmark.

function polyCentroid(poly) {
  let cx = 0, cz = 0, n = 0;
  for (const [x, z] of poly) { cx += x; cz += z; n++; }
  return n === 0 ? [0, 0] : [round2(cx / n), round2(cz / n)];
}

function resolveLandmarks(nodeIndex, wayIndex, previousDoc) {
  if (!previousDoc?.landmarks?.length) {
    console.warn('resolveLandmarks: no previous export supplied — landmarks array will be empty');
    return [];
  }
  const out = [];
  for (const prev of previousDoc.landmarks) {
    const source = prev.source ?? {};
    let position = prev.position;
    let resolvedFrom = 'previous-export';
    if (source.osmType === 'node' && source.osmId != null) {
      const n = nodeIndex.get(source.osmId);
      if (n) {
        position = toLocal(n.lat, n.lon);
        resolvedFrom = 'osm';
      }
    } else if (source.osmType === 'way' && source.osmId != null) {
      const w = wayIndex.get(source.osmId);
      if (w?.geometry) {
        position = polyCentroid(w.geometry.map((nd) => toLocal(nd.lat, nd.lon)));
        resolvedFrom = 'osm';
      }
    }
    if (resolvedFrom !== 'osm') {
      console.warn(`landmark ${prev.id}: OSM ${source.osmType}/${source.osmId} not in fetch — keeping previous position ${JSON.stringify(position)}`);
    }
    out.push({
      id: prev.id,
      displayName: prev.displayName,
      kind: prev.kind,
      position,
      source: { osmType: source.osmType ?? null, osmId: source.osmId ?? null, resolvedFrom },
      verification: prev.verification,
      note: prev.note
    });
  }
  return out;
}

// --- Main ------------------------------------------------------------

async function main() {
  const args = parseArgs();
  const [s, w, n, e] = BBOX;
  console.error(`Fetching Grythyttan OSM data for bbox ${s},${w},${n},${e}...`);

  // Main query — buildings, highways, simple polygon layers, amenity
  // landmarks, and all tagged nodes. Overpass returns geometry
  // inline (`out geom`) so no second node-resolution pass is needed.
  //
  // Water multipolygon relations are fetched separately (below) so
  // Overpass returns their member ways WITH member geometry — union
  // queries with `out geom` strip relation members in the current
  // Overpass version.
  const mainQuery = `
    [out:json][timeout:60];
    (
      way["building"](${s},${w},${n},${e});
      way["highway"](${s},${w},${n},${e});
      way["natural"="water"](${s},${w},${n},${e});
      way["waterway"="riverbank"](${s},${w},${n},${e});
      way["landuse"="forest"](${s},${w},${n},${e});
      way["natural"="wood"](${s},${w},${n},${e});
      way["landuse"="residential"](${s},${w},${n},${e});
      way["landuse"="grass"](${s},${w},${n},${e});
      way["leisure"](${s},${w},${n},${e});
      way["landuse"="cemetery"](${s},${w},${n},${e});
      way["amenity"](${s},${w},${n},${e});
      way["tourism"](${s},${w},${n},${e});
      node(${s},${w},${n},${e});
    );
    out geom tags;
  `;
  const waterRelationsQuery = `
    [out:json][timeout:60];
    relation["natural"="water"](${s},${w},${n},${e});
    out geom;
  `;

  async function fetchOrCache(cachePath, query) {
    if (cachePath && existsSync(cachePath)) {
      console.error(`  reading cached response from ${cachePath}`);
      return JSON.parse(readFileSync(cachePath, 'utf8'));
    }
    const r = await overpass(query);
    if (cachePath) {
      writeFileSync(cachePath, JSON.stringify(r));
      console.error(`  cached response to ${cachePath}`);
    }
    return r;
  }

  const mainCache = args.cache;
  const waterCache = args.cache ? args.cache.replace(/\.json$/, '-water.json') : null;

  const raw = await fetchOrCache(mainCache, mainQuery);
  const waterRaw = await fetchOrCache(waterCache, waterRelationsQuery);

  const els = [...(raw.elements ?? []), ...(waterRaw.elements ?? [])];
  console.error(`  fetched ${els.length} elements`);

  // Index nodes and ways by numeric id for landmark resolution.
  const nodeIndex = new Map();
  const wayIndex = new Map();
  for (const el of els) {
    if (el.type === 'node') nodeIndex.set(el.id, el);
    else if (el.type === 'way') wayIndex.set(el.id, el);
  }

  const buildings = extractBuildings(els);
  const roads = extractRoads(els);
  const water = [
    ...extractSimplePoly(els, (t) => t.natural === 'water' || t.waterway === 'riverbank'),
    ...extractWaterFromRelations(els)
  ];
  const forest = extractSimplePoly(
    els,
    (t) => t.landuse === 'forest' || t.natural === 'wood'
  );
  const residential = extractSimplePoly(els, (t) => t.landuse === 'residential');
  const grass = extractSimplePoly(
    els,
    (t) => t.landuse === 'grass' || t.leisure === 'park'
  );
  const graveyards = extractSimplePoly(
    els,
    (t) => t.landuse === 'cemetery' || t.amenity === 'grave_yard'
  );
  let previousDoc = null;
  if (args.previous && existsSync(args.previous)) {
    try {
      previousDoc = JSON.parse(readFileSync(args.previous, 'utf8'));
      console.error(`  loaded previous export from ${args.previous} for landmark fallback`);
    } catch (e) {
      console.warn(`  could not load previous export: ${e.message}`);
    }
  }
  const landmarks = resolveLandmarks(nodeIndex, wayIndex, previousDoc);

  const doc = {
    meta: {
      centerLatLon: [CENTRE_LAT, CENTRE_LON],
      mPerDeg: [M_PER_DEG_LAT, M_PER_DEG_LON],
      attribution:
        '© OpenStreetMap contributors (ODbL). Hämtad via Overpass API.',
      bbox: BBOX,
      fetched: new Date().toISOString()
    },
    buildings,
    roads,
    water,
    forest,
    residential,
    grass,
    graveyards,
    landmarks
  };

  console.error(`  buildings   ${buildings.length}`);
  console.error(`  roads       ${roads.length}   (${roads.filter((r) => r.ref).length} with ref)`);
  console.error(`  water       ${water.length}`);
  console.error(`  forest      ${forest.length}`);
  console.error(`  residential ${residential.length}`);
  console.error(`  grass       ${grass.length}`);
  console.error(`  graveyards  ${graveyards.length}`);
  console.error(`  landmarks   ${landmarks.length}`);

  writeFileSync(args.out, JSON.stringify(doc));
  console.error(`wrote ${args.out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
