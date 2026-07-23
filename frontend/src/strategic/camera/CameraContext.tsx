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
import type { CameraTarget, Selection, ViewLabel, Vec2 } from '../types';
import { labelForDistance, PRESETS, clampTarget } from './viewLevels';

export interface CameraApi {
  targetRef: MutableRefObject<CameraTarget>;
  actualRef: MutableRefObject<CameraTarget>;
  labelRef: MutableRefObject<ViewLabel>;
  label: ViewLabel;
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
  if (!m) return 'village';
  const v = m[1].toLowerCase();
  if (v === 'kvarteret' || v === 'district') return 'district';
  if (v === 'vinbaren' || v === 'business') return 'business';
  return 'village';
}

export function CameraProvider({ children }: Props) {
  const startPreset = initialPreset();
  const start = PRESETS[startPreset].target;
  const targetRef = useRef<CameraTarget>(cloneTarget(start));
  const actualRef = useRef<CameraTarget>(cloneTarget(start));
  const labelRef = useRef<ViewLabel>(PRESETS[startPreset].label);
  const [label, setLabel] = useState<ViewLabel>(PRESETS[startPreset].label);
  const [selection, setSelection] = useState<Selection | null>(null);

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
      selection,
      setSelection,
      zoomBy,
      focusOn,
      outward,
      jumpToPreset,
      rotate,
      pan
    }),
    [label, selection, zoomBy, focusOn, outward, jumpToPreset, rotate, pan]
  );

  return <CameraCtx.Provider value={api}>{children}</CameraCtx.Provider>;
}

export function useCamera(): CameraApi {
  const c = useContext(CameraCtx);
  if (!c) throw new Error('useCamera called outside CameraProvider');
  return c;
}
