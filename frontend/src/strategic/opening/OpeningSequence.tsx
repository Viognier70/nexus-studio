// ORDER 308 — öppningen före första morgonen (Designs D2, omtag 2026-10-04,
// documentation/leveranser/nexus-leverans-2026-10-04-oppningen-omtag/).
//
// Ordningen (Anders 2026-10-05): startskärmen → Nytt spel → namn och samtycke
// → öppningen → första morgonen. Öppningen är 41 s och slutar i svärta; första
// morgonen tonar upp ur samma svärta (LEVERANSNOT 2026-10-03 §4: "Bussens scen
// tonar upp ur samma svärta, så det finns inget klipp mellan dem"; bussen är
// borttagen ur starten, ORDER 300 §4, så morgonen tar dess plats).
//
// Överlägget äger klockan och ritar det som ligger över bilden: vinbarens två
// scener (egna dukar, openingBar.ts), raderna, nålarna, svärtan och Hoppa över.
// Byn är spelets egen scen under överlägget: kameran ställs varje bildruta på
// manusets kameraläge (spelets CameraContext, utan dämpning), kvällen och
// ljusnivån går via openingStage.ts till DayLighting, och Ingrid ritas av
// OpeningMentor. HUD:en är dold medan öppningen pågår (opening.css).
//
// Hoppa över: efter 3 s med en knapp, en tangent eller ett klick (LEVERANSNOT
// §3); den som har sett öppningen förut kan hoppa över direkt. Med
// prefers-reduced-motion står kameran still i varje bild (openingTimeline.ts
// REDUCED_HOLD), raderna lyfts inte, och klippen och texten är desamma.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { strings } from '../../content/strings';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useCamera } from '../camera/CameraContext';
import { applyCameraState } from '../camera/CameraController';
import type { CameraTarget } from '../types';
import * as M from './oppningManus';
import { OpeningBarStage } from './openingBar';
import { openingSceneReady, setOpeningStage } from './openingStage';
import {
  blackAt, canSkip, captionAt, EMPTY_T0, emptyCam, eveningAt, FADE_UP_S, GLIMPSE_T0, glimpseCam, layersAt,
  markOpeningSeen, mentorDoor, OPENING_END, openingSeen, pinsAt, titleAt, VENUE_CENTRE, villagePose, cameraTime
} from './openingTimeline';
import './opening.css';

/** Den tomma vinbarens strålkastare (prototypen: spot([-0,6, 2,6], 0,82)). */
const EMPTY_SPOT: [number, number] = [-0.6, 2.6];
const EMPTY_SPOT_K = 0.82;
/** Väntar högst så här länge på att byn ska ladda innan klockan börjar ändå. */
const READY_TIMEOUT_MS = 20000;

/** Strängen för en av manusets nycklar ('opening.place' → strings.prologue.place). */
export function openingText(key: string): string {
  const k = key.replace(/^opening\./, '') as keyof typeof strings.prologue;
  const v = strings.prologue[k];
  return typeof v === 'string' ? v : '';
}

interface Frame {
  t: number;
  op: { village: number; empty: number; glimpse: number };
  black: number;
  title: Record<string, { k: number; dy: number }>;
  cap: { key: string | null; k: number; dy: number };
  pins: Array<{ id: string; x: number; y: number; k: number; stem: number; label: string }>;
}

const EMPTY_FRAME: Frame = { t: 0, op: { village: 0, empty: 0, glimpse: 0 }, black: 1, title: {}, cap: { key: null, k: 0, dy: 0 }, pins: [] };

interface Props {
  onDone: () => void;
}

export function OpeningSequence({ onDone }: Props) {
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const { targetRef, actualRef } = useCamera();
  const [seenBefore] = useState(openingSeen);
  const [frame, setFrame] = useState<Frame>(EMPTY_FRAME);
  const tRef = useRef(0);
  const doneRef = useRef(false);
  const emptyRef = useRef<HTMLCanvasElement>(null);
  const glimpseRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const skip = useCallback(() => {
    if (tRef.current >= OPENING_END) return;
    if (!canSkip(tRef.current, seenBefore)) return;
    tRef.current = OPENING_END;
  }, [seenBefore]);

  // Tangenterna går inte till spelet medan öppningen pågår; efter 3 s hoppar de över den.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tRef.current > OPENING_END) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.key === 'Tab') return;
      if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [skip]);

  useEffect(() => {
    document.body.dataset.opening = '1';
    // Vinbarens två scener. Går de inte att bygga (ingen WebGL till) står svärtan i deras ställe.
    let emptyStage: OpeningBarStage | null = null;
    let glimpseStage: OpeningBarStage | null = null;
    const emptyScript = M.emptyBar();
    const glimpseScript = M.glimpses();
    try {
      if (emptyRef.current) emptyStage = new OpeningBarStage(emptyRef.current, emptyScript);
      if (glimpseRef.current) glimpseStage = new OpeningBarStage(glimpseRef.current, glimpseScript);
    } catch (err) {
      console.warn('[opening] vinbarens scener kunde inte byggas', err);
    }
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      emptyStage?.size(w, h);
      glimpseStage?.size(w, h);
    };
    resize();
    window.addEventListener('resize', resize);

    // Spelarens kamera före öppningen; det introduktionen sätter under tiden gäller efteråt.
    const clone = (c: CameraTarget): CameraTarget => ({ focus: { x: c.focus.x, z: c.focus.z }, distance: c.distance, yaw: c.yaw, pitch: c.pitch });
    let saved = clone(targetRef.current);
    let written: CameraTarget | null = null;
    let restored = false;
    const projector = new THREE.PerspectiveCamera(34, 16 / 9, 2, 5000);
    const v3 = new THREE.Vector3();
    const door = mentorDoor();

    const started = performance.now();
    let last = started;
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const ready = openingSceneReady() || now - started > READY_TIMEOUT_MS;
      if (ready) tRef.current += dt;
      const t = tRef.current;
      const red = reducedRef.current;
      const playing = t <= OPENING_END;

      setOpeningStage({ active: playing, t, e: eveningAt(t) });

      if (written && targetRef.current !== written) saved = clone(targetRef.current);
      if (playing) {
        const v = villagePose(cameraTime(t, red));
        const cam: CameraTarget = { focus: { x: v.tx, z: v.tz }, distance: v.dist, yaw: v.yaw, pitch: v.pitch };
        written = cam;
        targetRef.current = cam;
        actualRef.current = clone(cam);
      } else if (!restored) {
        restored = true;
        written = null;
        targetRef.current = clone(saved);
        actualRef.current = clone(saved);
        delete document.body.dataset.opening;
      }

      const L = layersAt(Math.min(t, OPENING_END));
      const op = playing ? L.op : { village: 0, empty: 0, glimpse: 0 };
      try {
        if (op.empty > 0 && emptyStage) {
          emptyStage.spot(EMPTY_SPOT, EMPTY_SPOT_K);
          emptyStage.draw(Math.max(0, t - EMPTY_T0), emptyCam(t, red, emptyScript.cam));
        }
        if (op.glimpse > 0 && glimpseStage) {
          glimpseStage.draw(Math.max(0, t - GLIMPSE_T0), glimpseCam(t, red, glimpseScript.cam));
        }
      } catch (err) {
        console.warn('[opening] vinbaren', err);
      }

      // Nålarna följer byns kamera: samma kamera som spelet ställer (CameraController apply).
      const pins: Frame['pins'] = [];
      if (playing && op.village > 0) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        projector.aspect = W / Math.max(1, H);
        applyCameraState(projector, actualRef.current);
        projector.updateMatrixWorld(true);
        for (const { pin, k } of pinsAt(t)) {
          const at = pin.id === 'venue' ? VENUE_CENTRE : [door.x, door.z];
          v3.set(at[0], pin.y, at[1]).project(projector);
          if (v3.z > 1) continue;
          pins.push({ id: pin.id, x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H, k: k * op.village, stem: pin.stemCqh, label: openingText(pin.key) });
        }
      }

      setFrame({ t, op, black: blackAt(t), title: titleAt(t, red), cap: captionAt(t, red), pins });

      if (t >= OPENING_END + FADE_UP_S && !doneRef.current) {
        doneRef.current = true;
        markOpeningSeen();
        onDoneRef.current();
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      setOpeningStage({ active: false, t: 0, e: 0 });
      delete document.body.dataset.opening;
      if (!restored) {
        targetRef.current = clone(saved);
        actualRef.current = clone(saved);
      }
      emptyStage?.dispose();
      glimpseStage?.dispose();
    };
  }, [targetRef, actualRef]);

  const playing = frame.t <= OPENING_END;
  const showSkip = playing && canSkip(frame.t, seenBefore);
  const vig = Math.max(frame.op.empty, frame.op.glimpse);
  const title = (key: string) => frame.title[key] ?? { k: 0, dy: 0 };
  const lift = (x: { k: number; dy: number }): CSSProperties => ({ opacity: x.k, transform: `translateY(${x.dy}cqh)` });

  return (
    <div
      className={`nx-opening${playing ? '' : ' is-fading'}`}
      data-testid="opening"
      data-t={frame.t.toFixed(2)}
      data-shot={layersAt(Math.min(frame.t, OPENING_END)).shot}
      data-reduced={reduced ? '1' : '0'}
      role="region"
      aria-label={strings.prologue.label}
      onClick={playing ? skip : undefined}
    >
      <canvas ref={emptyRef} className="nx-opening-layer nx-opening-bar" style={{ opacity: frame.op.empty }} aria-hidden="true" />
      <canvas ref={glimpseRef} className="nx-opening-layer nx-opening-bar" style={{ opacity: frame.op.glimpse }} aria-hidden="true" />
      <div className="nx-opening-layer nx-opening-vignette" style={{ opacity: vig }} />
      {frame.pins.map((p) => (
        <div key={p.id} className="nx-opening-pin" data-testid={`opening-pin-${p.id}`} style={{ left: p.x, top: p.y, opacity: p.k }}>
          <div className="nx-opening-pin-ring" />
          <div className="nx-opening-pin-stem" style={{ height: `${p.stem}cqh` }} />
          <span className="nx-opening-pin-label" style={{ bottom: `${p.stem + 1.2}cqh` }}>{p.label}</span>
        </div>
      ))}
      <div className="nx-opening-caption" data-testid="opening-caption" style={lift(frame.cap)}>
        {frame.cap.key ? openingText(frame.cap.key) : ''}
      </div>
      <div className="nx-opening-title" data-testid="opening-title">
        <span className="nx-opening-place" style={lift(title('opening.place'))}>{strings.prologue.place}</span>
        <span className="nx-opening-line1" style={lift(title('opening.line1'))}>{strings.prologue.line1}</span>
        <span className="nx-opening-line2" style={lift(title('opening.line2'))}>{strings.prologue.line2}</span>
      </div>
      <div className="nx-opening-layer nx-opening-black" style={{ opacity: frame.black }} />
      {showSkip && (
        <button
          type="button"
          className="nx-opening-skip"
          data-testid="opening-skip"
          onClick={(e) => { e.stopPropagation(); skip(); }}
        >
          {strings.prologue.skip}
        </button>
      )}
    </div>
  );
}
