// ORDER 319b — Designs D9 curiousMarker.ts och tilläggets curiousCard.ts (HATCH_LINE): markeringen
// för en nyfiken gäst som går att prata med, och repliken från luckan.
//
//   - Pratbubblan över huvudet (skärmens pixlar, samma storlek på alla nivåer): papper med mässingskant
//     och tre prickar, spetsen ned mot huvudet. Pekaren över: 1,15 gånger större, kanten guld, ringen
//     hel. Medan kortet är öppet och efter rätt svar tills gästen står i kön: fylld med guld.
//   - Bågen runt bubblan krymper medan gästen tvekar och visar hur länge det går att prata.
//   - Ringen på marken runt fötterna, streckad i mässing (0,44 m).
//   - Klick på bubblan (eller figuren, PlayerTruckCrew.tsx) öppnar kortet (CURIOUS_OPEN).
//   - Repliken: en pappersbubbla vid luckan med avsändaren (line.sender) och en av fyra repliker i tur
//     och ordning, CURIOUS.hatchLineSeconds efter att medhjälparen börjat vinka.
// Bubblan syns på krogens och gatans nivå (LevelBar.tsx levelForDistance), inte på kvarterets och byns.

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useLanguage } from '../../../content/language';
import { CURIOUS } from '../../../sim/balance';
import { curiousOf, curiousPhase, curiousTalkable } from '../../../sim/curious';
import { useCamera } from '../../camera/CameraContext';
import { useSimDispatch, useSimState } from '../../simulation/SimulationProvider';
import { levelForDistance } from '../../ui/LevelBar';
import { CURIOUS_MARKER, CuriousBubble, HatchLine } from '../../ui/curious/CuriousViews';


/** Huvudets höjd (figurens 1,7 m) där bubblans spets sitter. */
const HEAD_M = 1.75;
/** Replikens bubbla vid luckan, över hyllan. */
const LINE_HEIGHT_M = 2.35;
const RING_Y_M = 0.02;

export interface CuriousMarkerState {
  /** Den nyfikna som står vid skylten (sim/curious.ts current.seq), annars null. */
  seq: number | null;
  x: number;
  y: number;
  z: number;
  /** Gästen som ställde sig i kön efter rätt svar, och om hen står där. */
  settledGuest: { id: string; settled: boolean } | null;
  /** Repliken från luckan just nu. */
  beckon: { line: number; x: number; z: number } | null;
  /** Pekaren är över figuren (PlayerTruckCrew.tsx). */
  hover?: boolean;
}

function buildRing(): { group: THREE.Group; dashes: THREE.Mesh[]; solid: THREE.Mesh; mats: THREE.MeshBasicMaterial[] } {
  const R = CURIOUS_MARKER.ring, C = CURIOUS_MARKER.colours;
  const group = new THREE.Group();
  group.name = 'curiousRing';
  const dashMat = new THREE.MeshBasicMaterial({ color: C.ring, transparent: true, depthWrite: false });
  const solidMat = new THREE.MeshBasicMaterial({ color: C.ringTalking, transparent: true, depthWrite: false });
  const circumference = Math.PI * 2 * R.radiusM;
  const n = Math.max(1, Math.round(circumference / (R.dashM[0] + R.dashM[1])));
  // Ett streck och ett mellanrum per period, så att n perioder går jämnt runt.
  const period = (Math.PI * 2) / n, dashTheta = (period * R.dashM[0]) / (R.dashM[0] + R.dashM[1]);
  const dashes: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.RingGeometry(R.radiusM - R.widthM / 2, R.radiusM + R.widthM / 2, 4, 1, i * period, dashTheta);
    const m = new THREE.Mesh(g, dashMat);
    m.rotation.x = -Math.PI / 2;
    dashes.push(m);
    group.add(m);
  }
  const solid = new THREE.Mesh(new THREE.RingGeometry(R.radiusM - R.widthHoverM / 2, R.radiusM + R.widthHoverM / 2, 48), solidMat);
  solid.rotation.x = -Math.PI / 2;
  group.add(solid);
  group.renderOrder = 2;
  return { group, dashes, solid, mats: [dashMat, solidMat] };
}

export function CuriousMarker({ state }: { state: MutableRefObject<CuriousMarkerState> }) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const lang = useLanguage();
  const { actualRef } = useCamera();
  const bubble = useRef<THREE.Group>(null);
  const line = useRef<THREE.Group>(null);
  const ring = useMemo(buildRing, []);
  const [near, setNear] = useState(true);
  // Pekaren över bubblan (DOM) eller över figuren (PlayerTruckCrew.tsx, state.hover).
  const [bubbleHover, setBubbleHover] = useState(false);
  const [figureHover, setFigureHover] = useState(false);
  const [joinGold, setJoinGold] = useState(false);
  const [beckonLine, setBeckonLine] = useState<number | null>(null);
  const [scale, setScale] = useState(1);

  const c = curiousOf(sim);
  const cur = c.current;
  const talkable = curiousTalkable(sim);
  const talking = !!cur?.card;
  const hover = (bubbleHover || figureHover) && !talking;
  const shown = (talkable || talking || joinGold) && near;
  const gold = talking || joinGold;
  // Bågen medan gästen tvekar: andelen av fönstret som är kvar.
  const P = CURIOUS.phaseSeconds;
  const hesitateFrom = P.slowDown + P.toSign + P.read + P.smell + P.watch;
  const arc = talkable && cur && curiousPhase(cur) === 'hesitate' ? Math.max(0, Math.min(1, (CURIOUS.windowSeconds - cur.real) / (CURIOUS.windowSeconds - hesitateFrom))) : null;

  useFrame(() => {
    const m = state.current;
    const d = actualRef.current.distance;
    const lv = levelForDistance(d);
    const isNear = lv === 'room' || lv === 'street';
    if (isNear !== near) setNear(isNear);
    const h = typeof window !== 'undefined' ? window.innerHeight / 900 : 1;
    if (Math.abs(h - scale) > 0.02) setScale(h);
    // Guldbubblan över den som just ställde sig i kön, tills hen står där; en ny nyfiken går före.
    const jg = !cur && !!m.settledGuest && !m.settledGuest.settled && c.last?.grade === 'right';
    if (jg !== joinGold) setJoinGold(jg);
    const bl = m.beckon ? m.beckon.line : null;
    if (bl !== beckonLine) setBeckonLine(bl);
    const hv = !!m.hover;
    if (hv !== figureHover) setFigureHover(hv);
    const g = bubble.current;
    if (g?.parent) {
      const p = new THREE.Vector3(m.x, m.y + HEAD_M, m.z);
      g.parent.worldToLocal(p);
      g.position.copy(p);
    }
    const l = line.current;
    if (l?.parent && m.beckon) {
      const p = new THREE.Vector3(m.beckon.x, LINE_HEIGHT_M, m.beckon.z);
      l.parent.worldToLocal(p);
      l.position.copy(p);
    }
    ring.group.visible = shown;
    if (shown) {
      ring.group.position.set(m.x, RING_Y_M, m.z);
      const solid = hover || gold;
      ring.solid.visible = solid;
      for (const x of ring.dashes) x.visible = !solid;
    }
  });

  const open = () => { if (talkable) dispatch({ type: 'CURIOUS_OPEN' }); };
  return (
    <>
      <primitive object={ring.group} />
      <group ref={bubble}>
        {shown && (
          <Html center zIndexRange={[35, 0]} style={{ pointerEvents: 'none' }}>
            <CuriousBubble lang={lang} gold={gold} hover={hover} talkable={talkable} arc={arc} scale={scale} onHover={setBubbleHover} onOpen={open} />
          </Html>
        )}
      </group>
      <group ref={line}>
        {beckonLine !== null && (
          <Html center zIndexRange={[34, 0]} style={{ pointerEvents: 'none' }}>
            <HatchLine lang={lang} line={beckonLine} scale={scale} />
          </Html>
        )}
      </group>
    </>
  );
}
