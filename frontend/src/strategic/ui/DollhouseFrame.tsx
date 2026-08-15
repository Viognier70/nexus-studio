// TEMPORÄR rekognosering-komponent för SD-003 rev. 2:s dockskåp.
//
// **Placeringen i ui/** (inte scene/) är avsiktlig: komponenten är ren
// DOM/SVG-overlay, inte R3F. `scene/`-mappen scannas av
// scenePropShape.smoke.test.ts som förbjuder hyphenade JSX-attribut på
// lowercase-element (för att R3F applyProps kraschar på dem). Data-
// attribut som `data-opening` är korrekta på DOM/SVG men skulle failer
// smoketest:et i scene/. Samma undantag som `ui/RoomCardPanel/` har.
//
// Vision Owner-begäran 2026-08-15: en tillfällig växel i playtest-läget
// som renderar denna komponent i stället för det vanliga 3D-restaurang-
// vyet. Ingen permanent koppling — den riktiga monteringen (patternTransform
// på karta, mise-en-place-migration till PanelColumn, pixelbudget-fullt
// panorering under 1 280 px) hör till food truck-ordern (SD-003 §8
// följdorder 3).
//
// **Vad denna form är (rev. 2, 2026-08-15):** SD-003 §2 alternativ C —
// ett rum i genomskärning som fyller vyn. Fokusrummet ÄR SVG-scenens
// synliga volym: golv, bakvägg, tak-lister. I bakväggen finns två
// **öppningar** (passluckan mot kök, bardiskens öppning mot bar) som
// glimtar in i angränsande rum. Klick på en öppning byter fokus — det
// tidigare fokusrummet blir då en öppning i det nya fokusrummets bakvägg.
//
// **Scenbredden räknas mot fri yta** (fönster minus panel-reserverade
// gutters vänster + höger) — inte mot hela `window.innerWidth`. RoomCard-
// Panel på 260 px + PanelColumn.gutter 20 px + margin på 24 px = 304 px
// reserv i högerkanten; motsvarande på vänsterkanten där TeamPanel-
// familjen kan bli 320 + 16 + 24 = 360 px bred. Under 1 280 px total
// blir scenen så smal att panorering krävs — flagga för nu, panorering
// hör till följdordern.

import { useEffect, useState } from 'react';

// SVG-scenen använder viewBox 2432×1080. Rendering skalar viewBox till
// den css-storlek `<svg>` faktiskt får (`width: 100%; height: 100%`).
// Scenens CSS-bredd däremot är beräknad från viewport minus panel-
// reserv (se SCENE_LEFT_RESERVE_PX / SCENE_RIGHT_RESERVE_PX nedan).
const SCENE_VIEWBOX_W = 2432;
const SCENE_VIEWBOX_H = 1080;

// Panel-reserv i CSS-pixlar. TeamPanel + InvestmentPanel är 320 px
// breda; RoomCardPanel 260, InstrumentsPanel 220, EventStreamPanel
// upp till 320 px. Reserv = panel-bredd + PanelColumn.gutter + margin.
// Sätt konservativt till 360 (vänster) och 340 (höger — panel-bredden
// varierar per pass, EventStream är den värsta).
const SCENE_LEFT_RESERVE_PX = 360;
const SCENE_RIGHT_RESERVE_PX = 340;

// ORDER 096 §5.2 pixelbudget-golv: 140 px per figur för att uttrycket
// ska läsas. Under 1 280 px viewport blir sceneWidthPx = 1280 − 360 −
// 340 = 580 px, vilket räcker till ~4 figurer utan panorering.
// Panorerings-läge hör till följdordern; här visar vi bara en varnings-
// markering när scenen blir smalare än ORDER 096:s 16-kuverts-räckvidd
// (16 × 140 = 2 240 px).
const SCENE_MIN_FULL_WIDTH_PX = 2240;

// Rumsproportioner i viewBox-enheter. Alt C = ett fokusrum i genomskärning.
// Golv + tak-list ramar bilden vertikalt; bakvägg spänner hela bredden.
// Golvet är hälften så tjockt som ORDER 096:s "kartans golv 180 px" —
// olika koncept men samma pixelriktning: läsbara horisontella band.
const FLOOR_H = 60;                 // golv-tjocklek
const CEILING_H = 24;               // tunn tak-list
const SIDE_MARGIN = 40;             // sido-marginal för bakväggen från viewBox-kant

// Öppning-geometri (dörr-form). Bredd + höjd är per öppning; placering
// beräknas per öppning (kok vänster, bar höger). Öppningarna sitter
// vertikalt centrerade i bakväggen — en dörr som blickar in i angränsande
// rum, inte en fönstruta.
const OPENING_W = 180;
const OPENING_H = 480;
// Avstånd från fokusrummets sido-kant till öppningen. Denna avgränsar
// hur brett fokusrummet läses som "eget rum" innan öppningen börjar.
// 260 px = ~11% av viewBox = tydligt rums-band.
const OPENING_INSET_X = 260;

// Färger. Bakvägg medium-varm, golv mörkare, öppning mörkare än vägg
// (glimt in i angränsande rum), rumsbelysning-hint via ett svagt
// gradient-fyllning i bottom av bakväggen.
const COLOR_WALL = '#4a453d';       // bakvägg (fokusrummets bakre yta)
const COLOR_FLOOR = '#3a352e';      // golv
const COLOR_CEILING = '#2d2924';    // tak-list mörkare än vägg
const COLOR_OPENING = '#1c1a17';    // öppning — mörkare glimt in i nästa rum
const COLOR_OPENING_HOVER = '#2a2620'; // hover-fyllning

type FokusRum = 'fokusrum' | 'kok' | 'bar';

// Vilka öppningar (kok/bar/fokusrum) som visas per fokusrum. När fokus
// = 'fokusrum', ser vi öppningar mot 'kok' och 'bar'. När fokus = 'kok',
// ser vi öppningar mot 'fokusrum' och 'bar' (det tidigare fokusrummet
// blir öppning i det nya). Symmetriskt för 'bar'.
const OPENINGS_BY_FOCUS: Record<FokusRum, [FokusRum, FokusRum]> = {
  fokusrum: ['kok', 'bar'],
  kok:      ['fokusrum', 'bar'],
  bar:      ['fokusrum', 'kok']
};

const ROOM_LABELS: Record<FokusRum, string> = {
  fokusrum: 'Matsalen',
  kok:      'Köket',
  bar:      'Baren'
};

// Reaktiv scenbredd — läser window.innerWidth minus panel-reserv.
// Uppdateras vid resize så DollhouseFrame anpassar sin CSS-bredd.
function useSceneWidth(): { widthPx: number; panningNeeded: boolean } {
  const [widthPx, setWidthPx] = useState(() => computeSceneWidth());
  useEffect(() => {
    const handler = () => setWidthPx(computeSceneWidth());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return { widthPx, panningNeeded: widthPx < SCENE_MIN_FULL_WIDTH_PX };
}

function computeSceneWidth(): number {
  if (typeof window === 'undefined') return SCENE_MIN_FULL_WIDTH_PX;
  return Math.max(320, window.innerWidth - SCENE_LEFT_RESERVE_PX - SCENE_RIGHT_RESERVE_PX);
}

export function DollhouseFrame() {
  const [focus, setFocus] = useState<FokusRum>('fokusrum');
  const [hovered, setHovered] = useState<FokusRum | null>(null);
  const { widthPx, panningNeeded } = useSceneWidth();

  const [leftRoom, rightRoom] = OPENINGS_BY_FOCUS[focus];
  const wallLeft = SIDE_MARGIN;
  const wallRight = SCENE_VIEWBOX_W - SIDE_MARGIN;
  const wallWidth = wallRight - wallLeft;
  const wallTop = CEILING_H;
  const wallBottom = SCENE_VIEWBOX_H - FLOOR_H;
  const wallHeight = wallBottom - wallTop;

  // Öppning-placering i bakväggen. Vertikalt centrerad; horisontellt
  // insatt från fokusrummets sido-kant med OPENING_INSET_X.
  const openingY = wallTop + (wallHeight - OPENING_H) / 2;
  const openingLeftX = wallLeft + OPENING_INSET_X;
  const openingRightX = wallRight - OPENING_INSET_X - OPENING_W;

  return (
    <div
      data-dollhouse-frame
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        background: '#1a1815',
        // Layout: horisontellt centrerad scenyta, panel-reserv på båda
        // sidor. `pointer-events: none` på ytterlagret så mushjul / drag
        // fortfarande når panelerna över/under; öppningarna opt:ar in
        // med sin egen `pointer-events: auto` för klick.
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <svg
        viewBox={`0 0 ${SCENE_VIEWBOX_W} ${SCENE_VIEWBOX_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: widthPx,
          height: '100%',
          display: 'block'
        }}
      >
        {/* Tak-list */}
        <rect
          x={0}
          y={0}
          width={SCENE_VIEWBOX_W}
          height={CEILING_H}
          fill={COLOR_CEILING}
        />
        {/* Bakvägg (fokusrummets bakre yta — fyller nästan hela vyn) */}
        <rect
          x={wallLeft}
          y={wallTop}
          width={wallWidth}
          height={wallHeight}
          fill={COLOR_WALL}
        />
        {/* Rummets namn-etikett — läses på bakväggen så spelaren vet
            vilket rum hen är i under rekognoseringen. */}
        <text
          x={SCENE_VIEWBOX_W / 2}
          y={wallTop + 96}
          textAnchor="middle"
          fill="#f0e8d4"
          fontSize={72}
          fontFamily="system-ui, sans-serif"
          letterSpacing={4}
          style={{ textTransform: 'uppercase' }}
        >
          {ROOM_LABELS[focus]}
        </text>
        {/* Golv */}
        <rect
          x={0}
          y={wallBottom}
          width={SCENE_VIEWBOX_W}
          height={FLOOR_H}
          fill={COLOR_FLOOR}
        />
        {/* Öppning vänster — leder in i `leftRoom` */}
        <Opening
          x={openingLeftX}
          y={openingY}
          w={OPENING_W}
          h={OPENING_H}
          target={leftRoom}
          hovered={hovered === leftRoom}
          onEnter={() => setHovered(leftRoom)}
          onLeave={() => setHovered(null)}
          onClick={() => setFocus(leftRoom)}
        />
        {/* Öppning höger — leder in i `rightRoom` */}
        <Opening
          x={openingRightX}
          y={openingY}
          w={OPENING_W}
          h={OPENING_H}
          target={rightRoom}
          hovered={hovered === rightRoom}
          onEnter={() => setHovered(rightRoom)}
          onLeave={() => setHovered(null)}
          onClick={() => setFocus(rightRoom)}
        />
        {/* Rekognoserings-metadata — dev-only markering + scen-mått för
            att bekräfta att bredden räknas mot fri yta, inte fönstret. */}
        <text
          x={SCENE_VIEWBOX_W / 2}
          y={SCENE_VIEWBOX_H - 12}
          textAnchor="middle"
          fill="#5a5449"
          fontSize={18}
          fontFamily="system-ui, sans-serif"
        >
          SD-003 rev. 2 — rekognosering · scene {widthPx} px · {panningNeeded ? 'panorering krävs (<2240 px)' : 'full bredd'}
        </text>
      </svg>
    </div>
  );
}

interface OpeningProps {
  x: number;
  y: number;
  w: number;
  h: number;
  target: FokusRum;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}

function Opening({ x, y, w, h, target, hovered, onEnter, onLeave, onClick }: OpeningProps) {
  return (
    <g>
      {/* Själva öppningen (mörkare fyllning + ram) */}
      <rect
        data-opening={target}
        x={x}
        y={y}
        width={w}
        height={h}
        fill={hovered ? COLOR_OPENING_HOVER : COLOR_OPENING}
        stroke="#6b6355"
        strokeWidth={2}
      />
      {/* Klickyta — läggs OVANPÅ öppning, med pointer-events opt-in.
          Separat rect så vi kan använda `cursor: pointer` utan att den
          styling går ut över svg-fyllningen. */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="transparent"
        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={onClick}
      />
      {/* Etikett — vilket rum öppningen leder in i. */}
      <text
        x={x + w / 2}
        y={y + h + 32}
        textAnchor="middle"
        fill="#8a836e"
        fontSize={22}
        fontFamily="system-ui, sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {ROOM_LABELS[target]}
      </text>
    </g>
  );
}
