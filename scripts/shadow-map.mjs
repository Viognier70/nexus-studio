#!/usr/bin/env node
// Render a top-down SVG "shadow map" of the current world data, at
// the same lat/lon centres and zoom as the Vision Owner's Google Maps
// screenshots. Purpose: let this agent (and Vision Owner) diagnose
// visual defects in the rendered scene by direct side-by-side
// comparison, without needing browser-side access.
//
// The projection matches scripts/fetch-grythyttan-osm.mjs so a lat/lon
// coordinate lands at the same world (x, z) as the runtime.
//
// Output: `reports/shadow-map/<zone>.svg` per zone.
//
// Usage:
//   node scripts/shadow-map.mjs               # generate all zones
//   node scripts/shadow-map.mjs --zone torget # just one zone

import { mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';

const WORLD_PATH = 'frontend/src/strategic/data/grythyttan-world.json';
const OUT_DIR = 'reports/shadow-map';

const CENTRE_LAT = 59.70575;
const CENTRE_LON = 14.53723;
const M_PER_DEG_LAT = 111132.9;
const M_PER_DEG_LON = 56060.0;

const toLocal = (lat, lon) => ({
  x: (lon - CENTRE_LON) * M_PER_DEG_LON,
  z: -(lat - CENTRE_LAT) * M_PER_DEG_LAT
});

// One zone per Vision Owner screenshot. Centre lat/lon match the URLs
// in the screenshot bar; radius is the map viewport half-width (Google
// Maps at 17z at Grythyttan latitude shows ~500 m across at native
// zoom, so radius ≈ 250 m).
// Zone radius chosen to match the Google Maps 17z field of view at
// Grythyttan latitude — ~400 m radius = 800 m viewport width matches
// what the six reference screenshots capture (including the Rv 244
// shield at the east edge of the centre view).
const ZONES = [
  { id: 'centre',       lat: 59.7050497, lon: 14.5389160, radius: 400, note: 'Screenshot 8 — Torget + Prästgatan + INGO + Rv 244 T-junction' },
  { id: 'northern',     lat: 59.7065202, lon: 14.5388660, radius: 400, note: 'Screenshot 9 — Nygatan / Norra Bergvägen / Sörgårdens' },
  { id: 'school',       lat: 59.7088748, lon: 14.5332862, radius: 400, note: 'Screenshot 10 — Grythyttans skola / IP / Fotbollsplan' },
  { id: 'central-w',    lat: 59.7064733, lon: 14.5343583, radius: 400, note: 'Screenshot 11 — Nygatan / Östergatan / Jaktakademin' },
  { id: 'western',      lat: 59.7053504, lon: 14.5324428, radius: 400, note: 'Screenshot 12 — Skolgatan / Barbellclub / Grythyttan Stålmöbler' },
  { id: 'station',      lat: 59.7031359, lon: 14.5282950, radius: 400, note: 'Screenshot 13 — Grythyttan station / Badvägen / Skiffergatan' },
  // Extra overview map covering the whole reference-package extent.
  { id: 'overview',     lat: 59.7055000, lon: 14.5370000, radius: 800, note: 'Whole-village overview covering all six reference screenshots' }
];

const args = process.argv.slice(2);
const filterZone = (() => {
  const i = args.indexOf('--zone');
  return i >= 0 ? args[i + 1] : null;
})();

const world = JSON.parse(readFileSync(WORLD_PATH, 'utf8'));

// ---------- Role helpers (mirror content/roadRoles.ts) ----------
const VILLAGE_STREET_NAMES = new Set([
  'Prästgatan', 'Torget', 'Kyrkbacken',
  'Norra Bergvägen', 'Östra Bergvägen', 'Västra Bergvägen',
  'Nygatan', 'Östergatan', 'Hantverksgatan', 'Sjögatan',
  'Hyttgatan', 'Kolargatan',
  'Stationsgatan', 'Magasinsgatan', 'Järnvägsgatan', 'Stallgatan',
  'Skolgatan', 'Kyrkogårdsgatan', 'Artur Lindqvists gata',
  'Hammargatan', 'Bergslagsgatan', 'Närkesgatan', 'Skiffergatan',
  'Badvägen', 'Gruvgatan'
]);
function roleFor(r) {
  if (r.ref === '244') return 'primary';
  switch (r.kind) {
    case 'motorway': case 'trunk': return 'primary';
    case 'primary': case 'secondary': return 'main';
    case 'tertiary': return 'secondary_connector';
    case 'unclassified': return 'local_street';
    case 'residential': case 'living_street':
      if (r.name && VILLAGE_STREET_NAMES.has(r.name)) return 'village_street';
      return 'residential';
    case 'service': return 'service';
    case 'track': return 'track';
    case 'cycleway': return 'cycleway';
    case 'footway': case 'path': case 'steps': case 'pedestrian': case 'platform': return 'footpath';
    default: return 'local_street';
  }
}
const ROLE_WIDTH = {
  primary: 10.0, main: 9.0, secondary_connector: 6.2,
  local_street: 5.0, village_street: 4.6, residential: 3.6,
  service: 2.8, track: 2.4, cycleway: 2.0, footpath: 1.3
};
const ROLE_COLOUR = {
  primary: '#c8b070', main: '#c8b070',
  secondary_connector: '#dcd0a0', village_street: '#e0d8c0',
  local_street: '#e0d8c0', residential: '#eae2c8',
  service: '#eae2c8', track: '#e6d9b8',
  cycleway: '#e6d9b8', footpath: '#efe2c0'
};

function bounds(poly) {
  let a=Infinity,b=-Infinity,c=Infinity,d=-Infinity;
  for (const [x,z] of poly) { if (x<a)a=x; if (x>b)b=x; if (z<c)c=z; if (z>d)d=z; }
  return {minX:a, maxX:b, minZ:c, maxZ:d};
}

// ---------- SVG helpers ----------
const SVG_W = 900, SVG_H = 700;
function project(x, z, zc) {
  const scale = SVG_W / (zc.radius * 2);
  return {
    sx: (x - zc.cx) * scale + SVG_W / 2,
    sy: (z - zc.cz) * scale + SVG_H / 2
  };
}

function svgLine(zc, poly, colour, width) {
  const pts = poly.map(([x,z]) => {
    const p = project(x, z, zc);
    return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
  }).join(' ');
  return `<polyline points="${pts}" stroke="${colour}" stroke-width="${width.toFixed(1)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function svgPoly(zc, poly, fill, stroke = 'none', strokeWidth = 0) {
  const pts = poly.map(([x,z]) => {
    const p = project(x, z, zc);
    return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}
function svgText(zc, x, z, text, size = 10, colour = '#333', anchor = 'middle') {
  const p = project(x, z, zc);
  return `<text x="${p.sx.toFixed(1)}" y="${p.sy.toFixed(1)}" font-family="Helvetica,Arial,sans-serif" font-size="${size}" fill="${colour}" text-anchor="${anchor}" dominant-baseline="middle">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text>`;
}
function svgCircle(zc, x, z, r, fill, stroke = 'none') {
  const p = project(x, z, zc);
  return `<circle cx="${p.sx.toFixed(1)}" cy="${p.sy.toFixed(1)}" r="${r}" fill="${fill}" stroke="${stroke}"/>`;
}

function inViewport(zc, poly, margin = 60) {
  const b = bounds(poly);
  return !(b.maxX < zc.cx - zc.radius - margin ||
           b.minX > zc.cx + zc.radius + margin ||
           b.maxZ < zc.cz - zc.radius - margin ||
           b.minZ > zc.cz + zc.radius + margin);
}
function pointIn(zc, x, z, margin = 60) {
  return x > zc.cx - zc.radius - margin && x < zc.cx + zc.radius + margin &&
         z > zc.cz - zc.radius - margin && z < zc.cz + zc.radius + margin;
}

function polylineMid(poly) {
  const mid = poly[Math.floor(poly.length / 2)];
  const a = poly[Math.max(0, Math.floor(poly.length / 2) - 1)];
  return {
    x: (mid[0] + a[0]) / 2,
    z: (mid[1] + a[1]) / 2,
    angle: Math.atan2(-(mid[1] - a[1]), mid[0] - a[0]) * 180 / Math.PI
  };
}

function polygonCentroid(poly) {
  let cx=0, cz=0, n=0;
  for (let i = 0; i < poly.length - 1; i++) { cx += poly[i][0]; cz += poly[i][1]; n++; }
  return n === 0 ? [0, 0] : [cx / n, cz / n];
}

function renderZone(zone) {
  const centre = toLocal(zone.lat, zone.lon);
  const zc = { cx: centre.x, cz: centre.z, radius: zone.radius };
  const scale = SVG_W / (zc.radius * 2);   // px per metre

  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">`);
  parts.push(`<rect width="${SVG_W}" height="${SVG_H}" fill="#f2ede0"/>`);

  // ---- Water ----
  for (const w of world.water) {
    if (w.poly.length < 3) continue;
    if (!inViewport(zc, w.poly, 200)) continue;
    parts.push(svgPoly(zc, w.poly, '#b8d2e6'));
  }
  // ---- Forest ----
  for (const f of world.forest) {
    if (f.poly.length < 3) continue;
    if (!inViewport(zc, f.poly, 100)) continue;
    parts.push(svgPoly(zc, f.poly, '#c8dcc0'));
  }
  // ---- Grass / graveyards ----
  for (const g of world.grass) {
    if (g.poly.length < 3) continue;
    if (!inViewport(zc, g.poly, 60)) continue;
    parts.push(svgPoly(zc, g.poly, '#d6e2b8'));
  }
  for (const g of world.graveyards) {
    if (g.poly.length < 3) continue;
    if (!inViewport(zc, g.poly, 60)) continue;
    parts.push(svgPoly(zc, g.poly, '#d0d8c0'));
  }
  // ---- Buildings ----
  for (const b of world.buildings) {
    if (b.poly.length < 3) continue;
    if (!inViewport(zc, b.poly)) continue;
    const isLandmark = b.name != null;
    parts.push(svgPoly(zc, b.poly, isLandmark ? '#f5e8c8' : '#e8e2d2', '#8a8478', 0.4));
  }
  // ---- Roads (in tier order: base first, primary last) ----
  const roadsByTier = { base: [], residential: [], village_street: [], local_street: [],
    secondary_connector: [], main: [], primary: [], footpath: [], cycleway: [], track: [], service: [] };
  for (const r of world.roads) {
    if (r.poly.length < 2) continue;
    if (!inViewport(zc, r.poly)) continue;
    const role = roleFor(r);
    (roadsByTier[role] || roadsByTier.base).push(r);
  }
  const drawOrder = ['footpath','cycleway','track','service','residential','village_street','local_street','secondary_connector','main','primary'];
  for (const role of drawOrder) {
    for (const r of roadsByTier[role] || []) {
      const w = (ROLE_WIDTH[role] || 3.6) * scale;
      parts.push(svgLine(zc, r.poly, ROLE_COLOUR[role] || '#e0e0e0', w));
    }
  }
  // ---- Landmarks ----
  for (const lm of world.landmarks) {
    if (!pointIn(zc, lm.position[0], lm.position[1])) continue;
    parts.push(svgCircle(zc, lm.position[0], lm.position[1], 4, '#c04040', '#fff'));
    parts.push(svgText(zc, lm.position[0], lm.position[1] - 8, lm.displayName, 10, '#a02020'));
  }
  // ---- Building names (for landmarks / named buildings) ----
  for (const b of world.buildings) {
    if (!b.name) continue;
    if (b.poly.length < 3) continue;
    const [cx, cz] = polygonCentroid(b.poly);
    if (!pointIn(zc, cx, cz)) continue;
    // Only show if not already covered by a landmark
    const covered = world.landmarks.some(l =>
      Math.hypot(l.position[0] - cx, l.position[1] - cz) < 15);
    if (covered) continue;
    parts.push(svgText(zc, cx, cz, b.name, 8, '#555'));
  }
  // ---- Street labels ----
  const shownNames = new Set();
  for (const role of drawOrder) {
    for (const r of roadsByTier[role] || []) {
      const label = r.name || (r.ref === '244' ? 'Hälleforsvägen' : r.ref === '205' ? 'Lokavägen' : null);
      if (!label) continue;
      if (shownNames.has(label)) continue;
      shownNames.add(label);
      const m = polylineMid(r.poly);
      if (!pointIn(zc, m.x, m.z, 0)) continue;
      const isMain = role === 'primary' || role === 'main';
      parts.push(`<g transform="translate(${project(m.x, m.z, zc).sx.toFixed(1)},${project(m.x, m.z, zc).sy.toFixed(1)}) rotate(${(-m.angle).toFixed(1)})">
        <text x="0" y="0" font-family="Helvetica,Arial,sans-serif" font-size="${isMain ? 11 : 9}" fill="${isMain ? '#404040' : '#606060'}" text-anchor="middle" dominant-baseline="middle" font-weight="${isMain ? 'bold' : 'normal'}">${label}</text>
      </g>`);
    }
  }
  // ---- North arrow + scale ----
  parts.push(`<g transform="translate(${SVG_W - 60},${SVG_H - 60})">
    <line x1="0" y1="30" x2="0" y2="-10" stroke="#333" stroke-width="1.5"/>
    <polygon points="-5,-5 5,-5 0,-15" fill="#333"/>
    <text x="0" y="42" font-family="Helvetica" font-size="10" fill="#333" text-anchor="middle">N</text>
  </g>`);
  const scaleBarM = 100;
  const scaleBarPx = scaleBarM * scale;
  parts.push(`<g transform="translate(20,${SVG_H - 30})">
    <line x1="0" y1="0" x2="${scaleBarPx.toFixed(0)}" y2="0" stroke="#333" stroke-width="2"/>
    <line x1="0" y1="-4" x2="0" y2="4" stroke="#333" stroke-width="2"/>
    <line x1="${scaleBarPx.toFixed(0)}" y1="-4" x2="${scaleBarPx.toFixed(0)}" y2="4" stroke="#333" stroke-width="2"/>
    <text x="${(scaleBarPx / 2).toFixed(0)}" y="-8" font-family="Helvetica" font-size="10" fill="#333" text-anchor="middle">${scaleBarM} m</text>
  </g>`);
  // ---- Header ----
  parts.push(`<g>
    <rect x="0" y="0" width="${SVG_W}" height="30" fill="#404040"/>
    <text x="10" y="15" font-family="Helvetica" font-size="12" fill="#f0e8d4" dominant-baseline="middle">Nexus shadow map · zone ${zone.id} · centre ${zone.lat.toFixed(6)}, ${zone.lon.toFixed(6)} · radius ${zone.radius} m</text>
    <text x="10" y="26" font-family="Helvetica" font-size="9" fill="#c8bfa8" dominant-baseline="middle">${zone.note}</text>
  </g>`);
  parts.push('</svg>');
  return parts.join('\n');
}

// ---------- Main ----------
mkdirSync(OUT_DIR, { recursive: true });
const zonesToRender = filterZone ? ZONES.filter((z) => z.id === filterZone) : ZONES;
for (const z of zonesToRender) {
  const svg = renderZone(z);
  const path = `${OUT_DIR}/${z.id}.svg`;
  writeFileSync(path, svg);
  console.log('wrote', path, '(' + Buffer.byteLength(svg) + ' bytes)');
}
