import { INTERIOR } from '../content/layout';
import { businessHasOvernight, businessHasSeats, capacityForBusiness } from '../business/businessClass';
import type { BusinessClass } from '../business/businessClass';
import type { Guest, SimulationState, StaffMember, StaffRole, TaskAssignment, TaskType, Vec2 } from '../types';
import { taskDurationTicks } from './economics';
import { roleCompetence } from './team';
import { businessRoomRef } from '../scene/interiorSharedState';
import {
  HAPPY_THRESHOLD,
  UNHAPPY_THRESHOLD,
  reputationEventDeparture,
  reputationEventGiveUp
} from './reputation';
import {
  MORALE_GIVE_UP_HIT,
  MORALE_HAPPY_DEPARTURE_BUMP,
  MORALE_UNHAPPY_DEPARTURE_HIT,
  bumpMorale
} from './morale';
import { valueQuotaSatisfactionDelta } from './valueQuota';
import { applyMissingMepHit, consumeMepForOneGuest } from './mepConsumption';

const TICK_SECONDS = 0.2;

// ORDER 043 v3 §5.2 — the waiting queue is a phenomenon, not a
// furniture list. The room's painted waiting spots (INTERIOR.waitingSpots)
// stay at 4 for cycle 1, but the queue itself can grow to 12 before a
// guest is turned away; overflow guests re-render on the same pucks via
// modulo. Signal path: peakQueue is the reading, floor pucks are chrome.
const WAITING_QUEUE_CAP = 12;
// ORDER 115 §4.5 — Food truck-uteplatsens eating-fas. 20 sim-sek
// matchar "äta en portion foodtruck-mat vid en bänk". Kortare än
// restaurangens dining-cykel (34-55 s). Bara relevant när
// policies.hasUteplats är sann OCH businessClass === 'foodtrucken'.
const EATING_DURATION_SEC = 20;
// ORDER 115 rev 2 — Serving-fasens längd. VO 2026-08-17: "Bygg
// serving-fas, 2-3 sekunder. En överlämning som inte syns är ingen
// överlämning." 2,5 sek = 12-13 ticks vid 5 Hz — säkert flera
// render-frames där prop är synlig och staff-servePose peak:ar.
const SERVING_PHASE_SEC = 2.5;

function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function copy(v: Vec2): Vec2 {
  return { x: v.x, z: v.z };
}

export function stepEntityMotion(entity: {
  position: Vec2;
  targetPosition: Vec2;
  moveProgress: number;
}) {
  if (entity.moveProgress >= 1) return;
  const distTotal = Math.max(distance(entity.targetPosition, entity.position), 0.001);
  const step = (TICK_SECONDS * 2.4) / distTotal;
  entity.moveProgress = Math.min(1, entity.moveProgress + step);
  entity.position.x = lerp1(entity.position.x, entity.targetPosition.x, step);
  entity.position.z = lerp1(entity.position.z, entity.targetPosition.z, step);
  if (
    distance(entity.position, entity.targetPosition) < 0.05 ||
    entity.moveProgress >= 1
  ) {
    entity.position = copy(entity.targetPosition);
    entity.moveProgress = 1;
  }
}

function lerp1(current: number, target: number, k: number): number {
  return current + (target - current) * Math.min(1, k);
}

// ORDER 188 tillägg 2 — nearestSeat med avståndstak. Före ORDER 188
// fanns ingen exponerad nearestSeat-funktion; städningen i tickGuests
// använde bara guest.state för att bedöma om en id skulle stanna i
// seatedIds. En gäst i "seated"-state MEN med position långt från
// någon riktig seat (t.ex. mid-transition, walk-away edge case)
// räknades som seated ändå. Avståndstaket säkerställer att en gäst
// som är >2 m från alla platser inte matchas som "på plats" — annars
// städas fel gäst bort ur seatedIds (VO 2026-09-07 tillägg 2).
const NEAREST_SEAT_MAX_M = 2.0;

export function nearestSeatWithinM(
  state: SimulationState,
  position: Vec2,
  maxM: number = NEAREST_SEAT_MAX_M
): number | null {
  const cap = isSeatedCapacity(state);
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < cap; i++) {
    const seat = seatSlot(state, i);
    const d = distance(position, seat);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestDist <= maxM ? bestIdx : null;
}

export function isSeatedCapacity(state: SimulationState): number {
  // ORDER 186 fynd 3 — capacity derives från businessClass i stället för
  // state.policies.capacity. Anledning: DEFAULT_POLICIES.capacity=TOTAL_SEATS=16
  // uppdateras bara vid bank-outcome-driven klass-byte (reducer.ts:882-889).
  // En spelare som startar med `#business=olkrogen` fick capacity=16 trots
  // att businessClass='ölkrogen' vill ha 20 — findFreeSeat nådde aldrig
  // bar-stolarna på seatIndex 16-19. Att läsa direkt från businessClass
  // gör policies.capacity till en cache som aldrig behöver invalideras.
  return capacityForBusiness(state.businessClass, state.policies.staffCount);
}

export function seatSlot(state: SimulationState, index: number): Vec2 {
  // ORDER 219 (A) — läs per-klass seat-position från businessRoomRef om
  // scenen är monterad. Detta fixar buggen där sim.guest.position för
  // seat-index >= 12 fastnade på INTERIOR.seatOrder[0] = (2, -1.8), som
  // gjorde att `moveStaff(staff, guest.position)` gav samma tal för alla
  // efterföljande gäster → servitörens sim.position ändrades aldrig
  // (utredning 2026-09-14 §Q5). Rendering läser guest-render-position
  // via `guestPositionsRef` med korrekt per-klass seats — sim-fixen är
  // för läsare av sim.staff/guest.position (tester, DevPanel, logg).
  //
  // Fallback till INTERIOR.seatOrder när scenen inte är monterad (t.ex.
  // i tester som inte kör React-scenen). Samma pattern som pre-219 för
  // dem, ingen regression.
  void state; // reserved for future use
  const local = businessRoomRef.current?.seatsLocal?.[index];
  if (local) return { x: local[0], z: local[1] };
  return INTERIOR.seatOrder[index] ?? INTERIOR.seatOrder[0];
}

// Seat preferences per scenario response (ORDER 042 §3.3 walk-in-of-
// five). The visual room reads only when the party actually lands in
// the seats the response promises: choice A combines the 4-top with a
// 2-top; choice B fills the 4-top and puts the fifth at the bar. If a
// preferred seat is already taken (a regular got there first), the
// next preference is tried; only after the whole preference list is
// exhausted does the party fall back to the general seat sequence.
//
// Seat indices are the interiorLayout.ts flat seat order:
//   0–1   Table t0 (2-top)   ← left-most on the west row
//   2–3   Table t1 (2-top)
//   4–7   Table t2 (4-top)   ← centre
//   8–9   Table t3 (2-top)
//   10–11 Table t4 (2-top)   ← right-most
//   12–15 Bar stools
const SEATS_CHOICE_A = [4, 5, 6, 7, 8]; // 4-top + t3 seat 0 (party of 5 split 4+1)
const SEATS_CHOICE_B = [4, 5, 6, 7, 12]; // 4-top + first bar stool
// Regular arrivals + fallback: fill front-to-back leaving the 4-top
// alone so it stays available for future parties. Order puts the outer
// 2-tops first, then bar stools, then the 4-top (least preferred).
const SEATS_DEFAULT = [
  0, 1, 2, 3,      // t0, t1 (left-side 2-tops)
  8, 9, 10, 11,    // t3, t4 (right-side 2-tops)
  12, 13, 14, 15,  // bar stools
  4, 5, 6, 7       // 4-top (avoided unless nothing else free)
];

// ORDER 186 fynd 3 — ölkrogens preferensordning. brewpubRoom.seats:
//   seatIndex 0-7   communal (två långbord, fyra platser vardera)
//   seatIndex 8-11  twotop (två tvåbord vid entrén)
//   seatIndex 12-19 bar (åtta barstolar längs disken)
// SEATS_DEFAULT (restaurang-form, 16 index) nådde aldrig bar 16-19 och
// tilldelade bar 12-15 sist. En ölkrog där ingen sitter vid baren är
// inte en ölkrog — Vision Owner 2026-09-07. Ny preferensordning:
// bar först (klassens karaktär), sedan communal (långbords-pratläget),
// sedan twotop sist. Alla 20 index representerade.
const SEATS_OLKROGEN = [
  12, 13, 14, 15, 16, 17, 18, 19,  // bar — fylls först
  0, 1, 2, 3, 4, 5, 6, 7,          // communal (långbord)
  8, 9, 10, 11                     // twotop (sist)
];

function seatsPreferenceFor(businessClass: BusinessClass): readonly number[] {
  if (businessClass === 'ölkrogen') return SEATS_OLKROGEN;
  return SEATS_DEFAULT;
}

// ORDER 187 — seat-grupperingar per klass. En party håller ihop på
// samma grupp när det är möjligt (findFreeSeat prioriterar samma grupp
// som existerande party-medlem). En två-top som splittras mellan bar
// och långbord är värre än att fylla bar-först-preferensen — VO 2026-09-07.
//
// Grupperna motsvarar fysiska möbelenheter i klassens rumsgeometri:
//   ölkrogen (från brewpubRoom.ts:597-660):
//     0-3   longS (långbord söder)
//     4-7   longN (långbord norr)
//     8-9   twoC (tvåbord öster om entré)
//     10-11 twoD (tvåbord söder om entré)
//     12-19 bar (åtta stolar längs disken)
//   kvarterskrogen (från restaurantRoom.ts + interiorLayout.ts):
//     0-1   t0 (2-top)
//     2-3   t1 (2-top)
//     4-7   t2 (4-top)
//     8-9   t3 (2-top)
//     10-11 t4 (2-top)
//     12-15 bar
const SEAT_GROUPS_OLKROGEN: readonly (readonly number[])[] = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9],
  [10, 11],
  [12, 13, 14, 15, 16, 17, 18, 19]
];
const SEAT_GROUPS_KVARTERSKROGEN: readonly (readonly number[])[] = [
  [0, 1], [2, 3], [4, 5, 6, 7], [8, 9], [10, 11], [12, 13, 14, 15]
];

function seatGroupsFor(businessClass: BusinessClass): readonly (readonly number[])[] {
  if (businessClass === 'ölkrogen') return SEAT_GROUPS_OLKROGEN;
  return SEAT_GROUPS_KVARTERSKROGEN;
}

function groupOfSeat(businessClass: BusinessClass, seat: number): readonly number[] | null {
  for (const g of seatGroupsFor(businessClass)) {
    if (g.includes(seat)) return g;
  }
  return null;
}

function scenarioPreferredSeats(state: SimulationState): number[] {
  if (state.scenario.choice === 'A') return SEATS_CHOICE_A;
  if (state.scenario.choice === 'B') return SEATS_CHOICE_B;
  return SEATS_DEFAULT;
}

function seatTaken(state: SimulationState, seat: number): boolean {
  return state.seatedIds.some((gid) => guestSeat(state, gid) === seat);
}

export function findFreeSeat(
  state: SimulationState,
  forScenarioGuest = false,
  partyId?: string
): number | null {
  // ORDER 113 fel 1 — verksamheter utan matsal har inga stolar att
  // finna. Utan denna guard returnerar findFreeSeat en giltig index
  // ur SEATS_DEFAULT (0..15) även för foodtruck, eftersom
  // state.layout.seats fortfarande är 16 default. Det får arriving-tick
  // (rad 162) och waiting-tick (rad 199) att alltid ta seat-vägen →
  // setGuestSeated-genvägen skickar gästen till 'ordering' utan att
  // sätta fot i waitingIds. Konsekvens: foodtruckens kö fylls aldrig,
  // ORDER 111:s kögate + väder- och konkurrensmultiplikatorer gate:ar
  // en tom port. Med guarden faller foodtruck-gäster in i else-branchen
  // (rad 176) och pushas korrekt till waitingIds; staff-task-pipelinen
  // (findTaskTarget → completeStaffTask 'greet'/'seat') tar dem sedan
  // vidare till 'ordering'. Restaurant/Värdshus opåverkade.
  if (!businessHasSeats(state.businessClass)) return null;
  const cap = isSeatedCapacity(state);
  // Scenario guests walk the response-specific preference list first.
  // A regular arrival got seat 4 before the party arrived? Try seat 5
  // next, then 6, 7, 8; only after the preference list is exhausted
  // fall back to the general sequence.
  if (forScenarioGuest && state.scenario.choice) {
    for (const seat of scenarioPreferredSeats(state)) {
      if (seat < cap && !seatTaken(state, seat)) return seat;
    }
  }
  // ORDER 187 — party-hänsyn. Om en annan medlem av samma parti redan
  // är seated, försök hitta ledig plats i SAMMA seat-grupp (samma bord
  // eller bar-sektion). Om ingen ledig i gruppen: hitta grupp med minst
  // `remainingPartySize` lediga platser så resten av partiet får plats
  // där gästen nu placeras. Fallback: vanlig preferensordning per klass.
  if (partyId !== undefined) {
    // Hitta redan-seated partymedlem
    const seatedPartyMember = state.guests.find(
      (g) => g.partyId === partyId && g.seatIndex !== null && g.seatIndex !== undefined
    );
    if (seatedPartyMember) {
      const group = groupOfSeat(state.businessClass, seatedPartyMember.seatIndex as number);
      if (group) {
        // Först lediga i samma grupp
        for (const seat of group) {
          if (seat < cap && !seatTaken(state, seat)) return seat;
        }
        // Gruppen full → fallback (partisplittring är sista utväg)
      }
    } else {
      // Första medlemmen från partiet — hitta grupp med tillräckligt
      // med lediga platser för hela partiet, iterera i class-preferens.
      const partySize = state.guests.find((g) => g.partyId === partyId)?.partySize ?? 2;
      const groups = seatGroupsFor(state.businessClass);
      // Sortera grupper i preferensordning: den grupp vars första seat
      // är först i seatsPreferenceFor kommer först.
      const pref = seatsPreferenceFor(state.businessClass);
      const groupRank = (g: readonly number[]): number => {
        let best = Infinity;
        for (const s of g) {
          const r = pref.indexOf(s);
          if (r >= 0 && r < best) best = r;
        }
        return best;
      };
      const sortedGroups = [...groups].sort((a, b) => groupRank(a) - groupRank(b));
      for (const group of sortedGroups) {
        const free = group.filter((s) => s < cap && !seatTaken(state, s));
        if (free.length >= partySize) {
          // Hela partiet får plats här — ta första lediga
          return free[0];
        }
      }
      // Ingen grupp tillräckligt stor: fallback (partiet splittras)
    }
  }
  // ORDER 186 fynd 3 — per-klass preferensordning. Ölkrogen fyller bar
  // först; övriga klasser använder SEATS_DEFAULT (restaurang-form).
  for (const seat of seatsPreferenceFor(state.businessClass)) {
    if (seat < cap && !seatTaken(state, seat)) return seat;
  }
  return null;
}

function guestSeat(state: SimulationState, guestId: string): number | null {
  const g = state.guests.find((x) => x.id === guestId);
  return g?.seatIndex ?? null;
}

export function moveGuest(guest: Guest, target: Vec2) {
  guest.targetPosition = { ...target };
  guest.moveProgress = 0;
}

export function moveStaff(staff: StaffMember, target: Vec2) {
  staff.targetPosition = { ...target };
  staff.moveProgress = 0;
}

// -------------------------------------------------------------------------
// Guest state transitions driven by time and by staff task completion.
// -------------------------------------------------------------------------

export function tickGuests(state: SimulationState) {
  const now = state.simTime;
  for (const guest of state.guests) {
    stepEntityMotion(guest);

    if (guest.state === 'arriving') {
      if (guest.moveProgress >= 1) {
        // ORDER 043 §6 walk-away: guests whose economic-at-spawn said
        // "refuse entry" turn back without checking for a seat. Visible
        // reading: at low economic, more pucks approach the door and
        // walk out again — "guests leaving without sitting."
        if (guest.walkAwayOnArrival && !guest.scenarioSource) {
          guest.state = 'declined';
          guest.stateTime = now;
          moveGuest(guest, { x: 0, z: 8 });
          continue;
        }
        const seat = findFreeSeat(state, guest.scenarioSource, guest.partyId);
        if (seat !== null && !state.scenario.awaitingChoice) {
          setGuestSeated(state, guest, seat);
        } else {
          // Queue at waiting spot. The waiting cap (WAITING_QUEUE_CAP)
          // is decoupled from the number of physical waiting-spot pucks
          // in INTERIOR.waitingSpots: at cycle-1 the room only has 4
          // painted spots but the queue needs headroom for the dinner
          // signal (peak 5–7 at low social) — otherwise every extra
          // guest is a walk-away and the queue length collapses to a
          // step function. Overflow guests re-use the visible spots via
          // modulo; the "extra" arrivals stack on the same pucks in
          // rendering, which is fine for now — the phenomenon-of-record
          // is the count, not the individual placement.
          const idx = state.waitingIds.length;
          if (idx >= WAITING_QUEUE_CAP) {
            // No waiting room — leave.
            guest.state = 'declined';
            guest.stateTime = now;
            moveGuest(guest, { x: 0, z: 8 });
          } else {
            state.waitingIds.push(guest.id);
            guest.state = 'waiting';
            guest.stateTime = now;
            const spot =
              INTERIOR.waitingSpots[idx % INTERIOR.waitingSpots.length];
            moveGuest(guest, spot);
          }
        }
      }
      continue;
    }

    if (guest.state === 'waiting') {
      // Satisfaction decreases while waiting.
      const drop = 0.02 * TICK_SECONDS;
      guest.satisfaction = Math.max(0, guest.satisfaction - drop);
      const seat = findFreeSeat(state, guest.scenarioSource, guest.partyId);
      if (seat !== null) {
        state.waitingIds = state.waitingIds.filter((id) => id !== guest.id);
        setGuestSeated(state, guest, seat);
      } else if (now - guest.stateTime > 90 && guest.satisfaction < 0.2) {
        // Give up. ORDER 043 v3 §4 reputation loop: a walkout from
        // the queue is the loudest bad-reputation signal — a person
        // waited long enough to be visibly unhappy and then left.
        // ORDER 047 §2: same event drags morale — the team registers
        // that someone waited too long and gave up.
        guest.state = 'leaving';
        guest.stateTime = now;
        moveGuest(guest, { x: 0, z: 8 });
        reputationEventGiveUp(state);
        bumpMorale(state, -MORALE_GIVE_UP_HIT);
      }
      continue;
    }

    if (guest.state === 'seated' && now - guest.stateTime > 4) {
      guest.state = 'ordering';
      guest.stateTime = now;
      continue;
    }

    // ORDER 115 rev 2 — serving → paying efter SERVING_PHASE_SEC.
    // Prop-överlämningen har hunnit synas i 2,5 sim-sek (12+ frames);
    // gästen övergår till 'paying' som är transaktion + steg-åt-sidan.
    if (guest.state === 'serving' && now - guest.stateTime > SERVING_PHASE_SEC) {
      guest.state = 'paying';
      guest.stateTime = now;
      continue;
    }

    if (guest.state === 'dining' && now - guest.stateTime > diningDuration(state)) {
      guest.state = 'paying';
      guest.stateTime = now;
      continue;
    }

    if (guest.state === 'paying' && now - guest.stateTime > 8) {
      // Free the seat, count as completed. ORDER 043 v3 §4 reputation
      // loop: read final satisfaction as a reputation signal — happy
      // departures pull word-of-mouth up, unhappy departures pull it
      // down, mediocre is neutral (a forgettable dinner is not
      // remembered).
      state.completedGuests += 1;
      state.seatedIds = state.seatedIds.filter((id) => id !== guest.id);
      reputationEventDeparture(state, guest.satisfaction);
      // ORDER 047 §2 — same satisfaction band drives morale. A happy
      // departure lifts; an unhappy one drags; a mediocre departure is
      // silent (the team doesn't register a neutral customer).
      if (guest.satisfaction >= HAPPY_THRESHOLD) {
        bumpMorale(state, MORALE_HAPPY_DEPARTURE_BUMP);
      } else if (guest.satisfaction <= UNHAPPY_THRESHOLD) {
        bumpMorale(state, -MORALE_UNHAPPY_DEPARTURE_HIT);
      }
      // ORDER 111 §4 — Värdshus: en andel av betalande gäster stannar
      // över natten istället för att gå. Enkel rullning: en gäst med
      // stateTime som är jämnt tal per konstant blir "sover över" —
      // deterministisk (harnessen körs fixed-seed), ingen Math.random.
      // 1/3 av gäster stannar över — låst tröskel, kalibrering hör till
      // senare (§7 avgränsning: djupet får hållas nere).
      if (businessHasOvernight(state.businessClass) && shouldStayOvernight(guest)) {
        guest.state = 'sleeping';
        guest.stateTime = now;
        guest.stayingOvernight = true;
        // Behåll seatIndex — gäst sover på plats i denna enkla form
        // (rumsbokning hör till senare arbete). Ingen moveGuest.
        continue;
      }
      // ORDER 115 §4.5 — foodtruck-uteplats. Om policies.hasUteplats
      // så går paying → eating (äter i bild) innan leaving. Utan
      // uteplats: direkt till leaving som förut.
      if (state.businessClass === 'foodtrucken' && state.policies.hasUteplats === true) {
        guest.state = 'eating';
        guest.stateTime = now;
        // Bär med sig maten till uteplatsen. Ingen moveGuest — renderaren
        // placerar eating-gäster vid uteplats-position.
        continue;
      }
      guest.state = 'leaving';
      guest.stateTime = now;
      moveGuest(guest, { x: 0, z: 8 });
      continue;
    }

    // ORDER 115 §4.5 — eating-fas: äter en tid vid uteplats, sedan
    // leaving. EATING_DURATION_SEC balanserad mot arrival-rate så
    // uteplats-slots inte överfylls under peak. 20 sim-sek matchar
    // grovt "äta en portion food-truck-mat" ute på bänken.
    if (guest.state === 'eating' && now - guest.stateTime > EATING_DURATION_SEC) {
      guest.state = 'leaving';
      guest.stateTime = now;
      moveGuest(guest, { x: 0, z: 8 });
      continue;
    }

    if (guest.state === 'leaving' && guest.moveProgress >= 1) {
      guest.state = 'declined';
      guest.stateTime = now;
      continue;
    }

    if (guest.state === 'declined' && now - guest.stateTime > 3) {
      // Removal happens outside this loop.
    }
  }

  // Prune declined guests that have been off-screen long enough.
  state.guests = state.guests.filter(
    (g) => !(g.state === 'declined' && state.simTime - g.stateTime > 3)
  );
  // Refresh waiting list to match state.
  state.waitingIds = state.waitingIds.filter((id) => {
    const g = state.guests.find((x) => x.id === id);
    return g && g.state === 'waiting';
  });
  state.seatedIds = state.seatedIds.filter((id) => {
    const g = state.guests.find((x) => x.id === id);
    if (!g) return false;
    if (!['seated', 'ordering', 'dining', 'paying'].includes(g.state)) return false;
    // ORDER 188 fynd 5 + tillägg 2 — verifiera att gästen är faktiskt
    // nära en seat, inte bara i seated-state. En gäst mid-transition
    // (state='seated' men position ännu inte hos seat) räknades tidigare
    // som seated → staff.targetGuestId följde dem ut ur rummet. Med
    // avståndstak 2 m filtreras spöks-seatedIds bort.
    return nearestSeatWithinM(state, g.position) !== null;
  });
  // ORDER 188 fynd 5 — nolla staff.targetGuestId när gästen är borta.
  // Tidigare behöll staff en pointer till en borttagen gäst → position
  // undefined → puck driftar ut ur rummet under "personal försvinner"-
  // observationen (VO 2026-09-07). completeStaffTask nullar bara vid
  // normal task-slutförande; pruning-vägen ovan städas separat här.
  const activeGuestIds = new Set(state.guests.map((g) => g.id));
  for (const staff of state.staff) {
    if (staff.targetGuestId && !activeGuestIds.has(staff.targetGuestId)) {
      staff.targetGuestId = null;
      staff.taskType = null;
      staff.taskProgress = 0;
    }
  }
}

// ORDER 111 §4 — deterministisk overnight-roll för värdshus. En tredjedel
// av betalande gäster stannar över natten. Baseras på hash av guest.id
// snarare än Math.random så fixed-seed-harnessen ger reproducerbara
// mätningar per verksamhet (§5 mätkravet). guest.id sätts i model.ts av
// en global counter — samma seed → samma ids → samma overnight-fördelning.
function shouldStayOvernight(guest: Guest): boolean {
  // Enkel numerisk hash på guest.id-suffixet. `gst-<n>` eller `grp-<n>`.
  const suffix = guest.id.replace(/^(gst|grp)-/, '');
  const n = parseInt(suffix, 10);
  if (Number.isNaN(n)) return false;
  return n % 3 === 0;
}

function setGuestSeated(state: SimulationState, guest: Guest, seat: number) {
  // ORDER 110 — R4: verksamheter utan matsal (food truck) placerar
  // aldrig gäster på stolar. Guarden här kompletterar samma guard i
  // completeStaffTask 'greet'/'seat'-grenen; det finns två write-sites
  // så guarden måste finnas på båda för att flaggan `hasSeats: false`
  // ska hålla i alla anropsvägar (DoD 6).
  if (!businessHasSeats(state.businessClass)) {
    // Food truck-branchen: hoppa över sittande, gå direkt till ordering
    // (gäst vid luckan tar sin order). Ingen seatIndex, ingen seatSlot.
    guest.state = 'ordering';
    guest.seatIndex = null;
    guest.stateTime = state.simTime;
    return;
  }
  guest.state = 'seated';
  guest.seatIndex = seat;
  guest.stateTime = state.simTime;
  state.seatedIds.push(guest.id);
  moveGuest(guest, seatSlot(state, seat));
}

function diningDuration(state: SimulationState): number {
  const base = state.policies.service === 'formell' ? 55 : 34;
  // ORDER 043 v3 §5.2 — low social capital lingers, high social capital
  // turns tables. Scale factor (2 − social) with social clamped [0, 1]:
  //   social = 1 → factor 1.0  (normal linger)
  //   social = 0.5 → factor 1.5 (~50 % longer)
  //   social = 0  → factor 2.0  (double linger, staff bottleneck)
  // The queue reading depends on this: without slower turnover at low
  // social, the room drains fast enough that a queue never forms.
  const social = Math.max(0, Math.min(1, state.capitals.values.social));
  return base * (2 - social);
}

// -------------------------------------------------------------------------
// Staff task assignment. Priority reflects the service philosophy: greet and
// seat first, order and serve next, decant/flambé and clear last.
// -------------------------------------------------------------------------

// ORDER 098 — cooldown för checkback (tillsyn). En dining-gäst blir
// behörig för en ny tillsyn ~15 sim-sekunder efter den senaste (eller
// efter dining-inträdet, om ingen har utförts än). Vald så att en
// 6-gästs dining genererar ~2.4 checkbacks per minut totalt — märkbar
// last utan att sätta personalen på 100 % från en enda dining-topp.
// Ordern tillåter kalibrering; siffran är ett rimligt utgångsläge som
// mätning kommer att pröva.
const CHECKBACK_COOLDOWN_SEC = 15;

// ORDER 098 — satisfaction-bump vid genomförd checkback. Litet,
// avsiktligt: tillsyn är underhåll, inte en händelse. Serve (+0.08)
// och decant/flambe (+0.14) förblir de större satisfaction-drivarna.
const CHECKBACK_SATISFACTION_BUMP = 0.03;

const PRIORITY: TaskType[] = [
  'greet',
  'seat',
  'welcomeDrink',
  'order',
  'serve',
  // ORDER 098 — checkback ligger efter serve (en nyss-serverad gäst
  // ska inte få tillsyn samma tick) men före decant/flambe (rariteter
  // under formell). Betyder att dining-hålet fylls först när
  // greet/seat/order/serve inte har någon i kön.
  'checkback',
  'decant',
  'flambe',
  'clear'
];

// ORDER 137 — bakgrundsarbete. Uppgifter personalen utför när inga
// direkta gäst-uppgifter finns i PRIORITY. Ligger MEDVETET utanför
// PRIORITY så gäst-uppgifter alltid vinner (§2.2). Preemption sker
// dessutom explicit i tickStaff: om personal är i en bakgrunds-
// uppgift och en direkt uppgift dyker upp, avbryts bakgrundsuppgiften
// samma tick — så en väntande gäst aldrig blockeras av städning.
const BACKGROUND_TASKS = new Set<TaskType>(['misEnPlace', 'dish', 'restock', 'clean']);

function isBackgroundTask(t: TaskType | null): boolean {
  return t != null && BACKGROUND_TASKS.has(t);
}

// ORDER 210 (spelbalans, tidigare tecknad som "fynd 4" i ORDER 202) —
// ölkrogen får bg-tasks. Föregående lägen:
//   ORDER 137 §2.3: `[]` — bryggeri-arbete deferrat.
//   ORDER 201 (2026-09-10 fm): `['misEnPlace','dish','restock','clean']`
//     — men utan mätning; reverterad av ORDER 202 §4.
//   ORDER 202 §4 (revert + mät): `[]` + mätrapport `order202-mep/`.
//   ORDER 209 §4 (deferrat fynd 2 "On break vid 16 s" hit).
//   ORDER 210 (denna): `['misEnPlace','dish','restock','clean']` med
//     refill-mängder kalibrerade mot mätrapporten (se
//     `MEP_REFILL_BY_TASK` nedan). Bryggeri-specifika tasks (mash-check,
//     tapp-koll) är fortfarande egen order — dessa fyra räcker för att
//     hålla mep vid liv OCH ge staff något att göra under prep (löser
//     VO-inspelning 2026-09-11 16:45 fynd 2 "On break på alla tre
//     roller vid 16 s"; utan bg-tasks under prep var workload=0 →
//     deriveActions valde "On break").
const BACKGROUND_TASKS_BY_BUSINESS: Record<string, readonly TaskType[]> = {
  kvarterskrogen: ['misEnPlace', 'dish', 'restock', 'clean'],
  gästgiveriet:   ['misEnPlace', 'dish', 'restock', 'clean'],
  foodtrucken:    [],
  ölkrogen:       ['misEnPlace', 'dish', 'restock', 'clean']
};

// ORDER 210 — refill-mängder kalibrerade mot ORDER 202 §4M-mätrapporten
// (`frontend/reports/order202-mep/mep-measurement.json`). Per-guest
// consumption × 96-guest-pass = totalt behov:
//   napkins  0.03 × 96 = 2.88 per pass
//   cutlery  0.025 × 96 = 2.40 per pass
//   garnish  0.04 × 96 = 3.84 per pass
//   stations 0.01 × 96 = 0.96 per pass
//   ice      0.02 × 96 = 1.92 per pass
//
// Vid ~15 completions per bg-task-typ per pass (mätrapportens task-
// observations minus prep-fönstret, grovt räknat) täcker fördelningen
// nedan behovet med lite marginal så prepReadiness håller sig över
// MEP_HIT_THRESHOLD (0.2) genom hela passet:
//   napkins  15 × (0.10 + 0.10) = 3.0 (behov 2.88)
//   cutlery  15 × (0.08 + 0.15) = 3.45 (behov 2.40)
//   garnish  15 × (0.10 + 0.15) = 3.75 (behov 3.84)  (marginellt under)
//   stations 15 × (0.05 + 0.15) = 3.00 (behov 0.96)  (bra marginal)
//   ice      15 × (0.15) = 2.25 (behov 1.92)
//
// Om VO tycker mep-nivåerna är för höga/låga per rumsdiagnostiken:
// justera denna tabell. Clamp 0..1 i replenishFromBackgroundTask
// gör att övertäckt refill inte spiller.
const MEP_REFILL_BY_TASK: Record<string, Record<string, number>> = {
  misEnPlace: { napkins: 0.10, cutlery: 0.08, garnish: 0.10 },
  dish:       { cutlery: 0.15 },
  restock:    { napkins: 0.10, garnish: 0.15, ice: 0.15, stations: 0.05 },
  clean:      { stations: 0.15 }
};

function replenishFromBackgroundTask(state: SimulationState, taskType: TaskType): void {
  const refill = MEP_REFILL_BY_TASK[taskType];
  if (!refill) return;
  const readiness = state.day.prepReadiness;
  if (!readiness) return;
  const next: Record<string, number> = { ...readiness };
  for (const [key, amount] of Object.entries(refill)) {
    const cur = next[key] ?? 0;
    next[key] = Math.min(1, cur + amount);
  }
  state.day = { ...state.day, prepReadiness: next };
}

// ORDER 211 (C1) — `anyDirectTaskAvailable` togs bort som konsumtion i
// tickStaff: preemption baseras nu per-staff på `staff.taskQueue.length > 0`
// i stället för global sökning. Utan konsumenter är hjälparen död kod;
// släpps bort och kan återöppnas i C2 vid roll-baserad tilldelning.

// Roterar bakgrundstyper deterministiskt per personal + simtid så att
// alla fyra uppgifter förekommer under en service — mise en place följs
// av disk följs av påfyllning följs av städning, i namngivna svängar
// snarare än en anonym fill-loop.
//
// ORDER 213 — bg-tasks filtreras nu på TASK_ROLE_ASSIGNMENT så en kock
// bara får misEnPlace, en servitör bara restock, osv. Detta är parallellt
// med hur C2 (ORDER 212) redan filtrerar guest-tasks per roll.
function pickBackgroundTaskFor(state: SimulationState, staff: StaffMember): TaskType | null {
  const list = BACKGROUND_TASKS_BY_BUSINESS[state.businessClass];
  if (!list || list.length === 0) return null;
  // ORDER 213 — filtrera på roll först. Om rollen saknar bg-tasks (t.ex.
  // värd i alla klasser idag) returneras null.
  const roleBgs = list.filter((t) => TASK_ROLE_ASSIGNMENT[t] === staff.role);
  if (roleBgs.length === 0) return null;
  // Deterministisk rotation: staff-id-hash + simTime som fönster ger
  // att en och samma personal cyklar genom alla typer under ett pass,
  // inte fastnar på "clean, clean, clean".
  let h = 0;
  for (let i = 0; i < staff.id.length; i++) h = (h * 31 + staff.id.charCodeAt(i)) | 0;
  const window = Math.floor(state.simTime / 20) + h;
  return roleBgs[Math.abs(window) % roleBgs.length];
}

function beginBackgroundTask(state: SimulationState, staff: StaffMember, type: TaskType) {
  staff.taskType = type;
  staff.taskProgress = 0;
  // ORDER 214 (C2 §4) — staff-rollens praktiska kompetens skalar duration.
  staff.taskDuration = taskDurationTicks(
    state.policies,
    type,
    state.capitals.values.social,
    roleCompetence(state.team, staff.role)
  );
  staff.targetGuestId = null;
  // Bakgrundsarbete håller personalen vid rollens home-punkt — kock i
  // köket, servitör vid disk-stationen. Ingen egen anchor per bg-typ
  // krävs; hemma är där uppgiften rimligen utförs.
  const home = INTERIOR.staffHomes[staff.role];
  if (
    Math.abs(staff.position.x - home.x) > 0.1 ||
    Math.abs(staff.position.z - home.z) > 0.1
  ) {
    moveStaff(staff, home);
  }
}

// ORDER 211 (C1) — kö-kapacitet vid vilken workload mättas till 1.0.
// `staff.workload = min(1, (taskQueue.length + (taskType ? 1 : 0)) / QUEUE_CAPACITY)`.
// Vald till 4 så att pressure-bands (workload ≥ 0.7 för strained,
// ≥ 0.95 för hurried) är reachable när servitören har 1 aktiv + 2-3
// köade, snarare än 1 aktiv + 4-5 (som QUEUE_CAPACITY=6 skulle kräva).
const QUEUE_CAPACITY = 4;

// ORDER 213 — bg-backlog per staff. Schemaläggaren håller kön fylld med
// minst så många bg-tasks (aktiv bg räknas). Val 1: en enda bg pending ger
// naturliga mellanlägen — workload = 0.25 vid idle bg, 0.5 med 1 guest-task
// på topp, 0.75 med 2 guests, 1.0 vid mättning. Sätts högre om /4-staffing
// visar för glest kö-djup i mätningen. Sätts till 0 för att stänga av bg
// helt (foodtruck har redan tom BACKGROUND_TASKS_BY_BUSINESS-lista och
// påverkas inte).
const BG_BACKLOG_TARGET = 1;

// ORDER 212 (C2) — roll-tilldelning per task-typ. VO 2026-09-13/14 C2-
// spec: "vem tar vilken uppgift". Kartlagt utifrån klassisk restaurangs-
// koreografi + ORDER 207 STATION_MAP-namnkonventioner. Alla mappningar
// är MINA ANTAGANDEN (per samma princip som STATION_MAP-antaganden i
// businessRoom.ts) — Design kan korrigera i egen order.
//
//   greet         → värd     (host greetar vid dörren)
//   seat          → värd     (host visar till bord, ANTAGANDE — kunde
//                             delegeras till servitör om värden är upptagen)
//   welcomeDrink  → servitör (dryck-servering)
//   order         → servitör (tar beställning)
//   serve         → servitör (levererar mat, ANTAGANDE — kan vara lärling
//                             som runner i formell service)
//   checkback     → servitör (tillsyn under dining)
//   decant        → servitör (formell vin-service)
//   flambe        → kock     (eldshow-mat, kock utför tableside)
//   clear         → servitör (rensa efter gäst, ANTAGANDE — vanligtvis
//                             delegerat till lärling i större team)
//   misEnPlace    → kock     (bg)
//   dish          → lärling  (bg, ANTAGANDE — praktikanten diskar)
//   restock       → servitör (bg, ANTAGANDE — servitörens ansvar för glas etc.)
//   clean         → lärling  (bg, ANTAGANDE — städ är typiskt lärlingens)
//
// Om en task saknar ansvarig roll i staff (t.ex. flambe men ingen kock)
// eller om alla i den rollen har full kö (QUEUE_CAPACITY nådd), räknas
// tasken som DROPPED i state.metrics.droppedTasksThisService.
// ORDER 214 (C2 §1) — joker-roll. Lärling absorberar överallt när primär
// roll inte finns i laget. Anställningstexten (team.ts:7) beskriver lärling
// som "low across the board, low cost". Lärlingens låga kompetens gör att
// duration blir längre (§4) — inte att uppgiften refuseras. En kock som
// serverar är inte en restaurang: primär roll står över allt annat, men
// lärling får ta över när ingen annan finns.
const JOKER_ROLE: StaffRole = 'lärling';

function pickAssigneeFor(state: SimulationState, type: TaskType): StaffMember | null {
  const primary = TASK_ROLE_ASSIGNMENT[type];

  // Primär roll först — kortast kö vinner, INGET CAPACITY-tak (§3).
  let best: StaffMember | null = null;
  for (const s of state.staff) {
    if (s.role !== primary) continue;
    if (best === null || s.taskQueue.length < best.taskQueue.length) best = s;
  }
  if (best !== null) return best;

  // Joker-fallback: om primär roll saknas i laget, låt lärling ta över.
  // Aktiveras bara när primary ≠ lärling (annars redan sökt ovan).
  if (primary !== JOKER_ROLE) {
    for (const s of state.staff) {
      if (s.role !== JOKER_ROLE) continue;
      if (best === null || s.taskQueue.length < best.taskQueue.length) best = s;
    }
    if (best !== null) return best;
  }

  // Varken primär eller joker finns → unstaffed (räknas i scheduleTasks).
  return null;
}

const TASK_ROLE_ASSIGNMENT: Record<TaskType, StaffRole> = {
  greet:        'värd',
  seat:         'värd',
  welcomeDrink: 'servitör',
  order:        'servitör',
  serve:        'servitör',
  checkback:    'servitör',
  decant:       'servitör',
  flambe:       'kock',
  clear:        'servitör',
  misEnPlace:   'kock',
  dish:         'lärling',
  restock:      'servitör',
  clean:        'lärling'
};

/**
 * ORDER 211 (C1) — enkel scheduler. Iterar PRIORITY och lägger varje
 * outsatt (guest, taskType) i den staff-kö som är kortast. Ingen roll-
 * mapping (C2), ingen chain-modell (§2.2 i utkastet). Duplicerar inte:
 * om (guest, type) redan är aktiv eller köad hoppar vi.
 *
 * Motivering: schemaläggaren är föråldrad greedy PRIORITY-plockning men
 * FLYTTAD från tickStaff till en egen fas som körs FÖRE tickStaff. Det
 * gör att när tickStaff sedan konsumerar kön, staff-medlemmarnas
 * `taskQueue.length` blir en giltig mätning av backlog (medan gamla
 * PRIORITY-loopen konsumerade tasks direkt utan att lämna spår).
 */
function scheduleTasks(state: SimulationState) {
  if (state.staff.length === 0) return;

  // 1. Städa döda gäster ur köerna.
  const activeGuestIds = new Set(state.guests.map((g) => g.id));
  for (const staff of state.staff) {
    if (staff.taskQueue.length > 0) {
      staff.taskQueue = staff.taskQueue.filter(
        (t) => t.targetGuestId === null || activeGuestIds.has(t.targetGuestId)
      );
    }
  }

  // 2. ORDER 212 → ORDER 214 (C2) — för varje PRIORITY-type, hitta första
  //    tillgängliga gäst och köa på KORTAST KÖ AV RÄTT ROLL. ORDER 214
  //    §3: kön har inget CAPACITY-tak i schemaläggningen — den växer.
  //    QUEUE_CAPACITY används fortfarande som workload-nämnare (mättar
  //    signalen vid 4) men schemaläggaren blockeras inte av den. "Att
  //    slänga uppgifter döljer överbelastning; att köra dem ändå gör
  //    bemanningen meningslös" (VO 2026-09-14).
  //
  //    §1 joker-regel: om primär roll saknas i laget faller vi tillbaka
  //    till lärling. Anställningstexten (team.ts:7): "lärling — apprentice,
  //    low across the board, low cost". Låg kompetens = längre duration
  //    (§4), inte att uppgiften refuseras.
  //
  //    Om varken primär roll ELLER lärling finns räknas tasken som
  //    unstaffed (droppedTasksThisService-fältet återanvänds med ny
  //    betydelse: "vi hade uppgifter för en roll som inte finns i laget").
  let unstaffed = 0;
  for (const type of PRIORITY) {
    const targetGuestId = findTaskTarget(state, type);
    if (!targetGuestId) continue;

    const alreadyBoundOrQueued = state.staff.some(
      (s) =>
        (s.taskType === type && s.targetGuestId === targetGuestId) ||
        s.taskQueue.some(
          (t) => t.type === type && t.targetGuestId === targetGuestId
        )
    );
    if (alreadyBoundOrQueued) continue;

    const bestStaff = pickAssigneeFor(state, type);
    if (bestStaff === null) {
      unstaffed += 1;
      continue;
    }
    const assignment: TaskAssignment = {
      id: `${targetGuestId}:${type}:${state.simTime}`,
      type,
      targetGuestId,
      scheduledAt: state.simTime
    };
    bestStaff.taskQueue.push(assignment);
  }

  if (unstaffed > 0) {
    state.metrics = {
      ...state.metrics,
      droppedTasksThisService: state.metrics.droppedTasksThisService + unstaffed
    };
  }

  // 3. ORDER 213 — fyll varje personals kö med bg-tasks som backlog. Bg-
  //    arbetet är rollspecifikt (misEnPlace=kock, dish/clean=lärling,
  //    restock=servitör) och räknas nu som kö-djup. Målet är BG_BACKLOG_TARGET
  //    pending bg-tasks per staff (aktiv bg räknas). Utan detta steg skulle
  //    bg-arbetet försvinna helt när §3.4-exkluderingen tog bort +1-bidraget
  //    från aktiv bg-task — istället flyttar vi bg in i själva kön så det
  //    naturligt syns som backlog. "En uppgift i kön är inte samma sak som
  //    fem" (VO 2026-09-14): kö-djupet får då mellanlägen som löser
  //    bimodaliteten (ORDER 131) strukturellt.
  for (const staff of state.staff) {
    if (staff.taskQueue.length >= QUEUE_CAPACITY) continue;
    const activeIsBg = staff.taskType && isBackgroundTask(staff.taskType) ? 1 : 0;
    const queuedBg = staff.taskQueue.reduce(
      (n, t) => n + (isBackgroundTask(t.type) ? 1 : 0),
      0
    );
    if (activeIsBg + queuedBg >= BG_BACKLOG_TARGET) continue;
    const bg = pickBackgroundTaskFor(state, staff);
    if (!bg) continue;
    staff.taskQueue.push({
      id: `${staff.id}:${bg}:${state.simTime}`,
      type: bg,
      targetGuestId: null,
      scheduledAt: state.simTime
    });
  }

  // 4. ORDER 213 — sortera varje kö så guest-tasks kommer FÖRE bg-tasks
  //    (stabil sort bevarar FIFO inom varje klass). Bg-tasks läggs alltid
  //    på back-of-queue via push, men om steg 2 lade en guest-task på back
  //    efter att steg 3 redan hunnit skjuta in bg måste vi städa. Enkel sort
  //    per staff — O(n log n) på högst QUEUE_CAPACITY element per staff.
  for (const staff of state.staff) {
    if (staff.taskQueue.length <= 1) continue;
    staff.taskQueue.sort((a, b) => {
      const aBg = isBackgroundTask(a.type) ? 1 : 0;
      const bBg = isBackgroundTask(b.type) ? 1 : 0;
      if (aBg !== bBg) return aBg - bBg; // guest (0) före bg (1)
      return a.scheduledAt - b.scheduledAt; // FIFO inom klass
    });
  }
}

export function tickStaff(state: SimulationState) {
  const now = state.simTime;

  // ORDER 211 (C1) — schemaläggaren fyller köer före tickStaff.
  scheduleTasks(state);

  for (const staff of state.staff) {
    stepEntityMotion(staff);

    if (staff.taskType) {
      // ORDER 137 §2.2 / ORDER 213 — bg-task preemption. Efter ORDER 213
      // ligger bg-tasks också i kön, så "queue.length > 0" räcker inte som
      // preemption-villkor — då skulle en aktiv bg avbrytas för att göra
      // en annan bg. Preemption fires ENDAST när kön har en riktig guest-
      // task (queue är sorterad guest-first av scheduleTasks steg 4, så
      // det räcker att titta på fronten).
      const front = staff.taskQueue[0];
      const guestWaiting = front != null && !isBackgroundTask(front.type);
      if (isBackgroundTask(staff.taskType) && guestWaiting) {
        completeStaffTask(state, staff);
        // Fall genom till task-val nedan.
      } else {
        // ORDER 251 — arrival guard. `taskProgress` börjar räknas först
        // när personen kommit fram (`moveProgress >= 1`). Före denna
        // ändring räknade progress upp från tick 1 oavsett position, så
        // en order-task på 10 ticks = 2 s slutade efter 2 s även om
        // servitören fortfarande gick — ORDER 250-mätningens 61 %
        // mid-move-byten var direkt konsekvens. Ingen ändring av
        // taskDuration ännu — det kommer i egen order efter ORDER 252
        // (spelklockan vs animationsklocka). Effekten mäts före/efter
        // via order250-scriptet; M3 får falla (VO 2026-09-22: "rapportera
        // siffrorna, uppdatera INTE baseline utan mitt godkännande").
        if (staff.moveProgress >= 1) {
          staff.taskProgress += 1;
        }
        if (staff.taskProgress >= staff.taskDuration) {
          completeStaffTask(state, staff);
        }
        // ORDER 211 (C1) — härled workload ur kön (inkl. aktiv task).
        setWorkloadFromQueue(staff);
        continue;
      }
    }

    // ORDER 211 (C1) / ORDER 213 — plocka nästa task ur kön. Efter ORDER
    // 213 innehåller kön både guest-tasks (targetGuestId satt) och bg-tasks
    // (targetGuestId null). Dispatch efter typ.
    if (staff.taskQueue.length > 0) {
      const next = staff.taskQueue.shift();
      if (next) {
        if (isBackgroundTask(next.type)) {
          beginBackgroundTask(state, staff, next.type);
        } else if (next.targetGuestId) {
          beginStaffTask(state, staff, next.type, next.targetGuestId);
        }
      }
    }

    // Idle drift toward home if nothing to do.
    if (!staff.taskType) {
      const home = INTERIOR.staffHomes[staff.role];
      if (
        Math.abs(staff.position.x - home.x) > 0.1 ||
        Math.abs(staff.position.z - home.z) > 0.1
      ) {
        moveStaff(staff, home);
      }
    }

    setWorkloadFromQueue(staff);
  }
  void now;
}

/**
 * ORDER 211 (C1) — härled workload ur `taskQueue.length` + `taskType ? 1 : 0`.
 * Ersätter rate-modellen (+0.05 direkt / -0.03 idle / bg-approach 0.4).
 * Skalan 0..1 bevaras så deriveFaces / hurried / strained / bandläsare
 * (ORDER 088 §2.1) läser samma tal — men bakomvarande betydelsen är nu
 * "hur mycket backlog har jag" i stället för "hur snabbt växer min rate".
 *
 * ORDER 213 — bg-tasks räknas som +1 aktiv precis som guest-tasks. Efter
 * migrationen i scheduleTasks steg 3 ligger bg-arbete i själva kön (inte
 * separat via pickBackgroundTaskFor-fallback), så en aktiv bg-task är
 * bara "task jag just plockade ur kön". Ingen dubbelräkning — bg-tasken
 * konsumerades från kön till aktiv, den ligger inte kvar i kön.
 */
function setWorkloadFromQueue(staff: StaffMember): void {
  const activeCount = staff.taskType ? 1 : 0;
  const load = (staff.taskQueue.length + activeCount) / QUEUE_CAPACITY;
  staff.workload = Math.min(1, Math.max(0, load));
}

function findTaskTarget(state: SimulationState, type: TaskType): string | null {
  switch (type) {
    case 'greet': {
      // ORDER 113 fel 1 — foodtruck servar front-of-queue (FIFO).
      // Utan denna gren skulle findTaskTarget bara leta efter arriving-
      // gäster; foodtruck-gäster som redan pushats till waitingIds
      // (via arriving-tick → findFreeSeat=null → else-branchen) skulle
      // aldrig plockas upp. state.waitingIds[0] är front-of-queue —
      // completeStaffTask('greet') foodtruck-branchen filtrerar sedan
      // bort den från waitingIds och sätter state='ordering'.
      if (!businessHasSeats(state.businessClass) && state.waitingIds.length > 0) {
        const w = state.guests.find((g) => g.id === state.waitingIds[0]);
        if (w && !w.hasBeenGreeted) return w.id;
        return null;
      }
      // ORDER 219 (B) — pre-219 krävde `state==='arriving' && moveProgress>=1`
      // men tickGuests transitionerade arriving→seated/waiting samma tick
      // som moveProgress nådde 1, så villkoret var aldrig sant för
      // restaurangs-klasser (utredning 2026-09-14 §Q3). greet fyrades
      // aldrig. Nu: fyra så tidigt som möjligt så värden hinner gå till
      // entrén och möta gästen där. Prioritering:
      //   1. arriving (gästen på väg in) — värden hinner gå till entré
      //   2. waiting (kö, rummet fullt) — värden kan hälsa i kön
      //   3. seated men ännu inte greetad — värden går till bordet
      // `hasBeenGreeted` sätts i completeStaffTask så en gäst bara greetas
      // en gång per besök.
      const arriving = state.guests.find(
        (g) => g.state === 'arriving' && !g.hasBeenGreeted
      );
      if (arriving) return arriving.id;
      const waiting = state.guests.find(
        (g) => g.state === 'waiting' && !g.hasBeenGreeted
      );
      if (waiting) return waiting.id;
      const seated = state.guests.find(
        (g) => g.state === 'seated' && !g.hasBeenGreeted
      );
      return seated?.id ?? null;
    }
    case 'seat': {
      // Behåller tidigare beteende för seat-tasken — arriving-gäst med
      // moveProgress>=1. Se ORDER 198 header för varför denna gren
      // sällan fyras i praktiken; kvar för foodtruck-kompatibilitet
      // och framtida re-work.
      if (!businessHasSeats(state.businessClass) && state.waitingIds.length > 0) {
        return state.waitingIds[0];
      }
      const arriving = state.guests.find((g) => g.state === 'arriving' && g.moveProgress >= 1);
      return arriving?.id ?? null;
    }
    case 'welcomeDrink': {
      if (!state.policies.welcomeDrink) return null;
      const guest = state.guests.find(
        (g) => g.state === 'waiting' && !g.hadWelcomeDrink
      );
      return guest?.id ?? null;
    }
    case 'order': {
      const guest = state.guests.find((g) => g.state === 'ordering');
      return guest?.id ?? null;
    }
    case 'serve': {
      const guest = state.guests.find(
        (g) => g.state === 'seated' && state.simTime - g.stateTime > 6
      );
      return guest?.id ?? null;
    }
    case 'decant':
    case 'flambe': {
      if (state.policies.service !== 'formell') return null;
      const guest = state.guests.find(
        (g) => g.state === 'dining' && state.simTime - g.stateTime < 4
      );
      return guest?.id ?? null;
    }
    case 'checkback': {
      // ORDER 098 — tillsyn under dining. Behörig när
      // simTime − (lastCheckbackAt ?? stateTime) > CHECKBACK_COOLDOWN_SEC.
      // Väljer första matchande dining-gäst (ingen prioritering mellan
      // dem — den som sitter längst utan tillsyn väljs indirekt genom
      // ordningen i state.guests, som är stabil).
      const guest = state.guests.find(
        (g) =>
          g.state === 'dining' &&
          state.simTime - (g.lastCheckbackAt ?? g.stateTime) > CHECKBACK_COOLDOWN_SEC
      );
      return guest?.id ?? null;
    }
    case 'clear': {
      const guest = state.guests.find((g) => g.state === 'leaving');
      return guest?.id ?? null;
    }
    default:
      return null;
  }
}

function beginStaffTask(
  state: SimulationState,
  staff: StaffMember,
  type: TaskType,
  targetGuestId: string
) {
  staff.taskType = type;
  staff.taskProgress = 0;
  // ORDER 214 (C2 §4) — staff-rollens praktiska kompetens skalar duration.
  staff.taskDuration = taskDurationTicks(
    state.policies,
    type,
    state.capitals.values.social,
    roleCompetence(state.team, staff.role)
  );
  staff.targetGuestId = targetGuestId;
  const guest = state.guests.find((g) => g.id === targetGuestId);
  if (guest) {
    moveStaff(staff, guest.position);
  }
}

function completeStaffTask(state: SimulationState, staff: StaffMember) {
  const guest = staff.targetGuestId
    ? state.guests.find((g) => g.id === staff.targetGuestId)
    : null;
  const type = staff.taskType;
  staff.taskType = null;
  staff.taskProgress = 0;
  staff.taskDuration = 0;
  staff.targetGuestId = null;

  // ORDER 210 — bakgrunds-tasks fyller på prep-readiness. Kalibrerad
  // mot ORDER 202 §4M-mätrapporten (`frontend/reports/order202-mep/
  // mep-measurement.json`). Refill-mängderna i `MEP_REFILL_BY_TASK`
  // ovan; kommentaren där dokumenterar per-pass-räkningen. Bg-tasks
  // för ölkrogen aktiverade i samma order (`BACKGROUND_TASKS_BY_BUSINESS.
  // ölkrogen`). Fyras HÄR före `!guest`-guarden så bg-tasks (som har
  // targetGuestId=null) triggar refill innan tidig retur.
  if (!guest && type !== null && BACKGROUND_TASKS.has(type)) {
    replenishFromBackgroundTask(state, type);
    return;
  }

  if (!guest) return;

  const now = state.simTime;
  switch (type) {
    case 'greet': {
      // ORDER 219 (B) — greet är nu en separat handling från seat.
      // Sätter `hasBeenGreeted=true` så samma gäst inte greetas igen.
      // För restaurangs-klasser: ingen state-transition — gästen sitter
      // eller väntar redan (transition sker via tickGuests när
      // moveProgress når 1). För foodtruck: sätter också gästen i
      // 'ordering' (bevarar pre-219-beteendet där greet + seat delade
      // case och foodtruck-grenen flyttade gäst till ordering).
      guest.hasBeenGreeted = true;
      if (!businessHasSeats(state.businessClass) && guest.state === 'waiting') {
        state.waitingIds = state.waitingIds.filter((id) => id !== guest.id);
        guest.state = 'ordering';
        guest.seatIndex = null;
        guest.stateTime = now;
      }
      break;
    }
    case 'seat': {
      // Behåller pre-219 seat-completion — sätter waiting/arriving-gäst
      // till seated om plats finns. Fyras sällan för with-seats-klasser
      // (samma arriving-moveProgress-race som ORDER 198 header noterade)
      // men behållet för foodtruck-fallback och framtida re-work.
      if (guest.state === 'arriving' || guest.state === 'waiting') {
        if (!businessHasSeats(state.businessClass)) {
          state.waitingIds = state.waitingIds.filter((id) => id !== guest.id);
          guest.state = 'ordering';
          guest.seatIndex = null;
          guest.stateTime = now;
          break;
        }
        const seat = findFreeSeat(state, guest.scenarioSource, guest.partyId);
        if (seat !== null) {
          state.waitingIds = state.waitingIds.filter((id) => id !== guest.id);
          guest.state = 'seated';
          guest.seatIndex = seat;
          guest.stateTime = now;
          state.seatedIds.push(guest.id);
          moveGuest(guest, seatSlot(state, seat));
        }
      }
      break;
    }
    case 'welcomeDrink': {
      guest.hadWelcomeDrink = true;
      guest.satisfaction = Math.min(1, guest.satisfaction + 0.12);
      state.waste += 0.6;
      break;
    }
    case 'order': {
      if (guest.state === 'ordering') {
        // ORDER 111 §3 — food truck-gästen får sin beställning över
        // luckan. ORDER 115 rev 2 — går nu via 'serving'-fas (2.5 s)
        // så överlämningen är visuellt observerbar. Utan denna fas
        // var ordering→paying instantant (< 1 tick) och prop-
        // överlämningen fanns aldrig i en synlig ram.
        // Restaurant/Värdshus tar den vanliga vägen ordering → dining.
        if (!businessHasSeats(state.businessClass)) {
          guest.state = 'serving';
          guest.stateTime = now;
          // Carrying sätts VID INTRÄDE till serving så prop är
          // synlig genom hela fasen (staff-servePose peak:as här).
          guest.carrying = 'foodtruckMeal';
          // ORDER 117 §3.2 — värdekvot-modulerad first-impression.
          const vDelta = valueQuotaSatisfactionDelta(state);
          guest.satisfaction = Math.max(0, Math.min(1, guest.satisfaction + vDelta));
          // ORDER 117 §4 — MeP-brist-hit och konsumtion vid överlämning.
          // Servett saknas → mild; garnityr → allvarligare; utebliven
          // mat → sista utvägen. Ingen post stoppar servicen (VO: en
          // spärr är inte en avvägning). Tröskelbaserat: bara poster
          // under 0.2 readiness räknas som "saknas".
          applyMissingMepHit(state, guest);
          consumeMepForOneGuest(state);
        } else {
          guest.state = 'dining';
          guest.stateTime = now;
          // Samma modulering för restaurang/värdshus vid dining-entry.
          const vDelta = valueQuotaSatisfactionDelta(state);
          guest.satisfaction = Math.max(0, Math.min(1, guest.satisfaction + vDelta));
          applyMissingMepHit(state, guest);
          consumeMepForOneGuest(state);
        }
      }
      break;
    }
    case 'serve': {
      if (guest.state === 'seated') {
        guest.state = 'ordering';
        guest.stateTime = now;
      }
      guest.satisfaction = Math.min(1, guest.satisfaction + 0.08);
      break;
    }
    case 'decant':
    case 'flambe': {
      guest.satisfaction = Math.min(1, guest.satisfaction + 0.14);
      break;
    }
    case 'checkback': {
      // ORDER 098 — tillsyn utförd. Timerstämpel så cooldown räknar från
      // nu; liten satisfaction-bump — se CHECKBACK_SATISFACTION_BUMP.
      guest.lastCheckbackAt = now;
      guest.satisfaction = Math.min(1, guest.satisfaction + CHECKBACK_SATISFACTION_BUMP);
      break;
    }
    case 'clear': {
      // Free the seat by removing the guest from seatedIds if still there.
      state.seatedIds = state.seatedIds.filter((id) => id !== guest.id);
      break;
    }
    default:
      break;
  }
}
