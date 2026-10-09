// ORDER 322 B (Anders 2026-10-09: "Länsmansgården: flytta mittlinjen en halv meter, så att uppfarten blir hel.
// Vägen ska inte gå in under huset."). Bilden före och efter av uppfarten w862853244 vid Länsmansgården.
// Utsnittet tas ur karta-torget.png (6 px per meter, utsnittet i reports/order322/karta-vyer.json) som
// order322-karta.mjs ritar: före ur git (BEFORE_REF, förvalt 63bb1f85, B före flytten), efter ur
// reports/order322/efter/. Utdata: reports/order322/jamfor/uppfarten-lansmansgarden.png.
//
//   node scripts/order322-uppfarten.mjs          (efter KARTA_TAG=efter node scripts/order322-karta.mjs)

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REF = process.env.BEFORE_REF ?? '63bb1f85';
const view = JSON.parse(readFileSync(resolve(FRONTEND, 'reports', 'order322', 'karta-vyer.json'), 'utf8')).find((v) => v.name === 'karta-torget');
// Länsmansgårdens hörn (w1422743880) närmast uppfarten, och 24 m runt det.
const CENTRE = [-24.22, 87.52], HALF_M = 12, ZOOM = 3;
const before = execFileSync('git', ['show', `${REF}:frontend/reports/order322/efter/karta-torget.png`], { cwd: FRONTEND, maxBuffer: 1 << 26 });
const after = readFileSync(resolve(FRONTEND, 'reports', 'order322', 'efter', 'karta-torget.png'));
const px = [(CENTRE[0] - HALF_M - view.view.minX) * view.scale, (CENTRE[1] - HALF_M - view.view.minZ) * view.scale];
const side = 2 * HALF_M * view.scale;
const cell = (png, label) => `<figure style="margin:0;color:#eee;font:16px sans-serif">
  <div style="width:${side * ZOOM}px;height:${side * ZOOM}px;overflow:hidden;position:relative">
    <img src="data:image/png;base64,${png.toString('base64')}" style="position:absolute;left:${-px[0] * ZOOM}px;top:${-px[1] * ZOOM}px;transform-origin:0 0;transform:scale(${ZOOM});image-rendering:pixelated">
  </div><figcaption>${label}</figcaption></figure>`;

const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const page = await browser.newPage({ viewport: { width: side * ZOOM * 2 + 20, height: side * ZOOM + 30 } });
await page.setContent(`<html><body style="margin:0;background:#222;display:flex;gap:20px">${cell(before, `Före (${REF}): vägen bryts vid hörnet`)}${cell(after, 'Efter: mittlinjen 0,5 m från huset')}</body></html>`);
await page.screenshot({ path: resolve(FRONTEND, 'reports', 'order322', 'jamfor', 'uppfarten-lansmansgarden.png') });
await browser.close();
console.log('reports/order322/jamfor/uppfarten-lansmansgarden.png');
