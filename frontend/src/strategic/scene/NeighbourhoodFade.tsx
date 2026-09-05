// ORDER 173 §Fix — dockshus-vy för myBusiness-kameran.
//
// Problem-diagnos (frontend/reports/order173/overlap-probe.json):
// vid myBusiness-vyn (dist=24 m) står 244 mesh:er inom en 16×16 m
// kvadrat kring spelarbyggnadens footprint — grannbyggnader från
// OsmBuildings/ProceduralFacades vars väggar och tak är opaka och
// skymer sikten in i lokalen. PlayerBusiness egen roof/wall/plinth
// fejdar till opacity=0 (verifierat via `__nxPlayerBusinessOpacityMeasure`)
// men grannarnas geometri fyller frustum. VO 2026-09-05 alt B:
// "väggarna får inte skymma".
//
// **Vad denna komponent gör.** Vid mount cacheas alla mesh-material
// vars mesh-centroid ligger inom `NEIGHBOUR_FADE_RADIUS_M` från
// `PLAYER_BUSINESS_CENTROID`, undantaget PlayerBusinesss egna mesher
// (som redan har sin egen fade-loop). Per frame läses kamera-distansen
// från `useCamera().actualRef`. Om kameran är i myBusiness-vyn (dist
// under `restaurantRoofFadeMid - restaurantRoofFadeHalf`) fejdas
// grannarnas opacity mot 0 på samma kurva som PlayerBusinesss egen
// roof (smoothstep över roof-fade-bandet). Utanför bandet återställs
// opacity till 1.
//
// **Vad denna komponent INTE gör.**
// - Rör INTE OsmBuildings' render-loop eller material-cache-nycklar.
//   Vi läser referenserna via scen-traversal en gång vid mount och
//   muterar mat.opacity/mat.transparent/mat.depthWrite per frame,
//   samma mönster som PlayerBusiness roof/wall/plinth-loopen.
// - Rör INTE mesher utanför radien — grannbyggnader vid Torget som
//   inte skymer myBusiness-vyn förblir opaka. Threshold är rummets
//   fysiska radius, inte kvarterets.
// - Rör INTE mesher tillhörande PlayerBusiness (identifieras via
//   userData.playerBusinessPlinth eller ref-jämförelse med scenens
//   PlayerBusiness-mesh).

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { WORLD, PLAYER_BUSINESS_BUILDING_IDS } from '../content/world';

// Kopia av PlayerBusiness.tsx:103 (inline där). Håller samma kurva
// mellan de två fade-lopparna — om PlayerBusinesss byter formel ska
// denna följa efter.
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// PLAYER_BUSINESS_CENTROID kopieras här från viewLevels.ts — samma
// koordinater refererar spelarbyggnaden. Om w869907975 flyttas ska båda
// filerna uppdateras (finns test för OBB-mått i interiorLayout.test.ts).
function playerBusinessCentroid(): [number, number] {
  const targetId = [...PLAYER_BUSINESS_BUILDING_IDS][0];
  const b = WORLD.buildings.find((bld) => bld.id === targetId);
  if (!b) return [0, 0];
  let cx = 0, cz = 0;
  for (const [x, z] of b.poly) { cx += x; cz += z; }
  const n = Math.max(1, b.poly.length);
  return [cx / n, cz / n];
}

// Radien inom vilken grannbyggnader räknas som "skymer myBusiness-vyn".
// Ölkrogen har OBB ~14×10 m; grannbyggnaderna som konkurrerar för samma
// frustum vid pitch 50°+dist 24 ligger typiskt inom 15-25 m från centroid.
// 25 m täcker de tätaste grannarna utan att röra Torgets större
// landmärken (Gästgivaregården ~40 m bort osv).
const NEIGHBOUR_FADE_RADIUS_M = 25;

// Threshold: samma tal som `myBusiness`-preset:s distance
// (restaurantRoofFadeMid - restaurantRoofFadeHalf - 4 = 24 m).
// Grannbyggnader börjar fejda samtidigt som PlayerBusinesss roof
// börjar fejda, så vyn är sammanhållen.
const NEIGHBOUR_FADE_MID = GRAY_BOX_CAMERA.restaurantRoofFadeMid;
const NEIGHBOUR_FADE_HALF = GRAY_BOX_CAMERA.restaurantRoofFadeHalf;

interface FadeTarget {
  material: THREE.MeshStandardMaterial;
  originalTransparent: boolean;
  originalDepthWrite: boolean;
}

export function NeighbourhoodFade() {
  const { actualRef } = useCamera();
  const centre = useMemo(playerBusinessCentroid, []);
  const targetsRef = useRef<FadeTarget[]>([]);
  const collectedRef = useRef<boolean>(false);
  const groupRef = useRef<THREE.Group>(null);

  // Vid mount: traversera hela scenen (från groupRef uppåt), hitta
  // meshers vars world-centroid ligger inom NEIGHBOUR_FADE_RADIUS_M
  // från spelarbyggnaden. Kasta PlayerBusinesss egna mesher (identifieras
  // via userData.playerBusinessPlinth-flaggan för plinth, och för wall/
  // roof via att de INTE har någon userData — men enklare: uteslut alla
  // meshes vars parent-grupp innehåller en interiorGroupRef-like structur).
  //
  // För enkelhet: uteslut mesher vars material redan är transparent
  // (PlayerBusiness roof/wall/plinth är författade med `transparent`).
  useEffect(() => {
    // Vänta ett kort tag på att andra scen-komponenter (OsmBuildings,
    // ProceduralFacades, RestaurantScene, BrewpubScene) hinner mount:a
    // sina meshes så vår traversal fångar dem.
    const id = window.setTimeout(() => {
      const grp = groupRef.current;
      if (!grp || !grp.parent) return;
      // Klättra uppåt till scenen.
      let root: THREE.Object3D = grp;
      while (root.parent) root = root.parent;
      const [cx, cz] = centre;
      const box = new THREE.Box3();
      const targets: FadeTarget[] = [];
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (!mat || !('opacity' in mat)) return;
        // Skippa alla mesher som tillhör PlayerBusiness — deras fade
        // hanteras av PlayerBusinesss egen useFrame (opacity följer
        // roof/wall/plinth-fade eller interiorVisibility). Kontrollera
        // via ancestor-traversal efter en grupp med name="playerBusiness"
        // (PlayerBusiness rot-grupp sätter den flaggan).
        let ancestor: THREE.Object3D | null = mesh;
        while (ancestor) {
          if (ancestor.name === 'playerBusiness') return;
          ancestor = ancestor.parent;
        }
        // Skippa också drei-Instances (windows från OsmBuildings) — de
        // är författade transparent och har egen fade-logik.
        if (mat.transparent === true) return;
        mesh.updateMatrixWorld(true);
        box.setFromObject(mesh);
        if (!isFinite(box.min.x)) return;
        const mcx = (box.min.x + box.max.x) / 2;
        const mcz = (box.min.z + box.max.z) / 2;
        const dx = mcx - cx;
        const dz = mcz - cz;
        if (dx * dx + dz * dz > NEIGHBOUR_FADE_RADIUS_M * NEIGHBOUR_FADE_RADIUS_M) return;
        targets.push({
          material: mat,
          originalTransparent: mat.transparent,
          originalDepthWrite: mat.depthWrite
        });
      });
      targetsRef.current = targets;
      collectedRef.current = true;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info(`[order173/NeighbourhoodFade] collected ${targets.length} neighbouring meshes within ${NEIGHBOUR_FADE_RADIUS_M} m of player`);
      }
    }, 500);
    return () => window.clearTimeout(id);
  }, [centre]);

  useFrame(() => {
    if (!collectedRef.current) return;
    const dist = actualRef.current.distance;
    // Samma smoothstep-kurva som PlayerBusiness roof (rad 273-277).
    // 1 = fullt opakt (utanför myBusiness-vyn), 0 = fullt transparent
    // (djupt i myBusiness-vyn).
    const opacity = smoothstep(
      NEIGHBOUR_FADE_MID - NEIGHBOUR_FADE_HALF,
      NEIGHBOUR_FADE_MID + NEIGHBOUR_FADE_HALF,
      dist
    );
    const wantTransparent = opacity < 0.99;
    for (const t of targetsRef.current) {
      const mat = t.material;
      mat.opacity = opacity;
      if (mat.transparent !== wantTransparent) {
        mat.transparent = wantTransparent;
        mat.needsUpdate = true;
      }
      mat.depthWrite = opacity > 0.5;
    }
  });

  // Tomt group så useFrame + useEffect har mount:a-hook att bygga från.
  return <group ref={groupRef} />;
}
