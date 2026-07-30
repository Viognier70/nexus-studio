import { useEffect } from 'react';
import type { PRESETS } from './viewLevels';
import { useCamera } from './CameraContext';

interface Options {
  enabled: boolean;
  targetElement: () => HTMLElement | null;
  onJumpPreset?: (preset: keyof typeof PRESETS) => void;
}

// Wheel = zoom (continuous). LMB drag = pan. RMB or MMB drag = rotate.
// Q / E = rotate yaw. Escape = outward.
// Digit dev-presets: 1 village, 2 district, 3 business, 4 myBusiness.
export function useDesktopControls({ enabled, targetElement, onJumpPreset }: Options) {
  const camera = useCamera();

  useEffect(() => {
    if (!enabled) return;
    const el = targetElement();
    if (!el) return;

    let dragButton = -1;
    let lastX = 0;
    let lastY = 0;
    const wheelHandler = (event: WheelEvent) => {
      event.preventDefault();
      // Sensitivity chosen in the camera constants; log-space delta keeps
      // the zoom feel consistent from village to interior.
      camera.zoomBy(event.deltaY * 0.0011);
    };
    const pointerDown = (event: PointerEvent) => {
      dragButton = event.button;
      lastX = event.clientX;
      lastY = event.clientY;
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (dragButton < 0) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      if (dragButton === 0) {
        // pan
        camera.pan(-dx, dy);
      } else {
        camera.rotate(-dx * 0.006, -dy * 0.004);
      }
    };
    const pointerUp = () => {
      dragButton = -1;
    };
    const contextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') camera.outward();
      if (event.key === 'q' || event.key === 'Q') camera.rotate(-0.08, 0);
      if (event.key === 'e' || event.key === 'E') camera.rotate(0.08, 0);
      if (event.key === '1' && onJumpPreset) onJumpPreset('village');
      if (event.key === '2' && onJumpPreset) onJumpPreset('district');
      if (event.key === '3' && onJumpPreset) onJumpPreset('business');
      if (event.key === '4' && onJumpPreset) onJumpPreset('myBusiness');
    };

    el.addEventListener('wheel', wheelHandler, { passive: false });
    el.addEventListener('pointerdown', pointerDown);
    el.addEventListener('pointermove', pointerMove);
    el.addEventListener('pointerup', pointerUp);
    el.addEventListener('pointerleave', pointerUp);
    el.addEventListener('pointercancel', pointerUp);
    el.addEventListener('contextmenu', contextMenu);
    window.addEventListener('keydown', keyDown);

    return () => {
      el.removeEventListener('wheel', wheelHandler);
      el.removeEventListener('pointerdown', pointerDown);
      el.removeEventListener('pointermove', pointerMove);
      el.removeEventListener('pointerup', pointerUp);
      el.removeEventListener('pointerleave', pointerUp);
      el.removeEventListener('pointercancel', pointerUp);
      el.removeEventListener('contextmenu', contextMenu);
      window.removeEventListener('keydown', keyDown);
    };
  }, [camera, enabled, onJumpPreset, targetElement]);
}
