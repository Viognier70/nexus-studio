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
import { idlePose, walkPose, servePose, variantForId, RIG_INK, RIG_LINE, RIG_GROUND, RIG_ACCENT } from './rig';
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

// Luckan (öppning i vagnens front). Placerad högt så gäster ser upp
// i den; counter-höjd markerad med ljusare linje längs nederkanten.
const HATCH_W = 560;
const HATCH_H = 280;
const HATCH_X = WAGON_LEFT + (WAGON_WIDTH - HATCH_W) / 2;
const HATCH_Y = WAGON_TOP + 120;

// Kö-slots — där gästerna står framför luckan. En slot per köande
// gäst. Slot 0 är närmast luckan, resten sträcker sig åt vänster.
// ORDER 114 Steg 2 DoD 3 — skalning kalibrerad mot wagon-geometrin.
//
// **Rättad 2026-08-17 (rev 5)** efter VO-fynd mot faces.png:
//   VO: "Gästen står framför vagnen och täcker luckan. Benen fortsätter
//   under vagnens underkant. Kontrollera y-basen för kö- och order-
//   positioner mot vagnens geometri."
//
// Utredning: vid scale 2.5 var figuren 790 SVG-units hög (316 × 2.5),
// medan wagon-höjden var 400 units. Figuren var **2× wagons höjd** →
// omöjligt att stå framför utan att täcka den. Face-läsbarhet hade
// prioriterats utan att kalibreras mot wagon-proportioner.
//
// **Ny kalibrering (scale 2.0):**
//   * Figur-höjd: 316 × 2.0 = 632 units
//   * Foot vid QUEUE_Y = 1020 → world-y 1044 (på gatan, under STREET_BOTTOM 1080)
//   * Head-top-with-topping vid world-y 1020 - 314*2 = 392 (INUTI hatch 340-620) ✓
//   * Face-region vid world-y 412-528 (helt inuti hatch) ✓
//   * Face-bredd i CSS-px: 54 * 2.0 * 0.5 (CSS-ratio) = 54 CSS-px — läsbart
//   * Ögon-bredd i CSS-px: 12 * 0.457 (Face-inner-SX) * 2.0 * 0.5 = 5.5 CSS-px
//
// Härleder ALLA positions-mått ur QUEUE_FIGURE_SCALE — spacing följer
// automatiskt (rig.ts:RIG_PROTO_MAX_WIDTH_AT_SCALE_1).
const QUEUE_FIGURE_SCALE = 2.0;

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

// Personalens ansikte i luckan — kalibrerad så att hela figuren får
// plats INUTI hatch-öppningen (y=340-620, 280 units hög). Vid
// STAFF_SCALE 0.85 blir total figur-höjd 316*0.85 = 269 units — nästan
// exakt hatch-höjden. STAFF_Y = 607 placerar head-top vid y=340
// (hatch-top) och feet vid y=617 (just innanför hatch-bottom).
// Face-region hamnar vid y=348-398 (övre delen av hatch) — läses
// som "personal-ansikte som tittar ut ur luckan".
const STAFF_X = HATCH_X + HATCH_W / 2;
const STAFF_SCALE = 0.85;
const STAFF_Y = HATCH_Y + Math.round(314 * STAFF_SCALE);  // = 340 + 267 = 607

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
// **ORDER 114 rev 6** — counter-stack borttagen: rendering-logiken i
// FoodtruckScene placerar nu bara EN ordering-guest vid counter, resten
// hamnar i queue-position. Paying-guests staplas höger om counter med
// full QUEUE_SLOT_SPACING mellan varje.
//
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

// ORDER 115 §4 — Uteplatsen. Ståbord höger om vagnen där gäster med
// `hasUteplats` går efter paying för att äta.
//
// Layout-räkning:
//   * Scen 2432 bred. Vagn slutar vid WAGON_RIGHT=1952.
//   * Tillgängligt höger om vagnen: ~480 units.
//   * Bord skiva 120 wide vid tx. Gäst står 90 units HÖGER om bord
//     (offset så bord + gäst inte överlappar visuellt).
//   * Kapacitet 2 samtidiga ätande gäster.
const UTEPLATS_X = WAGON_RIGHT + 60;      // första bordets x
const UTEPLATS_TABLE_COUNT = 2;           // kapacitet 2 samtidiga
const UTEPLATS_TABLE_SPACING = 220;       // avstånd mellan bord-par
const UTEPLATS_GUEST_OFFSET_X = 100;      // gäst står så mycket höger om sitt bord
// Bord-skiva vid mid-lår-höjd på gäst; benen på gatan.
const UTEPLATS_TABLE_Y = 900;             // skiva topp
const UTEPLATS_TABLE_LEG_H = 120;         // ben-höjd
// Eating-gästens fot-y — samma som queue-y så de står på gatan.
const EATING_Y = QUEUE_Y;

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
    carrying?: string;  // ORDER 115 §2 — mat/paket från foodtrucken
  }
  const positionedGuests: PositionedGuest[] = [];
  // Räknare per state-typ så flera gäster i samma tillstånd inte
  // överlappar exakt på samma pixel.
  let orderingIdx = 0;
  let payingIdx = 0;
  let arrivingIdx = 0;
  let leavingIdx = 0;
  let eatingIdx = 0;

  // ORDER 114 rev 6 — VO: "Bara den som beställer står vid luckan."
  // Räknas separat från waiting-slots så counter-figurer aldrig
  // kolliderar med kö-slot 0.
  //
  //   * Första ordering-guest: AT counter (COUNTER_X)
  //   * Ytterligare ordering-guests: som queue-front (bakom slot 0
  //     med QUEUE_SLOT_SPACING avstånd) — representerar "nästa i
  //     tur, just stiger fram"
  //   * Första paying-guest: höger om counter (COUNTER_X + spacing)
  //   * Ytterligare paying: längre höger (fördelar mot leaving-region)
  //
  // Innan denna fix trängdes alla ordering + paying vid counter med
  // halva slot-spacing (218 units) → visuellt kluster framför luckan.

  // Räkna waiting-figurer först så vi vet var kö-back är.
  const totalWaitingCount = sim.waitingIds.length;

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
        if (orderingIdx === 0) {
          // Första ordering-guest: AT counter
          x = COUNTER_X;
          y = COUNTER_Y;
        } else {
          // Ytterligare ordering: bakom slot 0 i queue-position
          // (representerar "nästa i tur"). Läggs efter alla waiting-
          // figurer så överlapp med kö undviks.
          x = QUEUE_FIRST_X - QUEUE_SLOT_SPACING * (totalWaitingCount + orderingIdx - 1);
          y = QUEUE_Y;
        }
        orderingIdx++;
        basePose = idlePose(T + ph * 2);
        facing = -1;   // vid counter/kö, tittar in i luckan (höger)
        break;
      }
      case 'paying': {
        // Paying: höger om counter (picked up food, stepping aside).
        // Första paying: COUNTER_X + spacing. Andra: + 2*spacing. Osv.
        x = COUNTER_X + QUEUE_SLOT_SPACING * (payingIdx + 1);
        y = COUNTER_Y;
        payingIdx++;
        // Något mer aktiv puls än ordering — signalerar transaktion.
        basePose = idlePose(T * 1.4 + ph * 2);
        facing = -1;   // fortsatt titta vänster mot luckan / kön
        break;
      }
      case 'serving': {
        // ORDER 115 rev 2 — 2.5-sek överlämningsfas mellan ordering och
        // paying. Gästen står EXAKT vid counter (COUNTER_X), samma
        // position som ordering-slot 0 — men eftersom ordering har
        // slutförts finns ingen kollision (gästen har flyttats vidare
        // i sim-loopen). Personalen sträcker sig ut med servePose i
        // samma bild → prop-överlämningen syns.
        x = COUNTER_X;
        y = COUNTER_Y;
        // Något mer aktiv puls än ordering — signalerar mottagande.
        basePose = idlePose(T * 1.6 + ph * 2);
        facing = -1;
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
        y = EATING_Y;
        // ORDER 115 §3 — "mönster 20" (walk med förhöjd amplitud) för
        // avfärd. amp 1.15 matcher prototypens EXIT-mönster
        // (guest-reel.jsx:239 `walkPose(T * 1.7, 1.15)`).
        basePose = walkPose((T * 0.9 + ph) % 1, 1.15);
        isWalking = true;
        facing = 1;    // går ur scenen åt höger → default-facing
        break;
      }
      case 'eating': {
        // ORDER 115 §4.5 — foodtruck-uteplats. Gäst står vid ett ståbord
        // höger om vagnen och äter i bild. Positioneras deterministiskt
        // per eatingIdx över UTEPLATS_TABLE_COUNT bord. Gäst-x är
        // OFFSET åt höger så bord + gäst inte överlappar (bord synlig
        // till vänster om gäst).
        const tableIdx = eatingIdx % UTEPLATS_TABLE_COUNT;
        const tableX = UTEPLATS_X + tableIdx * UTEPLATS_TABLE_SPACING;
        x = tableX + UTEPLATS_GUEST_OFFSET_X;
        y = EATING_Y;
        eatingIdx++;
        // Låg-amplitud idle med litet bob — läser som "stående vid
        // bord, äter". Halva idle-frekvensen så det inte ser stressat ut.
        basePose = idlePose(T * 0.5 + ph * 2);
        facing = -1;   // vänder tillbaka mot vagnen/gatan
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
    positionedGuests.push({
      id: g.id, x, y, pose, variant, archetype, face, faceKey, skinTone, facing,
      // Bär maten från paying och genom eating/leaving. Setts i
      // sim (service.ts completeStaffTask 'order' foodtruck-branch).
      carrying: g.carrying
    });
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

        {/* Vagnen — klassisk skåpbil-silhuett (Citroën HY-familj).
            VO-referens 2026-08-16: front med sluttande huv, kupé,
            rundad taklinje, hjulhus-bågar, kofångare. Sidvy — kupén
            till vänster (kör-riktning), servicelucka till höger i
            karossen. Måtten stannar på WAGON_LEFT/RIGHT/TOP/BOTTOM så
            queue-positioner (COUNTER_X, QUEUE_FIRST_X) inte drivs
            om; det som ändras är formen på ytorna.

            Silhuett-uppdelning:
              * CAB_END       = WAGON_LEFT + 340    kupé slut (huv/vindruta hit)
              * BODY_START    = CAB_END + 20        kaross börjar (mindre glapp)
              * ROOF_CURVE    = 60 units            rundning tak-hörn
              * FENDER_R      = 80 units            hjulhus-radie */}
        <g data-foodtruck-wagon>
          {(() => {
            const CAB_END = WAGON_LEFT + 340;
            const BODY_START = CAB_END + 20;
            const ROOF_CURVE = 60;
            const FENDER_R = 80;
            const WINDSHIELD_TOP = WAGON_TOP + 30;
            const WINDSHIELD_BOT = WAGON_TOP + 180;
            const HOOD_TOP = WAGON_TOP + 160;
            const BUMPER_TOP = WAGON_BOTTOM - 30;
            const BUMPER_LEFT = WAGON_LEFT - 20;
            const FRONT_WHEEL_CX = WAGON_LEFT + 200;
            const REAR_WHEEL_CX = WAGON_RIGHT - 200;
            const WHEEL_CY = WAGON_BOTTOM + 24;
            const WHEEL_R = 42;

            // Karossens fyllnadsfärg — samma varma stål-blå som
            // referensen, med en aning grönt i grå-tonen så det inte
            // blir cyan.
            const BODY_FILL = '#5a7684';
            const BODY_STROKE = RIG_INK;
            const GLASS_FILL = '#1e2a30';

            // Karossens ram — en path som ger avrundade tak-hörn.
            // Följer WAGON_LEFT..WAGON_RIGHT längs nederkanten, gårupp
            // via höger kant, kröner taket från BODY_START till
            // WAGON_RIGHT med två quadratiska bågar för rundningen.
            const bodyPath = [
              `M ${BODY_START} ${WAGON_BOTTOM}`,
              `L ${WAGON_RIGHT - ROOF_CURVE} ${WAGON_BOTTOM}`,
              // rear roof corner (rundning)
              `L ${WAGON_RIGHT} ${WAGON_BOTTOM}`,
              `L ${WAGON_RIGHT} ${WAGON_TOP + ROOF_CURVE}`,
              `Q ${WAGON_RIGHT} ${WAGON_TOP} ${WAGON_RIGHT - ROOF_CURVE} ${WAGON_TOP}`,
              // tak ovan kaross
              `L ${BODY_START + ROOF_CURVE} ${WAGON_TOP}`,
              // front roof corner (rundning) — kaross-fronten
              `Q ${BODY_START} ${WAGON_TOP} ${BODY_START} ${WAGON_TOP + ROOF_CURVE}`,
              `L ${BODY_START} ${WAGON_BOTTOM}`,
              'Z'
            ].join(' ');

            // Kupén — separat form, kortare + med sluttande huv.
            // Vindrutan är rektangulär överst; huven sluttar ner mot
            // kofångare-höjd.
            const cabPath = [
              `M ${WAGON_LEFT + 40} ${WAGON_BOTTOM}`,       // längst bak-under vid kupé-slut
              `L ${CAB_END} ${WAGON_BOTTOM}`,
              `L ${CAB_END} ${WAGON_TOP + ROOF_CURVE}`,
              `Q ${CAB_END} ${WAGON_TOP} ${CAB_END - ROOF_CURVE} ${WAGON_TOP}`,
              `L ${WAGON_LEFT + 140} ${WAGON_TOP}`,          // tak-främre kant
              `L ${WAGON_LEFT + 100} ${WINDSHIELD_TOP}`,    // vindrute-topp lutar bakåt
              `L ${WAGON_LEFT + 100} ${WINDSHIELD_BOT}`,    // vindrute-bot
              `L ${WAGON_LEFT + 40} ${HOOD_TOP}`,           // huv-topp (sluttar ner)
              `L ${BUMPER_LEFT} ${BUMPER_TOP}`,             // vidare ner mot kofångare
              `L ${BUMPER_LEFT} ${WAGON_BOTTOM}`,           // ner till mark
              'Z'
            ].join(' ');

            return (
              <>
                {/* Karossen (bak) */}
                <path
                  d={bodyPath}
                  fill={BODY_FILL}
                  stroke={BODY_STROKE}
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
                {/* Kupén (fram) */}
                <path
                  d={cabPath}
                  fill={BODY_FILL}
                  stroke={BODY_STROKE}
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
                {/* Vindruta */}
                <path
                  d={[
                    `M ${WAGON_LEFT + 140} ${WAGON_TOP + 14}`,
                    `L ${CAB_END - 30} ${WAGON_TOP + 14}`,
                    `L ${CAB_END - 30} ${WINDSHIELD_BOT - 14}`,
                    `L ${WAGON_LEFT + 108} ${WINDSHIELD_BOT - 14}`,
                    'Z'
                  ].join(' ')}
                  fill={GLASS_FILL}
                  stroke={RIG_LINE}
                  strokeWidth={2}
                />
                {/* Sidoruta i kupé (bakre kupédörr) */}
                <rect
                  x={CAB_END - 100}
                  y={WAGON_TOP + 40}
                  width={70}
                  height={140}
                  fill={GLASS_FILL}
                  stroke={RIG_LINE}
                  strokeWidth={2}
                />
                {/* Vertikal accent-list mellan kupé och kaross (dörrfog) */}
                <line
                  x1={CAB_END + 10}
                  y1={WAGON_TOP + 20}
                  x2={CAB_END + 10}
                  y2={WAGON_BOTTOM - 20}
                  stroke={RIG_LINE}
                  strokeWidth={2}
                />
                {/* Korrugerings-linjer på karossen — subtila vertikala
                    ränder som läser HY-familjens plåtprofil. Bara på
                    karossen bakåt så luckan står ut. */}
                {(() => {
                  const lines: number[] = [];
                  const startX = BODY_START + 40;
                  const endX = WAGON_RIGHT - 40;
                  const step = 60;
                  for (let x = startX; x <= endX; x += step) {
                    // hoppa över luckan-bandet så texten på hatchen syns
                    if (x >= HATCH_X - 10 && x <= HATCH_X + HATCH_W + 10) continue;
                    lines.push(x);
                  }
                  return lines.map((x, i) => (
                    <line
                      key={`corr-${i}`}
                      x1={x}
                      y1={WAGON_TOP + 20}
                      x2={x}
                      y2={WAGON_BOTTOM - 20}
                      stroke={RIG_LINE}
                      strokeOpacity={0.35}
                      strokeWidth={1.5}
                    />
                  ));
                })()}
                {/* Namn-list — smalare + mer diskret än förr så
                    silhuetten dominerar över typografin. */}
                <rect
                  x={BODY_START + 20}
                  y={WAGON_TOP + ROOF_CURVE + 10}
                  width={WAGON_RIGHT - BODY_START - 40}
                  height={36}
                  fill={RIG_ACCENT}
                  opacity={0.85}
                />
                <text
                  x={(BODY_START + WAGON_RIGHT) / 2}
                  y={WAGON_TOP + ROOF_CURVE + 34}
                  textAnchor="middle"
                  fill={RIG_INK}
                  fontSize={22}
                  fontFamily="system-ui, sans-serif"
                  letterSpacing={4}
                  style={{ textTransform: 'uppercase' }}
                >
                  Food truck
                </text>
                {/* Kofångare fram */}
                <rect
                  x={BUMPER_LEFT}
                  y={BUMPER_TOP}
                  width={CAB_END - BUMPER_LEFT + 8}
                  height={22}
                  fill="#8a8a86"
                  stroke={RIG_INK}
                  strokeWidth={2}
                />
                {/* Strålkastare (rund, framhjulet nära) */}
                <circle
                  cx={WAGON_LEFT + 20}
                  cy={HOOD_TOP + 30}
                  r={16}
                  fill="#f0e8c8"
                  stroke={RIG_INK}
                  strokeWidth={2}
                />
                {/* Hjulhus-bågar (halvcirklar över hjulen). Ritas
                    innan hjulen så hjulens topp läser som "innanför"
                    bågen. */}
                <path
                  d={`M ${FRONT_WHEEL_CX - FENDER_R} ${WHEEL_CY} A ${FENDER_R} ${FENDER_R} 0 0 1 ${FRONT_WHEEL_CX + FENDER_R} ${WHEEL_CY}`}
                  fill="none"
                  stroke={RIG_INK}
                  strokeWidth={4}
                />
                <path
                  d={`M ${REAR_WHEEL_CX - FENDER_R} ${WHEEL_CY} A ${FENDER_R} ${FENDER_R} 0 0 1 ${REAR_WHEEL_CX + FENDER_R} ${WHEEL_CY}`}
                  fill="none"
                  stroke={RIG_INK}
                  strokeWidth={4}
                />
                {/* Hjul + nav */}
                <circle cx={FRONT_WHEEL_CX} cy={WHEEL_CY} r={WHEEL_R} fill={RIG_INK} />
                <circle cx={REAR_WHEEL_CX} cy={WHEEL_CY} r={WHEEL_R} fill={RIG_INK} />
                <circle cx={FRONT_WHEEL_CX} cy={WHEEL_CY} r={12} fill="#8a8a86" />
                <circle cx={REAR_WHEEL_CX} cy={WHEEL_CY} r={12} fill="#8a8a86" />
              </>
            );
          })()}
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

        {/* ORDER 115 §4 — Uteplatsen (ståbord). Ritas ENDAST när
            policies.hasUteplats är sann. Tre ståbord höger om vagnen
            där eating-gäster står och äter. Ritas EFTER wagon men
            FÖRE guest-figurer så eating-gäster syns framför borden.
            Data-attribut `data-foodtruck-uteplats` för test-grep. */}
        {sim.policies.hasUteplats && (
          <g data-foodtruck-uteplats>
            {Array.from({ length: UTEPLATS_TABLE_COUNT }).map((_, i) => {
              const tx = UTEPLATS_X + i * UTEPLATS_TABLE_SPACING;
              const ty = UTEPLATS_TABLE_Y;
              return (
                <g key={i}>
                  {/* Bord-skiva (rektangel, hüftr höjd på gata-nivå) */}
                  <rect
                    x={tx - 60}
                    y={ty}
                    width={120}
                    height={20}
                    fill="#5a5044"
                    stroke={RIG_INK}
                    strokeWidth={3}
                  />
                  {/* Ben (två pinnar ner) */}
                  <rect x={tx - 50} y={ty + 20} width={8} height={UTEPLATS_TABLE_LEG_H} fill={RIG_INK} />
                  <rect x={tx + 42} y={ty + 20} width={8} height={UTEPLATS_TABLE_LEG_H} fill={RIG_INK} />
                </g>
              );
            })}
            {/* Etikett ovanför första bordet */}
            <text
              x={UTEPLATS_X}
              y={UTEPLATS_TABLE_Y - 16}
              textAnchor="middle"
              fill="#8a836e"
              fontSize={18}
              fontFamily="system-ui, sans-serif"
              letterSpacing={2}
              style={{ textTransform: 'uppercase' }}
            >
              Uteplats
            </text>
          </g>
        )}

        {/* Personalen — ett ansikte i luckan. Fast `nojd`-uttryck:
            personal-vokabulär (deriveFaces.ts) rörs inte per ORDER 114
            §7-avgränsningen, men Figure:s face-prop tar GUEST_FACES-
            formen direkt.
            **ORDER 114 rev 6** — servePose när counter är upptagen:
            VO 2026-08-17 "Serveringen syns inte. Personalen står
            stilla i luckan, gästen står framför, ingen överlämning."
            När någon gäst är i ordering/paying-tillstånd växlar staff
            till reach-and-retract-cykeln (rig.ts:servePose) så
            överlämningen syns som ARBETE. Vid tom counter faller
            staff tillbaka på idle-andning. */}
        {(() => {
          // ORDER 115 rev 2 — 'serving' är den fas där överlämningen
          // faktiskt sker; servePose ska definitivt köra då. Behåller
          // ordering + paying så staff-rörelsen inte glappar mellan
          // faserna.
          const anyAtCounter = sim.guests.some(
            (g) => g.state === 'ordering' || g.state === 'serving' || g.state === 'paying'
          );
          const staffPose = anyAtCounter ? servePose(T) : idlePose(T + 0.7);
          return (
            <Figure
              pose={staffPose}
              x={STAFF_X}
              y={STAFF_Y}
              scale={STAFF_SCALE}
              variant="Cap"
              id="staff-hatch"
              face={GUEST_FACES.nojd}
              faceKey="nojd"
              skinTone={assignSkinTone('staff-hatch')}
            />
          );
        })()}

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
            carrying={p.carrying}
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
