// businessRoom — ett kontrakt för alla fem verksamhetsklasser.
//
// Begärt av Vision Owner 2026-08-30 (svar på fråga 4), att skrivas
// FÖRE monteringen.
//
// ── Varför ────────────────────────────────────────────────────────
// Fem klasser har i dag fem nästan-lika API:er:
//
//   measureRestaurantRoom   walkPathToSeat
//   measureBrewpubRoom      walkPathToSeat
//   measureWineBarRoom      walkPathToSeat
//   measureInnRoom          walkPathToSeat + walkPathFromRoom
//   measureFoodTruckRoom    walkPathToQueueSlot
//   measureNightClubRoom    walkPathToSeat + walkPathToBar
//
// Monteringskoden får då fem specialfall för fem saker som gör samma
// sak, och specialfall är där fel gömmer sig. Den här filen
// normaliserar OVANPÅ rumsfilerna — den rör dem inte, importerar bara
// och översätter.
//
// ── Vad som medvetet INTE normaliseras ────────────────────────────
// Skillnader som är verkliga ska synas, inte slätas ut:
//
//   • foodtrucken har seats = [] och capacity = 0. Inte "okänt" — noll.
//     Klassen begränsas av genomströmning, och den storheten finns
//     inte i modellen. Se FLAGS.capacityModel.
//   • foodtrucken äger inte sin mark, så dess palettkontroll tar
//     gatans färger som argument. Den ligger kvar i foodTruckRoom.ts.
//   • gästgiveriet har gästrum, morgonväg och höjdprofil. Ingen annan
//     klass har det, så `guestRooms` är tom för de fyra andra i
//     stället för att gömmas bakom en flagga.
//   • foodtrucken har `pitch` skild från `group`: platsen ligger kvar
//     när fordonet kör. Kontraktet exponerar båda.
//   • nattklubben har 150 platser varav 24 är stolar. `occupancyAreas`
//     bär resten som YTOR med densitet — ett dansgolv har inga punkter.
//     Den är tom för de fem andra i stället för att gömmas.
//   • nattklubben har dessutom `walkPathToBar`, för en barkö är en
//     ordning medan ett dansgolv inte är det.
//
// ── Namnet på vägfunktionen ───────────────────────────────────────
// `walkPathToSeat` genomgående, även för foodtrucken där den leder
// till en köplats. Ett namn ska beskriva ROLLEN, inte möbeln — Vision
// Owner 2026-08-30.

import * as THREE from 'three';

import type { StaffRole } from '../types';

import * as Restaurant from './restaurantRoom';
import * as Brewpub from './brewpubRoom';
import * as WineBar from './wineBarRoom';
import * as Inn from './innRoom';
import * as FoodTruck from './foodTruckRoom';
import * as NightClub from './nightClubRoom';

// #region types

export type Vec2 = [number, number];

/** Nycklarna följer BusinessClass i bestämd form (ORDER 139). */
export type RoomClass =
  | 'kvarterskrogen' | 'ölkrogen' | 'vinbaren' | 'gästgiveriet'
  | 'foodtrucken' | 'nattklubben';

export interface RoomSeat {
  id: string;
  /** Reducerarens seatIndex. Ordningen är rummets, inte kontraktets. */
  seatIndex: number;
  /** 'table' | 'bar' | 'lounge' | 'communal' | 'twotop' | 'queue' … */
  kind: string;
  furnitureId: string;
  local: Vec2;
  seatHeight: number;
  facing: number;
}

export interface RoomStation {
  id: string;
  local: Vec2;
  facing: number;
  /** Golvhöjd stationen står på. Noll utom i foodtrucken. */
  standHeight: number;
  // ORDER 155 — `uniform`-fält borttaget. Personalens färg läses ur
  // `ROLE_COLOUR` (staffColour.ts) via sim-rollen; stationen bär inte
  // längre färg per klass (rumsfilernas STAFF_UNIFORMS var Designs
  // förslag och aldrig kalibrerat mot silhuettbandet).
  note: string;
}

export interface RoomMeasure {
  /** Rummets eller fordonets utbredning i planet. */
  footprint: Vec2;
  /** Fri höjd. Mätt ur väggar respektive kaross, aldrig ur inredning. */
  height: number;
  seatCount: number;
  standingCount: number;
  floorZones: number;
  /** Klassens egna tal, oförvanskade. Läs dem när du behöver dem. */
  raw: any;
}

export interface BusinessRoom {
  roomClass: RoomClass;
  /** Lägg i scenen. Placeras med byggnadens OBB, eller — för
   *  foodtrucken — med fordonets position och kurs. */
  group: THREE.Group;
  /** Endast foodtrucken: torgplatsen, som ligger kvar när vagnen kör.
   *  null för de fyra rummen. */
  pitch: THREE.Group | null;
  seats: RoomSeat[];
  /** Ståplatser. Ingår ALDRIG i capacity — inget gästtillstånd finns. */
  standing: { id: string; local: Vec2; facing: number }[];
  /** Gästrum. Tom utom i gästgiveriet. */
  guestRooms: any[];
  /** Beläggningsytor — rektangel, m², densitet. Tom utom i
   *  nattklubben, där de bär 126 av 150 platser. Se §1 i den filen. */
  occupancyAreas: any[];
  stations: RoomStation[];
  entrance: Vec2;
  waitingSpot: Vec2;
  /**
   * Reducerarens kapacitet. Tre klasser avviker och det är rätt:
   *   foodtrucken   0 — begränsas av genomströmning, inte platser
   *   nattklubben   150 — varav 126 i occupancyAreas, inte i seats
   *   gästgiveriet  100 — mot interiorLayout.TOTAL_SEATS = 16
   * Rummets eget `capacity` vinner över seats.length när det finns.
   */
  capacity: number;
  fits: boolean;
  shortfall: Vec2;
  /** Klassens FLAGS, oförändrade. Läs dem före montering. */
  flags: { [k: string]: string };
  /** Rumsobjektet som klassens egen modul returnerade. */
  raw: any;
  dispose: () => void;
}

// #endregion types

const MODULES: { [k: string]: any } = {
  kvarterskrogen: Restaurant,
  ölkrogen: Brewpub,
  vinbaren: WineBar,
  gästgiveriet: Inn,
  foodtrucken: FoodTruck,
  nattklubben: NightClub
};

const FACTORY: { [k: string]: string } = {
  kvarterskrogen: 'createRestaurantRoom',
  ölkrogen: 'createBrewpubRoom',
  vinbaren: 'createWineBarRoom',
  gästgiveriet: 'createInnRoom',
  foodtrucken: 'createFoodTruckRoom',
  nattklubben: 'createNightClubRoom'
};

const MEASURE: { [k: string]: string } = {
  kvarterskrogen: 'measureRestaurantRoom',
  ölkrogen: 'measureBrewpubRoom',
  vinbaren: 'measureWineBarRoom',
  gästgiveriet: 'measureInnRoom',
  foodtrucken: 'measureFoodTruckRoom',
  nattklubben: 'measureNightClubRoom'
};

const UPDATE: { [k: string]: string } = {
  kvarterskrogen: 'updateRestaurantRoom',
  ölkrogen: 'updateBrewpubRoom',
  vinbaren: 'updateWineBarRoom',
  gästgiveriet: 'updateInnRoom',
  foodtrucken: 'updateFoodTruckRoom',
  nattklubben: 'updateNightClubRoom'
};

function moduleFor(roomClass: RoomClass): any {
  const m = MODULES[roomClass];
  if (!m) {
    throw new Error(
      'businessRoom: okänd klass "' + roomClass + '". Nycklarna är ' +
      'bestämd form (ORDER 139): kvarterskrogen, ölkrogen, vinbaren, ' +
      'gästgiveriet, foodtrucken, nattklubben. En klass som saknas ska ' +
      'bli ett fel, inte ett tomt rum.'
    );
  }
  return m;
}

/**
 * Bygger ett rum av valfri klass. `opts` skickas vidare oförändrat till
 * klassens egen fabrik — se respektive fil för vad den tar.
 */
export function createRoom(roomClass: RoomClass, opts?: any): BusinessRoom {
  const mod = moduleFor(roomClass);
  const raw = mod[FACTORY[roomClass]](opts ?? {});

  const isTruck = roomClass === 'foodtrucken';

  // Platserna. Foodtrucken har inga — dess queue[] är köplatser, inte
  // sittplatser, och den skillnaden ska inte gömmas.
  const seats: RoomSeat[] = (raw.seats ?? []).map(function (s: any) {
    return {
      id: s.id,
      seatIndex: s.seatIndex,
      kind: s.kind,
      furnitureId: s.furnitureId,
      local: s.local,
      seatHeight: s.seatHeight,
      facing: s.facing
    };
  });

  const standingSrc = isTruck
    ? (raw.queue ?? []).filter(function (q: any) { return q.kind === 'stand'; })
    : (raw.standing ?? []);
  const standing = standingSrc.map(function (s: any) {
    return { id: s.id, local: s.local, facing: s.facing };
  });

  const stations: RoomStation[] = (raw.staffStations ?? []).map(function (s: any) {
    return {
      id: s.id,
      local: s.local,
      facing: s.facing,
      standHeight: s.standHeight ?? 0,
      note: s.note ?? ''
    };
  });

  // Entré och väntplats. Foodtrucken har orderPoint i stället för dörr
  // — gästen går fram till en lucka, inte in genom en entré.
  const entrance: Vec2 = isTruck ? raw.orderPoint : raw.entrance;
  const waitingSpot: Vec2 = isTruck
    ? (raw.queue.find(function (q: any) { return q.index === 1; })
       || raw.queue[0]).local
    : raw.waitingSpot;

  return {
    roomClass: roomClass,
    group: raw.group,
    pitch: raw.pitch ?? null,
    seats: seats,
    standing: standing,
    guestRooms: raw.guestRooms ?? [],
    occupancyAreas: raw.occupancyAreas ?? [],
    stations: stations,
    entrance: entrance,
    waitingSpot: waitingSpot,
    // Rummets eget tal vinner. Nattklubben har 150 med 24 stolar, och
    // seats.length hade tyst rapporterat 24.
    capacity: raw.capacity !== undefined ? raw.capacity : seats.length,
    fits: raw.fits,
    shortfall: raw.shortfall,
    flags: mod.FLAGS ?? {},
    raw: raw,
    dispose: raw.dispose
  };
}

/**
 * Rummets enda rörliga del, om det har någon. Alla fem tar ett tal
 * 0..1 från anroparen och äger ingen klocka:
 *   kvarterskrogen  fläkten i spiskåpan — skicka 0, köket har inget
 *                   tillstånd
 *   ölkrogen        omrörararmen i mäskkaret — skicka 0
 *   vinbaren        skivtallriken — skicka 0
 *   gästgiveriet    vindflöjeln
 *   foodtrucken     0 = FÄRD (markis nedfälld, hylla in, stödben upp),
 *                   1 = servering. Här är talet ett tillstånd, inte en
 *                   fas — se FLAGS.hatchState.
 */
export function updateRoom(room: BusinessRoom, phase: number): void {
  const mod = moduleFor(room.roomClass);
  const fn = mod[UPDATE[room.roomClass]];
  if (fn) fn(room.raw, phase);
}

/**
 * ORDER 184 — sätt shell-opacity (wall + roof) på ett rum. Anropas varje
 * frame av *Scene-komponenterna med samma smoothstep-formel som PlayerBusinesss
 * roof-fade så att spelarens kamera vid myBusiness-preset kan zooma IN i
 * lokalen: byggnadsvolymen försvinner, interiören avslöjas.
 *
 * Före ORDER 184 hade brewpubRoom / restaurantRoom fast opaka väggar + tak.
 * PlayerBusinesss egen skal fejdades vid 24 m men businessRoom-skalet stod
 * kvar och skymmer interiören — vad Vision Owner såg i olkrogen-vyn 2026-09-06.
 * ORDER 184 alternativ B: PlayerBusinesss skal skippas när kontraktet är
 * monterat, och kontraktet får själv fade-ansvar via denna funktion.
 *
 * Traversar `room.group` en gång per frame och hittar mesh med namn i
 * SHELL_MESH_NAMES-set:et. Materialet delas ofta mellan flera mesher
 * (brewpubRoom bygger med shared `matWall` / `matRoof`) — vi noterar
 * varje material en gång så vi inte skriver samma opacity gång på gång.
 *
 * `castShadow` togglas parallellt med opacity per ORDER 055 Del A —
 * ett fejdat tak stämplar sin silhuett på marken om depth-pass:en
 * ignorerar alpha.
 */
const SHELL_MESH_NAMES = new Set(['wallN', 'wallS', 'wallE', 'wallW', 'roofSlab']);

export function setShellOpacity(room: BusinessRoom, opacity: number): void {
  const clamped = Math.max(0, Math.min(1, opacity));
  const wantTransparent = clamped < 0.99;
  const depthWrite = clamped > 0.5;
  const castShadow = clamped > 0.5;
  const seen = new Set<THREE.Material>();
  room.group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (!SHELL_MESH_NAMES.has(obj.name)) return;
    obj.castShadow = castShadow;
    const mat = obj.material as THREE.Material | THREE.Material[];
    const list = Array.isArray(mat) ? mat : [mat];
    for (const m of list) {
      if (seen.has(m)) continue;
      seen.add(m);
      m.opacity = clamped;
      if (m.transparent !== wantTransparent) {
        m.transparent = wantTransparent;
        m.needsUpdate = true;
      }
      if ('depthWrite' in m) (m as unknown as { depthWrite: boolean }).depthWrite = depthWrite;
    }
  });
}

/**
 * Vägpunkter till en plats, i rummets lokala XZ.
 *
 * Heter walkPathToSeat även för foodtrucken, där den leder till en
 * köplats: namnet beskriver rollen, inte möbeln.
 */
export function walkPathToSeat(room: BusinessRoom, seatId: string): Vec2[] {
  const mod = moduleFor(room.roomClass);
  if (room.roomClass === 'foodtrucken') {
    return mod.walkPathToQueueSlot(room.raw, seatId);
  }
  return mod.walkPathToSeat(room.raw, seatId);
}

/**
 * Vägpunkter till en barköplats. Endast nattklubben — de fem andra
 * kastar, eftersom de inte har barköer som platser.
 */
export function walkPathToBar(room: BusinessRoom, approachId: string): Vec2[] {
  if (room.roomClass !== 'nattklubben') {
    throw new Error(
      'walkPathToBar: bara nattklubben har barköplatser. ' +
      'Klassen "' + room.roomClass + '" har seats — använd walkPathToSeat.'
    );
  }
  return moduleFor(room.roomClass).walkPathToBar(room.raw, approachId);
}

/** Vägen ut. Foodtrucken har serveFlowPath i stället — beställ, hämta,
 *  ut — eftersom gästen aldrig satt någonstans. */
export function exitPath(room: BusinessRoom, seatId: string): Vec2[] {
  const mod = moduleFor(room.roomClass);
  if (room.roomClass === 'foodtrucken') return mod.serveFlowPath(room.raw);
  return mod.exitPathFromSeat(room.raw, seatId);
}

/**
 * ORDER 217 (C3 §3.2) — vägpunkter från entrén till en personalstation.
 * Delegerar till modul (kvarterskrogen/ölkrogen har korridor-medvetna
 * implementationer som skirtar långborden). Klasser utan modul-support
 * faller tillbaka till [entrance, station.local] — samma raka linje som
 * före ORDER 217, men explicit två-punkts-path för att renderaren ska
 * kunna följa samma waypoint-loop utan special-fall.
 *
 * `role` slås upp mot STATION_MAP via `stationFor(role, room)` — så
 * anroparen inte behöver känna station-id:t direkt.
 */
export function walkPathToStation(room: BusinessRoom, role: StaffRole): Vec2[] {
  const station = stationFor(role, room);
  if (!station) return [];
  const mod = moduleFor(room.roomClass) as {
    walkPathToStation?: (raw: unknown, stationId: string) => Vec2[];
  };
  if (typeof mod.walkPathToStation === 'function') {
    return mod.walkPathToStation(room.raw, station.id);
  }
  // Fallback för klasser utan modul-support: entrance → station.
  return [
    [room.entrance[0], room.entrance[1]],
    [station.local[0], station.local[1]]
  ];
}

/** Ögonhöjd för en plats. Räknas ur SITSEN, aldrig ur golvet. */
export function eyeHeightForSeat(room: BusinessRoom, seatId: string): number {
  const mod = moduleFor(room.roomClass);
  if (room.roomClass === 'foodtrucken') return mod.EYE_STANDING_M;
  const seat = room.raw.seats.find(function (s: any) { return s.id === seatId; });
  if (!seat) return mod.EYE_STANDING_M ?? 1.66;
  return mod.eyeHeightForSeat(seat);
}

/**
 * Ett gemensamt mått, plus klassens egna tal orörda i `raw`.
 *
 * Höjden läses ur väggar respektive kaross — aldrig ur inredningen.
 * Det felet gjordes två gånger under bygget: gästgiveriets sal
 * rapporterade 2,22 m fri höjd i en sal som är 5,00, och restaurangens
 * 1,00 i ett rum som är 3,00.
 */
export function measureRoom(room: BusinessRoom): RoomMeasure {
  const mod = moduleFor(room.roomClass);
  const raw = mod[MEASURE[room.roomClass]](room.raw);
  let footprint: Vec2;
  let height: number;
  if (room.roomClass === 'foodtrucken') {
    footprint = raw.bodyFootprint;
    height = raw.totalHeight;
  } else if (room.roomClass === 'gästgiveriet') {
    footprint = raw.footprint;
    height = raw.hallHeight;
  } else {
    footprint = raw.footprint;
    height = raw.interiorHeight;
  }
  return {
    footprint: footprint,
    height: height,
    seatCount: room.seats.length,
    standingCount: room.standing.length,
    floorZones: (mod.ZONE_FLOORS ?? []).length || (room.roomClass === 'foodtrucken' ? 1 : 0),
    raw: raw
  };
}

/**
 * Världskoordinater efter placering. Varje klass har redan funktionen;
 * den här returnerar den oförändrad, så konsumenten slipper veta
 * vilken modul rummet kom ur.
 */
export function resolveWorldPositions(room: BusinessRoom): any {
  const mod = moduleFor(room.roomClass);
  return mod.resolveWorldPositions(room.raw);
}

// ────────────────────────────────────────────────────────────────
// Sim-roll → rums-station mappning (ORDER 154, VO-beslut 2026-08-31)
// ────────────────────────────────────────────────────────────────
//
// Sim-lagret bär FYRA roller: `värd | servitör | kock | lärling`.
// Rummen har egen stations-vokabulär per klass. Mappningen är
// kontraktets ansvar (ORDER 152 §2) — renderaren ska fråga, inte
// räkna ut. En station är en PLATS, inte en anställning: en sim-kock
// i ölkrogen kan stå vid `brewer`-stationen utan att bli en ny
// rolltyp.
//
// PRINCIPER från Vision Owner 2026-08-31:
//   1. **Värden vid entrén** — ölkrogen och vinbaren har ingen host-
//      station i geometrin, men entrén är rummets `entrance`-fält.
//      För dem läses `room.entrance`-positionen och slås in i en
//      syntetisk RoomStation. Detta är INTE att uppfinna en station
//      (VO:s varning) — entréns position kommer från rummets EGET
//      kontrakt, inte från gissning.
//   2. **Kocken i ölkrogen = brewer** — bryggeriet ÄR ölkrogens kök,
//      det var rummets poäng. Nattklubben har inget kök: null.
//   3. **Lärlingen vid pass-luckan** — närmast produktionen utan att
//      vara i den. I restaurangen: `server` (matsalssidan av passet).
//      I ölkrogen och vinbaren: `runner` (samma placering — noten på
//      båda stationerna är "vid passluckan"). I gästgiveriet finns
//      ingen pass-mottagarstation: null. Foodtruck och nattklubb:
//      null.
//   4. **null när klassen saknar platsen.** En station som uppfinns
//      för att fylla en cell är precis den gissning ordrarna finns
//      för att undvika.
//
// TeamPanel filtreras INTE per klass — en ölkrog utan värd är ett
// spelarval, inte något systemet ska förbjuda. Renderaren väljer
// själv vad den gör med null: dölj puck, fallback-position, eller
// stå vid centre. Ingen mappning här bestämmer det.

type StationTarget = string | '__entrance' | null;

// ORDER 206 — kontraktet äger mappningen (VO 2026-09-10 kl. 16:30:
// "Bygg staffHomeFor i businessRoom.ts, inte i scenen — kontraktet
// ska äga mappningen, som ORDER 154 gjorde för stationFor.").
// InteriorStaff läser inte längre kontraktets flata `stations` direkt
// (ORDER 204:s approach); i stället kallar den `staffHomeFor(role, room)`
// nedan som slår upp station via STATION_MAP + räknar hem 0.6 m fram
// vid PLINTH_M-golvet.
//
// **Mappnings-antaganden markerade explicit.** ORDER 205:s design-
// fråga `STATION_ROLE_MAPPING_QUESTION_2026-09-10.md` är öppen — Design
// har inte bekräftat vilken station-id som hör till vilken sim-roll för
// ölkrogen. Varje icke-uppenbar rad nedan har en `ANTAGANDE:`-kommentar.
// När Design svarar: uppdatera raderna och ta bort ANTAGANDE-taggen.
//
// VO 2026-09-10 kl. 16:30: "brewer→kock och taps→värd är dina antaganden
// om Designs namn. Skriv dem som antaganden i koden, så nästa läsare
// ser att de inte är bekräftade." → 'taps' är namnet Design kanske vill
// ha; nuvarande brewpubRoom har ingen 'taps'-station så jag mappar värd
// till närmaste substitut ('__entrance', VO-arv från ORDER 200) tills
// 'taps' finns.
const STATION_MAP: Record<RoomClass, Record<StaffRole, StationTarget>> = {
  // Kvarterskrogen: namn-matchning entydig.
  kvarterskrogen: { värd: 'host', servitör: 'server', kock: 'chef', lärling: 'server' },

  // Ölkrogen: brewer/cook/runner-namnen matchar inte entydigt sim-roller.
  // Fyra stations = fyra roller (Design via VO 2026-09-10 kl. 15:30).
  // Namn-mappningen nedan är MINA ANTAGANDEN om Designs namn — inte
  // bekräftade. VO 2026-09-10 kl. 17:00:
  //   "Skriv brewer→kock, taps→värd som antaganden i koden — de är
  //    dina, inte Designs."
  //
  //   värd → 'taps' — ANTAGANDE. Design 4-to-4 tyder på en 'taps'-
  //     station (tapptornet är där värden både servar och möter gästen
  //     i en ölkrog). 'taps'-station finns INTE i nuvarande
  //     brewpubRoom.ts (fyra deklarerade: barkeep/brewer/cook/runner).
  //     Design måste antingen (a) döpa om 'barkeep' → 'taps' eller (b)
  //     lägga till en 'taps'-station för att värd ska renderas. Tills
  //     dess: `stationFor('värd', ölkrogen)` returnerar null →
  //     InteriorStaff skippar värd med DEV-warn. Ingen tyst fallback
  //     till entrance eller barkeep — kontraktet levererar antingen
  //     data eller ingenting (VO-princip: "en fallback som döljer att
  //     data saknas är samma mönster som INTERIOR.chair.seatY").
  //
  //   servitör → 'barkeep' — ANTAGANDE. Pubservitör är typiskt
  //     bartender. Om 'taps' är samma station som nuvarande 'barkeep'
  //     med nytt namn så kolliderar värd och servitör; om 'taps' är
  //     egen station bakom värden (tapptornet) och 'barkeep' står kvar
  //     för kassan/serving så är det två distincta.
  //
  //   kock → 'brewer' — ANTAGANDE, uttryckligen nämnt av VO 2026-09-10
  //     kl. 16:30 som "din" antagande. Bryggarens arbete = kock-arbete
  //     i ölkrog-verksamhet. Alternativ: 'cook' (den mer traditionella
  //     kock-stationen); men brewer läser starkare som "husets kock" i
  //     en pub där maten är utpekat sekundär.
  //
  //   lärling → 'cook' — ANTAGANDE. Apprentice hjälper i köket vid
  //     spisen. Om kock → 'brewer' så är 'cook' ledig för lärling.
  //
  // Öppen Design-fråga: STATION_ROLE_MAPPING_QUESTION_2026-09-10.md.
  ölkrogen:       { värd: 'taps',       servitör: 'barkeep', kock: 'brewer', lärling: 'cook' },

  vinbaren:       { värd: '__entrance', servitör: 'runner', kock: 'cook',   lärling: 'runner' },
  gästgiveriet:   { värd: 'host',       servitör: 'hallA',  kock: 'chef',   lärling: null },
  foodtrucken:    { värd: null,         servitör: 'window', kock: 'cook',   lärling: null },
  nattklubben:    { värd: 'door',       servitör: 'floor',  kock: null,     lärling: null }
};

/**
 * Vilken station en given sim-roll hör hemma vid i det här rummet.
 * En station är en plats, inte en anställning — en kock i ölkrogen
 * kan stå vid `brewer`-stationen utan att bli en ny rolltyp.
 *
 * Returnerar `null` när klassen saknar platsen (t.ex. foodtrucken har
 * ingen värd-station, nattklubben har ingen kock). Renderaren väljer
 * själv vad den gör med null.
 *
 * För ölkrogen/vinbarens `värd`: syntetiserar en station vid
 * `room.entrance` — inte en uppfunnen plats, utan rummets EGEN
 * entrépunkt returnerad i RoomStation-form.
 */
export function stationFor(role: StaffRole, room: BusinessRoom): RoomStation | null {
  const target = STATION_MAP[room.roomClass]?.[role];
  if (target == null) return null;
  if (target === '__entrance') {
    // Syntetisk värd-station vid rummets entré. `facing = Math.PI`
    // ("in mot rummet") som default: värden möter gästen och blickar
    // in i lokalen bakom sig. Om ett specifikt rum vill ha annan
    // vinkel läggs en explicit host-station i dess staffStations.
    return {
      id: '__entrance',
      local: room.entrance,
      facing: Math.PI,
      standHeight: 0,
      note: 'Värdens plats: rummets entré (syntetiserad av stationFor — ingen host-station i geometrin).'
    };
  }
  return room.stations.find(function (s) { return s.id === target; }) ?? null;
}

/**
 * Diagnos-form av `stationFor` — returnerar alla fyra rollernas mål
 * som ett objekt, med null för de som saknas. Praktisk för test och
 * DevPanel-utskrifter.
 */
export function stationsForAllRoles(room: BusinessRoom): Record<StaffRole, RoomStation | null> {
  return {
    värd:     stationFor('värd', room),
    servitör: stationFor('servitör', room),
    kock:     stationFor('kock', room),
    lärling:  stationFor('lärling', room)
  };
}

/**
 * Sim-rollernas hemstationer i VÄRLDS-XZ efter att rummet placerats.
 * Använder rummets group.localToWorld — måste kallas efter att
 * `room.group.position/rotation` är satta. `null` för roller vars
 * klass saknar station (STATION_MAP-cell = null).
 *
 * Scenerna (RestaurantScene, BrewpubScene, …) skriver detta till
 * `businessRoomRef.current.staffStationsByRole` så InteriorStaff kan
 * placera personalpuckarna på rummets faktiska stationer i stället för
 * att räkna ur `layout.entrance/bar/centre` (restaurantsspecifikt).
 */
export function resolveStaffStationsWorld(room: BusinessRoom): Record<StaffRole, Vec2 | null> {
  room.group.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  function toWorld(local: Vec2): Vec2 {
    v.set(local[0], 0, local[1]);
    room.group.localToWorld(v);
    return [v.x, v.z];
  }
  function resolve(role: StaffRole): Vec2 | null {
    const s = stationFor(role, room);
    return s ? toWorld(s.local) : null;
  }
  return {
    värd:     resolve('värd'),
    servitör: resolve('servitör'),
    kock:     resolve('kock'),
    lärling:  resolve('lärling')
  };
}

/**
 * ORDER 206 — hemplatsen för en sim-roll i rummet. Fyra egenskaper:
 *
 *   xz     — värld-XZ, 0,6 m FRAMFÖR stationens mittpunkt (arbetssidan,
 *            dvs motsatt riktning från stationens front). VO 2026-09-10
 *            kl. 16:00: "Hemplatsen är fortfarande INTE stationens
 *            mittpunkt. En punkt framför, vänd mot stationen, ~0,6 m ut."
 *   y      — golv-Y (`floorY` = PLINTH_M ≈ 0.11 m för alla nuvarande rum).
 *            VO 2026-09-10 kl. 16:30: "Hemplatserna ska mätas mot floorY,
 *            inte mot noll." Räknas som `moduleFor(room.roomClass).PLINTH_M ?? 0.11`
 *            så framtida rum med annan sockel (foodtruck-flak Y=0.42-0.62)
 *            hämtar sitt eget värde när modulen exporterar det.
 *   facing — station.facing i värld-koordinater. Figuren tittar mot
 *            arbetsområdet.
 *
 * Retur `null` när rollen inte har en station i klassen (STATION_MAP-
 * cell = null). Renderaren (InteriorStaff) skippar sådana medlemmar med
 * DEV-warning i stället för att gissa en fallback-position.
 */
export interface StaffHome {
  xz: Vec2;
  y: number;
  facing: number;
}

const STAFF_HOME_STANDOFF_M = 0.6;

export function staffHomeFor(role: StaffRole, room: BusinessRoom): StaffHome | null {
  const station = stationFor(role, room);
  if (!station) return null;
  const mod = moduleFor(room.roomClass) as { PLINTH_M?: number };
  const floorY = mod.PLINTH_M ?? 0.11;
  // Home = station.local − 0,6 m i facing-riktning. `facing` är station-
  // fronten (vart stationens "front" pekar); staff står 0,6 m på
  // arbetssidan och tittar mot stationen (rotation.y = facing).
  const fx = Math.sin(station.facing);
  const fz = Math.cos(station.facing);
  return {
    xz: [station.local[0] - STAFF_HOME_STANDOFF_M * fx, station.local[1] - STAFF_HOME_STANDOFF_M * fz],
    y: floorY,
    facing: station.facing
  };
}

/**
 * ORDER 206 — hemplatsen per roll i VÄRLDS-XZ efter att rummet placerats.
 * Använder room.group.localToWorld för XZ och adderar room.group.rotation.y
 * till facing (samma pattern som `resolveWorldPositions().seatFacings`).
 * Y är rummets floorY oförändrad — det är en Y-mätning, inte transformerad
 * av rum-group:s position (som är Y=0 i alla nuvarande rum, men explicit-
 * ändras det om ett framtida rum står på annan Y).
 *
 * Scenerna (BrewpubScene/RestaurantScene/…) publicerar detta till
 * `SharedBusinessRoom.staffHomesByRole` så InteriorStaff läser rummets
 * kontraktsberäknade hem per roll — inte längre en beräkning i scenen.
 */
export function resolveStaffHomesWorldByRole(room: BusinessRoom): Record<StaffRole, { xz: Vec2; y: number; facing: number } | null> {
  room.group.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  const groupYaw = room.group.rotation.y;
  function toWorldXZ(local: Vec2): Vec2 {
    v.set(local[0], 0, local[1]);
    room.group.localToWorld(v);
    return [v.x, v.z];
  }
  function resolve(role: StaffRole): { xz: Vec2; y: number; facing: number } | null {
    const h = staffHomeFor(role, room);
    if (!h) return null;
    return {
      xz: toWorldXZ(h.xz),
      y: h.y,
      facing: h.facing + groupYaw
    };
  }
  return {
    värd:     resolve('värd'),
    servitör: resolve('servitör'),
    kock:     resolve('kock'),
    lärling:  resolve('lärling')
  };
}

/**
 * ORDER 217 (C3 §3.2) — vägpunkter per roll i värld-XZ. Publiceras
 * parallellt med `staffHomesByRole` så InteriorStaff kan traversa
 * korridorerna istället för att gå raka linjen genom långborden.
 *
 * Returnerar tomma arrayer för roller vars klass saknar station-mapping
 * (null från `walkPathToStation`). Renderaren skippar path-following
 * för de rollerna och faller tillbaka till home-target.
 */
export function resolveStaffPathsWorldByRole(room: BusinessRoom): Record<StaffRole, Vec2[]> {
  room.group.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  function toWorldXZ(local: Vec2): Vec2 {
    v.set(local[0], 0, local[1]);
    room.group.localToWorld(v);
    return [v.x, v.z];
  }
  function resolvePath(role: StaffRole): Vec2[] {
    const localPath = walkPathToStation(room, role);
    return localPath.map(toWorldXZ);
  }
  return {
    värd:     resolvePath('värd'),
    servitör: resolvePath('servitör'),
    kock:     resolvePath('kock'),
    lärling:  resolvePath('lärling')
  };
}

/**
 * ORDER 218 (C3 §3.2 uppföljning) — vägpunkter TILL VARJE SÄTE i värld-XZ.
 * Index-aligned med `room.seats` (så seatIndex från sim mappar direkt).
 * Delegerar till modulens `walkPathToSeat(raw, seat.id)` per säte.
 *
 * Publiceras i `SharedBusinessRoom.walkPathsToSeatsByIndex` så InteriorStaff
 * kan routa staff→guest via samma korridorer som guest själv skulle använt
 * (walkPathToSeat är kontraktets egna korridor-deklaration, se
 * brewpubRoom.ts/restaurantRoom.ts). Rak linje staff→seated-guest korsar
 * långborden lika illa som staff→home gjorde före ORDER 217.
 */
export function resolveWalkPathsToSeatsWorld(room: BusinessRoom): Vec2[][] {
  room.group.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  function toWorldXZ(local: Vec2): Vec2 {
    v.set(local[0], 0, local[1]);
    room.group.localToWorld(v);
    return [v.x, v.z];
  }
  const mod = moduleFor(room.roomClass) as {
    walkPathToSeat?: (raw: unknown, seatId: string) => Vec2[];
  };
  if (typeof mod.walkPathToSeat !== 'function') return [];
  return room.seats.map((seat) => {
    const localPath = mod.walkPathToSeat!(room.raw, seat.id);
    return localPath.map(toWorldXZ);
  });
}

/**
 * Alla klassers flaggor i en läsning, med klassnamn framför.
 * Monteringskoden bör skriva ut den här listan en gång och stanna vid
 * de blockerande — det finns tre, och de är alla sim-sidiga.
 */
export function allFlags(): { business: string; key: string; text: string }[] {
  const out = [];
  const keys = Object.keys(MODULES);
  for (let i = 0; i < keys.length; i++) {
    const f = MODULES[keys[i]].FLAGS ?? {};
    const fk = Object.keys(f);
    for (let j = 0; j < fk.length; j++) {
      out.push({ business: keys[i], key: fk[j], text: f[fk[j]] });
    }
  }
  return out;
}

/**
 * De flaggor som stoppar montering. Sorterade så att den som monterar
 * ser dem först.
 */
export function blockingFlags(): { business: string; key: string; text: string }[] {
  return allFlags().filter(function (f) {
    return f.text.indexOf('BLOCKERANDE') >= 0;
  });
}
