// ORDER 061 point 3 — sample the framebuffer centre once per throttle
// interval and publish the average sRGB value to `pixelSampler`.
//
// Runtime notes learned the hard way during the initial "returns 0 0 0
// everywhere" report:
//   1. WebGL default `preserveDrawingBuffer: false` lets the browser
//      discard the backbuffer after present() → readPixels returns
//      zeros. StrategicScene now sets it to `true` in DEV builds so
//      the canvas retains its pixels between frames.
//   2. Three.js may leave a WebGLRenderTarget bound after its last
//      internal pass (e.g. the shadow map pass). readPixels reads
//      from the CURRENTLY BOUND framebuffer, not "the canvas". We
//      explicitly bind null (= default framebuffer) via
//      `gl.setRenderTarget(null)` before the readPixels call.
//   3. useFrame at priority 0 runs BEFORE the current frame's render.
//      With preserveDrawingBuffer=true we read the PREVIOUS frame's
//      contents — one frame lag is fine for a diagnostic overlay.
//
// A one-shot console.log on the first non-zero reading verifies the
// probe against a known value (typically the sky) before any fix
// hypothesis is tested against roof pixels.
//
// Dev-only. Renders nothing. Consumers gate on `import.meta.env.DEV`
// so this module tree-shakes cleanly in prod bundles.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { pixelSamplerWrite } from './pixelSampler';
import { harnessParams } from '../strategic/testHarness/urlParams';

const SAMPLE_SIZE_PX = 7;
const THROTTLE_FRAMES = 8;   // ~7 Hz at 60 fps

// Module-level flag: log once per page load so HMR doesn't spam.
let moduleLoggedLoad = false;
if (!moduleLoggedLoad) {
  moduleLoggedLoad = true;
  // eslint-disable-next-line no-console
  console.log('[PixelSampleProbe] module loaded');
}

export function PixelSampleProbe() {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const counter = useRef(0);
  const buf = useRef<Uint8Array | null>(null);
  const debugTicksLogged = useRef(0);

  // On mount: report the WebGL context's key attributes so we can see
  // whether preserveDrawingBuffer actually took effect. If HMR reused
  // the old context, this line will show `preserveDrawingBuffer: false`
  // and we know why the probe is reading zeros.
  useEffect(() => {
    const ctx = gl.getContext();
    const attrs = ctx.getContextAttributes();
    // eslint-disable-next-line no-console
    console.log('[PixelSampleProbe] mounted. GL context attributes:', attrs);
    // eslint-disable-next-line no-console
    console.log('[PixelSampleProbe] renderer info:', {
      dpr: gl.getPixelRatio(),
      size: { w: size.width, h: size.height },
      isWebGL2: 'getIndexedParameter' in ctx
    });
  }, [gl, size.width, size.height]);

  useFrame(() => {
    counter.current += 1;
    if (counter.current % THROTTLE_FRAMES !== 0) return;

    // Explicitly bind the default framebuffer.
    gl.setRenderTarget(null);

    const ctx = gl.getContext();
    const dpr = gl.getPixelRatio();
    const wPx = Math.floor(size.width * dpr);
    const hPx = Math.floor(size.height * dpr);
    // ORDER 063 INFRA-1 — URL param `#roi=X,Y,W,H` pins the sample
    // region (CSS pixels, top-left origin). Enables the visual-
    // regression harness to sample a specific ROI per pose. Default
    // is the screen-centre 7×7 region.
    const roi = harnessParams.roi;
    const sW = roi ? Math.max(1, Math.floor(roi.w * dpr)) : SAMPLE_SIZE_PX;
    const sH = roi ? Math.max(1, Math.floor(roi.h * dpr)) : SAMPLE_SIZE_PX;
    let x: number;
    let y: number;
    if (roi) {
      x = Math.max(0, Math.min(wPx - sW, Math.floor(roi.x * dpr)));
      const yTop = Math.max(0, Math.min(hPx - sH, Math.floor(roi.y * dpr)));
      y = hPx - yTop - sH;   // flip to gl bottom-left origin
    } else {
      x = Math.max(0, Math.floor(wPx / 2 - sW / 2));
      y = Math.max(0, Math.floor(hPx / 2 - sH / 2));
    }
    const bufLen = sW * sH * 4;
    if (!buf.current || buf.current.length !== bufLen) {
      buf.current = new Uint8Array(bufLen);
    }
    const pixels = buf.current;
    // Deliberately NO try/catch — if readPixels throws, we want to see
    // the error in the console rather than silently swallow it.
    ctx.readPixels(x, y, sW, sH, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);

    let rs = 0, gs = 0, bs = 0;
    const n = sW * sH;
    let anyNonZero = false;
    for (let i = 0; i < n; i++) {
      const pr = pixels[i * 4 + 0];
      const pg = pixels[i * 4 + 1];
      const pb = pixels[i * 4 + 2];
      rs += pr; gs += pg; bs += pb;
      if (pr > 0 || pg > 0 || pb > 0) anyNonZero = true;
    }
    const r = Math.round(rs / n);
    const g = Math.round(gs / n);
    const b = Math.round(bs / n);
    // Publish the CSS-pixel coord of the ROI centre (top-left origin)
    // so DOM overlays render a crosshair in the right place.
    const cxCss = roi ? Math.round(roi.x + roi.w / 2) : Math.round(size.width / 2);
    const cyCss = roi ? Math.round(roi.y + roi.h / 2) : Math.round(size.height / 2);
    pixelSamplerWrite(r, g, b, n, cxCss, cyCss);

    // Log the first few ticks unconditionally so we can see what the
    // probe is doing regardless of whether pixels are non-zero. If
    // they're all zero on tick 1, the framebuffer read is failing.
    // If they're non-zero on tick 1, the probe is working.
    if (debugTicksLogged.current < 3) {
      debugTicksLogged.current += 1;
      // Also sample a corner and top pixel so we have two independent
      // sample points to confirm the buffer isn't just wiped.
      const corner = new Uint8Array(4);
      ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, corner);
      const top = new Uint8Array(4);
      ctx.readPixels(Math.floor(wPx / 2), hPx - 4, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, top);
      // eslint-disable-next-line no-console
      console.log(
        `[PixelSampleProbe] tick #${debugTicksLogged.current}: centre R${r} G${g} B${b} anyNonZero=${anyNonZero} corner(0,0)=R${corner[0]}G${corner[1]}B${corner[2]} top-centre=R${top[0]}G${top[1]}B${top[2]} canvas=${wPx}×${hPx}@${dpr.toFixed(2)}dpr gl-y=${y}`
      );
    }
  });

  return null;
}
