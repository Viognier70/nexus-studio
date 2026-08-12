// ORDER 061 point 3 — sample the framebuffer centre once per throttle
// interval and publish the average sRGB value to `pixelSampler`.
//
// Uses gl.readRenderTargetPixels against the default framebuffer via a
// direct readPixels call on the WebGL context. WebGL uses bottom-left
// pixel origin, so we flip Y into the coordinate before reading.
//
// Sample region is a small square (default 7×7 = 49 px) centred at the
// current canvas centre. That's stable against sub-pixel wiggle while
// small enough to isolate whatever surface the Vision Owner is aiming
// at. A crosshair overlay outside the canvas shows where the sample
// lands.
//
// Dev-only. Renders nothing. Consumers gate on `import.meta.env.DEV`
// so this module tree-shakes cleanly in prod bundles.

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { pixelSamplerWrite } from './pixelSampler';

const SAMPLE_SIZE_PX = 7;
const THROTTLE_FRAMES = 8;   // ~7 Hz at 60 fps

export function PixelSampleProbe() {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const counter = useRef(0);
  // Reusable buffer — avoid a per-tick allocation.
  const buf = useRef<Uint8Array | null>(null);

  useFrame(() => {
    counter.current += 1;
    if (counter.current % THROTTLE_FRAMES !== 0) return;

    const ctx = gl.getContext();
    const dpr = gl.getPixelRatio();
    // Canvas backing-store dimensions (not CSS pixels).
    const wPx = Math.floor(size.width * dpr);
    const hPx = Math.floor(size.height * dpr);
    const s = SAMPLE_SIZE_PX;
    // Centre the sample region on the canvas centre. readPixels uses
    // bottom-left origin, so a top-left CSS centre (wPx/2, hPx/2)
    // maps to y = hPx - hPx/2 - s = hPx/2 - s in gl space.
    const x = Math.max(0, Math.floor(wPx / 2 - s / 2));
    const y = Math.max(0, Math.floor(hPx / 2 - s / 2));
    if (!buf.current || buf.current.length !== s * s * 4) {
      buf.current = new Uint8Array(s * s * 4);
    }
    const pixels = buf.current;
    try {
      ctx.readPixels(x, y, s, s, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);
    } catch {
      return;
    }
    // Average — walk all pixels, sum RGB.
    let rs = 0, gs = 0, bs = 0;
    const n = s * s;
    for (let i = 0; i < n; i++) {
      rs += pixels[i * 4 + 0];
      gs += pixels[i * 4 + 1];
      bs += pixels[i * 4 + 2];
    }
    pixelSamplerWrite(
      Math.round(rs / n),
      Math.round(gs / n),
      Math.round(bs / n),
      n,
      Math.round(size.width / 2),
      Math.round(size.height / 2)
    );
  });

  return null;
}
