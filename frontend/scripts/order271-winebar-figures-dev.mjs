#!/usr/bin/env node
// ORDER 271 — vinbarens figurer i spelarens kamera, via dev-servern.
//
// AVVIKELSE (CLAUDE.md DoD, ORDER 174): spelarens flöde från bussen
// (order271-winebar-figures.mjs) stannade 2026-09-27 vid mentorns nya
// helskärmsdialog, som en annan del av ORDER 271 bygger om samtidigt
// (klicket på "Öva" fångas av dialogen). Den här varianten når vinbarens
// kväll med dev-flaggorna `#playtest=1&business=vinbaren&start=dinner15`
// och myBusiness-kameran (tangent 4) — samma kamera som spelaren landar i,
// men inte spelarens väg dit. Utdata: reports/order271/w*.png + winebar-figures-dev.json.
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(FRONTEND, 'reports', 'order271');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 5179);
const URL = `http://localhost:${PORT}/#playtest=1&business=vinbaren&start=dinner15`;
const proc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore' });
for (let i = 0; i < 120; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch {} await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-angle=metal', '--enable-gpu'] }).catch(() => chromium.launch({ headless: false }));
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 400)));
const report = { url: URL, shots: [], samples: [], errors };
const probe = async () => page.evaluate(() => {
  const d = window.__nxWineBarDirector; const s = window.__nxSimState;
  if (!d || !s) return null;
  const staff = d.staffSamples.map((x, i) => ({ i, pose: x.pose, x: +x.x.toFixed(2), z: +x.z.toFixed(2), stress: x.stress }));
  const guests = d.guestSamples.filter((x) => x.visible).map((x) => ({ id: x.guestId, pose: x.pose, seated: x.seated }));
  return { simTime: s.simTime, simGuests: s.guests.map((g) => g.state), staff, guests, pending: d.pendingCount() };
});
const shot = async (file, what) => {
  await page.screenshot({ path: resolve(OUT, file) });
  report.shots.push({ file, what, probe: await probe() });
};
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 120000 });
  await delay(8000);
  if (await page.$('.business-name-overlay input[type=text]')) {
    await page.fill('.business-name-overlay input[type=text]', 'Vinbaren vid torget');
    await page.click('.business-name-overlay button[type=submit]');
    await delay(1500);
  }
  // Startrutan (en annan del av ORDER 271) ligger över scenen även med
  // dev-flaggorna; den tas bort ur DOM:en för bilden (scenen påverkas inte).
  await page.evaluate(() => {
    const s = document.querySelector('[data-testid=start-screen]');
    const root = s?.closest('[role=dialog]') ?? s?.parentElement ?? s;
    root?.remove();
    document.querySelectorAll('*').forEach((e) => { const cs = getComputedStyle(e); if (cs.backdropFilter && cs.backdropFilter !== 'none') e.style.backdropFilter = 'none'; if (cs.filter && cs.filter.includes('blur')) e.style.filter = 'none'; });
  });
  await page.focus('canvas').catch(() => {});
  await page.keyboard.press('4');
  await delay(5000);
  await shot('w01-vinbaren-spelarens-kamera.png', 'myBusiness-kameran (24 m, 50°), strax efter öppning');
  // Vänta tills simuleringen har sällskap vid borden (sittande i sim).
  await page.waitForFunction(() => (window.__nxSimState?.guests ?? []).filter((g) => ['ordering', 'dining', 'paying'].includes(g.state)).length >= 4, null, { timeout: 300000, polling: 1000 }).catch(() => {});
  await delay(5000);
  await shot('w02-kvallen-tidpunkt-1.png', 'kvällen, när minst fyra gäster sitter i simuleringen');
  await delay(35000);
  await shot('w03-kvallen-tidpunkt-2.png', 'kvällen, 35 s senare');
  await page.focus('canvas').catch(() => {});
  await page.keyboard.press('q');
  await delay(3000);
  await shot('w04-kvallen-vriden.png', 'kameran vriden (q): väggarna på kamerasidan kapade');
} finally {
  writeFileSync(resolve(OUT, 'winebar-figures-dev.json'), JSON.stringify(report, null, 2));
  await browser.close();
  proc.kill('SIGTERM');
}
console.log(JSON.stringify(report.shots.map((s) => ({ file: s.file, simTime: s.probe?.simTime, guests: s.probe?.guests.length, poses: [...new Set((s.probe?.guests ?? []).map((g) => g.pose))], staff: s.probe?.staff.map((x) => x.pose) })), null, 1), errors);
