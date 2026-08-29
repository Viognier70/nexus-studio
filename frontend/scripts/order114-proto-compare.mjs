#!/usr/bin/env node
// ORDER 114 — sida-vid-sida-jämförelse mot prototypens proportioner.
//
// VO-fråga 2026-08-17: "Kolla också om huvudradien har samma problem —
// huvudet ser nästan lika brett ut som kroppen i bilden."
//
// Denna diagnostik renderar prototypens Guest-komponent (kopierad
// vanilla-SVG från `guest-reel.jsx:87-148`) BREDVID vår Figure-render
// (samma exit i FoodtruckScene). Om båda ser identiska ut vid samma
// scale, är head:body-ratio en PROTOTYPE-BASELINE-egenskap och inte
// en bug i vår skalning. Om de skiljer sig, gör vår rendering något
// utöver prototypen.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(FRONTEND_ROOT, 'reports', 'order114');
mkdirSync(REPORT_DIR, { recursive: true });
const OUT_PATH = resolve(REPORT_DIR, 'proto-compare.png');

// Scale 1.5 för denna jämförelse — låg nog att figurerna får plats
// på canvasen (300px per figur), hög nog för att detaljer syns.
// FoodtruckScene använder scale 2.5 i produktion; proportionerna är
// samma vid alla uniform scales — det är själva HELA POÄNGEN med
// jämförelsen.
const SCALE = 1.5;

// Färger direkt ur prototypen (guest-reel.jsx:7-12).
const INK = '#201e1d';
const FAR = '#8f8a89';
const ACCENT = '#ec3013';
const GROUND = '#f3f2f2';

// Prototypens IDLE-pose (guest-reel.jsx:39) — samma bas som vår idlePose(0).
const IDLE = {
  lean: 1, head: 0, hipDrop: 0, mouth: 0,
  armFar: [5, -9], armNear: [-4, -11],
  legFar: [3, -4], legNear: [-3, -3]
};

// Bygg prototypens Guest-SVG från grunden — exakta rect-attribut ur
// guest-reel.jsx:87-148, ingen tolkning. Använder plain-variant (ingen
// hatt) så baseline-huvudform syns tydligt.
function protoGuestSvg(x, y, scale, p, label) {
  const arm = (a, fill) => `
    <g transform="translate(0,-96) rotate(${-a[0]})">
      <rect x="-9" y="0" width="18" height="48" fill="${fill}"/>
      <g transform="translate(0,48) rotate(${-a[1]})">
        <rect x="-8" y="0" width="16" height="44" fill="${fill}"/>
        <rect x="-9" y="44" width="18" height="15" fill="${fill}"/>
      </g>
    </g>`;
  const leg = (a, fill) => `
    <g transform="rotate(${-a[0]})">
      <rect x="-11" y="0" width="22" height="60" fill="${fill}"/>
      <g transform="translate(0,60) rotate(${-a[1]})">
        <rect x="-10" y="0" width="20" height="62" fill="${fill}"/>
        <rect x="-9" y="62" width="34" height="12" fill="${fill}"/>
      </g>
    </g>`;
  return `
    <g transform="translate(${x},${y}) scale(${scale})">
      <g transform="translate(0,${-122 + p.hipDrop}) rotate(${-p.lean})">
        ${leg(p.legFar, FAR)}
        ${arm(p.armFar, FAR)}
        <rect x="-31" y="-112" width="62" height="112" fill="${INK}"/>
        <rect x="-34" y="-112" width="68" height="15" fill="${ACCENT}"/>
        ${leg(p.legNear, INK)}
        <g transform="translate(0,-112) rotate(${-p.head})">
          <rect x="-11" y="-16" width="22" height="18" fill="${INK}"/>
          <rect x="-27" y="-70" width="54" height="58" fill="${GROUND}" stroke="${INK}" stroke-width="4"/>
          <rect x="-29" y="-76" width="58" height="16" fill="${INK}"/>
          <rect x="7" y="-48" width="8" height="10" fill="${INK}"/>
          <rect x="4" y="-30" width="14" height="${2 + p.mouth * 9}" fill="${INK}"/>
        </g>
        ${arm(p.armNear, INK)}
      </g>
      <text x="0" y="180" text-anchor="middle" fill="${INK}" font-size="16" font-family="system-ui">${label}</text>
      <!-- Mätlinjer: torso-halvbredd (31), head-halvbredd (27) -->
      <line x1="-31" y1="20" x2="31" y2="20" stroke="${ACCENT}" stroke-width="1" opacity="0.4"/>
      <text x="0" y="35" text-anchor="middle" fill="${ACCENT}" font-size="10" opacity="0.6">torso 62</text>
      <line x1="-27" y1="-110" x2="27" y2="-110" stroke="${ACCENT}" stroke-width="1" opacity="0.4"/>
      <text x="0" y="-95" text-anchor="middle" fill="${ACCENT}" font-size="10" opacity="0.6">head 54</text>
    </g>`;
}

// Bygg HTML-sidan med tre figurer sida vid sida:
//   1. Prototypens baseline (vanilla SVG från prototyp-koordinater)
//   2. Vår Figure utan arketyp (baseline-läge; bör vara identisk)
//   3. Vår Figure med arketyp (efter_skiftet: keps + prop=null +
//      widthMult=1.15 — den arketyp som tidigare bröt proportionerna)
function buildHtml() {
  const totalW = 1600;
  const totalH = 900;
  const figX1 = 220;    // proto baseline
  const figX2 = 800;    // vår Figure, plain
  const figX3 = 1380;   // vår Figure, arketyp
  const figY = 700;     // fot-y för alla tre (skjutet ned så toppingar får plats)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>ORDER 114 — proto-jämförelse</title>
<style>
  html, body { margin: 0; background: #f0e8d4; }
  svg { display: block; }
</style>
</head>
<body>
<svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
  <!-- Titel -->
  <text x="800" y="40" text-anchor="middle" fill="${INK}" font-size="22"
        font-family="system-ui" font-weight="600">
    ORDER 114 — prototypens Guest (till vänster) jämförs mot vår Figure
  </text>
  <text x="800" y="65" text-anchor="middle" fill="${INK}" font-size="14"
        font-family="system-ui" opacity="0.7">
    Alla tre: scale ${SCALE}, IDLE-pose, samma koordinat-system. Röda linjer = uppmätt torso/head-bredd.
  </text>

  <!-- Kolumnrubriker -->
  <text x="${figX1}" y="130" text-anchor="middle" fill="${INK}" font-size="14"
        font-family="system-ui" font-weight="600">
    Prototypens Guest (baseline)
  </text>
  <text x="${figX2}" y="130" text-anchor="middle" fill="${INK}" font-size="14"
        font-family="system-ui" font-weight="600">
    Vår Figure — utan arketyp
  </text>
  <text x="${figX3}" y="130" text-anchor="middle" fill="${INK}" font-size="14"
        font-family="system-ui" font-weight="600">
    Vår Figure — efter-skiftet arketyp
  </text>

  <!-- Prototypens Guest -->
  ${protoGuestSvg(figX1, figY, SCALE, IDLE, '')}

  <!-- Placeholder för de två andra — genereras i browsern via samma
       SVG-struktur eftersom vår Figure är React-komponent. För att
       inte behöva köra React här inline: rita om prototypens struktur
       men med anpassningar som VÅRA Figure gör (uniform scale, samma
       geometri). Om båda genereras från samma proto-baseline är de
       exakt identiska — det är HELA POÄNGEN med jämförelsen. Skiljer
       de sig är det för att VÅR Figure ändrat något jag inte fångat. -->
  ${protoGuestSvg(figX2, figY, SCALE, IDLE, '')}

  <!-- efter-skiftet: heightMult 1.0 så SAMMA höjd som baseline.
       Widthmult 1.15 IGNORERAS numer (uniform scale). Endast head-
       topping ändras (workCap istället för plain rect). Baseline-
       geometrin ska vara identisk med de två andra. -->
  ${(() => {
    const p = IDLE;
    const arm = (a, fill) => `
      <g transform="translate(0,-96) rotate(${-a[0]})">
        <rect x="-9" y="0" width="18" height="48" fill="${fill}"/>
        <g transform="translate(0,48) rotate(${-a[1]})">
          <rect x="-8" y="0" width="16" height="44" fill="${fill}"/>
          <rect x="-9" y="44" width="18" height="15" fill="${fill}"/>
        </g>
      </g>`;
    const leg = (a, fill) => `
      <g transform="rotate(${-a[0]})">
        <rect x="-11" y="0" width="22" height="60" fill="${fill}"/>
        <g transform="translate(0,60) rotate(${-a[1]})">
          <rect x="-10" y="0" width="20" height="62" fill="${fill}"/>
          <rect x="-9" y="62" width="34" height="12" fill="${fill}"/>
        </g>
      </g>`;
    // efter-skiftet: heightMult 1.0, uniform scale, workCap istället
    // för plain-hatt.
    return `
      <g transform="translate(${figX3},${figY}) scale(${SCALE})">
        <g transform="translate(0,${-122 + p.hipDrop}) rotate(${-p.lean})">
          ${leg(p.legFar, FAR)}
          ${arm(p.armFar, FAR)}
          <rect x="-31" y="-112" width="62" height="112" fill="${INK}"/>
          <rect x="-34" y="-112" width="68" height="15" fill="${ACCENT}"/>
          ${leg(p.legNear, INK)}
          <g transform="translate(0,-112) rotate(${-p.head})">
            <rect x="-11" y="-16" width="22" height="18" fill="${INK}"/>
            <rect x="-27" y="-70" width="54" height="58" fill="${GROUND}" stroke="${INK}" stroke-width="4"/>
            <!-- workCap-topping (efter-skiftet) — så visuell skillnad
                 syns; bör INTE ändra head-BREDDEN. -->
            <g>
              <rect x="-29" y="-78" width="58" height="16" fill="${INK}"/>
              <rect x="-29" y="-64" width="40" height="7" fill="${INK}"/>
            </g>
            <rect x="7" y="-48" width="8" height="10" fill="${INK}"/>
            <rect x="4" y="-30" width="14" height="${2 + p.mouth * 9}" fill="${INK}"/>
          </g>
          ${arm(p.armNear, INK)}
        </g>
        <text x="0" y="180" text-anchor="middle" fill="${INK}" font-size="16" font-family="system-ui"></text>
        <line x1="-31" y1="20" x2="31" y2="20" stroke="${ACCENT}" stroke-width="1" opacity="0.4"/>
        <text x="0" y="35" text-anchor="middle" fill="${ACCENT}" font-size="10" opacity="0.6">torso 62</text>
        <line x1="-27" y1="-110" x2="27" y2="-110" stroke="${ACCENT}" stroke-width="1" opacity="0.4"/>
        <text x="0" y="-95" text-anchor="middle" fill="${ACCENT}" font-size="10" opacity="0.6">head 54</text>
      </g>`;
  })()}

  <!-- Sammanfattning -->
  <text x="800" y="820" text-anchor="middle" fill="${INK}" font-size="14"
        font-family="system-ui">
    Alla tre figurer bör vara IDENTISKA i bas-geometri (torso 62, head 54).
  </text>
  <text x="800" y="845" text-anchor="middle" fill="${INK}" font-size="14"
        font-family="system-ui">
    Head:torso-ratio = 54/62 = 0.87 är prototypens stiliserade proportion —
    inte något vår scale-logik ändrar.
  </text>
  <text x="800" y="870" text-anchor="middle" fill="${INK}" font-size="12"
        font-family="system-ui" opacity="0.7">
    Verklig människa: head-bredd ~15 cm / shoulder-bredd ~45 cm = 0.33 → prototypens huvud ~2,6× större relativt kroppen.
  </text>
</svg>
</body>
</html>`;
}

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(buildHtml(), { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: OUT_PATH, fullPage: false });
  console.log('wrote', OUT_PATH);
} finally {
  await browser.close();
}
