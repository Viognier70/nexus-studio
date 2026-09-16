// ORDER 221 §2 — gåbar-yta + navigering över den.
//
// VO 2026-09-16 "Rummet går att gå i": figurer klipper i dag genom
// bardisk, bord och bryggkar för att `walkPathToSeat` är rak linje
// mellan två punkter och ingen ytterlagerclamp känner interiörens
// möbler. §2 kräver: möblerna som hinder, seats/stations som inte-
// hinder, väg som beräknas i st f gissas, gäster + personal via samma
// system. §3 kräver: noll genomträngningar under ett helt pass i
// ölkrogen. §6 varnar: en billig lösning som låter figurer klippa hörn
// löser inte det som rapporterats.
//
// Formvalet är grid-A* med string-pulling-smoothing:
//   - Rummen är små (~15 × 12 m), grid 0.25 m → ~60 × 48 = 2880 celler.
//     A* över det är < 1 ms med binary heap; kan köras varje gång en
//     figur får ny target utan att belasta render-loopen.
//   - Grid hanterar godtycklig hinderform (axis-aligned rektangel räcker
//     för nuvarande möbler; framtida rundade tankar kan approximeras
//     som fyrkant utan att API:t ändras).
//   - String-pulling ger få waypoints (2-4 för de flesta vägar) så
//     ease-loopen i InteriorGuests/InteriorStaff inte behöver ändra
//     signatur — den läser bara nästa waypoint som förut.
//
// Alternativ som förkastades:
//   - Handlagd hinderlista per rum: §2.1 förbjuder explicit ("hindren
//     härleds ur den [geometrin], inte ur en handskriven lista som kan
//     glida isär"). Rums-moduler exponerar därför `getObstacles()`
//     som HÄRLEDS ur samma konstanter som bygger meshen (BAR_X,
//     LONG_TABLE_LEN etc.) — inte en parallell tabell.
//   - Navmesh via triangulering: overkill för axis-aligned möbler i
//     ~15 m rum. Kod-storleken av triangulerings-biblioteket är större
//     än grid-A*, med noll läsbarhets-vinst i den skala vi opererar.
//   - Ren visibility-graph (obstacle-corner-noder): matematiskt elegant
//     men kräver polygon-clipping mot rummets OBB och exemption för
//     seats/stations som ligger PÅ hinderkanter. Grid gör det billigare:
//     seat-punkter märks walkable oavsett obstacle-overlap.

export type XZ = [number, number];

/**
 * Axis-aligned obstacle i rum-lokal XZ. Möbler modelleras som denna
 * (bord, bardisk, bryggkar, köksstationer). Cylindriska hinder (jäst-
 * tank, mäskkar) approximeras som cirkumskrivna fyrkanter — 2 * radien
 * på var sida — vilket är konservativt (lite mer walkable-avdrag än
 * cirkeln kräver, aldrig mindre). Rummet självt (yttervägg) hanteras
 * som `halfW`/`halfD` i `buildNav`, INTE som obstacle.
 */
export interface ObstacleAABB {
  id: string;
  local: XZ;
  halfW: number;
  halfD: number;
}

/**
 * Navigation-grafen som en scen håller. Beräknas EN gång vid mount
 * (per rumsinstans) och läses av path-frågor per figur.
 */
export interface NavGraph {
  /** Cell-storlek i meter. Standardvärde 0.25 m — se buildNav. */
  cellSize: number;
  /** Grid-mått i celler. */
  cols: number;
  rows: number;
  /** XZ för cell (0,0):s CENTRUM i rum-lokal frame. Övriga celler
   *  ligger på origin.x + col*cellSize, origin.z + row*cellSize. */
  origin: XZ;
  /** Walkable-bitmap. `walkable[row*cols + col] === 1` när gåbar. */
  walkable: Uint8Array;
  /** Obstacle-listan bygget hämtade sina AABBs ur. Läses av
   *  `isInsideObstacle` för genomträngnings-testet så påstående +
   *  källa hänger ihop (ORDER 158-principen). */
  obstacles: readonly ObstacleAABB[];
  /** Rummets OBB i lokal frame — halva bredden/djupet. */
  halfW: number;
  halfD: number;
  /** Padding mot ytterväggen (m). Figurer får inte gå NÄRMARE än detta. */
  wallInflate: number;
  /** Padding runt varje hinder (m). Figurer får inte gå NÄRMARE än detta. */
  obstacleInflate: number;
}

interface BuildOpts {
  /** Cell-storlek i meter. Default 0.25 m. Mindre → finare vägar men
   *  fler celler; större → snabbare A* men risk för missade smala
   *  passager (t.ex. mellan två långbord med 0.6 m mellanrum ryms bara
   *  en cell om cellen är 0.5 m). 0.25 m är kompromissen för nuvarande
   *  klasser (ölkrogen har smalaste passage 0.6 m). */
  cellSize?: number;
  /** Padding INÅT från ytterväggen. Default 0.20 m ≈ figur-radie. */
  wallInflate?: number;
  /** Padding kring varje hinder. Default 0.25 m ≈ figur-radie + luft.
   *  För smal — figurer klipper hörn. För bred — smala passager stängs. */
  obstacleInflate?: number;
  /** Punkter (i lokal XZ) som ALLTID märks walkable oavsett hinder-
   *  overlap. Används för seats/stations som per definition ligger vid
   *  möbelkanten (§2.2 "stolar och platser är inte hinder"). En radie
   *  kring varje punkt markeras walkable. Radien följer `exemptRadius`
   *  om inte punkten kommer via `exemptCircles`. */
  exemptPoints?: XZ[];
  /**
   * Punkter med per-punkt-radie. Behövs för stationer som ligger i
   * NARROW slots — en kock som står mellan spis och kall prep har
   * ~0.6 m walkspace åt vardera hållet, seat-radien 0.35 räcker inte
   * för att öppna in-korridoren. Kombineras med `exemptPoints` (som
   * använder default-radien).
   */
  exemptCircles?: { local: XZ; radius: number }[];
  /** Default exempt-radie i m (för `exemptPoints`). Default 0.35 m —
   *  täcker en cell även vid cellSize=0.25 plus lite luft. */
  exemptRadius?: number;
}

const DEFAULT_CELL_SIZE = 0.25;
const DEFAULT_WALL_INFLATE = 0.20;
const DEFAULT_OBSTACLE_INFLATE = 0.25;
// Default exempt-radie 0.6 m. Härlett från att en seat på ett 4-topsbord
// (kvarterskrogens t2 i mitten, sizeM=1.7 m, halfW=0.85) sitter 0.7 m
// från bordets centrum — 0.15 m INUTI bordets footprint. Med obstacle-
// inflate 0.25 m ligger seat 0.4 m innanför walkable-yta; en exempt-
// radie < 0.4 m + cellSize/2 lämnar seat isolerad från grafen. 0.6 m
// ger tillräcklig marginal (0.6 vs 0.4 + 0.125) för både 2-tops
// (seat 0.075 m innanför) och 4-tops (seat 0.4 m innanför).
const DEFAULT_EXEMPT_RADIUS = 0.6;

/**
 * Bygger nav-grafen. Inte per-frame — kör en gång vid scen-mount, cacha
 * resultatet i scenen och skicka det till konsumenterna via
 * SharedBusinessRoom.nav.
 */
export function buildNav(
  halfW: number,
  halfD: number,
  obstacles: readonly ObstacleAABB[],
  opts?: BuildOpts
): NavGraph {
  const cellSize = opts?.cellSize ?? DEFAULT_CELL_SIZE;
  const wallInflate = opts?.wallInflate ?? DEFAULT_WALL_INFLATE;
  const obstacleInflate = opts?.obstacleInflate ?? DEFAULT_OBSTACLE_INFLATE;
  const exemptRadius = opts?.exemptRadius ?? DEFAULT_EXEMPT_RADIUS;
  const exemptPoints = opts?.exemptPoints ?? [];

  const cols = Math.max(1, Math.floor((2 * halfW) / cellSize));
  const rows = Math.max(1, Math.floor((2 * halfD) / cellSize));
  const origin: XZ = [-halfW + cellSize / 2, -halfD + cellSize / 2];
  const walkable = new Uint8Array(cols * rows);

  const wallX = halfW - wallInflate;
  const wallZ = halfD - wallInflate;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = origin[0] + c * cellSize;
      const z = origin[1] + r * cellSize;
      // Yttervägg: cellens CENTRUM måste ligga innanför wallInflate-margin.
      if (Math.abs(x) > wallX || Math.abs(z) > wallZ) continue;
      // Hinder: cellens centrum ska ligga UTANFÖR alla obstacle-AABBs
      // (inflaterade). Overlap = går inte.
      let blocked = false;
      for (const ob of obstacles) {
        const dx = Math.abs(x - ob.local[0]);
        const dz = Math.abs(z - ob.local[1]);
        if (dx <= ob.halfW + obstacleInflate && dz <= ob.halfD + obstacleInflate) {
          blocked = true;
          break;
        }
      }
      if (!blocked) walkable[r * cols + c] = 1;
    }
  }

  // Exempt-punkter: seats/stations sitter per definition VID möbeln (§2.2
  // "Stolar och platser är inte hinder"). Utan exemption skulle
  // seatSlot-punkten själv ligga i en blockerad cell och pathfindern
  // kunde inte nå den. Vi öppnar en radie kring varje sådan punkt.
  // Exempt-punkter märker en minsta möjliga korridor från punktens
  // cell ut till närmaste redan-walkable cell i varje kardinal-riktning.
  // Radien bestämmer HUR LÅNGT vi expanderar innan vi ger upp. Detta
  // ger:
  //   - Seats som ligger på möbelkanten (bar-stolar utanför counter):
  //     radie ~= 0.35 räcker; expansion +X träffar walkable direkt.
  //   - Seats som ligger INUTI möbel-inflate (4-top center-stolar):
  //     expansion tar 2-3 cellsteg innan walkable — korridoren blir
  //     tunn (1 cell bred) och läcker inte igenom hela möbeln.
  //   - Stationer som ligger i narrow slots (kvarterskrogens chef):
  //     radien måste räcka för att bryta igenom prep/range i EN
  //     riktning (norrut) — 1.5 m ger 6 cellsteg vilket överbryggar.
  // Skillnaden mot en fylld-cirkel-exempt: en cirkel öppnar ALLA celler
  // inom radien, vilket kan bygga oavsiktliga genvägar tvärs över
  // närliggande hinder. En linjär korridor öppnar bara den enkla
  // korridoren till walkable, så genvägar undviks.
  const circles: { local: XZ; radius: number }[] = [];
  for (const p of exemptPoints) circles.push({ local: p, radius: exemptRadius });
  for (const c of opts?.exemptCircles ?? []) circles.push(c);
  const DIRS: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const cir of circles) {
    const p = cir.local;
    const rad = cir.radius;
    const startC = Math.round((p[0] - origin[0]) / cellSize);
    const startR = Math.round((p[1] - origin[1]) / cellSize);
    if (startC < 0 || startC >= cols || startR < 0 || startR >= rows) continue;
    const startX = origin[0] + startC * cellSize;
    const startZ = origin[1] + startR * cellSize;
    if (Math.abs(startX) > wallX || Math.abs(startZ) > wallZ) continue;
    // Markera cellen som innehåller exempt-punkten walkable oavsett hinder.
    walkable[startR * cols + startC] = 1;
    const maxSteps = Math.max(1, Math.floor(rad / cellSize));
    // Två-pass: (1) räkna hur många steg varje kardinal-riktning behöver
    // för att nå walkable inom maxSteps. (2) öppna ENDAST den KORTASTE
    // lyckade riktningen. Motivering: en station som ligger bakom ett
    // brett hinder (barkeep bakom bardisken, breda counter) skulle med
    // "öppna alla riktningar" bygga en genväg tvärs över hela hindret i
    // den svåra riktningen. Vi vill bara ha EN väg in — den kortaste,
    // som är den naturliga approach-riktningen. Chef mellan spis och
    // prep: kortaste riktning norr (kitchen-passagen), 6 celler. Barkeep
    // bakom counter: kortaste riktning väster (brewery), 1 cell.
    let bestSteps = Infinity;
    let bestDir: [number, number] | null = null;
    for (const [dc, dr] of DIRS) {
      for (let step = 1; step <= maxSteps; step++) {
        const c = startC + dc * step;
        const r = startR + dr * step;
        if (c < 0 || c >= cols || r < 0 || r >= rows) break;
        const x = origin[0] + c * cellSize;
        const z = origin[1] + r * cellSize;
        if (Math.abs(x) > wallX || Math.abs(z) > wallZ) break;
        if (walkable[r * cols + c] === 1) {
          if (step < bestSteps) { bestSteps = step; bestDir = [dc, dr]; }
          break;
        }
      }
    }
    if (bestDir) {
      const [dc, dr] = bestDir;
      for (let step = 1; step <= bestSteps; step++) {
        const c = startC + dc * step;
        const r = startR + dr * step;
        walkable[r * cols + c] = 1;
      }
    }
  }

  return {
    cellSize, cols, rows, origin,
    walkable, obstacles,
    halfW, halfD, wallInflate, obstacleInflate
  };
}

/**
 * Räknar om en XZ-punkt till närmaste cell-index. Klampar in på gridet
 * — anroparen får bestämma om "utanför gridet" är fel eller ska bli
 * kant-cell. För path-frågor är kant-klamp rätt (from/to kan råka
 * ligga 5 cm utanför OBB p.g.a. arrival-slot).
 */
function toCell(nav: NavGraph, xz: XZ): { c: number; r: number } {
  const c = Math.max(0, Math.min(nav.cols - 1,
    Math.round((xz[0] - nav.origin[0]) / nav.cellSize)));
  const r = Math.max(0, Math.min(nav.rows - 1,
    Math.round((xz[1] - nav.origin[1]) / nav.cellSize)));
  return { c, r };
}

function cellCentre(nav: NavGraph, c: number, r: number): XZ {
  return [nav.origin[0] + c * nav.cellSize, nav.origin[1] + r * nav.cellSize];
}

function isWalkable(nav: NavGraph, c: number, r: number): boolean {
  if (c < 0 || c >= nav.cols || r < 0 || r >= nav.rows) return false;
  return nav.walkable[r * nav.cols + c] === 1;
}

/**
 * Hittar närmaste walkable-cell till (c, r) via BFS. Behövs när
 * from/to ligger inom en hindrad cell (t.ex. seat-punkt vars exemption
 * inte täckte just den cellen). Söker ut till maxRing-avstånd i celler.
 */
function nearestWalkable(nav: NavGraph, c: number, r: number, maxRing: number): { c: number; r: number } | null {
  if (isWalkable(nav, c, r)) return { c, r };
  for (let ring = 1; ring <= maxRing; ring++) {
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        // Endast cellerna PÅ ringens rand (undvik omprövning av
        // inre celler som redan testats i tidigare varv).
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        if (isWalkable(nav, c + dc, r + dr)) return { c: c + dc, r: r + dr };
      }
    }
  }
  return null;
}

/**
 * Räknar om ett linjesegment (XZ→XZ) och avgör om det passerar hinder
 * eller yttervägg. Används för string-pulling: waypoint W_i får tas
 * bort om W_{i-1} → W_{i+1} är fri. Metod: sampla segmentet i steg
 * <= cellSize/2 och kontrollera walkable per sample.
 */
function segmentClear(nav: NavGraph, a: XZ, b: XZ): boolean {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return true;
  const step = nav.cellSize * 0.5;
  const n = Math.max(2, Math.ceil(len / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + dx * t;
    const z = a[1] + dz * t;
    const { c, r } = toCell(nav, [x, z]);
    if (!isWalkable(nav, c, r)) return false;
  }
  return true;
}

/**
 * A* på gridet med 8-directional grannar och octile-heuristik. Returnerar
 * cell-sekvensen från start till mål (inklusive båda), eller null om
 * omöjligt. Använder en enkel binary-heap för öppen mängd; för < 3000
 * celler räcker den även vid worst-case.
 */
function astar(nav: NavGraph,
               startC: number, startR: number,
               goalC: number, goalR: number): Array<[number, number]> | null {
  const { cols, rows } = nav;
  const total = cols * rows;
  const gScore = new Float32Array(total);
  const fScore = new Float32Array(total);
  const cameFrom = new Int32Array(total);
  const closed = new Uint8Array(total);
  gScore.fill(Infinity);
  fScore.fill(Infinity);
  cameFrom.fill(-1);

  function h(c: number, r: number): number {
    // Octile distance — exakt för 8-connected grid.
    const dc = Math.abs(c - goalC);
    const dr = Math.abs(r - goalR);
    return (dc + dr) + (Math.SQRT2 - 2) * Math.min(dc, dr);
  }

  const startIdx = startR * cols + startC;
  const goalIdx = goalR * cols + goalC;
  gScore[startIdx] = 0;
  fScore[startIdx] = h(startC, startR);

  // Binary min-heap på fScore-index.
  const heap: number[] = [startIdx];
  const heapPos = new Int32Array(total);
  heapPos.fill(-1);
  heapPos[startIdx] = 0;

  function heapUp(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (fScore[heap[p]] <= fScore[heap[i]]) return;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      heapPos[heap[p]] = p; heapPos[heap[i]] = i;
      i = p;
    }
  }
  function heapDown(i: number) {
    const n = heap.length;
    while (true) {
      const l = i * 2 + 1;
      const r = i * 2 + 2;
      let best = i;
      if (l < n && fScore[heap[l]] < fScore[heap[best]]) best = l;
      if (r < n && fScore[heap[r]] < fScore[heap[best]]) best = r;
      if (best === i) return;
      [heap[best], heap[i]] = [heap[i], heap[best]];
      heapPos[heap[best]] = best; heapPos[heap[i]] = i;
      i = best;
    }
  }
  function heapPop(): number {
    const top = heap[0];
    const last = heap.pop()!;
    heapPos[top] = -1;
    if (heap.length > 0) {
      heap[0] = last;
      heapPos[last] = 0;
      heapDown(0);
    }
    return top;
  }

  const NEIGHBOURS = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]
  ];

  while (heap.length > 0) {
    const cur = heapPop();
    if (cur === goalIdx) break;
    closed[cur] = 1;
    const cc = cur % cols;
    const cr = (cur - cc) / cols;
    for (const [dc, dr, cost] of NEIGHBOURS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const nIdx = nr * cols + nc;
      if (closed[nIdx]) continue;
      if (nav.walkable[nIdx] !== 1) continue;
      // Diagonal-passage: kräv att båda ort-grannarna är walkable så
      // figuren inte skär hörnet av ett hinder.
      if (dc !== 0 && dr !== 0) {
        if (nav.walkable[cr * cols + nc] !== 1) continue;
        if (nav.walkable[nr * cols + cc] !== 1) continue;
      }
      const tentative = gScore[cur] + cost;
      if (tentative < gScore[nIdx]) {
        cameFrom[nIdx] = cur;
        gScore[nIdx] = tentative;
        fScore[nIdx] = tentative + h(nc, nr);
        if (heapPos[nIdx] === -1) {
          heap.push(nIdx);
          heapPos[nIdx] = heap.length - 1;
          heapUp(heap.length - 1);
        } else {
          heapUp(heapPos[nIdx]);
        }
      }
    }
  }

  if (cameFrom[goalIdx] === -1 && startIdx !== goalIdx) return null;
  const out: Array<[number, number]> = [];
  let idx = goalIdx;
  while (idx !== -1) {
    const c = idx % cols;
    const r = (idx - c) / cols;
    out.push([c, r]);
    if (idx === startIdx) break;
    idx = cameFrom[idx];
  }
  out.reverse();
  return out;
}

/**
 * Räknar A*-cellernas centra till en XZ-lista och applicerar string-
 * pulling: itererar och tar bort waypoints där rak linje mellan grannen
 * före och grannen efter är fri av hinder. Ger få waypoints (2-4 för
 * typiska rum-vägar) → ease-loopen i InteriorGuests/InteriorStaff läser
 * en waypoint åt gången utan ändring.
 */
function smoothPath(nav: NavGraph, cells: Array<[number, number]>, from: XZ, to: XZ): XZ[] {
  const pts: XZ[] = [from];
  for (const [c, r] of cells) pts.push(cellCentre(nav, c, r));
  pts.push(to);
  // Iterativ string-pulling: håll en läsare-position, testa framåt så
  // långt som möjligt utan att bryta line-of-sight, hoppa dit, upprepa.
  const out: XZ[] = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let farthest = i + 1;
    for (let j = pts.length - 1; j > i + 1; j--) {
      if (segmentClear(nav, pts[i], pts[j])) { farthest = j; break; }
    }
    out.push(pts[farthest]);
    i = farthest;
  }
  return out;
}

/**
 * ORDER 222 — instrumentering för perf-verifiering (§5 DoD 7). Räknar
 * antal `computePath`-anrop uppdelat på rak-linje-snabbfall och äkta
 * A*, samt totalt tidsåtgång + max-per-anrop. Läses av perf-scriptet
 * (`scripts/order222-nav-perf.mjs`) via `resetNavPerfCounters` +
 * `readNavPerfCounters`. Overhead: en integer-inkrement + `performance
 * .now()` per anrop → försumbart, får ligga kvar i prod (siffrorna kan
 * användas i devpanel senare).
 */
interface NavPerfCounters {
  computePathCalls: number;
  straightLineHits: number;
  astarRuns: number;
  totalMs: number;
  maxMs: number;
  nullResults: number;
}
const _navPerf: NavPerfCounters = {
  computePathCalls: 0,
  straightLineHits: 0,
  astarRuns: 0,
  totalMs: 0,
  maxMs: 0,
  nullResults: 0
};
export function resetNavPerfCounters(): void {
  _navPerf.computePathCalls = 0;
  _navPerf.straightLineHits = 0;
  _navPerf.astarRuns = 0;
  _navPerf.totalMs = 0;
  _navPerf.maxMs = 0;
  _navPerf.nullResults = 0;
}
export function readNavPerfCounters(): Readonly<NavPerfCounters> {
  return { ..._navPerf };
}

// DEV-hook så playwright kan läsa/nolla utan att importera modulen.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as {
    __nxNavPerf?: {
      reset: () => void;
      read: () => Readonly<NavPerfCounters>;
    };
  }).__nxNavPerf = { reset: resetNavPerfCounters, read: readNavPerfCounters };
}

/**
 * Beräknar en väg i lokal XZ från `from` till `to`. Returnerar en lista
 * som ALLTID börjar med `from` (eller nära det, om from ligger i ett
 * blockerat område och måste projiceras) och slutar med `to`. Null om
 * målet är oåtkomligt från startpunkten (skulle vara ett fynd — se
 * `isReachable` för samma test utan väg-konstruktion).
 *
 * Anropskontrakt: ändra ALDRIG returlistan (kan cachas av anroparen).
 */
export function computePath(nav: NavGraph, from: XZ, to: XZ): XZ[] | null {
  const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  _navPerf.computePathCalls += 1;
  const fCell = toCell(nav, from);
  const tCell = toCell(nav, to);
  // Om from/to hamnade i blockerad cell — hitta närmaste walkable inom
  // rimligt avstånd. Rimlig = 6 celler = 1.5 m vid cellSize 0.25.
  const fW = isWalkable(nav, fCell.c, fCell.r)
    ? fCell : nearestWalkable(nav, fCell.c, fCell.r, 6);
  const tW = isWalkable(nav, tCell.c, tCell.r)
    ? tCell : nearestWalkable(nav, tCell.c, tCell.r, 6);
  if (!fW || !tW) {
    _navPerf.nullResults += 1;
    if (typeof performance !== 'undefined') {
      const ms = performance.now() - t0;
      _navPerf.totalMs += ms;
      if (ms > _navPerf.maxMs) _navPerf.maxMs = ms;
    }
    return null;
  }
  // Snabbfall: rak linje fungerar → hoppa A*.
  if (segmentClear(nav, from, to)) {
    _navPerf.straightLineHits += 1;
    if (typeof performance !== 'undefined') {
      const ms = performance.now() - t0;
      _navPerf.totalMs += ms;
      if (ms > _navPerf.maxMs) _navPerf.maxMs = ms;
    }
    return [from, to];
  }
  const cells = astar(nav, fW.c, fW.r, tW.c, tW.r);
  _navPerf.astarRuns += 1;
  if (!cells) {
    _navPerf.nullResults += 1;
    if (typeof performance !== 'undefined') {
      const ms = performance.now() - t0;
      _navPerf.totalMs += ms;
      if (ms > _navPerf.maxMs) _navPerf.maxMs = ms;
    }
    return null;
  }
  const smoothed = smoothPath(nav, cells, from, to);
  if (typeof performance !== 'undefined') {
    const ms = performance.now() - t0;
    _navPerf.totalMs += ms;
    if (ms > _navPerf.maxMs) _navPerf.maxMs = ms;
  }
  return smoothed;
}

/**
 * Ligger `xz` inuti något hinder? Returnerar det första hindret som
 * träffar, eller null om punkten är fri. Används av penetrations-testet
 * i §3 DoD ("noll genomträngningar under ett helt pass").
 *
 * INTE inflaterad — testet ska svara på om en figur står FYSISKT inuti
 * en möbel, inte om den ligger inom sitt gångmarginal-band.
 */
export function isInsideObstacle(nav: NavGraph, xz: XZ): ObstacleAABB | null {
  for (const ob of nav.obstacles) {
    const dx = Math.abs(xz[0] - ob.local[0]);
    const dz = Math.abs(xz[1] - ob.local[1]);
    if (dx <= ob.halfW && dz <= ob.halfD) return ob;
  }
  return null;
}

/**
 * Går det att nå `to` från `from`? BFS på gridet — kort variant för
 * reachability-testet i §5 DoD 4 ("varje plats och varje station är
 * nåbar från entrén"). Delar inte kod med `computePath` för att hålla
 * A*-implementationen fokuserad; BFS räcker för Ja/Nej-frågan.
 */
export function isReachable(nav: NavGraph, from: XZ, to: XZ): boolean {
  const fCell = toCell(nav, from);
  const tCell = toCell(nav, to);
  const fW = isWalkable(nav, fCell.c, fCell.r)
    ? fCell : nearestWalkable(nav, fCell.c, fCell.r, 6);
  const tW = isWalkable(nav, tCell.c, tCell.r)
    ? tCell : nearestWalkable(nav, tCell.c, tCell.r, 6);
  if (!fW || !tW) return false;
  const { cols, rows } = nav;
  const seen = new Uint8Array(cols * rows);
  const queue: number[] = [fW.r * cols + fW.c];
  seen[queue[0]] = 1;
  const goalIdx = tW.r * cols + tW.c;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === goalIdx) return true;
    const cc = cur % cols;
    const cr = (cur - cc) / cols;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const nIdx = nr * cols + nc;
      if (seen[nIdx]) continue;
      if (nav.walkable[nIdx] !== 1) continue;
      seen[nIdx] = 1;
      queue.push(nIdx);
    }
  }
  return false;
}
