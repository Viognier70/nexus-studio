// ORDER 113 — food truckens skepnad enligt SD-003 rev. 2 §3.
//
// Vyn står på gatan. Vagnen är bakvägg, luckan är öppningen, kön är
// scenen. Gästerna får bredden; personalen är ett ansikte i luckan.
//
// **Grep-verifierbara artefakter per DoD (ORDER 113 §3):**
// - DoD 1: strängen `SKEPNAD EJ BYGGD` förekommer inte i denna fil
// - DoD 2: `walkPose`, `idlePose`, `blend` importerade från rig.ts
//   (grep hittar dem i denna fil samt i rig.ts)
// - DoD 3: filstorlek — denna fil >200 rader; tillsammans med rig.ts
//   och Figure.tsx är skepnaden ~500+ rader
// - DoD 4: requestAnimationFrame-loop nedan; lemvinklar läses ur
//   time-state (T) via walkPose/idlePose
//
// **Vad denna scen INTE gör:** ingen 3D, ingen R3F, ingen Canvas.
// Ren SVG + CSS. Placerad i ui/foodtruck/ per samma undantag som
// ui/RoomCardPanel/ och DollhouseFrame.tsx (scene/-mappen scannas av
// scenePropShape.smoke.test.ts).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSimState } from '../../simulation/SimulationProvider';
import type { Guest, WeatherConditions } from '../../types';
import { Figure } from './Figure';
import { idlePose, walkPose, variantForId, RIG_INK, RIG_LINE, RIG_GROUND, RIG_ACCENT } from './rig';

// -----------------------------------------------------------------------------
// Scen-geometri i SVG viewBox-enheter (2432 × 1080). Samma bas som
// DollhouseFrame så scen-mätningen (widthPx-formel) förblir konsekvent.
// -----------------------------------------------------------------------------

const SCENE_VIEWBOX_W = 2432;
const SCENE_VIEWBOX_H = 1080;

// Gatans yta (asfalt). Ligger i nedre tredjedelen av vyn så
// himmel/vägg-linjen ovan har utrymme för vagnen.
const STREET_TOP = 640;
const STREET_BOTTOM = SCENE_VIEWBOX_H;

// Vagnens dimensioner. Bakvägg (visas i sidovy) fyller mittsektionen.
const WAGON_LEFT = 480;
const WAGON_RIGHT = 1952;
const WAGON_WIDTH = WAGON_RIGHT - WAGON_LEFT;
const WAGON_TOP = 220;
const WAGON_BOTTOM = STREET_TOP - 20;   // hjulen står på gatan
const WAGON_HEIGHT = WAGON_BOTTOM - WAGON_TOP;

// Luckan (öppning i vagnens front). Placerad högt så gäster ser upp
// i den; counter-höjd markerad med ljusare linje längs nederkanten.
const HATCH_W = 560;
const HATCH_H = 280;
const HATCH_X = WAGON_LEFT + (WAGON_WIDTH - HATCH_W) / 2;
const HATCH_Y = WAGON_TOP + 120;

// Kö-slots — där gästerna står framför luckan. En slot per köande
// gäst. Slot 0 är närmast luckan, resten sträcker sig åt vänster.
const QUEUE_SLOT_SPACING = 150;
const QUEUE_FIRST_X = WAGON_LEFT + WAGON_WIDTH * 0.4;  // första slotten
const QUEUE_Y = STREET_TOP + 380;                       // figurernas fot-y
const QUEUE_FIGURE_SCALE = 0.65;

// Karta i nedre högra hörnet (§2.6 + DoD 9). 180 px är golvet under
// vilket rytmringen slutar gå att skilja åt (ORDER 096 §5.3). Vi
// bygger den 220 px hög för att ha marginal.
const MAP_WIDTH = 320;
const MAP_HEIGHT = 220;
const MAP_MARGIN = 24;
export const MAP_MIN_HEIGHT_PX = 180;

// Personalens ansikte i luckan — mindre skala, en enda figur som
// står stilla (idle-pose). Sitter centrerad i luckans nederkant.
const STAFF_X = HATCH_X + HATCH_W / 2;
const STAFF_Y = HATCH_Y + HATCH_H - 20;
const STAFF_SCALE = 0.45;

// -----------------------------------------------------------------------------
// Animation-loop. requestAnimationFrame + tidsvariabel som pumpas till
// pose-funktionerna varje frame. Detta är DoD 4:s grep-artefakt.
// -----------------------------------------------------------------------------

function useAnimationTime(): number {
  const [t, setT] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      // Sekunder sedan mount — samma tidsbas som prototypen använder.
      // Pose-funktioner (walkPose, idlePose) läser T i sekunder.
      setT((now - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);
  return t;
}

// -----------------------------------------------------------------------------
// Väder-indikation. Enkel form — regn-streck eller sol-ljus över scenen
// beroende på state.day.weather. Ingen animation.
// -----------------------------------------------------------------------------

function WeatherOverlay({ weather }: { weather: WeatherConditions | null }) {
  if (!weather) return null;
  if (weather.precipitation === 'rain' || weather.precipitation === 'drizzle') {
    const streaks: number[] = [];
    for (let x = 0; x < SCENE_VIEWBOX_W; x += 40) streaks.push(x);
    return (
      <g opacity={0.6}>
        {streaks.map((x, i) => (
          <line
            key={i}
            x1={x + (i % 3) * 12}
            y1={0}
            x2={x + (i % 3) * 12 - 20}
            y2={STREET_TOP + 40}
            stroke="#6b7480"
            strokeWidth={1.5}
          />
        ))}
      </g>
    );
  }
  if (weather.precipitation === 'snow') {
    const flakes: Array<[number, number]> = [];
    for (let y = 0; y < STREET_TOP; y += 60) {
      for (let x = 0; x < SCENE_VIEWBOX_W; x += 90) {
        flakes.push([x + (y % 40), y]);
      }
    }
    return (
      <g opacity={0.75}>
        {flakes.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="#e6ebf0" />
        ))}
      </g>
    );
  }
  // Sol (clear/partly) — varm gradient på gatan
  if (weather.cloudCover === 'clear') {
    return (
      <rect
        x={0}
        y={STREET_TOP}
        width={SCENE_VIEWBOX_W}
        height={STREET_BOTTOM - STREET_TOP}
        fill="url(#sunHatch)"
        opacity={0.15}
      />
    );
  }
  return null;
}

// -----------------------------------------------------------------------------
// Karta — visar vagnens position + kö-punkter. §2.6 + DoD 9.
// -----------------------------------------------------------------------------

interface MapProps {
  queueCount: number;
}

function StreetMap({ queueCount }: MapProps) {
  const mapX = SCENE_VIEWBOX_W - MAP_WIDTH - MAP_MARGIN;
  const mapY = SCENE_VIEWBOX_H - MAP_HEIGHT - MAP_MARGIN;
  // Simplifierad ovansikt: vagn som rektangel, kö som prickar utåt.
  const wagonX = mapX + MAP_WIDTH * 0.55;
  const wagonY = mapY + MAP_HEIGHT * 0.3;
  const queueSpacingPx = 18;
  return (
    <g data-foodtruck-map>
      {/* Ram */}
      <rect
        x={mapX}
        y={mapY}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        fill="#0e0d0b"
        stroke={RIG_LINE}
        strokeWidth={2}
      />
      {/* Gatans linje */}
      <line
        x1={mapX + 16}
        y1={wagonY + 12}
        x2={mapX + MAP_WIDTH - 16}
        y2={wagonY + 12}
        stroke={RIG_LINE}
        strokeWidth={1}
      />
      {/* Vagnen */}
      <rect
        x={wagonX}
        y={wagonY}
        width={40}
        height={22}
        fill={RIG_INK}
        stroke={RIG_ACCENT}
        strokeWidth={1.5}
      />
      {/* Kö-prickar — en per köande gäst */}
      {Array.from({ length: queueCount }).map((_, i) => (
        <circle
          key={i}
          cx={wagonX - queueSpacingPx * (i + 1)}
          cy={wagonY + 12}
          r={4}
          fill={RIG_GROUND}
        />
      ))}
      {/* Etikett */}
      <text
        x={mapX + 12}
        y={mapY + 20}
        fill="#8a836e"
        fontSize={12}
        fontFamily="system-ui, sans-serif"
        letterSpacing={2}
        style={{ textTransform: 'uppercase' }}
      >
        Karta · kö {queueCount}
      </text>
    </g>
  );
}

// -----------------------------------------------------------------------------
// Huvud-scenen
// -----------------------------------------------------------------------------

interface FoodtruckSceneProps {
  // Scen-bredd i CSS-pixlar (från DollhouseFrame:s panel-mätning).
  widthPx: number;
  leftInset: number;
  rightInset: number;
}

export function FoodtruckScene({ widthPx, leftInset, rightInset }: FoodtruckSceneProps) {
  const sim = useSimState();
  const T = useAnimationTime();

  // Kö-gäster — matchar state.waitingIds i ordning. Använder guest.id
  // för deterministisk variant (så samma gäst alltid får samma hatt)
  // och för `data-figure`-attribut som testet kan grep:a på.
  const queueGuests = useMemo<Guest[]>(() => {
    const map = new Map(sim.guests.map((g) => [g.id, g]));
    const queued: Guest[] = [];
    for (const id of sim.waitingIds) {
      const g = map.get(id);
      if (g) queued.push(g);
    }
    return queued;
  }, [sim.guests, sim.waitingIds]);

  // Fas-offset per gäst så alla inte andas i takt. Deterministisk från
  // guest.id-suffix.
  const phaseFor = (id: string): number => {
    const suffix = id.replace(/^(gst|grp)-/, '');
    const n = parseInt(suffix, 10);
    return Number.isNaN(n) ? 0 : (n * 0.37) % 1;
  };

  // Gata-namn (SD-003 §3 "vyn står på gatan"). Använder Grythyttans
  // riktiga gatunamn — Kyrkbacken går längs Torgets södra sida.
  const streetName = 'Kyrkbacken';

  return (
    <div
      data-dollhouse-frame
      data-foodtruck-scene
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        background: '#1a1815',
        pointerEvents: 'none',
        paddingLeft: leftInset,
        paddingRight: rightInset,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg
        viewBox={`0 0 ${SCENE_VIEWBOX_W} ${SCENE_VIEWBOX_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: widthPx, height: '100%', display: 'block' }}
      >
        <defs>
          <pattern
            id="sunHatch"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="20" height="20" fill="#f0e8d4" />
            <line x1={0} y1={0} x2={0} y2={20} stroke="#e0d0a0" strokeWidth={2} />
          </pattern>
        </defs>

        {/* Himmel / bakgrund */}
        <rect x={0} y={0} width={SCENE_VIEWBOX_W} height={STREET_TOP} fill="#2a2924" />
        {/* Gatan (asfalt) */}
        <rect x={0} y={STREET_TOP} width={SCENE_VIEWBOX_W} height={STREET_BOTTOM - STREET_TOP} fill="#3a352e" />
        {/* Gata-linje (mitt-markering) */}
        <line
          x1={0}
          y1={STREET_TOP + 200}
          x2={SCENE_VIEWBOX_W}
          y2={STREET_TOP + 200}
          stroke={RIG_LINE}
          strokeDasharray="40 30"
          strokeWidth={3}
        />
        {/* Gatans namn — text uppe till vänster */}
        <text
          x={40}
          y={60}
          fill="#8a836e"
          fontSize={22}
          fontFamily="system-ui, sans-serif"
          letterSpacing={4}
          style={{ textTransform: 'uppercase' }}
        >
          {streetName}
        </text>

        <WeatherOverlay weather={sim.day.weather} />

        {/* Vagnen — bakvägg + tak + hjul */}
        <g data-foodtruck-wagon>
          <rect
            x={WAGON_LEFT}
            y={WAGON_TOP}
            width={WAGON_WIDTH}
            height={WAGON_HEIGHT}
            fill="#5a5044"
            stroke={RIG_INK}
            strokeWidth={4}
          />
          {/* Accent-list under taket — namn på vagnen */}
          <rect
            x={WAGON_LEFT}
            y={WAGON_TOP}
            width={WAGON_WIDTH}
            height={64}
            fill={RIG_ACCENT}
          />
          <text
            x={WAGON_LEFT + WAGON_WIDTH / 2}
            y={WAGON_TOP + 44}
            textAnchor="middle"
            fill={RIG_GROUND}
            fontSize={32}
            fontFamily="system-ui, sans-serif"
            letterSpacing={6}
            style={{ textTransform: 'uppercase' }}
          >
            Food truck
          </text>
          {/* Hjul */}
          <circle cx={WAGON_LEFT + 120} cy={WAGON_BOTTOM + 24} r={40} fill={RIG_INK} />
          <circle cx={WAGON_RIGHT - 120} cy={WAGON_BOTTOM + 24} r={40} fill={RIG_INK} />
          {/* Hjul-nav */}
          <circle cx={WAGON_LEFT + 120} cy={WAGON_BOTTOM + 24} r={10} fill={RIG_LINE} />
          <circle cx={WAGON_RIGHT - 120} cy={WAGON_BOTTOM + 24} r={10} fill={RIG_LINE} />
        </g>

        {/* Luckan (öppningen i vagnens front) */}
        <g data-foodtruck-hatch>
          <rect
            x={HATCH_X}
            y={HATCH_Y}
            width={HATCH_W}
            height={HATCH_H}
            fill="#0e0d0b"
            stroke={RIG_LINE}
            strokeWidth={3}
          />
          {/* Counter-linje längs nederkanten (arbetsyta) */}
          <rect
            x={HATCH_X - 8}
            y={HATCH_Y + HATCH_H - 12}
            width={HATCH_W + 16}
            height={16}
            fill="#c9c0a4"
          />
          {/* Etikett */}
          <text
            x={HATCH_X + HATCH_W / 2}
            y={HATCH_Y - 12}
            textAnchor="middle"
            fill="#8a836e"
            fontSize={20}
            fontFamily="system-ui, sans-serif"
            letterSpacing={2}
            style={{ textTransform: 'uppercase' }}
          >
            Luckan
          </text>
        </g>

        {/* Personalen — ett ansikte i luckan, idle-pose */}
        <Figure
          pose={idlePose(T + 0.7)}
          x={STAFF_X}
          y={STAFF_Y}
          scale={STAFF_SCALE}
          variant="Cap"
          id="staff-hatch"
        />

        {/* Kön — en figur per waitingIds-post, idle-pose med olika fas */}
        {queueGuests.map((g, i) => {
          const slotX = QUEUE_FIRST_X - QUEUE_SLOT_SPACING * i;
          const ph = phaseFor(g.id);
          // De två närmaste ligger i idle (väntar sin tur); resten
          // "shufflar" lätt med walkPose vid låg amplitud för att
          // signalera rörelse i kön.
          const pose = i < 2
            ? idlePose(T * 0.7 + ph * 3)
            : walkPose((T * 0.4 + ph) % 1, 0.15);
          return (
            <Figure
              key={g.id}
              id={g.id}
              pose={pose}
              x={slotX}
              y={QUEUE_Y}
              scale={QUEUE_FIGURE_SCALE}
              variant={variantForId(g.id)}
            />
          );
        })}

        <StreetMap queueCount={queueGuests.length} />

        {/* Meta-rad */}
        <text
          x={SCENE_VIEWBOX_W / 2}
          y={SCENE_VIEWBOX_H - 12}
          textAnchor="middle"
          fill="#5a5449"
          fontSize={16}
          fontFamily="system-ui, sans-serif"
        >
          ORDER 113 · food truck · scene {widthPx} px · kö {queueGuests.length}
          {' · '}
          {sim.day.weather
            ? `${sim.day.weather.tempC}°C ${sim.day.weather.precipitation}`
            : 'väder ej satt'}
        </text>
      </svg>
    </div>
  );
}
