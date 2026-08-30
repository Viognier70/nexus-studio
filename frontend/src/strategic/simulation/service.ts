import { INTERIOR } from '../content/layout';
import { businessHasOvernight, businessHasSeats } from '../business/businessClass';
import type { Guest, SimulationState, StaffMember, TaskType, Vec2 } from '../types';
import { taskDurationTicks } from './economics';
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
// policies.hasUteplats är sann OCH businessClass === 'foodtruck'.
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

export function isSeatedCapacity(state: SimulationState): number {
  return state.policies.capacity;
}

export function seatSlot(_state: SimulationState, index: number): Vec2 {
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
  forScenarioGuest = false
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
  for (const seat of SEATS_DEFAULT) {
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
        const seat = findFreeSeat(state, guest.scenarioSource);
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
      const seat = findFreeSeat(state, guest.scenarioSource);
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
      if (state.businessClass === 'foodtruck' && state.policies.hasUteplats === true) {
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
    return g && ['seated', 'ordering', 'dining', 'paying'].includes(g.state);
  });
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

// ORDER 137 §2.3 — bakgrundsarbete per verksamhet. Foodtruck och
// ölkrogen står tomma: ORDER 134 visade att foodtruck är trogen på
// 32 % mittmassa (bg-arbete skulle bara döda det), och ordern lämnar
// ölkrogens bryggeri-arbete som egen order. Restaurant och värdshus
// får alla fyra typerna — det är där mittmassan i ORDER 134 var
// 8-9 % som ska stiga.
const BACKGROUND_TASKS_BY_BUSINESS: Record<string, readonly TaskType[]> = {
  restaurant: ['misEnPlace', 'dish', 'restock', 'clean'],
  värdshus:   ['misEnPlace', 'dish', 'restock', 'clean'],
  foodtruck:  [],
  ölkrogen:   []
};

function anyDirectTaskAvailable(state: SimulationState): boolean {
  for (const type of PRIORITY) {
    if (findTaskTarget(state, type)) return true;
  }
  return false;
}

// Roterar bakgrundstyper deterministiskt per personal + simtid så att
// alla fyra uppgifter förekommer under en service — mise en place följs
// av disk följs av påfyllning följs av städning, i namngivna svängar
// snarare än en anonym fill-loop.
function pickBackgroundTaskFor(state: SimulationState, staff: StaffMember): TaskType | null {
  const list = BACKGROUND_TASKS_BY_BUSINESS[state.businessClass];
  if (!list || list.length === 0) return null;
  // Deterministisk rotation: staff-id-hash + simTime som fönster ger
  // att en och samma personal cyklar genom alla typer under ett pass,
  // inte fastnar på "clean, clean, clean".
  let h = 0;
  for (let i = 0; i < staff.id.length; i++) h = (h * 31 + staff.id.charCodeAt(i)) | 0;
  const window = Math.floor(state.simTime / 20) + h;
  return list[Math.abs(window) % list.length];
}

function beginBackgroundTask(state: SimulationState, staff: StaffMember, type: TaskType) {
  staff.taskType = type;
  staff.taskProgress = 0;
  staff.taskDuration = taskDurationTicks(
    state.policies,
    type,
    state.capitals.values.social
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

export function tickStaff(state: SimulationState) {
  const now = state.simTime;
  // ORDER 137 §2.2 — bakgrundsarbete-preemption. Beräkna EN gång per
  // tick om det finns någon direkt uppgift att ta. Om ja, ska pågående
  // bakgrundsuppgifter avbrytas — en väntande gäst får aldrig blockeras
  // av att personalen städar. `anyDirectTaskAvailable` iterar PRIORITY
  // och returnerar första hit; findTaskTarget är gäst-drivet så det
  // är rimligt billigt.
  const directAvailable = state.staff.some((s) => isBackgroundTask(s.taskType))
    ? anyDirectTaskAvailable(state)
    : false;

  for (const staff of state.staff) {
    stepEntityMotion(staff);

    if (staff.taskType) {
      // Preempt: om personal är i en bakgrundsuppgift och direkt
      // uppgift finns, avbryt så nästa steg i loopen väljer den direkta.
      if (isBackgroundTask(staff.taskType) && directAvailable) {
        completeStaffTask(state, staff);
        // Fall genom till task-selection nedan.
      } else {
        staff.taskProgress += 1;
        if (staff.taskProgress >= staff.taskDuration) {
          completeStaffTask(state, staff);
        }
        continue;
      }
    }

    // Look for the next task.
    for (const type of PRIORITY) {
      const targetGuestId = findTaskTarget(state, type);
      if (targetGuestId) {
        beginStaffTask(state, staff, type, targetGuestId);
        break;
      }
    }

    // ORDER 137 — inga direkta uppgifter tillgängliga, prova bakgrunds-
    // arbete. Verksamheter utan bakgrundslista (foodtruck, ölkrogen)
    // returnerar null och personalen driver hem som förut.
    if (!staff.taskType) {
      const bg = pickBackgroundTaskFor(state, staff);
      if (bg) beginBackgroundTask(state, staff, bg);
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

    // Workload decays when idle (ingen taskType alls) eller styrs mot
    // bg-target när bakgrundsuppgift pågår. Direkta uppgifter hanteras
    // i separat loop nedan så grow-rate 0,05/s bevaras oförändrad.
    if (!staff.taskType) {
      staff.workload = Math.max(0, staff.workload - 0.03 * TICK_SECONDS);
    } else if (isBackgroundTask(staff.taskType)) {
      // ORDER 137 §2 — bakgrundsarbete målsöker en steady-state
      // (~0,4) i stället för att växa mot 1. Motivet är modell-trohet,
      // inte tröskeljustering (§3 förbjuder ansiktsbanden 0,95/0,7,
      // inte rate per task-typ): att städa eller fylla på flaskor
      // ger inte samma push som en väntande gäst — arbetet håller
      // personalen aktiv men inte pressad. Approach 0,5/s betyder att
      // en pinnad workload (efter en direktuppgift) svalnar mot 0,4
      // på ~2 sim-sekunder när bg-uppgift börjar. Under en bg-uppgift
      // som varar 1-2 s nås därför ungefär mittspannet 0,3-0,5, vilket
      // ORDER 131:s histogram var tomt på.
      const BG_TARGET = 0.4;
      const BG_APPROACH_PER_SEC = 0.5;
      const delta = (BG_TARGET - staff.workload) * BG_APPROACH_PER_SEC * TICK_SECONDS;
      staff.workload = Math.max(0, Math.min(1, staff.workload + delta));
    }
    // Direct-task-grow hanteras i sista loopen nedan (oförändrat).
  }

  // Recompute an average workload signal — direkta uppgifter växer
  // med oförändrad rate 0,05/s (§3 förbud mot tröskeljustering respekteras).
  for (const staff of state.staff) {
    if (staff.taskType && !isBackgroundTask(staff.taskType)) {
      staff.workload = Math.min(1, staff.workload + 0.05 * TICK_SECONDS);
    }
  }
  void now;
}

function findTaskTarget(state: SimulationState, type: TaskType): string | null {
  switch (type) {
    case 'greet':
    case 'seat': {
      // ORDER 113 fel 1 — foodtruck servar front-of-queue (FIFO).
      // Utan denna gren skulle findTaskTarget bara leta efter arriving-
      // gäster; foodtruck-gäster som redan pushats till waitingIds
      // (via arriving-tick → findFreeSeat=null → else-branchen) skulle
      // aldrig plockas upp. state.waitingIds[0] är front-of-queue —
      // completeStaffTask('greet'/'seat') foodtruck-branchen filtrerar
      // sedan bort den från waitingIds och sätter state='ordering'.
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
  staff.taskDuration = taskDurationTicks(
    state.policies,
    type,
    state.capitals.values.social
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

  if (!guest) return;

  const now = state.simTime;
  switch (type) {
    case 'greet':
    case 'seat': {
      // A guest sitting in the waiting queue is served here too.
      if (guest.state === 'arriving' || guest.state === 'waiting') {
        // ORDER 110 — R4: food truck saknar matsal. Hoppa över
        // findFreeSeat och sittandet; gästen övergår direkt till
        // ordering (vid luckan) och plockas ur waiting-listan.
        // Guarden speglar den i setGuestSeated ovan så flaggan
        // `hasSeats: false` håller i båda write-sites (DoD 6).
        if (!businessHasSeats(state.businessClass)) {
          state.waitingIds = state.waitingIds.filter((id) => id !== guest.id);
          guest.state = 'ordering';
          guest.seatIndex = null;
          guest.stateTime = now;
          break;
        }
        const seat = findFreeSeat(state, guest.scenarioSource);
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
