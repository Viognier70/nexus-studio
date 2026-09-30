// ORDER 290 — kameran under servicen (provspel av cae53c9: "Raketen:
// kontrollera att kameran glider in i produktionsbygget. Jag såg det inte i
// provspelet"). Rummets egen glidning (theatreStage.ts camera) körs bara när
// vinbaren ritas, alltså när kameran står närmare än rummets tonband
// (GRAY_BOX_CAMERA.restaurantInteriorFadeMid ± Half). Från byn eller
// kvarteret gled kameran därför aldrig in.
// - När servicen börjar och kameran står så långt bort att rummet inte syns,
//   flyger den till krogen (myBusiness, 24 m).
// - När en raket börjar och rummet inte syns, flyger kameran först till
//   krogen; rummets glidning tar sedan över mot figuren (12 m). När raketen är
//   slut går kameran tillbaka dit spelaren stod.

import { useEffect, useRef } from 'react';
import { useCamera } from './CameraContext';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { THEATRE } from '../../sim/balance';
import { useSimState } from '../simulation/SimulationProvider';
import type { CameraTarget } from '../types';

const ROOM_HIDDEN_FROM = GRAY_BOX_CAMERA.restaurantInteriorFadeMid + GRAY_BOX_CAMERA.restaurantInteriorFadeHalf;
const ROOM_FAINT_FROM = GRAY_BOX_CAMERA.restaurantInteriorFadeMid - GRAY_BOX_CAMERA.restaurantInteriorFadeHalf;

export function ServiceCamera() {
  const sim = useSimState();
  const { targetRef, actualRef, jumpToPreset } = useCamera();
  const period = sim.day.period;
  const inService = period === 'lunch' || period === 'dinner';
  const rocket = sim.incidents?.active ?? null;
  const rocketKey = rocket && rocket.context.figure && !rocket.backed ? `${rocket.id}:${rocket.openedAt}` : null;
  const saved = useRef<CameraTarget | null>(null);

  useEffect(() => {
    if (inService && actualRef.current.distance > ROOM_HIDDEN_FROM) jumpToPreset('myBusiness');
    // Bara när servicen börjar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inService]);

  useEffect(() => {
    if (!rocketKey) return;
    if (actualRef.current.distance <= ROOM_FAINT_FROM) return;
    const t = targetRef.current;
    saved.current = { ...t, focus: { ...t.focus } };
    jumpToPreset('myBusiness');
    return () => {
      const back = saved.current;
      saved.current = null;
      if (!back) return;
      // Rummets egen glidning går tillbaka först (THEATRE.camera.glideOutSeconds).
      window.setTimeout(() => { targetRef.current = { ...back, focus: { ...back.focus } }; }, (THEATRE.camera.glideOutSeconds + 0.3) * 1000);
    };
  }, [rocketKey, targetRef, actualRef, jumpToPreset]);
  return null;
}
