// ORDER 288 — gatlyktorna i kvällsbyn (Vision Owner 2026-10-01: "Ljus i
// kvällsbyn: gatlyktor, upplysta fönster och krogar som lyser när de har
// öppet. Byn ska vara stämningsfull, men det ska gå att se gator, hus och
// människor.").
//
// Lyktorna står längs byns gator (WORLD.roads utom skogsvägarna) inom
// byns kärna, en var LAMP_SPACING_M meter vid sidan av vägen. Stolpe och
// lykta är instansierade; skenet är en gloria per lykta (punkter med
// avståndsskala) som tänds med skyState.nightFactor, samma kurva som
// fönstren (ProceduralFacades). Inga punktljus: priset per ljus i
// shadern är för högt för hundratals lyktor.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { skyState } from '../../../lib/lighting/skyState';
import { WORLD } from '../../content/world';

const LAMP_SPACING_M = 32;
const LAMP_OFFSET_M = 4;
const CORE_RADIUS_M = 700;
const CORE: [number, number] = [150, 20];
const POLE_H = 4.6;

function lampPositions(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const road of WORLD.roads) {
    if (road.kind === 'track' || road.kind === 'path' || road.poly.length < 2) continue;
    let carry = LAMP_SPACING_M / 2;
    for (let i = 1; i < road.poly.length; i++) {
      const [ax, az] = road.poly[i - 1];
      const [bx, bz] = road.poly[i];
      const seg = Math.hypot(bx - ax, bz - az);
      if (seg <= 0) continue;
      let s = carry;
      while (s < seg) {
        const t = s / seg;
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        if (Math.hypot(x - CORE[0], z - CORE[1]) < CORE_RADIUS_M) {
          // Vid sidan av vägen (höger i färdriktningen).
          out.push([x + ((bz - az) / seg) * LAMP_OFFSET_M, z - ((bx - ax) / seg) * LAMP_OFFSET_M]);
        }
        s += LAMP_SPACING_M;
      }
      carry = s - seg;
    }
  }
  return out;
}

function haloTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,226,170,1)');
  g.addColorStop(0.3, 'rgba(255,196,120,0.5)');
  g.addColorStop(1, 'rgba(255,170,90,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function StreetLamps() {
  const built = useMemo(() => {
    const pos = lampPositions();
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, POLE_H, 6);
    poleGeo.translate(0, POLE_H / 2, 0);
    const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: '#2c2a28', roughness: 0.7 }), pos.length);
    const headGeo = new THREE.SphereGeometry(0.28, 10, 8);
    headGeo.translate(0, POLE_H + 0.1, 0);
    const headMat = new THREE.MeshStandardMaterial({ color: '#e8dcc0', emissive: new THREE.Color('#ffcf8a'), emissiveIntensity: 0 });
    const heads = new THREE.InstancedMesh(headGeo, headMat, pos.length);
    const m = new THREE.Matrix4();
    pos.forEach(([x, z], i) => {
      m.makeTranslation(x, 0, z);
      poles.setMatrixAt(i, m);
      heads.setMatrixAt(i, m);
    });
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos.flatMap(([x, z]) => [x, POLE_H, z]), 3));
    const tex = haloTexture();
    const haloMat = new THREE.PointsMaterial({ map: tex, size: 9, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const halos = new THREE.Points(haloGeo, haloMat);
    halos.frustumCulled = false;
    const group = new THREE.Group();
    group.add(poles, heads, halos);
    return { group, poles, heads, halos, headMat, haloMat, tex, count: pos.length };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') document.body.dataset.streetLamps = String(built.count);
    return () => {
      built.group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose?.();
      });
      built.headMat.dispose();
      built.haloMat.dispose();
      built.tex.dispose();
    };
  }, [built]);

  useFrame(() => {
    const night = skyState.nightFactor;
    built.headMat.emissiveIntensity = 2.2 * night;
    built.haloMat.opacity = 0.85 * night;
    built.halos.visible = night > 0.02;
  });

  return <primitive object={built.group} />;
}
