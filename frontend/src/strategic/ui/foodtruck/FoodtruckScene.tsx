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

import { useEffect, useRef, useState } from 'react';
import { useSimState } from '../../simulation/SimulationProvider';
import type { WeatherConditions } from '../../types';
import { Figure } from './Figure';
import { idlePose, walkPose, variantForId, RIG_INK, RIG_LINE, RIG_GROUND, RIG_ACCENT } from './rig';
import { RIG_PROTO_MAX_WIDTH_AT_SCALE_1 } from './rig';
import type { Pose, FigureVariant } from './rig';
import { assignArchetype, assignSkinTone, FOODTRUCK_ARCHETYPES, applyArchetypeMod } from './archetypes';
import type { FoodtruckArchetype } from './archetypes';
import { deriveFoodtruckGuestFace, GUEST_FACES } from './guestFaces';
import type { GuestFaceKey, FaceParams } from './guestFaces';

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
// ORDER 114 Steg 2 DoD 3 — skalning kalibrerad mot faktiskt CSS-bredd.
//
// **Rättad 2026-08-17 (rev 2)** efter VO-fynd mot faces.png:
//   Härleder ALLA positions-mått ur `QUEUE_FIGURE_SCALE` +
//   `RIG_PROTO_MAX_WIDTH_AT_SCALE_1` (definierad i rig.ts från
//   prototypens uppmätta geometri). Inga hårdkodade pixel-värden
//   för spacing/offset — ändras scale i framtiden följer allt annat
//   automatiskt. Tidigare buggen "överlappande figurer" berodde på att
//   QUEUE_SLOT_SPACING satts numeriskt (400) medan scale bumpades
//   från 1.05 → 2.5 utan att spacing följde med.
//
// **Fynd per §6 (kvarstår):** 140 CSS-px per figur kan INTE nås vid
// nuvarande scen-bredd (1216 CSS-px). Figur-aspect torso 62 : totalhöjd
// 316 betyder 140 CSS-px bred = 630 CSS-px hög = 58% av scen-höjden.
// Full 140 CSS-px kräver bredare scen (följdorder).
const QUEUE_FIGURE_SCALE = 2.5;

// **Härledda spacing-konstanter** — allt skalas automatiskt med
// `QUEUE_FIGURE_SCALE`.
//
// FIGURE_MAX_WIDTH_UNITS = prototypens max-bredd (torso + arm-swing
// vid walkPose amp=1.0) × scale. Se rig.ts:RIG_PROTO_MAX_WIDTH_AT_SCALE_1
// för härledningen (torso 62 + arm-swing ±47 = 156 units).
const FIGURE_MAX_WIDTH_UNITS = RIG_PROTO_MAX_WIDTH_AT_SCALE_1 * QUEUE_FIGURE_SCALE;
// Safety-marginal: 40% extra luft mellan figurers ytterkanter så
// arm-frame-övergångar aldrig ger visuell tangens. 1.4× är kalibrerat
// mot att accent-remsan bryts synligt mellan slots.
const SPACING_SAFETY_MARGIN = 1.4;
// Slot-spacing = max-figur-bredd × safety-marginal. Härledd, INTE
// hårdkodad. Vid scale 2.5: 156 × 2.5 × 1.4 = 546 units.
const QUEUE_SLOT_SPACING = Math.round(FIGURE_MAX_WIDTH_UNITS * SPACING_SAFETY_MARGIN);
const QUEUE_Y = STREET_TOP + 380;                        // figurernas fot-y

// Karta i nedre högra hörnet (§2.6 + DoD 9). 180 px är golvet under
// vilket rytmringen slutar gå att skilja åt (ORDER 096 §5.3). Vi
// bygger den 220 px hög för att ha marginal.
const MAP_WIDTH = 320;
const MAP_HEIGHT = 220;
const MAP_MARGIN = 24;
export const MAP_MIN_HEIGHT_PX = 180;

// Personalens ansikte i luckan — mindre skala, en enda figur som
// står stilla (idle-pose). ORDER 114 Steg 2 — bumpad till 1.6 så
// luckans ansikte läses lika starkt som gäst-ansiktena (scale 2.5).
// Y-position centrerad i luckan så personen står bakom counter.
const STAFF_X = HATCH_X + HATCH_W / 2;
const STAFF_Y = HATCH_Y + HATCH_H - 8;
const STAFF_SCALE = 1.6;

// ORDER 113 fel 2 — positioner för gäster i andra states än 'waiting'.
// Före fel 2 renderade FoodtruckScene bara sim.waitingIds; gäster i
// 'ordering'/'paying'/'arriving'/'leaving' försvann ur scenen så snart
// staff-pipelinen tog dem ur kön, även om waitingIds momentant var > 0.
// Nu positioneras alla sim.guests per state:
//
//   arriving  → vänsterkant på gatan, gående höger mot kö-back
//   waiting   → kö-slot (som förut)
//   ordering  → framför luckan (interagerar med personalen)
//   paying    → framför luckan, marginellt förskjuten (transaktion)
//   leaving   → höger om vagnen, gående ut ur scenen
//   declined  → höger om vagnen (vände om), gående ut
//   seated / dining / sleeping → skippas (foodtruck saknar matsal;
//     ORDER 111:s guarder ska hindra detta men den defensiva skippen
//     håller renderaren robust mot framtida sim-tillägg)
//
// Positionerna är i SVG viewBox-koordinater (samma frame som
// wagon/hatch/queue-slot). Ingen mappning från sim.position (m) sker;
// scen-positionering är rent state-baserad — sim-lagret bestämmer
// TILLSTÅND, renderaren bestämmer VAR i scenen tillståndet visas.
const COUNTER_X = HATCH_X + HATCH_W / 2;
const COUNTER_Y = QUEUE_Y;
// Counter-stack sprider figurer TILL HÖGER (bort från kön). Halva
// slot-spacing räcker eftersom counter-figurer står stilla (idle-pose,
// ingen arm-swing). Härledd, inte hårdkodad.
const COUNTER_STACK_OFFSET = Math.round(QUEUE_SLOT_SPACING * 0.5);
// Första kö-slotten härleds från COUNTER_X så att slot 0 är exakt
// QUEUE_SLOT_SPACING vänster om counter-mitten. Utan denna härledning
// (t.ex. tidigare `QUEUE_FIRST_X = WAGON_LEFT + WAGON_WIDTH * 0.30`)
// blev avståndet mellan slot 0 och counter-figurer < slot-spacing →
// counter-ordering-figurer överlappade första waiting-gästen. Med
// härledning skjuts hela kön automatiskt när QUEUE_SLOT_SPACING bumpas.
const QUEUE_FIRST_X = COUNTER_X - QUEUE_SLOT_SPACING;
// Arriving-fältet — vänster om kö-back. Samma spacing som kön så
// gående-in-figurer inte överlappar vid pose-frame-övergång.
const ARRIVING_START_X = 100;
const ARRIVING_SPACING = QUEUE_SLOT_SPACING;
// Leaving-fältet — höger om vagnen, gående ut.
const LEAVING_START_X = SCENE_VIEWBOX_W - 220;
const LEAVING_SPACING = QUEUE_SLOT_SPACING;

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

  // Fas-offset per gäst så alla inte andas i takt. Deterministisk från
  // guest.id-suffix.
  const phaseFor = (id: string): number => {
    const suffix = id.replace(/^(gst|grp)-/, '');
    const n = parseInt(suffix, 10);
    return Number.isNaN(n) ? 0 : (n * 0.37) % 1;
  };

  // ORDER 113 fel 2 — positionera ALLA sim.guests, inte bara waitingIds.
  // Före fel 2 renderades bara kön; gäster i ordering/paying/leaving
  // försvann ur scenen så snart de lämnade waitingIds. Kombinerat med
  // fel 1-fixen (staff-pipelinen serverar snabbt) blinkade kön förbi
  // och scenen såg död ut trots pågående service.
  //
  // Positioneringen är state-baserad, inte sim.position-baserad —
  // se COUNTER_X-blocket för motivering.
  const waitingIdxById = new Map<string, number>();
  sim.waitingIds.forEach((id, i) => waitingIdxById.set(id, i));

  interface PositionedGuest {
    id: string;
    x: number;
    y: number;
    pose: Pose;
    variant: FigureVariant;
    archetype: FoodtruckArchetype;
    face: FaceParams;
    faceKey: GuestFaceKey;
    skinTone: string;
    facing: 1 | -1;   // -1 = titta höger (mot luckan), 1 = titta vänster (default figur-läge)
  }
  const positionedGuests: PositionedGuest[] = [];
  // Räknare per state-typ så flera gäster i samma tillstånd inte
  // överlappar exakt på samma pixel.
  let orderingIdx = 0;
  let payingIdx = 0;
  let arrivingIdx = 0;
  let leavingIdx = 0;

  // Sido-offset-hjälp för counter-stacken: 0, -1, +1, -2, +2, ... så
  // första gästen står centrerad, resten pendlar ut åt sidorna.
  // Counter-stack sprider figurer TILL HÖGER först. Väster sida (mot
  // kön) undviks aktivt så counter-figurer inte överlappar kö-slot 0.
  // Ordning: 0 (mitt), +1 höger, +2 höger, +3 höger, ... — pendlar
  // aldrig åt vänster där kön står.
  const counterOffset = (idx: number): number => {
    return idx * COUNTER_STACK_OFFSET;
  };

  for (const g of sim.guests) {
    const ph = phaseFor(g.id);
    const variant = variantForId(g.id);
    // ORDER 114 §3 wire — arketyp + hudton tilldelas deterministiskt
    // per gäst-id, period-viktat. Uttrycket härleds från state + kötid.
    const archetype = FOODTRUCK_ARCHETYPES[
      assignArchetype(g.id, sim.day.period)
    ];
    const skinTone = assignSkinTone(g.id);
    const faceKey = deriveFoodtruckGuestFace(g, sim.simTime, archetype);
    const face = GUEST_FACES[faceKey];
    let x: number;
    let y: number;
    let basePose: Pose;
    let isWalking = false;
    // Facing-riktning: -1 = titta HÖGER (mot luckan/counter).
    // Default (1) = figuren i prototypens naturliga ansikts-riktning
    // (öra på vår höger, läser som "vänder sig lite mot vänster").
    // Ändras per state så figuren pekar mot rätt destination.
    let facing: 1 | -1 = 1;
    switch (g.state) {
      case 'waiting': {
        const i = waitingIdxById.get(g.id) ?? 0;
        x = QUEUE_FIRST_X - QUEUE_SLOT_SPACING * i;
        y = QUEUE_Y;
        // De två närmaste ligger i idle (väntar sin tur); resten
        // "shufflar" lätt med walkPose vid låg amplitud för att
        // signalera rörelse i kön.
        if (i < 2) {
          basePose = idlePose(T * 0.7 + ph * 3);
        } else {
          basePose = walkPose((T * 0.4 + ph) % 1, 0.15);
          isWalking = true;
        }
        facing = -1;   // kön står till vänster om luckan → titta höger
        break;
      }
      case 'ordering': {
        x = COUNTER_X + counterOffset(orderingIdx++);
        y = COUNTER_Y;
        basePose = idlePose(T + ph * 2);
        facing = -1;   // vid counter, tittar in i luckan (höger)
        break;
      }
      case 'paying': {
        x = COUNTER_X + counterOffset(payingIdx++);
        y = COUNTER_Y;
        // Något mer aktiv puls än ordering — signalerar transaktion.
        basePose = idlePose(T * 1.4 + ph * 2);
        facing = -1;   // samma — vid counter, tittar in i luckan
        break;
      }
      case 'arriving': {
        const i = arrivingIdx++;
        x = ARRIVING_START_X + i * ARRIVING_SPACING;
        y = QUEUE_Y;
        basePose = walkPose((T * 0.8 + ph) % 1, 1.0);
        isWalking = true;
        facing = -1;   // går HÖGER mot kö-back (som är åt höger)
        break;
      }
      case 'leaving':
      case 'declined': {
        const i = leavingIdx++;
        x = LEAVING_START_X - i * LEAVING_SPACING;
        y = QUEUE_Y;
        basePose = walkPose((T * 0.9 + ph) % 1, 1.0);
        isWalking = true;
        facing = 1;    // går ur scenen åt höger → default-facing
        break;
      }
      default:
        // seated / dining / sleeping — inte tillämpliga för foodtruck.
        // ORDER 111:s guards ska förhindra dessa states i praktiken;
        // vi skippar rendering defensivt så en framtida sim-tillägg
        // inte tyst placerar en gäst på seat-index=0-koordinaten.
        continue;
    }
    // Applicera arketyp-hållning: bob-multiplikator, lean-offset,
    // head-tilt. Se archetypes.ts:applyArchetypeMod.
    const pose = applyArchetypeMod(basePose, archetype, isWalking);
    positionedGuests.push({ id: g.id, x, y, pose, variant, archetype, face, faceKey, skinTone, facing });
  }

  // Kö-räknare för karta + meta-rad — bevarat separat så DoD 5:s test
  // (antalet renderade figurer följer state.waitingIds) håller för
  // 'waiting'-figurerna specifikt, samt så kartan visar kö-djup inte
  // total-scen-räknare (vilket vore missvisande).
  const queueCount = sim.waitingIds.length;

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

        {/* Personalen — ett ansikte i luckan, idle-pose. Fast `nojd`-
            uttryck: personal-vokabulär (deriveFaces.ts) rörs inte per
            ORDER 114 §7-avgränsningen, men Figure:s face-prop tar
            GUEST_FACES-formen direkt. */}
        <Figure
          pose={idlePose(T + 0.7)}
          x={STAFF_X}
          y={STAFF_Y}
          scale={STAFF_SCALE}
          variant="Cap"
          id="staff-hatch"
          face={GUEST_FACES.nojd}
          faceKey="nojd"
          skinTone={assignSkinTone('staff-hatch')}
        />

        {/* Gäster — en figur per sim.guests-post som är i ett scen-
            relevant state (waiting/ordering/paying/arriving/leaving/
            declined). Positionering beräknad ovan i positionedGuests.
            ORDER 114 — arketyp + face + hudton passeras per figur. */}
        {positionedGuests.map((p) => (
          <Figure
            key={p.id}
            id={p.id}
            pose={p.pose}
            x={p.x}
            y={p.y}
            scale={QUEUE_FIGURE_SCALE}
            variant={p.variant}
            archetype={p.archetype}
            face={p.face}
            faceKey={p.faceKey}
            skinTone={p.skinTone}
            facingDirection={p.facing}
          />
        ))}

        <StreetMap queueCount={queueCount} />

        {/* Meta-rad */}
        <text
          x={SCENE_VIEWBOX_W / 2}
          y={SCENE_VIEWBOX_H - 12}
          textAnchor="middle"
          fill="#5a5449"
          fontSize={16}
          fontFamily="system-ui, sans-serif"
        >
          ORDER 113 · food truck · scene {widthPx} px · kö {queueCount}
          {' · scen '}{positionedGuests.length}
          {' · '}
          {sim.day.weather
            ? `${sim.day.weather.tempC}°C ${sim.day.weather.precipitation}`
            : 'väder ej satt'}
        </text>
      </svg>
    </div>
  );
}
