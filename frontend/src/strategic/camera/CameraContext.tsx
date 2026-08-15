import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode
} from 'react';
import { GRAY_BOX_CAMERA as CAMERA } from '../content/grythyttan';
import { harnessParams } from '../testHarness/urlParams';
import type { CameraTarget, Selection, ViewLabel, Vec2 } from '../types';
import { labelForDistance, PRESETS, clampTarget } from './viewLevels';

export interface CameraApi {
  targetRef: MutableRefObject<CameraTarget>;
  actualRef: MutableRefObject<CameraTarget>;
  labelRef: MutableRefObject<ViewLabel>;
  label: ViewLabel;
  // TEMPORÄR (SD-003 rev. 2 rekognosering, Vision Owner 2026-08-15):
  // reaktiv flagga som är true när kameran är i nivå 4-bandet
  // (distance ≤ `restaurantRoofFadeMid - restaurantRoofFadeHalf` = 28 m —
  // samma gräns som myBusiness-preset:et landar på). Nivå 3 ('vinbaren'-
  // etiketten men roof-fade fortfarande i band) räknas som *inte* nivå 4.
  // Läses av StrategicShell för att avgöra om dockskåpsväxeln ska trigga.
  // Ingen permanent koppling; food truck-ordern (SD-003 §8 följdorder 3)
  // gör sin egen upptäckt när den bygger den riktiga inflätningen.
  atLevel4: boolean;
  selection: Selection | null;
  setSelection: (next: Selection | null) => void;
  zoomBy: (deltaLog: number) => void;
  focusOn: (pos: Vec2, distance?: number) => void;
  outward: () => void;
  jumpToPreset: (preset: keyof typeof PRESETS) => void;
  rotate: (dYaw: number, dPitch: number) => void;
  pan: (dx: number, dz: number) => void;
}

const CameraCtx = createContext<CameraApi | null>(null);

function cloneTarget(t: CameraTarget): CameraTarget {
  return {
    focus: { x: t.focus.x, z: t.focus.z },
    distance: t.distance,
    yaw: t.yaw,
    pitch: t.pitch
  };
}

interface Props {
  children: ReactNode;
}

// URL hash router for QA / screenshot capture: `#preset=kvarteret` (or
// `district` / `vinbaren` / `business` / `village`) starts the camera at
// that preset without any keystroke synth. Not part of the player interface.
function initialPreset(): keyof typeof PRESETS {
  if (typeof window === 'undefined') return 'village';
  const hash = window.location.hash.replace('#', '');
  const m = /(?:^|&)preset=([a-z]+)/i.exec(hash);
  if (m) {
    const v = m[1].toLowerCase();
    if (v === 'kvarteret' || v === 'district') return 'district';
    if (v === 'vinbaren' || v === 'business') return 'business';
    if (v === 'mybusiness' || v === 'myBusiness'.toLowerCase()) return 'myBusiness';
    return 'village';
  }
  // TEMPORÄR (SD-003 rev. 2 rekognosering, Vision Owner 2026-08-15):
  // när `dollhouse=1` (och därmed `playtest=1`) startar kameran vid
  // nivå 4 (myBusiness-preset) så dockskåpet syns direkt utan att
  // kräva att spelaren också måste sätta `preset=myBusiness`. Ingen
  // permanent koppling — flaggan lever tills food truck-ordern (SD-003
  // §8 följdorder 3) landar den riktiga inflätningen.
  if (/(?:^|&)dollhouse=1(?:&|$)/.test(hash) && /(?:^|&)playtest=1(?:&|$)/.test(hash)) {
    return 'myBusiness';
  }
  return 'village';
}

export function CameraProvider({ children }: Props) {
  const startPreset = initialPreset();
  // ORDER 063 INFRA-1 — explicit camera coordinates from URL params
  // override any preset. Enables the visual-regression harness to pin
  // camera state without a preset entry per pose. Dev-only.
  //
  // ORDER 068 — harness poses must respect the same clamp bounds as
  // the game (GRAY_BOX_CAMERA.pitchMin/pitchMax/minDistance/maxDistance).
  // Silently clamping like the interactive controls would hide pose-
  // authoring bugs (ORDER 067 §pitch: -0.45 put the harness camera
  // 26 m underground looking up at sky, and every downstream pixel
  // measurement was a lie because the ROI never landed on the
  // intended surface). Loud failure at mount instead — the runner
  // catches the pageerror and reports the pose as ERR.
  const harnessCamera = import.meta.env.DEV ? harnessParams.camera : null;
  if (harnessCamera) {
    const invalid: string[] = [];
    if (harnessCamera.pitch < CAMERA.pitchMin || harnessCamera.pitch > CAMERA.pitchMax) {
      invalid.push(
        `pitch=${harnessCamera.pitch.toFixed(3)} outside allowed ` +
        `[${CAMERA.pitchMin.toFixed(3)}, ${CAMERA.pitchMax.toFixed(3)}] rad ` +
        `(${((CAMERA.pitchMin * 180) / Math.PI).toFixed(0)}° - ` +
        `${((CAMERA.pitchMax * 180) / Math.PI).toFixed(0)}°)`
      );
    }
    if (harnessCamera.distance < CAMERA.minDistance || harnessCamera.distance > CAMERA.maxDistance) {
      invalid.push(
        `distance=${harnessCamera.distance.toFixed(1)} outside allowed ` +
        `[${CAMERA.minDistance}, ${CAMERA.maxDistance}] m`
      );
    }
    if (invalid.length > 0) {
      throw new Error(
        `[harness camera] invalid pose parameters: ${invalid.join('; ')}. ` +
        `Poses must respect the game's CameraProvider clamps. ` +
        `Fix the pose in visualPoses.ts; do not bypass the clamp.`
      );
    }
  }
  const start: CameraTarget = harnessCamera
    ? {
        focus: { x: harnessCamera.focus.x, z: harnessCamera.focus.z },
        distance: harnessCamera.distance,
        yaw: harnessCamera.yaw,
        pitch: harnessCamera.pitch
      }
    : PRESETS[startPreset].target;
  const targetRef = useRef<CameraTarget>(cloneTarget(start));
  const actualRef = useRef<CameraTarget>(cloneTarget(start));
  const labelRef = useRef<ViewLabel>(PRESETS[startPreset].label);
  const [label, setLabel] = useState<ViewLabel>(PRESETS[startPreset].label);
  const [selection, setSelection] = useState<Selection | null>(null);
  // TEMPORÄR nivå-4-tröskel. Samma värde som myBusiness-preset:et landar
  // på (roof-fade-mid − roof-fade-half). Under detta = full interiör (nivå
  // 4). Över = zoomar ut genom fade-bandet in i nivå 3.
  const LEVEL_4_THRESHOLD = CAMERA.restaurantRoofFadeMid - CAMERA.restaurantRoofFadeHalf;
  const level4Ref = useRef<boolean>(start.distance <= LEVEL_4_THRESHOLD);
  const [atLevel4, setAtLevel4] = useState<boolean>(level4Ref.current);

  // Poll the label whenever the actual distance crosses a threshold. We do
  // this outside the R3F loop so the DOM UI updates cheaply.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const desired = labelForDistance(actualRef.current.distance);
      if (desired !== labelRef.current) {
        labelRef.current = desired;
        setLabel(desired);
      }
      // TEMPORÄR (SD-003 rev. 2) — same rAF-loop, poll atLevel4 med
      // hysteres-fri boolean-transition. Ingen extra rAF-registrering.
      const desiredLevel4 = actualRef.current.distance <= LEVEL_4_THRESHOLD;
      if (desiredLevel4 !== level4Ref.current) {
        level4Ref.current = desiredLevel4;
        setAtLevel4(desiredLevel4);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const zoomBy = useCallback((deltaLog: number) => {
    const t = targetRef.current;
    const newLog = Math.log(t.distance) + deltaLog;
    t.distance = Math.max(
      CAMERA.minDistance,
      Math.min(CAMERA.maxDistance, Math.exp(newLog))
    );
    targetRef.current = clampTarget(t);
  }, []);

  const focusOn = useCallback((pos: Vec2, distance?: number) => {
    const t = targetRef.current;
    t.focus = { x: pos.x, z: pos.z };
    if (distance !== undefined) t.distance = distance;
    else t.distance = Math.max(t.distance * 0.55, CAMERA.districtDistance);
    targetRef.current = clampTarget(t);
  }, []);

  const outward = useCallback(() => {
    const t = targetRef.current;
    t.distance = Math.min(CAMERA.maxDistance, t.distance * 2.2);
    targetRef.current = clampTarget(t);
    setSelection(null);
  }, []);

  const jumpToPreset = useCallback((preset: keyof typeof PRESETS) => {
    const p = PRESETS[preset];
    targetRef.current = clampTarget(cloneTarget(p.target));
  }, []);

  const rotate = useCallback((dYaw: number, dPitch: number) => {
    const t = targetRef.current;
    t.yaw += dYaw;
    t.pitch = Math.max(
      CAMERA.pitchMin,
      Math.min(CAMERA.pitchMax, t.pitch + dPitch)
    );
    targetRef.current = clampTarget(t);
  }, []);

  const pan = useCallback((dx: number, dz: number) => {
    const t = targetRef.current;
    // Scale pan with distance so panning feels the same at all zooms.
    const scale = t.distance * 0.0015;
    // Pan in the yaw plane.
    const cos = Math.cos(t.yaw);
    const sin = Math.sin(t.yaw);
    t.focus.x += (dx * cos - dz * sin) * scale;
    t.focus.z += (dx * sin + dz * cos) * scale;
    targetRef.current = clampTarget(t);
  }, []);

  const api = useMemo<CameraApi>(
    () => ({
      targetRef,
      actualRef,
      labelRef,
      label,
      atLevel4,
      selection,
      setSelection,
      zoomBy,
      focusOn,
      outward,
      jumpToPreset,
      rotate,
      pan
    }),
    [label, atLevel4, selection, zoomBy, focusOn, outward, jumpToPreset, rotate, pan]
  );

  return <CameraCtx.Provider value={api}>{children}</CameraCtx.Provider>;
}

export function useCamera(): CameraApi {
  const c = useContext(CameraCtx);
  if (!c) throw new Error('useCamera called outside CameraProvider');
  return c;
}
