// ORDER 321 — kontrollen av provspelsläget i produktionsbygget (vite preview), 1440 × 900, på svenska:
//   1. Utan ?prov: startrutan som vanligt, ingen provskärm och ingen markering.
//   2. Med ?prov: startskärmen; för varje plats (foodtrucken, vinbaren, bistron) vecka 3, regn och en situation,
//      sedan spelet med markeringen "Provspel" i hörnet, morgonens rad och inga sparplatser i localStorage.
//   3. Foodtrucken: kvällen öppnas på 4×, och den valda situationen kommer (när dess signal håller).
// Utdata: reports/order321/check.json och check-*.png.
//
//   node scripts/order321-prov-check.mjs          (bygger först; SKIP_BUILD=1 hoppar över bygget)

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order321');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4186);
const URL = `http://localhost:${PORT}`;

async function startPreview() {
  if (!process.env.SKIP_BUILD) {
    await new Promise((res, rej) => {
      const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' });
      b.on('exit', (code) => (code === 0 ? res() : rej(new Error(`build exit ${code}`))));
    });
  }
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(URL); if (r.ok) return proc; } catch { /* väntar */ }
    await delay(500);
  }
  throw new Error('preview timeout');
}

const PLACES = [
  { place: 'foodtruck', incident: 'ft08-regnet' },
  { place: 'vinbar', incident: 'vb40-karaffen' },
  { place: 'bistro', incident: 'vb40-karaffen' }
];

const preview = await startPreview();
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const result = { ok: true, normal: null, prov: [], errors: [] };
const fail = (msg) => { result.ok = false; result.errors.push(msg); };

async function page() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('nexus.lang', 'sv'); } catch { /* ingen lagring */ } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => result.errors.push(`pageerror: ${e.message}`));
  return { ctx, p };
}

const saveKeys = (p) => p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('nexus.v1.slot')));

try {
  // 1. Det vanliga spelet.
  {
    const { ctx, p } = await page();
    await p.goto(URL);
    await p.waitForSelector('[data-testid=start-screen]', { timeout: 30000 });
    await delay(800);
    const normal = {
      startScreen: await p.locator('[data-testid=start-screen]').count(),
      provStart: await p.locator('[data-testid=prov-start]').count(),
      provBadge: await p.locator('[data-testid=prov-badge]').count()
    };
    result.normal = normal;
    if (normal.provStart !== 0 || normal.provBadge !== 0) fail('provspelet syns utan ?prov');
    await p.screenshot({ path: resolve(OUT, 'check-vanligt.png') });
    await ctx.close();
  }
  // 2. Provspelet, en gång per plats.
  for (const { place, incident } of PLACES) {
    const { ctx, p } = await page();
    await p.goto(`${URL}/?prov`);
    await p.waitForSelector('[data-testid=prov-start]', { timeout: 30000 });
    // Rutan tonar in på 220 ms (name-entry.css business-name-fade-in).
    if (place === 'foodtruck') { await delay(800); await p.screenshot({ path: resolve(OUT, 'check-startskarm.png') }); }
    await p.click(`[data-testid=prov-place-${place}]`);
    const cashDefault = await p.inputValue('[data-testid=prov-cash]');
    await p.selectOption('[data-testid=prov-week]', '3');
    await p.selectOption('[data-testid=prov-weather]', 'rain');
    const options = await p.locator('[data-testid=prov-incident] option').count();
    await p.selectOption('[data-testid=prov-incident]', incident);
    await p.click('[data-testid=prov-begin]');
    await p.waitForSelector('[data-testid=prov-badge]', { timeout: 30000 });
    await delay(4000);
    const row = {
      place, cashDefault: Number(cashDefault), incidentOptions: options - 1,
      badge: await p.locator('[data-testid=prov-badge]').innerText(),
      startScreen: await p.locator('[data-testid=start-screen]').count(),
      registerScreen: await p.locator('[data-testid=register-screen]').count(),
      saveKeys: await saveKeys(p)
    };
    result.prov.push(row);
    if (row.badge.trim().toLowerCase() !== 'provspel') fail(`${place}: markeringen säger "${row.badge}"`);
    if (row.startScreen || row.registerScreen) fail(`${place}: startrutan eller registreringen visas i provspelet`);
    if (row.saveKeys.length) fail(`${place}: provspelet sparade ${row.saveKeys.join(', ')}`);
    await p.screenshot({ path: resolve(OUT, `check-${place}.png`) });
    // 3. Foodtrucken: kvällen öppnas och den valda situationen kommer (köas när dörrarna öppnar, StrategicApp.tsx).
    if (place === 'foodtruck') {
      const vidare = p.getByRole('button', { name: 'Vidare' });
      for (let i = 0; i < 5 && (await vidare.count()) > 0; i++) { await vidare.first().click(); await delay(400); }
      await p.getByRole('button', { name: /Öppna för kvällen/ }).click();
      await delay(500);
      const fast = p.getByRole('button', { name: '4×' });
      if (await fast.count()) await fast.first().click();
      // Situationerna i kväll i ordning; den valda kommer så snart dess signal håller (ft08: när regnet börjar).
      const seen = [];
      for (let i = 0; i < 480 && !seen.includes(incident); i++) {
        const id = await p.locator('[data-testid=incident-card]').first().getAttribute('data-incident-id', { timeout: 500 }).catch(() => null);
        if (id && seen[seen.length - 1] !== id) seen.push(id);
        if (id === incident) await p.screenshot({ path: resolve(OUT, `check-${place}-kvall.png`) });
        else await delay(500);
      }
      row.incidentsTonight = seen;
      if (!seen.includes(incident)) fail(`${place}: ${incident} kom inte i kväll (${seen.join(', ')})`);
      row.saveKeysAfterEvening = await saveKeys(p);
    }
    await ctx.close();
  }
} catch (e) {
  fail(`FEL ${e.message}`);
} finally {
  await browser.close();
  try { process.kill(-preview.pid); } catch { /* redan stängd */ }
}
writeFileSync(resolve(OUT, 'check.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
