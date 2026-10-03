// ORDER 299 — spelarens krog i världen för kamerans gränser (roomBounds.ts):
// rummets centrum och radien runt det, ur samma layout som rummet byggs med.

import { useEffect } from 'react';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { useSimState } from '../simulation/SimulationProvider';
import { roomCameraBounds } from './roomBounds';

export function RoomCameraBounds() {
  const sim = useSimState();
  const layout = usePlayerBusinessInterior(sim.businessClass);
  useEffect(() => {
    roomCameraBounds.current = layout ? { cx: layout.centre[0], cz: layout.centre[1], radius: Math.hypot(layout.width, layout.depth) / 2 } : null;
    return () => { roomCameraBounds.current = null; };
  }, [layout]);
  return null;
}
