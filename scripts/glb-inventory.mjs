// ORDER 057 §3 — parse each .glb under public/assets/characters/bodies
// and report file size + bind-pose Y extent.
//
// Reads the glb binary header + JSON chunk, walks nodes to accumulate
// each mesh's world transform (translation + rotation + scale down
// the scene graph), then applies that transform to the mesh's local
// POSITION min/max recorded on each accessor. This gives the true
// bind-pose bounding box even when nodes carry a non-identity
// transform (some Quaternius exports place the mesh at Y ≈ 1 instead
// of 0). Skinning is not applied — the mesh's local vertices already
// live in bind pose for these packs.
//
// Reports raw min/max and delta, and marks whether the model sits on
// the ground plane (min ≈ 0) or floats.

import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const ROOT = 'frontend/public/assets/characters/bodies';
const TARGET_HEIGHT_M = 1.70;    // ORDER 053 unit contract, gäst stående

const GLB_MAGIC = 0x46546c67;    // "glTF"
const CHUNK_JSON = 0x4e4f534a;   // "JSON"

// -- glb parse ---------------------------------------------------------

function readGlbJson(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const magic = dv.getUint32(0, true);
  if (magic !== GLB_MAGIC) throw new Error('not a glb');
  const chunkLen = dv.getUint32(12, true);
  const chunkType = dv.getUint32(16, true);
  if (chunkType !== CHUNK_JSON) throw new Error('first chunk not JSON');
  const jsonBytes = buf.subarray(20, 20 + chunkLen);
  return JSON.parse(new TextDecoder().decode(jsonBytes));
}

// Node-transform composition. Reads translation + rotation + scale (or
// matrix) and returns a 4x4 as a flat Float64Array in column-major
// order (three.js / OpenGL convention).
function trs(node) {
  if (node.matrix) return node.matrix.slice();
  const t = node.translation ?? [0, 0, 0];
  const r = node.rotation ?? [0, 0, 0, 1];    // quaternion (x,y,z,w)
  const s = node.scale ?? [1, 1, 1];
  const [x, y, z, w] = r;
  const xx = x * x, yy = y * y, zz = z * z;
  const xy = x * y, xz = x * z, yz = y * z;
  const wx = w * x, wy = w * y, wz = w * z;
  const [sx, sy, sz] = s;
  return [
    (1 - 2 * (yy + zz)) * sx, (2 * (xy + wz)) * sx,     (2 * (xz - wy)) * sx,     0,
    (2 * (xy - wz)) * sy,     (1 - 2 * (xx + zz)) * sy, (2 * (yz + wx)) * sy,     0,
    (2 * (xz + wy)) * sz,     (2 * (yz - wx)) * sz,     (1 - 2 * (xx + yy)) * sz, 0,
    t[0], t[1], t[2], 1
  ];
}

function multiplyMat4(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[0 * 4 + r] * b[c * 4 + 0] +
        a[1 * 4 + r] * b[c * 4 + 1] +
        a[2 * 4 + r] * b[c * 4 + 2] +
        a[3 * 4 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

function applyMat4(m, p) {
  const [x, y, z] = p;
  return [
    m[0] * x + m[4] * y + m[8]  * z + m[12],
    m[1] * x + m[5] * y + m[9]  * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14]
  ];
}

// Walk the scene. For each mesh accessor's POSITION min/max, compose
// with the node's world transform and expand a world-space AABB. Note
// this is the AABB of the *box corners*; a rotated node inflates it
// slightly but never contracts it, so heights come out correctly for
// upright characters (Quaternius packs are all upright).
function computeWorldAabb(json) {
  const scene = json.scenes?.[json.scene ?? 0];
  if (!scene) return null;
  const nodes = json.nodes ?? [];
  const meshes = json.meshes ?? [];
  const accessors = json.accessors ?? [];
  let min = [ Infinity,  Infinity,  Infinity];
  let max = [-Infinity, -Infinity, -Infinity];

  function visit(nodeIndex, parentMat) {
    const node = nodes[nodeIndex];
    if (!node) return;
    const local = trs(node);
    const world = multiplyMat4(parentMat, local);
    if (node.mesh !== undefined) {
      const mesh = meshes[node.mesh];
      for (const prim of mesh?.primitives ?? []) {
        const posIdx = prim.attributes?.POSITION;
        if (posIdx === undefined) continue;
        const acc = accessors[posIdx];
        if (!acc?.min || !acc?.max) continue;
        // Expand all 8 corners of the local AABB into world space.
        const [mnx, mny, mnz] = acc.min;
        const [mxx, mxy, mxz] = acc.max;
        const corners = [
          [mnx, mny, mnz], [mxx, mny, mnz], [mnx, mxy, mnz], [mxx, mxy, mnz],
          [mnx, mny, mxz], [mxx, mny, mxz], [mnx, mxy, mxz], [mxx, mxy, mxz]
        ];
        for (const c of corners) {
          const w = applyMat4(world, c);
          for (let i = 0; i < 3; i++) {
            if (w[i] < min[i]) min[i] = w[i];
            if (w[i] > max[i]) max[i] = w[i];
          }
        }
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  }

  const rootMat = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  for (const n of scene.nodes ?? []) visit(n, rootMat);
  return Number.isFinite(min[0]) ? { min, max } : null;
}

// -- report ------------------------------------------------------------

async function walkGlb(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkGlb(p)));
    } else if (extname(entry.name).toLowerCase() === '.glb') {
      out.push(p);
    }
  }
  return out;
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const files = (await walkGlb(ROOT)).sort();
console.log(`\n${files.length} .glb file(s) under ${ROOT}\n`);
const rows = [];
for (const f of files) {
  const buf = await readFile(f);
  const size = (await stat(f)).size;
  let heightStr = '?';
  let deviationStr = '?';
  let footedStr = '?';
  try {
    const json = readGlbJson(buf);
    const aabb = computeWorldAabb(json);
    if (aabb) {
      const h = aabb.max[1] - aabb.min[1];
      const dev = h - TARGET_HEIGHT_M;
      heightStr = `${h.toFixed(3)} m`;
      deviationStr = `${dev >= 0 ? '+' : ''}${dev.toFixed(3)} m`;
      footedStr = Math.abs(aabb.min[1]) < 0.05
        ? 'on ground'
        : `y_min=${aabb.min[1].toFixed(2)}`;
    }
  } catch (err) {
    heightStr = `error: ${err.message}`;
  }
  rows.push({
    file: relative(ROOT, f),
    size: fmtBytes(size),
    height: heightStr,
    deviation: deviationStr,
    footed: footedStr
  });
}

// Pretty print
const w = {
  file: Math.max(4, ...rows.map((r) => r.file.length)),
  size: Math.max(4, ...rows.map((r) => r.size.length)),
  height: Math.max(6, ...rows.map((r) => r.height.length)),
  deviation: Math.max(10, ...rows.map((r) => r.deviation.length)),
  footed: Math.max(4, ...rows.map((r) => r.footed.length))
};
const pad = (s, n) => s.padEnd(n);
console.log(
  pad('FILE', w.file), ' | ',
  pad('SIZE', w.size), ' | ',
  pad('HEIGHT', w.height), ' | ',
  pad('Δ vs 1.70', w.deviation), ' | ',
  pad('BASE', w.footed)
);
console.log('-'.repeat(w.file + w.size + w.height + w.deviation + w.footed + 4 * 3));
for (const r of rows) {
  console.log(
    pad(r.file, w.file), ' | ',
    pad(r.size, w.size), ' | ',
    pad(r.height, w.height), ' | ',
    pad(r.deviation, w.deviation), ' | ',
    pad(r.footed, w.footed)
  );
}
console.log('');
