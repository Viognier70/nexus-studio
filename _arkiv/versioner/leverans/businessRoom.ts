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
//
// ── Namnet på vägfunktionen ───────────────────────────────────────
// `walkPathToSeat` genomgående, även för foodtrucken där den leder
// till en köplats. Ett namn ska beskriva ROLLEN, inte möbeln — Vision
// Owner 2026-08-30.

import * as THREE from 'three';

import * as Restaurant from './restaurantRoom';
import * as Brewpub from './brewpubRoom';
import * as WineBar from './wineBarRoom';
import * as Inn from './innRoom';
import * as FoodTruck from './foodTruckRoom';

// #region types

export type Vec2 = [number, number];

/** Nycklarna följer BusinessClass i bestämd form (ORDER 139). */
export type RoomClass =
  | 'kvarterskrogen' | 'ölkrogen' | 'vinbaren' | 'gästgiveriet' | 'foodtrucken';

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
  uniform: string;
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
  stations: RoomStation[];
  entrance: Vec2;
  waitingSpot: Vec2;
  /** Reducerarens kapacitet. NOLL för foodtrucken, och det är rätt. */
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
  foodtrucken: FoodTruck
};

const FACTORY: { [k: string]: string } = {
  kvarterskrogen: 'createRestaurantRoom',
  ölkrogen: 'createBrewpubRoom',
  vinbaren: 'createWineBarRoom',
  gästgiveriet: 'createInnRoom',
  foodtrucken: 'createFoodTruckRoom'
};

const MEASURE: { [k: string]: string } = {
  kvarterskrogen: 'measureRestaurantRoom',
  ölkrogen: 'measureBrewpubRoom',
  vinbaren: 'measureWineBarRoom',
  gästgiveriet: 'measureInnRoom',
  foodtrucken: 'measureFoodTruckRoom'
};

const UPDATE: { [k: string]: string } = {
  kvarterskrogen: 'updateRestaurantRoom',
  ölkrogen: 'updateBrewpubRoom',
  vinbaren: 'updateWineBarRoom',
  gästgiveriet: 'updateInnRoom',
  foodtrucken: 'updateFoodTruckRoom'
};

function moduleFor(roomClass: RoomClass): any {
  const m = MODULES[roomClass];
  if (!m) {
    throw new Error(
      'businessRoom: okänd klass "' + roomClass + '". Nycklarna är ' +
      'bestämd form (ORDER 139): kvarterskrogen, ölkrogen, vinbaren, ' +
      'gästgiveriet, foodtrucken. En klass som saknas ska bli ett fel, ' +
      'inte ett tomt rum.'
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
      uniform: s.uniform ?? '',
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
    stations: stations,
    entrance: entrance,
    waitingSpot: waitingSpot,
    capacity: seats.length,
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
