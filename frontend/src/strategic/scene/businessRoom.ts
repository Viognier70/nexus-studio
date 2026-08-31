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

const STATION_MAP: Record<RoomClass, Record<StaffRole, StationTarget>> = {
  kvarterskrogen: { värd: 'host',       servitör: 'server', kock: 'chef',   lärling: 'server' },
  ölkrogen:       { värd: '__entrance', servitör: 'runner', kock: 'brewer', lärling: 'runner' },
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
