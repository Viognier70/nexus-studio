// ORDER 306b — Designs D8 (decanterProps.ts): karaffen i rummet i Karaffen (vb40), på loungebord B.
// Medan situationen pågår står karaffen och ett tänt ljus i mässingsstake på bordet. När den är
// avgjord ställs den tomma flaskan bredvid, med korken på ett fat (DECANTER_STATES.cleared, och
// .failed: "Den tomma flaskan ställs ändå på bordet"). Föremålen står kvar tills kvällen är slut.
// Föremålen är 1,5 gånger verklig storlek (D8 PROP_SCALE). Rummets lokala ram (wineBarHouse.ts)
// räknas om till världen med två av loungens platser (businessRoomRef seatsLocal → seats).
// Fällan "Gör det vid baren" (flaskan och karaffen på baren) och sommelierns klipp
// (somm.lightCandle, somm.setEmptyBottle) är inte byggda; se ORDER_306B_RAPPORT.md.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useSimState } from '../simulation/SimulationProvider';
import { businessRoomRef } from './interiorSharedState';
import { SURFACE_HEIGHT } from './wineBarRoom';
import { DECANTER_PROPS } from './decanterProps';
import type { SimulationState } from '../types';

export const DECANTER_INCIDENT = 'vb40-karaffen';
const PROP_SCALE = 1.5;

/** Vad som står på bordet: ingenting, karaffen och ljuset, eller också den tomma flaskan och korkfatet. */
export function decanterState(sim: Pick<SimulationState, 'incidents' | 'day' | 'economy'>): 'none' | 'running' | 'after' {
  if (sim.economy.businessClass !== 'vinbar') return 'none';
  if (sim.incidents?.active?.id === DECANTER_INCIDENT) return 'running';
  if (sim.day.period === 'morning') return 'none';
  return (sim.incidents?.log ?? []).some((r) => r.id === DECANTER_INCIDENT) ? 'after' : 'none';
}

function build() {
  const g = new THREE.Group();
  g.name = 'decanterAtLounge';
  const glass = new THREE.MeshStandardMaterial({ color: '#d8e4e8', transparent: true, opacity: 0.45, roughness: 0.1 });
  const wine = new THREE.MeshStandardMaterial({ color: '#6e1624', roughness: 0.4 });
  const brass = new THREE.MeshStandardMaterial({ color: '#b98a3c', metalness: 0.6, roughness: 0.4 });
  const wax = new THREE.MeshStandardMaterial({ color: '#e9e0cc', roughness: 0.8 });
  const flame = new THREE.MeshBasicMaterial({ color: '#ffb05a' });
  const bottleMat = new THREE.MeshStandardMaterial({ color: '#1f3a24', roughness: 0.3 });
  const dishMat = new THREE.MeshStandardMaterial({ color: '#efe1bf', roughness: 0.7 });
  const cork = new THREE.MeshStandardMaterial({ color: '#a67c4e', roughness: 0.9 });
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number, parent: THREE.Object3D, name: string, x = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0); m.name = name; parent.add(m); return m;
  };
  // Karaffen: bred botten, smal hals. Vinet fyller den nedre delen.
  const decanter = new THREE.Group(); decanter.name = 'decanter';
  part(new THREE.SphereGeometry(0.075, 16, 12, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), glass, 0.075, decanter, 'decanterBody');
  part(new THREE.CylinderGeometry(0.018, 0.022, 0.12, 12), glass, 0.19, decanter, 'decanterNeck');
  const fill = part(new THREE.CylinderGeometry(0.06, 0.05, 0.05, 16), wine, 0.03, decanter, 'decanterWine');
  // Ljuset i mässingsstaken (Ø 0,09) med lågan och ett svagt sken (D8 light: radie 0,75, 0,3).
  const candle = new THREE.Group(); candle.name = 'decanterCandle';
  part(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 16), brass, 0.006, candle, 'candleHolder');
  part(new THREE.CylinderGeometry(0.03, 0.03, 0.15, 12), wax, 0.087, candle, 'candleWax');
  part(new THREE.ConeGeometry(0.012, 0.035, 8), flame, 0.18, candle, 'candleFlame');
  const light = new THREE.PointLight('#ffb05a', 0.3, 0.75); light.position.set(0, 0.2, 0); light.castShadow = false; candle.add(light);
  // Den tomma flaskan, stående, och korken på ett fat (Ø 0,08).
  const bottle = new THREE.Group(); bottle.name = 'emptyBottle';
  part(new THREE.CylinderGeometry(0.037, 0.037, 0.2, 12), bottleMat, 0.1, bottle, 'bottleBody');
  part(new THREE.CylinderGeometry(0.013, 0.02, 0.09, 10), bottleMat, 0.245, bottle, 'bottleNeck');
  const dish = new THREE.Group(); dish.name = 'corkDish';
  part(new THREE.CylinderGeometry(0.04, 0.035, 0.01, 16), dishMat, 0.005, dish, 'dish');
  const c = part(new THREE.CylinderGeometry(0.012, 0.012, 0.045, 10), cork, 0.022, dish, 'cork'); c.rotation.z = Math.PI / 2;
  for (const o of [decanter, candle, bottle, dish]) { o.scale.setScalar(PROP_SCALE); g.add(o); }
  return { g, decanter, candle, bottle, dish, fill, mats: [glass, wine, brass, wax, flame, bottleMat, dishMat, cork] };
}

export function DecanterAtLounge() {
  const sim = useSimState();
  const state = decanterState(sim);
  const props = useMemo(build, []);
  useEffect(() => () => props.mats.forEach((m) => m.dispose()), [props]);
  useFrame(() => {
    const room = businessRoomRef.current;
    const loc = room?.seatsLocal ?? [];
    // ORDER 323 §9 — bara där loungen står: bistron har ingen lounge, och karaffen
    // svävade vid bänkborden (rummet byggs om men klassen är fortfarande vinbaren).
    const hasLounge = (room?.seatKinds ?? []).includes('lounge');
    props.g.visible = state !== 'none' && !!room && room.businessClass === 'vinbaren' && hasLounge && loc.length > 1;
    if (!props.g.visible || !room) return;
    // Lokalt → världen ur två platser (vrid och flytta; rummet är inte skalat).
    const [a, b] = [0, loc.length - 1];
    const la = loc[a], lb = loc[b], wa = room.seats[a], wb = room.seats[b];
    const rot = Math.atan2(wb[1] - wa[1], wb[0] - wa[0]) - Math.atan2(lb[1] - la[1], lb[0] - la[0]);
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const toWorld = (p: readonly [number, number]): [number, number] => {
      const dx = p[0] - la[0], dz = p[1] - la[1];
      return [wa[0] + dx * cos - dz * sin, wa[1] + dx * sin + dz * cos];
    };
    const y = (room.plinth ?? 0) + SURFACE_HEIGHT.lounge;
    const place = (o: THREE.Object3D, p: readonly [number, number]) => { const w = toWorld(p); o.position.set(w[0], y, w[1]); };
    place(props.decanter, DECANTER_PROPS.decanter.local);
    place(props.candle, DECANTER_PROPS.candle.local);
    place(props.bottle, DECANTER_PROPS.bottle.local);
    place(props.dish, DECANTER_PROPS.corkDish.local);
    props.bottle.visible = props.dish.visible = state === 'after';
    props.fill.scale.y = state === 'after' ? DECANTER_PROPS.decanter.fill.cleared / DECANTER_PROPS.decanter.fill.decant : 1;
  });
  return <primitive object={props.g} />;
}
