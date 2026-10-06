// ORDER 313 — Åsa och början i spelarens flöde, produktionsbygget:
// startskärmen → Nytt spel → namn → öppningen (hoppas över) → regelkortet →
// Åsas första skärm (M1) → morgonen → Måltidens hus (Tre sätt att kunna).
// Texten läses ur sidan (textContent), inte ur strängtabellen.
// Utdata: reports/order313/check.json och check-*.png.
//
//   [SKIP_BUILD=1] [PORT=4313] [LANG=sv] node scripts/order313-check.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order313');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4313);
const LANG = process.env.LANG === 'en' ? 'en' : 'sv';
const URL = `http://localhost:${PORT}`;
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const report = { build: 'produktion', size: '1440×900', lang: LANG, errors: [] };
const text = (page, sel) => page.textContent(sel).catch(() => null);
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((lang) => { if (!sessionStorage.getItem('o313')) { localStorage.setItem('nexus.lang', lang); sessionStorage.setItem('o313', '1'); } }, LANG);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=new-game]');
  await page.waitForSelector('[data-testid=register-screen]');
  await page.fill('[data-testid=register-name]', 'Anders');
  await page.click('[data-testid=register-sign]');
  await page.waitForSelector('[data-testid=opening-skip]', { timeout: 120000 });
  await page.click('[data-testid=opening-skip]');
  await page.waitForSelector('[data-testid=rules-card]', { timeout: 60000 });
  await page.click('[data-testid=rules-close]');
  await page.waitForSelector('[data-testid=mentor-next]', { timeout: 30000 });
  await delay(600);
  report.mentorScreen = await text(page, '[data-testid=mentor]');
  report.mentorSender = await page.getAttribute('[data-testid=mentor] [data-testid=sender]', 'data-sender').catch(() => null);
  await page.screenshot({ path: resolve(OUT, `check-${LANG}-01-asa.png`) });
  await page.click('[data-testid=mentor-next]');
  await delay(800);
  report.mentorLine = await text(page, '[data-testid=mentor-line]');
  report.activitiesLocked = await page.$$eval('[data-testid=activity-locked]', (els) => els.length).catch(() => 0);
  await page.screenshot({ path: resolve(OUT, `check-${LANG}-02-morgonen.png`) });
  await page.click('[data-testid=open-house]');
  await page.waitForSelector('[data-testid=house-intro]', { timeout: 20000 });
  await delay(500);
  report.houseIntro = await text(page, '[data-testid=house-intro]');
  await page.screenshot({ path: resolve(OUT, `check-${LANG}-03-tre-satt.png`) });
  await ctx.close();
} catch (e) {
  report.error = String(e?.message ?? e);
  console.log('FEL', report.error);
} finally {
  report.checks = {
    asaOnM1: /Åsa/.test(report.mentorScreen ?? ''),
    noIngrid: !/Ingrid|Mentorn|The Mentor/.test(`${report.mentorScreen}${report.mentorLine}${report.houseIntro}`),
    senderAsa: report.mentorSender === 'asa',
    houseIntroNoAnders: !/Crichton|Herdenstam/.test(report.houseIntro ?? ''),
    houseIntroOrder: /Episteme[\s\S]*Techne[\s\S]*Phronesis/.test(report.houseIntro ?? '')
  };
  writeFileSync(resolve(OUT, `check-${LANG}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ checks: report.checks, activitiesLocked: report.activitiesLocked, errors: report.errors.length, error: report.error ?? null }));
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
