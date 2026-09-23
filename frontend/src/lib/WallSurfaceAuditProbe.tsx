// ORDER 162 §DoD 1 + ORDER 168 §DoD 2 — dev-only probe that exposes
// screen-projection and framebuffer-readback hooks for the playwright
// verifieringsscript. Renders nothing.
//
// Only two hooks needed for ORDER 168 (fasad + interior-visibility
// verification):
//   1. `__nxProjectToScreen(x, y, z)` — world → CSS pixel (top-left).
//   2. `__nxReadCanvasPixel(xCss, yCss)` — 3×3 patch average from the
//      default framebuffer. Requires `preserveDrawingBuffer: true` which
//      StrategicScene sets under DEV.
// One probe covers both so no other module has to grow a dev hook.
// Tree-shaken from prod bundles by the `import.meta.env.DEV` gate at
// the mount site (StrategicScene.tsx).
//
// ORDER 162's original probe also exposed `__nxWallSurfaceAudit` for
// scene-traversal + vertex histograms. That hook is not needed by 168's
// verification, so it is omitted from this file. When ORDER 162 merges
// to main it can be added back without breaking 168's usage.

import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

export function WallSurfaceAuditProbe() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;

    // Project a world (x, y, z) coordinate to CSS pixel (top-left origin).
    (window as unknown as { __nxProjectToScreen?: (x: number, y: number, z: number) => { xCss: number; yCss: number; behindCamera: boolean } }).__nxProjectToScreen = (x, y, z) => {
      const v = new THREE.Vector3(x, y, z);
      camera.updateMatrixWorld(true);
      v.project(camera);
      const xCss = (v.x + 1) * 0.5 * size.width;
      const yCss = (1 - (v.y + 1) * 0.5) * size.height;
      return { xCss, yCss, behindCamera: v.z > 1 };
    };

    // Read a 3×3 patch average from the default framebuffer at a CSS
    // pixel coordinate. The patch averages a single subpixel edge away.
    (window as unknown as { __nxReadCanvasPixel?: (xCss: number, yCss: number) => { r: number; g: number; b: number; samples: number } }).__nxReadCanvasPixel = (xCss, yCss) => {
      gl.setRenderTarget(null);
      const ctx = gl.getContext();
      const dpr = gl.getPixelRatio();
      const wPx = Math.floor(size.width * dpr);
      const hPx = Math.floor(size.height * dpr);
      const patch = 3;
      const half = Math.floor(patch / 2);
      const xPx = Math.max(0, Math.min(wPx - patch, Math.floor(xCss * dpr - half)));
      const yTopPx = Math.max(0, Math.min(hPx - patch, Math.floor(yCss * dpr - half)));
      const yGl = hPx - yTopPx - patch;
      const buf = new Uint8Array(patch * patch * 4);
      ctx.readPixels(xPx, yGl, patch, patch, ctx.RGBA, ctx.UNSIGNED_BYTE, buf);
      let rs = 0, gs = 0, bs = 0;
      const n = patch * patch;
      for (let i = 0; i < n; i++) {
        rs += buf[i * 4 + 0];
        gs += buf[i * 4 + 1];
        bs += buf[i * 4 + 2];
      }
      return { r: Math.round(rs / n), g: Math.round(gs / n), b: Math.round(bs / n), samples: n };
    };

    return () => {
      const w = window as unknown as {
        __nxProjectToScreen?: unknown;
        __nxReadCanvasPixel?: unknown;
      };
      delete w.__nxProjectToScreen;
      delete w.__nxReadCanvasPixel;
    };
  }, [gl, camera, size.width, size.height]);

  return null;
}
