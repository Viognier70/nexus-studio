// ORDER 271 — vinbaren ur Designs paket 1 (INSTRUKTION §3.2 och §6).
//
// DoD per rum (INSTRUKTION §6):
//   • Kameraprovet är tomt från åtta vinklar med spelets kamera och grannhusen.
//   • checkPaletteAgainstFloors() är tom (bandet 1,8–3,6).
//   • Platsordningen håller (checkSeatContract() finns inte i wineBarRoom.ts;
//     samma prov görs här: 20 platser, seatIndex 0..19 i ordning, bordsplatser
//     före barstolar, grupperna följer möblerna).
//
// Kameran ställs med spelets egen funktion (CameraController.applyCameraState)
// och spelets preset (viewLevels PRESETS.myBusiness) — inte med PLAYER_CAMERA,
// som leveransen själv kallar övertagna värden (FLAGS.camera). Rummet
// placeras som WineBarScene gör (createRoom + interiorLayout-OBB:n).
//
// Grannhusen: varje byggnad inom 40 m som spelet ritar, med samma volym:
// OsmBuildings (osmBuildingVolume: samma ExtrudeGeometry som renderas, plus
// taket som en låda upp till nock — större än det ritade taket, alltså ett
// strängare prov) och ProceduralFacades (buildFacade LOD 0, samma geometri
// som renderas inom 70 m). Handbyggda landmärken (CraftedLandmarks) ingår
// inte; de närmaste ligger vid Torget. Utdata: reports/order271/wineBar-camera-view.json.

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import * as THREE from 'three';
import {
  checkCameraView,
  checkPaletteAgainstFloors,
  paletteContrastRange,
  setWineWallLevel,
  updateCutaway,
  getObstacles,
  walkPathToSeat,
  exitPathFromSeat,
  TOTAL_SEATS,
  type WineBarRoom
} from '../wineBarRoom';
import { createRoom, roomSizeFor, setShellOpacity, shellOpacityForDistance } from '../businessRoom';
import { computePlayerBusinessInterior } from '../../business/interiorLayout';
import { PRESETS } from '../../camera/viewLevels';
import { applyCameraState } from '../../camera/CameraController';
import { WORLD, PLAYER_BUSINESS_BUILDING_IDS } from '../../content/world';
import { isRenderedByOsmBuildings, osmBuildingVolume } from '../OsmBuildings';
import { SKIP_PROCEDURAL_IDS } from '../ProceduralFacades';
import { paramsFor } from '../../../lib/facade/paramsFor';
import { buildFacade } from '../../../lib/facade/buildFacade';
import { SEAT_KINDS, SEAT_RULE, seatKindFromRoom } from '../figureClips';

const REPORT_DIR = resolve(__dirname, '../../../../reports/order271');

function mountLikeScene(): { room: WineBarRoom; scene: THREE.Scene; contract: ReturnType<typeof createRoom> } {
  const layout = computePlayerBusinessInterior('vinbaren');
  if (!layout) throw new Error('vinbaren saknar layout');
  const contract = createRoom('vinbaren', roomSizeFor('vinbaren', layout.width, layout.depth));
  contract.group.position.set(layout.centre[0], 0, layout.centre[1]);
  contract.group.rotation.y = -layout.worldAngle;
  const scene = new THREE.Scene();
  scene.add(contract.group);
  scene.updateMatrixWorld(true);
  return { room: contract.raw as WineBarRoom, scene, contract };
}

function hash32(s: string): number {
  // Samma FNV-1a som ProceduralFacades.hash32 (fröet till buildFacade).
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function neighbours(centre: [number, number], radius: number): { meshes: THREE.Object3D[]; ids: string[] } {
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const meshes: THREE.Object3D[] = [];
  const ids: string[] = [];
  for (const b of WORLD.buildings) {
    if (PLAYER_BUSINESS_BUILDING_IDS.has(b.id)) continue;
    const near = b.poly.some((p) => Math.hypot(p[0] - centre[0], p[1] - centre[1]) < radius);
    if (!near) continue;
    if (SKIP_PROCEDURAL_IDS.has(b.id)) {
      const f = buildFacade(b.poly, paramsFor(b.id), hash32(b.id), { lod: 0 });
      for (const g of [f.walls, f.roof, f.corners, f.sockel]) {
        if (!g) continue;
        const m = new THREE.Mesh(g, mat);
        m.name = 'neighbour_' + b.id;
        meshes.push(m);
      }
      ids.push(b.id);
      continue;
    }
    if (!isRenderedByOsmBuildings(b)) continue;
    const v = osmBuildingVolume(b);
    if (!v) continue;
    const walls = new THREE.Mesh(v.geo, mat);
    walls.name = 'neighbour_' + b.id;
    meshes.push(walls);
    if (v.ridgeH > 0) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(v.ridgeW, v.ridgeH, v.ridgeD), mat);
      roof.position.set(v.ridgeCentre[0], v.height + v.ridgeH / 2, v.ridgeCentre[1]);
      roof.rotation.y = -v.ridgeAngle;
      roof.name = 'neighbourRoof_' + b.id;
      meshes.push(roof);
    }
    ids.push(b.id);
  }
  meshes.forEach((m) => m.updateMatrixWorld(true));
  return { meshes, ids };
}

describe('ORDER 271 — vinbaren (paket 1), kontraktet', () => {
  it('createRoom("vinbaren") publicerar floorY, seatSurfaceY, seatNodeId och capacity', () => {
    const { room } = mountLikeScene();
    expect(room.capacity).toBe(TOTAL_SEATS);
    expect(room.fits).toBe(true);
    expect(room.floorY).toBeGreaterThan(0);
    for (const s of room.seats) {
      expect(s.seatNodeId).toBeTruthy();
      expect(s.seatSurfaceY).toBeCloseTo(room.floorY + s.seatHeight, 6);
    }
  });

  // ORDER 284 — "en gäst satte sig på golvet" (tredje provspelet): loungens
  // dyna låg på 0,38 m, och den sittande figurens rot (sits − SEATED_HIP_Y,
  // wineBarDirector.ts) hamnade under golvet. ORDER 286a (tillägget till
  // leverans 2): sittklippen sänker höften från golvet till sitsens egen höjd
  // (SEAT_KINDS), så varje sits ska passa sin sort; regissörens rot spärras
  // vid golvet (wineBarDirector.ts seatedY).
  it('ingen sittande gäst hamnar under golvet', () => {
    const { room } = mountLikeScene();
    for (const s of room.seats) {
      const kind = seatKindFromRoom(s.kind);
      expect(Math.abs(s.seatHeight - SEAT_KINDS[kind].height), s.id).toBeLessThanOrEqual(SEAT_RULE.seatHeightTolerance);
    }
  });

  it('platsordningen: 20 platser, seatIndex 0..19, bordsplatser före barstolar', () => {
    const { room } = mountLikeScene();
    expect(room.seats.map((s) => s.seatIndex)).toEqual(Array.from({ length: 20 }, (_, i) => i));
    const firstBar = room.seats.findIndex((s) => s.kind === 'bar');
    expect(room.seats.slice(firstBar).every((s) => s.kind === 'bar')).toBe(true);
    expect(room.seats.slice(0, firstBar).every((s) => s.kind !== 'bar')).toBe(true);
    // Möblerna som service.ts SEAT_GROUPS_VINBAREN grupperar sällskap efter.
    const byFurniture = new Map<string, number[]>();
    room.seats.forEach((s) => byFurniture.set(s.furnitureId, [...(byFurniture.get(s.furnitureId) ?? []), s.seatIndex]));
    expect([...byFurniture.values()]).toEqual([[0, 1, 2], [3, 4, 5], [6, 7], [8, 9], [10, 11], [12, 13, 14, 15], [16, 17, 18, 19]]);
  });

  it('varje plats har en väg in och ut', () => {
    const { room } = mountLikeScene();
    for (const s of room.seats) {
      const p = walkPathToSeat(room, s.id);
      expect(p[0]).toEqual(room.entrance);
      expect(p[p.length - 1]).toEqual(s.local);
      expect(exitPathFromSeat(room, s.id).slice(-1)[0]).toEqual(room.waitingSpot);
    }
  });

  it('getObstacles läser hindren ur samma meshar som renderas', () => {
    const { room } = mountLikeScene();
    const obs = getObstacles(room);
    expect(obs.length).toBeGreaterThan(10);
    expect(obs.some((o) => o.id.startsWith('wineWall'))).toBe(true);
    expect(obs.some((o) => o.id.startsWith('floor'))).toBe(false);
  });
});

describe('ORDER 271 — vinbaren, INSTRUKTION §6', () => {
  it('checkPaletteAgainstFloors() är tom (bandet 1,8–3,6)', () => {
    expect(checkPaletteAgainstFloors()).toEqual([]);
    const r = paletteContrastRange();
    expect(r.min).toBeGreaterThanOrEqual(1.8);
    expect(r.max).toBeLessThanOrEqual(3.6);
  });

  it('kameraprovet är tomt från åtta vinklar med spelets kamera och grannhusen, båda vinväggslägena', () => {
    const { room, contract } = mountLikeScene();
    const preset = PRESETS.myBusiness.target;
    // Skalet som WineBarScene tonar det vid kamerans avstånd (taket döljs vid 0).
    const shell = shellOpacityForDistance(preset.distance);
    setShellOpacity(contract, shell);
    room.parts.roof.visible = shell > 0.01;
    const { meshes, ids } = neighbours([preset.focus.x, preset.focus.z], 40);
    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 2, 5000);
    const frustum = new THREE.Frustum();
    const m = new THREE.Matrix4();
    const v = new THREE.Vector3();
    const rows: unknown[] = [];
    const failures: unknown[] = [];
    for (const level of ['bas', 'platina'] as const) {
      setWineWallLevel(room, level);
      for (let k = 0; k < 8; k++) {
        const state = { focus: { ...preset.focus }, distance: preset.distance, pitch: preset.pitch, yaw: preset.yaw + (k * Math.PI) / 4 };
        applyCameraState(camera, state);
        camera.updateMatrixWorld(true);
        const cut = updateCutaway(room, camera);
        const view = checkCameraView(room, camera, meshes);
        // I bild också, inte bara fri sikt: varje plats inom kamerans frustum.
        m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(m);
        const outOfFrame = room.seats.filter((s) => {
          v.set(s.local[0], s.seatSurfaceY + 0.95, s.local[1]);
          room.group.localToWorld(v);
          return !frustum.containsPoint(v);
        }).map((s) => s.id);
        const row = { level, yaw: +state.yaw.toFixed(3), cut, seatsSeen: view.seatsSeen, seats: view.seats,
          stationsSeen: view.stationsSeen, stations: view.stations, entranceSeen: view.entranceSeen,
          blocked: view.blocked, outOfFrame };
        rows.push(row);
        if (view.blocked.length > 0) failures.push(row);
      }
    }
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(resolve(REPORT_DIR, 'wineBar-camera-view.json'), JSON.stringify({
      source: 'src/strategic/scene/__tests__/wineBarRoom.test.ts',
      shellOpacity: shell,
      camera: { preset: 'myBusiness', distance: preset.distance, pitch: preset.pitch, fov: camera.fov, apply: 'CameraController.applyCameraState' },
      neighbours: ids,
      rows
    }, null, 2));
    expect(ids.length).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });
});
