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
  // Sanity self-test: log the first non-zero reading so it's clear
  // in the dev console that the probe is wired to a real buffer.
  const firstNonZeroLogged = useRef(false);

  useFrame(() => {
    counter.current += 1;
    if (counter.current % THROTTLE_FRAMES !== 0) return;

    // Explicitly bind the default framebuffer. Three.js may have left
    // a render target bound after its last internal pass (e.g. the
    // shadow map) and readPixels reads from the currently bound FBO.
    gl.setRenderTarget(null);

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
    const r = Math.round(rs / n);
    const g = Math.round(gs / n);
    const b = Math.round(bs / n);
    pixelSamplerWrite(r, g, b, n, Math.round(size.width / 2), Math.round(size.height / 2));

    // First non-zero reading proves the probe is talking to a real
    // buffer. Logged once so the dev console shows a positive
    // verification and doesn't spam.
    if (!firstNonZeroLogged.current && (r > 0 || g > 0 || b > 0)) {
      firstNonZeroLogged.current = true;
      // eslint-disable-next-line no-console
      console.log(
        `[PixelSampleProbe] first non-zero read: R=${r} G=${g} B=${b} (${n} px, canvas ${wPx}×${hPx} @${dpr.toFixed(2)} dpr, gl-coord y=${y})`
      );
    }
  });

  return null;
}
