// ORDER 297b — två billiga detaljer ur Designs Byn i kvällsljus (byKvall.js
// update), för det som ORDER 297 §13 lämnade:
//   - kyrktornet belyses från marken när lyktorna tänds (LIGHTS.church.on):
//     tornets material lyser (0,32 vid fullt), och en ljuscirkel ligger vid
//     tornets fot (opacitet 0,35 vid fullt);
//   - sjön tar himlens sjöfärg (SKY lake) efter kvällens gång. Spelets sjö har
//     en färggradient från stranden (vertexColors); materialets färg sätts så
//     att ytans medelfärg blir himlens sjöfärg.
// Tornet och sjöns yta hittas på namnen ('church-tower' i CraftedLandmarks,
// 'lake-surface' i OsmWater). Inga nya ljuskällor.
// Monteras av EveningLighting och återställer allt när kvällen tar slut.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { LIGHTS } from './villageEvening';
import type { SkyNow } from './EveningLighting';

const TOWER_GLOW = 0.32;
const POOL_OPACITY = 0.35;
const POOL_M = 10;

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function poolTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function EveningAccents({ e, sky }: { e: number; sky: SkyNow }) {
  const { scene } = useThree();
  const pool = useMemo(() => {
    const geo = new THREE.PlaneGeometry(POOL_M, POOL_M);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: poolTexture(), color: '#ffcf9a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.renderOrder = 2;
    m.visible = false;
    return m;
  }, []);

  // Sjöns ytor och deras medelfärg (gradienten). Hittas när sjön har
  // monterats (scenens delar laddas i Suspense, kanske efter kvällsljuset).
  const lake = useRef<Array<{ mat: THREE.MeshStandardMaterial; mean: THREE.Color }> | null>(null);
  const lakeSky = useRef<THREE.Color | null>(null);
  const findLake = () => {
    const g = scene.getObjectByName('lake-surface');
    if (!g) return null;
    const items: Array<{ mat: THREE.MeshStandardMaterial; mean: THREE.Color }> = [];
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const col = mesh.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
      const mean = new THREE.Color(1, 1, 1);
      if (col && col.count > 0) {
        let r = 0, gg = 0, b = 0;
        for (let i = 0; i < col.count; i++) { r += col.getX(i); gg += col.getY(i); b += col.getZ(i); }
        mean.setRGB(r / col.count, gg / col.count, b / col.count);
      }
      items.push({ mat: mesh.material as THREE.MeshStandardMaterial, mean });
    });
    return items.length ? items : null;
  };

  useEffect(() => {
    scene.add(pool);
    return () => {
      scene.remove(pool);
      pool.geometry.dispose();
      const tower = scene.getObjectByName('church-tower') as THREE.Mesh | undefined;
      if (tower) (tower.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      for (const { mat } of lake.current ?? []) mat.color.setRGB(1, 1, 1);
    };
  }, [scene, pool]);

  useFrame(() => {
    // Sjöns färg: ytans medelfärg × materialets färg = himlens sjöfärg.
    if (!lake.current) lake.current = findLake();
    if (lake.current && lakeSky.current !== sky.lake) {
      lakeSky.current = sky.lake;
      for (const { mat, mean } of lake.current) mat.color.setRGB(sky.lake.r / Math.max(mean.r, 0.01), sky.lake.g / Math.max(mean.g, 0.01), sky.lake.b / Math.max(mean.b, 0.01));
    }
    const ch = smooth(LIGHTS.church.on[0], LIGHTS.church.on[1], e);
    const tower = scene.getObjectByName('church-tower') as THREE.Mesh | undefined;
    if (!tower) return;
    (tower.material as THREE.MeshStandardMaterial).emissiveIntensity = TOWER_GLOW * ch;
    if (!pool.visible) {
      const p = new THREE.Vector3();
      tower.getWorldPosition(p);
      pool.position.set(p.x, 0.09, p.z);
      pool.visible = true;
    }
    (pool.material as THREE.MeshBasicMaterial).opacity = POOL_OPACITY * ch;
  });
  return null;
}
