import { useEffect } from 'react';
import { useCamera } from './CameraContext';

interface Options {
  enabled: boolean;
  targetElement: () => HTMLElement | null;
}

// One-finger drag = pan, two-finger pinch = zoom, two-finger drag = rotate.
export function useTouchControls({ enabled, targetElement }: Options) {
  const camera = useCamera();

  useEffect(() => {
    if (!enabled) return;
    const el = targetElement();
    if (!el) return;

    let lastMidX = 0;
    let lastMidY = 0;
    let lastDist = 0;
    let mode: 'idle' | 'one' | 'two' = 'idle';

    const start = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        mode = 'one';
        lastMidX = event.touches[0].clientX;
        lastMidY = event.touches[0].clientY;
      } else if (event.touches.length === 2) {
        mode = 'two';
        const t1 = event.touches[0];
        const t2 = event.touches[1];
        lastMidX = (t1.clientX + t2.clientX) / 2;
        lastMidY = (t1.clientY + t2.clientY) / 2;
        lastDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      }
      event.preventDefault();
    };
    const move = (event: TouchEvent) => {
      if (mode === 'one' && event.touches.length === 1) {
        const t = event.touches[0];
        const dx = t.clientX - lastMidX;
        const dy = t.clientY - lastMidY;
        lastMidX = t.clientX;
        lastMidY = t.clientY;
        camera.pan(-dx, dy);
      } else if (mode === 'two' && event.touches.length === 2) {
        const t1 = event.touches[0];
        const t2 = event.touches[1];
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const zoom = Math.log(lastDist / dist);
        camera.zoomBy(zoom);
        const drotY = (midX - lastMidX) * 0.006;
        const drotP = (midY - lastMidY) * 0.004;
        camera.rotate(-drotY, -drotP);
        lastMidX = midX;
        lastMidY = midY;
        lastDist = dist;
      }
      event.preventDefault();
    };
    const end = (event: TouchEvent) => {
      if (event.touches.length === 0) mode = 'idle';
      else if (event.touches.length === 1) {
        mode = 'one';
        lastMidX = event.touches[0].clientX;
        lastMidY = event.touches[0].clientY;
      }
    };

    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [camera, enabled, targetElement]);
}
