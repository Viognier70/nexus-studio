// ORDER 245 verify — kör i Playwright med start=dinner15 och
// kontrollera att första fråga fyras vid simTime≈130.2s (matchar 238).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const VITE = 'http://localhost:5173';
async function startVite() {
  try { const r = await fetch(VITE + '/'); if (r.ok || r.status === 304) return null; } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: '/Users/ashm/Projects/nexus-studio/frontend', stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try { const r = await fetch(VITE + '/'); if (r.ok || r.status === 304) return proc; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

const viteProc = await startVite();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

const bust = Date.now();
await page.goto(
  `${VITE}/?bust=${bust}#playtest=1&seed=42&start=dinner15&business=kvarterskrogen`,
  { waitUntil: 'domcontentloaded' }
);
await page.waitForFunction(
  () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
  null, { timeout: 60000 }
);
await delay(1500);
try {
  await page.fill('input[type=text]', 'ORDER 245');
  await page.click('button[type=submit]');
  await delay(2000);
} catch {}

// Bekräfta att sim redan är i dinner-period vid start (ingen ytterligare
// dispatch krävs — start=dinner15 gjorde det vid init).
const initial = await page.evaluate(() => {
  const st = window.__nxSimState;
  return { simTime: st.simTime, period: st.day?.period, service: st.day?.currentServiceLengthMinutes };
});
console.log(`initial: simTime=${initial.simTime.toFixed(1)}s, period=${initial.period}, service=${initial.service}min`);

// Snabba upp och samla första 3 fyrningar.
await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 }));

const fires = [];
const deadline = Date.now() + 90000;
let seenIds = new Set();
while (Date.now() < deadline && fires.length < 3) {
  const info = await page.evaluate(() => {
    const st = window.__nxSimState;
    const pq = st.scenario?.pendingQuestion;
    if (!pq || st.scenario?.phase !== 'question' || !pq.anchorId) return null;
    return {
      simTime: st.simTime,
      id: pq.sourceBankId,
      anchor: pq.anchorId,
      asker: pq.askerRole
    };
  });
  if (info && !seenIds.has(info.id)) {
    seenIds.add(info.id);
    fires.push(info);
    console.log(`  ✓ fire ${fires.length}: t=${info.simTime.toFixed(1)}s ${info.id} anchor=${info.anchor} asker=${info.asker}`);
    // Auto-svara rätt så nästa fråga kan fyra.
    await page.evaluate(() => {
      const st = window.__nxSimState;
      const idx = st.scenario.pendingQuestion.options.findIndex((o) => o.correct);
      window.__nxSimDispatch({ type: 'ANSWER_QUESTION', index: idx >= 0 ? idx : 0 });
    });
    await delay(200);
    await page.evaluate(() => window.__nxSimDispatch({ type: 'ACK_QUESTION_EXPLANATION' }));
  }
  await delay(300);
}

console.log(`\nfyrningar: ${fires.length}`);
fires.forEach((f, i) => console.log(`  ${i+1}. t=${f.simTime.toFixed(1)}s id=${f.id}`));

await browser.close();
if (viteProc) viteProc.kill('SIGTERM');
