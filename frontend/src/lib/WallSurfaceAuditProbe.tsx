// ORDER 162 §DoD 1 — dev-only probe that exposes wall-surface audit hooks
// on window for the playwright utredningsscript. Renders nothing.
//
// The order asks a specific question — vad ritar grannarna vid ground-Y
// som PlayerBusiness inte ritar? Answering it needs three primitives the
// script cannot reach on its own:
//   1. Scene traversal to find the two wall meshes by userData tag.
//   2. Vertex Y-distribution per band from THREE.BufferGeometry position
//      attribute (raw arithmetic; no rendering involved).
//   3. Framebuffer pixel readback at specific CSS coordinates (needs
//      the WebGL context that R3F owns).
// One probe component covers all three so no other module has to grow
// a dev hook. Tree-shaken from prod bundles by the `import.meta.env.DEV`
// gate at the mount site (StrategicScene.tsx).

import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

// eslint-disable-next-line no-console
console.log('[WallSurfaceAuditProbe] module loaded');

interface YHistBand {
  yMinM: number;   // inclusive lower bound
  yMaxM: number;   // exclusive upper bound (except top band)
  count: number;
}

interface MaterialSnapshot {
  color: string;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  side: 'front' | 'back' | 'double';
}

interface MeshSnapshot {
  found: boolean;
  vertexCount?: number;
  yHistogram?: YHistBand[];
  worldAABB?: { xMinM: number; xMaxM: number; yMinM: number; yMaxM: number; zMinM: number; zMaxM: number };
  material?: MaterialSnapshot;
  matchTag?: string;
}

function materialSnapshot(mat: THREE.Material | THREE.Material[] | undefined): MaterialSnapshot | undefined {
  if (!mat) return undefined;
  const m = Array.isArray(mat) ? mat[0] : mat;
  const std = m as THREE.MeshStandardMaterial;
  const colour = std.color ? '#' + std.color.getHexString() : '#000000';
  const side =
    std.side === THREE.DoubleSide ? 'double'
    : std.side === THREE.BackSide ? 'back'
    : 'front';
  return {
    color: colour,
    opacity: std.opacity ?? 1,
    transparent: std.transparent ?? false,
    depthWrite: std.depthWrite ?? true,
    side
  };
}

function yHistogramFromGeometry(geo: THREE.BufferGeometry, bands: Array<[number, number]>): { hist: YHistBand[]; count: number; aabbY: [number, number] } {
  const pos = geo.getAttribute('position');
  const hist: YHistBand[] = bands.map(([a, b]) => ({ yMinM: a, yMaxM: b, count: 0 }));
  let yMin = Infinity;
  let yMax = -Infinity;
  const n = pos.count;
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i);
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
    for (const band of hist) {
      if (y >= band.yMinM && y < band.yMaxM) { band.count += 1; break; }
    }
  }
  // Also count vertices exactly at the top of the top band (inclusive).
  const top = hist[hist.length - 1];
  if (top) {
    for (let i = 0; i < n; i++) {
      const y = pos.getY(i);
      if (y === top.yMaxM) top.count += 1;
    }
  }
  return { hist, count: n, aabbY: [yMin, yMax] };
}

function worldAABB(mesh: THREE.Mesh): { xMinM: number; xMaxM: number; yMinM: number; yMaxM: number; zMinM: number; zMaxM: number } {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  return {
    xMinM: box.min.x, xMaxM: box.max.x,
    yMinM: box.min.y, yMaxM: box.max.y,
    zMinM: box.min.z, zMaxM: box.max.z
  };
}

function findMeshByUserData(scene: THREE.Scene, key: string): THREE.Mesh | null {
  let hit: THREE.Mesh | null = null;
  scene.traverse((o) => {
    if (hit) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && m.userData && m.userData[key] === true) hit = m;
  });
  return hit;
}

function findAllMeshesByUserData(scene: THREE.Scene, key: string): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.userData && m.userData[key] === true) out.push(m);
  });
  return out;
}

function centroidXZ(mesh: THREE.Mesh): [number, number] {
  const box = new THREE.Box3().setFromObject(mesh);
  return [(box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2];
}

// Y-bands used for both walls. Choice motivation:
//   ground-band [0, 0.10) captures the bottom-cap vertices ExtrudeGeometry
//     places at y=0; sideWallGeometry places its bottom edge there too, so
//     both meshes will have non-zero counts. The DIFFERENCE is that the
//     extrusion adds cap-fan triangles that share those y=0 vertices at
//     the cap centre, giving a higher count for the neighbour. This band
//     answers §2.1.1.
//   mid-band [0.10, 5.50) is the wall interior — vertex counts here reflect
//     side-quad density.
//   top-band [5.50, 7.50] captures the WALL_HEIGHT_M=6.50 top edge. The
//     neighbour ExtrudeGeometry adds top-cap vertices at y=height; the
//     PlayerBusiness sideWallGeometry does not.
// Bands are authored — they answer a specific question about cap presence.
const Y_BANDS: Array<[number, number]> = [
  [0.0, 0.1],
  [0.1, 5.5],
  [5.5, 20.0]
];

export function WallSurfaceAuditProbe() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;

    (window as unknown as { __nxWallSurfaceAudit?: () => object }).__nxWallSurfaceAudit = () => {
      // Player wall — tagged by PlayerBusiness.tsx via userData.
      const playerWall = findMeshByUserData(scene, 'playerBusinessWall');
      const playerSnap: MeshSnapshot = { found: false };
      let playerCentroid: [number, number] | null = null;
      if (playerWall) {
        const h = yHistogramFromGeometry(playerWall.geometry, Y_BANDS);
        playerSnap.found = true;
        playerSnap.vertexCount = h.count;
        playerSnap.yHistogram = h.hist;
        playerSnap.worldAABB = worldAABB(playerWall);
        playerSnap.material = materialSnapshot(playerWall.material);
        playerSnap.matchTag = 'userData.playerBusinessWall';
        playerCentroid = centroidXZ(playerWall);
      }

      // Neighbour wall — closest OsmBuildings mesh to player centroid.
      const allNeighbours = findAllMeshesByUserData(scene, 'osmBuildingWall');
      let neighbourSnap: MeshSnapshot = { found: false };
      let neighbourId: string | null = null;
      let neighbourCentroid: [number, number] | null = null;
      if (playerCentroid && allNeighbours.length > 0) {
        let bestD = Infinity;
        let best: THREE.Mesh | null = null;
        for (const n of allNeighbours) {
          const c = centroidXZ(n);
          const dx = c[0] - playerCentroid[0];
          const dz = c[1] - playerCentroid[1];
          const d = dx * dx + dz * dz;
          if (d < bestD) { bestD = d; best = n; }
        }
        if (best) {
          const h = yHistogramFromGeometry(best.geometry, Y_BANDS);
          neighbourSnap.found = true;
          neighbourSnap.vertexCount = h.count;
          neighbourSnap.yHistogram = h.hist;
          neighbourSnap.worldAABB = worldAABB(best);
          neighbourSnap.material = materialSnapshot(best.material);
          neighbourSnap.matchTag = 'userData.osmBuildingWall (closest)';
          neighbourId = (best.userData as { osmBuildingId?: string }).osmBuildingId ?? null;
          neighbourCentroid = centroidXZ(best);
        }
      }

      // Neighbour plinth — closest OsmBuildings plinth to neighbour centroid,
      // so we compare like-for-like (a neighbour whose wall has been picked
      // will also have its plinth picked).
      const allNeighbourPlinths = findAllMeshesByUserData(scene, 'osmBuildingPlinth');
      let neighbourPlinthMat: MaterialSnapshot | undefined;
      let neighbourPlinthAABB: { xMinM: number; xMaxM: number; yMinM: number; yMaxM: number; zMinM: number; zMaxM: number } | undefined;
      if (neighbourCentroid && allNeighbourPlinths.length > 0) {
        let bestD = Infinity;
        let best: THREE.Mesh | null = null;
        for (const p of allNeighbourPlinths) {
          const c = centroidXZ(p);
          const dx = c[0] - neighbourCentroid[0];
          const dz = c[1] - neighbourCentroid[1];
          const d = dx * dx + dz * dz;
          if (d < bestD) { bestD = d; best = p; }
        }
        if (best) {
          neighbourPlinthMat = materialSnapshot(best.material);
          neighbourPlinthAABB = worldAABB(best);
        }
      }

      // Player plinth — via existing userData tag from PlayerBusiness.tsx.
      const playerPlinth = findMeshByUserData(scene, 'playerBusinessPlinth');
      let playerPlinthMat: MaterialSnapshot | undefined;
      let playerPlinthAABB: { xMinM: number; xMaxM: number; yMinM: number; yMaxM: number; zMinM: number; zMaxM: number } | undefined;
      if (playerPlinth) {
        playerPlinthMat = materialSnapshot(playerPlinth.material);
        playerPlinthAABB = worldAABB(playerPlinth);
      }

      // Camera pose so the finding can cite where the observation is made.
      camera.updateMatrixWorld(true);
      const cameraPos = camera.position.toArray() as [number, number, number];

      return {
        playerCentroidXZ: playerCentroid,
        neighbourId,
        neighbourCentroidXZ: neighbourCentroid,
        distanceToNeighbourM: (playerCentroid && neighbourCentroid)
          ? Math.hypot(playerCentroid[0] - neighbourCentroid[0], playerCentroid[1] - neighbourCentroid[1])
          : null,
        cameraWorldPos: cameraPos,
        canvasSize: { widthCss: size.width, heightCss: size.height },
        playerWall: playerSnap,
        neighbourWall: neighbourSnap,
        playerPlinth: playerPlinth
          ? { found: true, material: playerPlinthMat, worldAABB: playerPlinthAABB }
          : { found: false },
        neighbourPlinth: neighbourPlinthMat
          ? { found: true, material: neighbourPlinthMat, worldAABB: neighbourPlinthAABB }
          : { found: false }
      };
    };

    // Project a world (x, y, z) coordinate to CSS pixel (top-left origin).
    (window as unknown as { __nxProjectToScreen?: (x: number, y: number, z: number) => { xCss: number; yCss: number; behindCamera: boolean } }).__nxProjectToScreen = (x, y, z) => {
      const v = new THREE.Vector3(x, y, z);
      camera.updateMatrixWorld(true);
      v.project(camera);
      // NDC → CSS pixel (top-left origin).
      const xCss = (v.x + 1) * 0.5 * size.width;
      const yCss = (1 - (v.y + 1) * 0.5) * size.height;
      return { xCss, yCss, behindCamera: v.z > 1 };
    };

    // Read one pixel from the default framebuffer at a CSS pixel coordinate.
    // Returns average RGB over a 3×3 patch so a single subpixel edge does
    // not dominate. Requires preserveDrawingBuffer=true which StrategicScene
    // sets under DEV.
    (window as unknown as { __nxReadCanvasPixel?: (xCss: number, yCss: number) => { r: number; g: number; b: number; samples: number } }).__nxReadCanvasPixel = (xCss, yCss) => {
      gl.setRenderTarget(null);
      const ctx = gl.getContext();
      const dpr = gl.getPixelRatio();
      const wPx = Math.floor(size.width * dpr);
      const hPx = Math.floor(size.height * dpr);
      const patch = 3;
      const half = Math.floor(patch / 2);
      const xPx = Math.max(0, Math.min(wPx - patch, Math.floor(xCss * dpr - half)));
      // Flip Y for gl bottom-left origin.
      const yTopPx = Math.max(0, Math.min(hPx - patch, Math.floor(yCss * dpr - half)));
      const yGl = hPx - yTopPx - patch;
      const buf = new Uint8Array(patch * patch * 4);
      ctx.readPixels(xPx, yGl, patch, patch, ctx.RGBA, ctx.UNSIGNED_BYTE, buf);
      let rs = 0, gs = 0, bs = 0;
      const n = patch * patch;
      for (let i = 0; i < n; i++) {
        rs += buf[i * 4 + 0];
        gs += buf[i * 4 + 1];
        bs += buf[i * 4 + 2];
      }
      return { r: Math.round(rs / n), g: Math.round(gs / n), b: Math.round(bs / n), samples: n };
    };

    return () => {
      const w = window as unknown as {
        __nxWallSurfaceAudit?: unknown;
        __nxProjectToScreen?: unknown;
        __nxReadCanvasPixel?: unknown;
      };
      delete w.__nxWallSurfaceAudit;
      delete w.__nxProjectToScreen;
      delete w.__nxReadCanvasPixel;
    };
  }, [scene, gl, camera, size.width, size.height]);

  return null;
}
