// ORDER 290 — byn (Vision Owner 2026-09-30): "en knapp (och en tangent) som
// zoomar ut till byn och tillbaka." Knappen och tangenten V flyger kameran
// till byns vy (viewLevels.ts PRESETS.village) och tillbaka dit den stod.
// Tangenten gäller när fokus inte ligger i ett textfält.

import { useCallback, useEffect, useRef, useState } from 'react';
import { strings } from '../../content/strings';
import { useCamera } from '../camera/CameraContext';
import type { CameraTarget } from '../types';

export const VILLAGE_KEY = 'v';

export function VillageButton() {
  const { targetRef, jumpToPreset } = useCamera();
  const saved = useRef<CameraTarget | null>(null);
  const [out, setOut] = useState(false);
  const toggle = useCallback(() => {
    if (saved.current) {
      targetRef.current = { ...saved.current, focus: { ...saved.current.focus } };
      saved.current = null;
      setOut(false);
    } else {
      const t = targetRef.current;
      saved.current = { ...t, focus: { ...t.focus } };
      jumpToPreset('village');
      setOut(true);
    }
  }, [targetRef, jumpToPreset]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key.toLowerCase() === VILLAGE_KEY) toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);
  return (
    <button type="button" className="nx nx-btn nx-btn-quiet nx-village-btn" data-testid="village-toggle" aria-pressed={out} onClick={toggle} title={strings.village.keyHint}>
      {out ? strings.village.back : strings.village.out}
    </button>
  );
}
