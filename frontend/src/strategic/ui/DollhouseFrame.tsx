// TEMPORÄR rekognosering-komponent för SD-003 rev. 2:s dockskåp.
//
// **Placeringen i ui/** (inte scene/) är avsiktlig: komponenten är ren
// DOM/SVG-overlay, inte R3F. `scene/`-mappen scannas av
// scenePropShape.smoke.test.ts som förbjuder hyphenade JSX-attribut på
// lowercase-element. Data-attribut som `data-opening` är korrekta på
// DOM/SVG men skulle failer smoketest:et i scene/.
//
// Vision Owner-begäran 2026-08-15/16: en tillfällig växel i playtest-
// läget som renderar denna komponent i stället för det vanliga 3D-
// restaurangvyet. Ingen permanent koppling — den riktiga monteringen
// (patternTransform på karta, mise-en-place-migration till PanelColumn,
// pixelbudget-fullt panorering under 1 280 px) hör till food truck-
// ordern (SD-003 §8 följdorder 3).
//
// **SD-003 §2 alternativ C:**
// - Ett fokusrum fyller vyn (bakvägg, golv, tak-list)
// - De andra två syns som **öppningar i bakväggen** — inte som egna rum
//   sida vid sida — utan som *passluckan mot köket* och *bardiskens
//   öppning mot baren*. Båda är horisontella (bredare än höga) och
//   sitter vid counter-höjd i bakväggen, inte som dörr-formade öppningar.
// - Klick på en öppning byter fokus: det valda rummet blir fokusrum, det
//   tidigare fokusrummet blir öppning i det nya rummets bakvägg.
//
// **Scenbredden mäts, inte antas.** `usePanelInsets()` läser den
// faktiska bredden av `[data-panel-column="left"]` och
// `[data-panel-column="right"]` via ResizeObserver och rAF-polling
// (samma pattern som DevPanel använder för kamera-distansen). Faller
// tillbaka till default-värden om kolumnerna inte finns i DOM:en (t.ex.
// under jsdom-tester).

import { useEffect, useMemo, useState } from 'react';

// SVG-scenen använder viewBox 2432×1080. Rendering skalar viewBox till
// den css-storlek `<svg>` faktiskt får. Scenens CSS-bredd är beräknad
// från viewport minus panel-mätta reserver.
const SCENE_VIEWBOX_W = 2432;
const SCENE_VIEWBOX_H = 1080;

// Default panel-reserver — bara fallback när PanelColumn-elementen inte
// finns i DOM:en. Vid vanlig körning ersätts av mätning.
const DEFAULT_LEFT_INSET_PX = 360;
const DEFAULT_RIGHT_INSET_PX = 340;
const EXTRA_MARGIN_PX = 24;

// ORDER 096 §5.2 pixelbudget-golv: 16 kuvert × 140 px/figur = 2 240 px.
// Under detta blir scenen för smal för full räckvidd → panorering krävs.
// Panorering själv hör till följdordern; här visar vi bara varning.
const SCENE_MIN_FULL_WIDTH_PX = 2240;

// Rumsproportioner i viewBox-enheter. Fokusrummet ÄR SVG-scenen.
const FLOOR_H = 60;
const CEILING_H = 24;
const SIDE_MARGIN = 40;

// Passluckan/bardiskens geometri — horisontella öppningar i bakväggen
// vid counter-höjd. Bredare än höga (motsatsen till en dörr) så formen
// läses som "fönster/lucka i bakvägg" istället för "dörr in i eget rum".
// Storlek: ~16 % av bakväggens bredd × ~20 % av bakväggens höjd —
// tillräckligt små för att bakväggen fortfarande dominerar visuellt.
const OPENING_W = 380;
const OPENING_H = 200;
// Öppningarnas insättning från bakväggens sida-kant. Större insättning
// gör att bakväggens fokusrums-band känns bredare i mitten.
const OPENING_INSET_X = 300;
// Vertikal placering — counter-höjd är typiskt mid-wall (~50 %) men vi
// lyfter något så en förbipasserande figur i fokusrummet inte skymmer.
const OPENING_CENTER_Y_FRAC = 0.55;

// Färger.
const COLOR_WALL = '#4a453d';
const COLOR_FLOOR = '#3a352e';
const COLOR_CEILING = '#2d2924';
const COLOR_OPENING = '#1c1a17';
const COLOR_OPENING_HOVER = '#2a2620';
// Passluckans/bardiskens "counter-linje" — antytt via en tunn ljusare
// linje längs öppningens nederkant, som visar var arbetsytan möts.
const COLOR_COUNTER_LINE = '#6b6355';

type FokusRum = 'fokusrum' | 'kok' | 'bar';

// Vilka öppningar (kok/bar/fokusrum) som visas per fokusrum. När fokus
// = 'fokusrum', ser vi öppningar mot 'kok' och 'bar'. När fokus = 'kok',
// ser vi öppningar mot 'fokusrum' och 'bar' (det tidigare fokusrummet
// blir öppning i det nya rummets bakvägg).
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

// Öppningens beskrivning per målrum — passluckan för kök, bardisken för
// bar, "matsalen" när fokus-swap gör matsalen till öppning.
const OPENING_LABELS: Record<FokusRum, string> = {
  kok:      'passluckan',
  bar:      'bardisken',
  fokusrum: 'matsalen'
};

interface PanelInsets {
  left: number;
  right: number;
}

// Mäter faktisk bredd på PanelColumn-elementen via ResizeObserver +
// rAF-polling för att fånga initialt mount + resize. Faller tillbaka
// till default när kolumnerna inte finns (jsdom-tester eller lager där
// dockskåpet renderas utan panel-shell).
function usePanelInsets(): PanelInsets {
  const [insets, setInsets] = useState<PanelInsets>({
    left: DEFAULT_LEFT_INSET_PX,
    right: DEFAULT_RIGHT_INSET_PX
  });

  useEffect(() => {
    let raf = 0;
    let observer: ResizeObserver | null = null;
    let observed: Element[] = [];

    const measure = () => {
      const leftCol = document.querySelector('[data-panel-column="left"]');
      const rightCol = document.querySelector('[data-panel-column="right"]');
      const leftW = leftCol
        ? (leftCol as HTMLElement).getBoundingClientRect().width
        : 0;
      const rightW = rightCol
        ? (rightCol as HTMLElement).getBoundingClientRect().width
        : 0;
      // Fall tillbaka till default när DOM-mätning ger 0 (t.ex. jsdom
      // som inte gör layout, eller innan kolumnerna mount:at).
      const next: PanelInsets = {
        left: leftW > 0 ? leftW + EXTRA_MARGIN_PX : DEFAULT_LEFT_INSET_PX,
        right: rightW > 0 ? rightW + EXTRA_MARGIN_PX : DEFAULT_RIGHT_INSET_PX
      };
      setInsets((prev) =>
        prev.left === next.left && prev.right === next.right ? prev : next
      );
    };

    const attachObserver = () => {
      if (typeof ResizeObserver === 'undefined') return;
      const leftCol = document.querySelector('[data-panel-column="left"]');
      const rightCol = document.querySelector('[data-panel-column="right"]');
      observer = new ResizeObserver(measure);
      observed = [];
      if (leftCol) {
        observer.observe(leftCol);
        observed.push(leftCol);
      }
      if (rightCol) {
        observer.observe(rightCol);
        observed.push(rightCol);
      }
    };

    // Initial mätning + Observer-attach. Om kolumnerna inte finns än
    // (mount-race) polla några frames tills de dyker upp.
    let attachAttempts = 0;
    const tryAttach = () => {
      measure();
      attachObserver();
      if (observed.length === 0 && attachAttempts < 60) {
        attachAttempts += 1;
        raf = requestAnimationFrame(tryAttach);
      }
    };
    tryAttach();

    window.addEventListener('resize', measure);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', measure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return insets;
}

function useSceneWidth(insets: PanelInsets): {
  widthPx: number;
  panningNeeded: boolean;
} {
  const [innerWidth, setInnerWidth] = useState(() =>
    typeof window === 'undefined' ? SCENE_MIN_FULL_WIDTH_PX : window.innerWidth
  );
  useEffect(() => {
    const handler = () => setInnerWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const widthPx = Math.max(320, innerWidth - insets.left - insets.right);
  return { widthPx, panningNeeded: widthPx < SCENE_MIN_FULL_WIDTH_PX };
}

export function DollhouseFrame() {
  const [focus, setFocus] = useState<FokusRum>('fokusrum');
  const [hovered, setHovered] = useState<FokusRum | null>(null);
  const insets = usePanelInsets();
  const { widthPx, panningNeeded } = useSceneWidth(insets);

  const [leftRoom, rightRoom] = OPENINGS_BY_FOCUS[focus];

  const geometry = useMemo(() => {
    const wallLeft = SIDE_MARGIN;
    const wallRight = SCENE_VIEWBOX_W - SIDE_MARGIN;
    const wallTop = CEILING_H;
    const wallBottom = SCENE_VIEWBOX_H - FLOOR_H;
    const wallHeight = wallBottom - wallTop;
    // Öppningarna centrerade vertikalt vid counter-höjd (55% ner i
    // bakväggen).
    const openingCenterY = wallTop + wallHeight * OPENING_CENTER_Y_FRAC;
    const openingY = openingCenterY - OPENING_H / 2;
    const openingLeftX = wallLeft + OPENING_INSET_X;
    const openingRightX = wallRight - OPENING_INSET_X - OPENING_W;
    return {
      wallLeft,
      wallRight,
      wallWidth: wallRight - wallLeft,
      wallTop,
      wallBottom,
      wallHeight,
      openingY,
      openingLeftX,
      openingRightX
    };
  }, []);

  return (
    <div
      data-dollhouse-frame
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        background: '#1a1815',
        // Layout: horisontellt centrerad scenyta med panel-reserv på
        // båda sidor via padding. `pointer-events: none` på yttre lagret
        // så mushjul/drag når panelerna över/under; öppningarna opt:ar
        // in med sin egen `pointer-events: auto` för klick.
        pointerEvents: 'none',
        paddingLeft: insets.left,
        paddingRight: insets.right,
        boxSizing: 'border-box'
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
          x={geometry.wallLeft}
          y={geometry.wallTop}
          width={geometry.wallWidth}
          height={geometry.wallHeight}
          fill={COLOR_WALL}
        />
        {/* Fokusrummets namn — läses stort på bakväggen. */}
        <text
          x={SCENE_VIEWBOX_W / 2}
          y={geometry.wallTop + 120}
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
          y={geometry.wallBottom}
          width={SCENE_VIEWBOX_W}
          height={FLOOR_H}
          fill={COLOR_FLOOR}
        />
        {/* Vänster öppning i bakväggen — passluckan/bardisken beroende
            på var fokus står. Horisontell (bredare än hög) — läses som
            "fönster i bakvägg" inte "dörr in i eget rum". */}
        <Opening
          x={geometry.openingLeftX}
          y={geometry.openingY}
          target={leftRoom}
          hovered={hovered === leftRoom}
          onEnter={() => setHovered(leftRoom)}
          onLeave={() => setHovered(null)}
          onClick={() => setFocus(leftRoom)}
        />
        {/* Höger öppning i bakväggen */}
        <Opening
          x={geometry.openingRightX}
          y={geometry.openingY}
          target={rightRoom}
          hovered={hovered === rightRoom}
          onEnter={() => setHovered(rightRoom)}
          onLeave={() => setHovered(null)}
          onClick={() => setFocus(rightRoom)}
        />
        {/* Rekognoserings-metadata — dev-only markering + scen-mått för
            att bekräfta att bredden räknas mot fri yta. */}
        <text
          x={SCENE_VIEWBOX_W / 2}
          y={SCENE_VIEWBOX_H - 12}
          textAnchor="middle"
          fill="#5a5449"
          fontSize={18}
          fontFamily="system-ui, sans-serif"
        >
          SD-003 rev. 2 — rekognosering · scene {widthPx} px (viewport −{' '}
          {Math.round(insets.left)} vä − {Math.round(insets.right)} hö){' '}
          · {panningNeeded ? 'panorering krävs (<2240)' : 'full bredd'}
        </text>
      </svg>
    </div>
  );
}

interface OpeningProps {
  x: number;
  y: number;
  target: FokusRum;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}

function Opening({ x, y, target, hovered, onEnter, onLeave, onClick }: OpeningProps) {
  const w = OPENING_W;
  const h = OPENING_H;
  return (
    <g>
      {/* Öppningens fyllning — glimt in i angränsande rum */}
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
      {/* Counter-linje längs nederkanten — visar var arbetsytan möts,
          markerar öppningen som passluckan/bardisken snarare än dörr. */}
      <line
        x1={x}
        y1={y + h}
        x2={x + w}
        y2={y + h}
        stroke={COLOR_COUNTER_LINE}
        strokeWidth={4}
      />
      {/* Klickyta — läggs OVANPÅ, med pointer-events opt-in. */}
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
      {/* Etikett under öppningen — "passluckan · Köket" eller
          "bardisken · Baren". Tydliggör vilken sorts öppning det är
          och vart klicket leder. */}
      <text
        x={x + w / 2}
        y={y + h + 32}
        textAnchor="middle"
        fill="#8a836e"
        fontSize={20}
        fontFamily="system-ui, sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {OPENING_LABELS[target]} · {ROOM_LABELS[target]}
      </text>
    </g>
  );
}
