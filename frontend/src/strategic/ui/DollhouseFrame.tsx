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
// vyet, "bara för att se ramen". Ingen permanent koppling — den riktiga
// monteringen (fokusrum-swap, klickytor, karta, paneler, pixel-budget-
// hantering, panorering under 1 280 px) hör till food truck-ordern som
// är SD-003 §8 följdorder 3.
//
// **Vad denna form är:** en tom scen i sidovy med rätt proportioner —
// en room-bakvägg med två öppningar (kök till vänster, bar till höger)
// och ett golv. Läses som "ett rum sett från framsidan i genomskärning",
// vilket är SD-003 §2 alternativ C. SVG, procedurell geometri, inga
// binära assets.
//
// **Vad den INTE är:** ingen figur-rendering (patternTransform har inte
// bytt målyta ännu), inga klickytor (fokusrum-mekaniken bygg först i
// följdordern), ingen karta (aggregatet flyttar dit i följdordern),
// inga paneler (PanelColumn-inflätning i följdordern).

// Bas-scenbredd i CSS-pixlar. ORDER 096 §5.2 visade att 16 kuvert vid
// 140 px/figur ryms vid ~2 432 px scenbredd. Vi ritar en bakvägg som
// SVG:ns viewBox är 2432×1080 (matchar en 2 560×1440-vy med
// panelkolumnernas bredd avdragen); rendering skalar till aktuell
// viewport. Panorering och pixelbudget-anpassning per §3 hör till
// följdordern.
const SCENE_VIEWBOX_W = 2432;
const SCENE_VIEWBOX_H = 1080;

// Rumsproportioner. Ett rum i genomskärning: golv nedanför bakvägg,
// bakvägg med två öppningar (kök vänster, bar höger). Måttförhållanden
// är författade — ORDER 096 §5.2:s mätning gäller pixel-per-figur, inte
// ram-geometri; formens rätta proportioner beslutas mot vision, inte
// mot tal.
const WALL_H = 720;         // rumshöjd i viewbox-enheter
const FLOOR_H = 40;         // golv-tjocklek
const WALL_MARGIN_X = 96;   // sido-marginal från viewbox-kant
const OPENING_H = 480;      // dörröppningens höjd
const OPENING_W = 320;      // dörröppningens bredd
const OPENING_MARGIN_X = 240;   // avstånd från vägg-slut till öppning

export function DollhouseFrame() {
  const wallLeft = WALL_MARGIN_X;
  const wallRight = SCENE_VIEWBOX_W - WALL_MARGIN_X;
  const wallWidth = wallRight - wallLeft;
  const wallTop = (SCENE_VIEWBOX_H - WALL_H) / 2;
  const wallBottom = wallTop + WALL_H;
  const floorTop = wallBottom;

  // Två öppningar i bakväggen — en till vänster (kök-passluckan enligt
  // SD-003 §2 alternativ C) och en till höger (bardisken-öppningen).
  // Placerade så bakväggens mittfält står orört som "fokusrummet".
  const openingLeftX = wallLeft + OPENING_MARGIN_X;
  const openingRightX = wallRight - OPENING_MARGIN_X - OPENING_W;
  const openingY = wallBottom - OPENING_H;

  return (
    <div
      data-dollhouse-frame
      style={{
        position: 'absolute',
        inset: 0,
        // Ovanpå 3D-canvasen men under panelerna, så DevPanel och
        // ViewLabel fortfarande syns för orientering under
        // rekognoseringen.
        zIndex: 5,
        background: '#1a1815',
        // Figurlagret får aldrig blockera klick per ORDER 096 §4 +
        // SD-003 §6. Ramen är just nu tom (inga figurer, inga
        // klickytor) — men vi sätter regeln redan här så tillägget
        // inte råkar avvika i följdordern.
        pointerEvents: 'none'
      }}
    >
      <svg
        viewBox={`0 0 ${SCENE_VIEWBOX_W} ${SCENE_VIEWBOX_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Golv */}
        <rect
          x={wallLeft}
          y={floorTop}
          width={wallWidth}
          height={FLOOR_H}
          fill="#3a352e"
        />
        {/* Bakvägg (fokusrummets bakre yta) */}
        <rect
          x={wallLeft}
          y={wallTop}
          width={wallWidth}
          height={WALL_H}
          fill="#4a453d"
        />
        {/* Öppning vänster — passluckan mot kök */}
        <rect
          data-opening="kok"
          x={openingLeftX}
          y={openingY}
          width={OPENING_W}
          height={OPENING_H}
          fill="#0f0e0c"
        />
        {/* Öppning höger — bardisken */}
        <rect
          data-opening="bar"
          x={openingRightX}
          y={openingY}
          width={OPENING_W}
          height={OPENING_H}
          fill="#0f0e0c"
        />
        {/* Rekognoserings-text — dev-only markering så det är tydligt att
            detta är växeln, inte något som ska tolkas som färdig scen. */}
        <text
          x={SCENE_VIEWBOX_W / 2}
          y={wallTop - 20}
          textAnchor="middle"
          fill="#8a836e"
          fontSize={22}
          fontFamily="system-ui, sans-serif"
        >
          SD-003 rev. 2 — dockskåpets ram (temporär rekognosering)
        </text>
      </svg>
    </div>
  );
}
