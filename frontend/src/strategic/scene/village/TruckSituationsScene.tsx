// ORDER 320 — Designs D10 (nexus-leverans-2026-10-08-d10-vid-vagnen): det som syns vid vagnen i de sex nya
// situationerna (sim/truckSituations.ts situationTonight), i vagnens ram utom Grillvagnens skylt:
//   - Regnet (ft08): efter ett helt grepp står ståbord A in under markisen (RAIN_TABLE.to) resten av kvällen.
//   - Getingen (ft09): getingar i öglor kring ketchupen på hyllan och en öppen burk på bord A (WASP_SCALE), under
//     förvarningen och kortet; efter lock på såserna (helt grepp, eller halvt mot analysen) står locken på och
//     getingarna vid hyllan flyger i väg.
//   - Kortläsaren (ft10): den brutna ringen blinkar i mässing (TERMINAL.errorBlinkHz) och HUD-nålen säger "Ingen
//     kontakt"; efter ett helt grepp nålen vid Swish-skylten en stund.
//   - Korven (ft11): lådan visar korvarna kvar ur simuleringen (sausagesLeft, högst SAUSAGE_BOX platser); tomma
//     platser är papper.
//   - Hunden (ft12): en hund i koppel vid ståbord A som nosar; efter ett helt grepp vid vattenskålen, där den
//     dricker och lägger sig.
//   - Grillvagnen (ft13): en gatupratare med gul lapp vid Grillvagnen på torget, med HUD-nålen "Halv special
//     {price}" (RIVAL_PRICES.halfSpecial).
// Ljudlöst och utan text i bilden; nålarna är HUD (TruckPin.tsx).

import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RIVAL_PRICES, SAUSAGE } from '../../../sim/balance';
import { situationTonight } from '../../../sim/truckSituations';
import { truckOf } from '../../../sim/truckLife';
import { useSimState } from '../../simulation/SimulationProvider';
import { TruckPin } from '../../ui/curious/TruckPin';
import { t as tt } from '../../../content/nexusStrings';
import { useLanguage } from '../../../content/language';
import { DECK_TOP_M, TRUCK_LAYOUT, onDeck } from '../playerTruck';
import { TRUCK_PROPS, WATER_BOWL_AT } from '../truckProps';
import { RAIN_TABLE, RIVAL_SIGN, SAUSAGE_BOX, SHELF_D10, TERMINAL, SWISH_SIGN, WASP_SCALE, PAY_LEDGE } from '../truckPropsD10';
import { TRUCK_STANDS } from '../../content/villagePlaces';
import type { TruckFrame } from './truckGuestFlow';

type Vec2 = [number, number];

/** Grillvagnens ram i Designs D10 (rivalTorget.ts): yawForThree, luckan i ramens +Z. */
export const RIVAL_YAW = -3.7103;
/** Getingen: 0,015 m, ritad WASP_SCALE gånger; öglornas radie (Designs wasp.fly 0,14–0,17 m) och varv per sekund. */
const WASP = { sizeM: 0.015, loopR: [0.14, 0.17] as const, hz: 0.9, shelf: 4, can: 2, leaveS: 1.8 };
/** Korvarna i lådan: platsernas rader och kolumner (SAUSAGE_BOX). */
const BOX_TOP_M = 0.5 + TRUCK_LAYOUT.grill.top + 0.1;
/** Swish-nålen står så här länge efter ett helt grepp i ft10 (spelets sekunder). */
const SWISH_PIN_S = 12;
/** Ståbord A bärs in under markisen på så här många sekunder (Designs carryTable 3,2 s och lyft/ställ). */
const TABLE_MOVE_S = 5;

function dogMesh(): THREE.Group {
  // Hunden (D10 dog: 0,80 × 0,30 m, 0,55 m hög): kropp, huvud, nos, öron, fyra ben och svans, i brunt.
  const g = new THREE.Group();
  g.name = 'dog';
  const fur = new THREE.MeshStandardMaterial({ color: '#7a5636', roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#3f2c1d', roughness: 0.9 });
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, name: string) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.name = name; o.castShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(0.24, 0.22, 0.5), fur, 0, 0.38, 0, 'dogBody');
  const head = new THREE.Group(); head.name = 'dogHead'; head.position.set(0, 0.5, 0.3); g.add(head);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.16, 0.18), fur); h.position.set(0, 0.04, 0.06); head.add(h);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.1), dark); nose.position.set(0, 0.0, 0.18); head.add(nose);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.05), dark); ear.position.set(0.07 * s, 0.13, 0.02); head.add(ear); }
  for (const [x, z] of [[-0.08, 0.18], [0.08, 0.18], [-0.08, -0.18], [0.08, -0.18]]) add(new THREE.BoxGeometry(0.06, 0.28, 0.06), fur, x, 0.14, z, 'dogLeg');
  const tail = add(new THREE.BoxGeometry(0.04, 0.04, 0.2), dark, 0, 0.45, -0.32, 'dogTail');
  tail.rotation.x = -0.6;
  return g;
}

export function TruckSituationsScene({ at }: { at: TruckFrame }) {
  const sim = useSimState();
  const lang = useLanguage();
  const { scene } = useThree();
  const rain = situationTonight(sim, 'ft08-regnet');
  const wasp = situationTonight(sim, 'ft09-getingen');
  const card = situationTonight(sim, 'ft10-kortet');
  const dog = situationTonight(sim, 'ft12-hunden');
  const rival = situationTonight(sim, 'ft13-priset');
  const truck = truckOf(sim);

  const parts = useMemo(() => {
    const g = new THREE.Group();
    g.name = 'truckSituations';
    // Korvarna i lådan: en korv eller ett papper per plats.
    const SB = SAUSAGE_BOX;
    const sausage = new THREE.MeshStandardMaterial({ color: '#c47a55', roughness: 0.6 });
    const paper = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.95 });
    const dx = (SB.x1 - SB.x0) / SB.cols, dz = (SB.z1 - SB.z0) / SB.rows;
    const slots = Array.from({ length: SB.cols * SB.rows }, (_, i) => {
      const c = i % SB.cols, r = Math.floor(i / SB.cols);
      const m = new THREE.Mesh(new THREE.BoxGeometry(dx * 0.7, 0.03, dz * 0.8), sausage);
      m.position.set(SB.x0 + dx * (c + 0.5), BOX_TOP_M, SB.z0 + dz * (r + 0.5));
      g.add(m);
      return m;
    });
    // Getingarna: små mörka kroppar med gult band, WASP_SCALE gånger verklig storlek.
    const waspMat = new THREE.MeshStandardMaterial({ color: '#2a2418', roughness: 0.5 });
    const waspBand = new THREE.MeshStandardMaterial({ color: '#e6bb34', roughness: 0.5 });
    const wasps = Array.from({ length: WASP.shelf + WASP.can }, (_, i) => {
      const w = new THREE.Group();
      const s = WASP.sizeM * WASP_SCALE;
      const body = new THREE.Mesh(new THREE.SphereGeometry(s / 2, 8, 6), waspMat); body.scale.set(0.6, 0.6, 1.2); w.add(body);
      const band = new THREE.Mesh(new THREE.SphereGeometry(s / 2.2, 8, 6), waspBand); band.scale.set(0.62, 0.62, 0.4); w.add(band);
      w.visible = false;
      w.userData.seed = i;
      g.add(w);
      return w;
    });
    // Hunden.
    const d = dogMesh();
    d.visible = false;
    g.add(d);
    // Grillvagnens skylt: gatupratare med gul lapp (D10 RIVAL_SIGN), i byns ram.
    const sign = new THREE.Group();
    sign.name = 'rivalSign';
    const frame = new THREE.Mesh(new THREE.BoxGeometry(RIVAL_SIGN.size[0], RIVAL_SIGN.size[1], 0.05), new THREE.MeshStandardMaterial({ color: '#5e4b3a', roughness: 0.8 }));
    frame.position.y = RIVAL_SIGN.size[1] / 2;
    frame.rotation.x = -0.2;
    const notice = new THREE.Mesh(new THREE.BoxGeometry(RIVAL_SIGN.size[0] * 0.7, RIVAL_SIGN.size[1] * 0.4, 0.01), new THREE.MeshStandardMaterial({ color: RIVAL_SIGN.notice, roughness: 0.7 }));
    notice.position.set(0, RIVAL_SIGN.size[1] * 0.6, 0.04);
    notice.rotation.x = -0.2;
    sign.add(frame, notice);
    sign.visible = false;
    return { g, slots, sausage, paper, wasps, dog: d, sign };
  }, []);

  useEffect(() => () => {
    for (const root of [parts.g, parts.sign]) root.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose?.(); });
  }, [parts]);

  // Grillvagnens skylt i byns ram: Designs ram med luckan i +Z (RIVAL_YAW).
  const signAt = useMemo((): Vec2 => {
    const s = TRUCK_STANDS.torget, c = Math.cos(RIVAL_YAW), n = Math.sin(RIVAL_YAW);
    return [s.x + RIVAL_SIGN.p[0] * c + RIVAL_SIGN.p[1] * n, s.z - RIVAL_SIGN.p[0] * n + RIVAL_SIGN.p[1] * c];
  }, []);
  const tableMove = useRef<{ from: number | null }>({ from: null });

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Kontrollskriptet (scripts/order320-check.mjs) läser situationernas läge härifrån.
    if (typeof window !== 'undefined') (window as unknown as { __nxTruckSituations?: unknown }).__nxTruckSituations = { rain, wasp, card, dog, rival, sausagesLeft: truck.sausagesLeft };
    // Korvarna i lådan.
    const left = Math.min(SAUSAGE.boxPlaces, truck.sausagesLeft ?? SAUSAGE.perEvening);
    parts.slots.forEach((m, i) => { m.material = i < left ? parts.sausage : parts.paper; });
    const trailer = scene.getObjectByName('playerTrailer');
    // Kortläsaren: den brutna ringen blinkar under förvarningen och kortet.
    const ring = trailer?.getObjectByName('terminalRing');
    if (ring) ring.visible = (card.phase === 'cue' || card.phase === 'active') && Math.sin(t * 2 * Math.PI * TERMINAL.errorBlinkHz) > 0;
    // Locken på såserna efter ett helt grepp, eller ett halvt mot analysen (lock men gästen kvar).
    const lids = wasp.phase === 'done' && (wasp.quality === 'best' || (wasp.quality === 'ok' && wasp.halfGrip === 'analysis'));
    for (const n of ['Ketchup', 'Mustard', 'MildMustard']) { const l = trailer?.getObjectByName('sauceLid' + n); if (l) l.visible = lids; }
    // Getingarna: kring ketchupen och burken på bord A, under situationen; efter locken flyger de vid hyllan i väg.
    const waspsOn = wasp.phase === 'cue' || wasp.phase === 'active' || (wasp.phase === 'done' && !lids && sim.simTime - wasp.at < SWISH_PIN_S);
    const leaving = wasp.phase === 'done' && lids ? sim.simTime - wasp.at : -1;
    const A = TRUCK_PROPS.standTable.at.A;
    parts.wasps.forEach((w, i) => {
      const atShelf = i < WASP.shelf;
      const gone = atShelf && leaving >= WASP.leaveS;
      w.visible = (waspsOn || (atShelf && leaving >= 0 && !gone));
      if (!w.visible) return;
      const cx = atShelf ? SHELF_D10.ketchup[0] : A[0] + 0.1, cz = atShelf ? SHELF_D10.ketchup[1] : A[1] + 0.1;
      const cy = atShelf ? TRUCK_PROPS.shelf.height + 0.35 : DECK_TOP_M + TRUCK_PROPS.standTable.top.height + 0.2;
      const r = WASP.loopR[0] + (WASP.loopR[1] - WASP.loopR[0]) * ((i * 37) % 10) / 10;
      const ph = t * 2 * Math.PI * WASP.hz + i * 1.7;
      const away = atShelf && leaving >= 0 ? leaving / WASP.leaveS : 0;
      w.position.set(cx + r * Math.cos(ph) + away * 3, cy + 0.05 * Math.sin(ph * 2.3) + away * 2, cz + r * Math.sin(ph * 1.3));
      w.rotation.y = -ph;
    });
    // Hunden: vid ståbord A under situationen, vid vattenskålen efter ett helt grepp (resten av kvällen den gästen
    // är kvar), annars borta när situationen är avgjord.
    const atBowl = dog.phase === 'done' && dog.quality === 'best';
    parts.dog.visible = dog.phase === 'cue' || dog.phase === 'active' || (dog.phase === 'done' && sim.simTime - dog.at < SWISH_PIN_S * 4);
    if (parts.dog.visible) {
      const [x, z] = atBowl ? [WATER_BOWL_AT[0] - 0.45, WATER_BOWL_AT[1]] : [A[0] - 0.2, A[1] + 0.85];
      parts.dog.position.set(x, onDeck(x, z) ? DECK_TOP_M : 0, z);
      parts.dog.rotation.y = atBowl ? Math.PI / 2 : Math.PI;
      const head = parts.dog.getObjectByName('dogHead');
      const lie = atBowl && sim.simTime - (dog.phase === 'done' ? dog.at : 0) > SWISH_PIN_S;
      parts.dog.scale.y = lie ? 0.6 : 1;
      if (head) head.rotation.x = atBowl && !lie ? 0.5 + 0.1 * Math.sin(t * 6) : 0.15 * Math.sin(t * 3);
      const tail = parts.dog.getObjectByName('dogTail');
      if (tail) tail.rotation.y = 0.5 * Math.sin(t * 8);
    }
    // Grillvagnens skylt resten av kvällen när situationen har kommit.
    parts.sign.visible = rival.phase !== 'none';
    parts.sign.position.set(signAt[0], 0, signAt[1]);
    parts.sign.rotation.y = RIVAL_YAW;
    // Regnet: ståbord A bärs in under markisen efter ett helt grepp.
    const moved = rain.phase === 'done' && rain.quality === 'best';
    if (moved && tableMove.current.from === null) tableMove.current.from = t;
    if (!moved) tableMove.current.from = null;
    const k = moved ? Math.min(1, (t - (tableMove.current.from ?? t)) / TABLE_MOVE_S) : 0;
    for (const name of ['standTableA', 'standTableLegA', 'standTableBaseA', 'napkinHolderA', 'napkinHolderANapkins']) {
      trailer?.traverse((o) => {
        if (o.name !== name) return;
        if (!o.userData.home) o.userData.home = o.position.clone();
        const h = o.userData.home as THREE.Vector3;
        const tx = h.x + (RAIN_TABLE.to[0] - A[0]) * k, tz = h.z + (RAIN_TABLE.to[1] - A[1]) * k;
        // Från däcket ned på marken under markisen.
        o.position.set(tx, h.y - DECK_TOP_M * k, tz);
      });
    }
  });

  const swish = card.phase === 'done' && card.quality === 'best' && sim.simTime - card.at < SWISH_PIN_S;
  const k15 = TRUCK_PROPS.napkinHolder.gameScale;
  return (
    <>
      <group position={[at.x, 0, at.z]} rotation={[0, at.rotationY, 0]}>
        <primitive object={parts.g} />
        {(card.phase === 'cue' || card.phase === 'active') && (
          <Html position={[TERMINAL.p[0], PAY_LEDGE.height + TERMINAL.size[1] * k15 + 0.15, TERMINAL.p[1]]} center zIndexRange={[33, 0]} style={{ pointerEvents: 'none' }}>
            <TruckPin who="pin.terminal.who" text="pin.terminal.text" testId="truck-pin-terminal" />
          </Html>
        )}
        {swish && (
          <Html position={[SWISH_SIGN.p[0], PAY_LEDGE.height + SWISH_SIGN.size[1] * k15 + 0.15, SWISH_SIGN.p[1]]} center zIndexRange={[33, 0]} style={{ pointerEvents: 'none' }}>
            <TruckPin who="pin.swish.who" text="pin.swish.text" testId="truck-pin-swish" />
          </Html>
        )}
      </group>
      <primitive object={parts.sign} />
      {rival.phase !== 'none' && (
        <Html position={[signAt[0], RIVAL_SIGN.size[1] + 0.35, signAt[1]]} center zIndexRange={[33, 0]} style={{ pointerEvents: 'none' }}>
          <TruckPin who="pin.rival.who" text="pin.rival.text" vars={{ price: tt(lang, 'menu.price', { n: RIVAL_PRICES.halfSpecial }) }} testId="truck-pin-rival" />
        </Html>
      )}
    </>
  );
}
