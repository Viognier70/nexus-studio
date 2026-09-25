// src/strategic/ui/RoomCardPanel/guestPatterns.ts
function selectGuestPattern(input) {
  switch (input.task) {
    case "arriving":
      return "WALK";
    case "waiting":
      if (input.inState >= WAIT_HAIL_SEC) return "HAIL";
      if (input.inState >= WAIT_IMPATIENT_SEC) return "IMPATIENT";
      return "IDLE";
    case "seated":
      if (input.hadWelcomeDrink) return "IDLE";
      return "SIT DOWN";
    case "ordering":
      if (input.inState >= WAIT_HAIL_SEC) return "HAIL";
      if (input.inState >= WAIT_IMPATIENT_SEC) return "IMPATIENT";
      return "READ MENU";
    case "dining":
      return "EAT";
    case "paying":
      return "IDLE";
    case "leaving":
      return "EXIT";
    case "declined":
      return "EXIT";
    case "sleeping":
    case "eating":
    case "serving":
      return "IDLE";
  }
}
function patternForGuest(guest, simTime) {
  return selectGuestPattern({
    task: guest.state,
    patience: deriveGuestPatience(guest, simTime),
    simTime,
    inState: Math.max(0, simTime - guest.stateTime),
    walkAwayOnArrival: guest.walkAwayOnArrival,
    hadWelcomeDrink: guest.hadWelcomeDrink
  });
}
function deriveGuestPatience(guest, simTime) {
  const inState = Math.max(0, simTime - guest.stateTime);
  switch (guest.state) {
    case "waiting":
    case "ordering": {
      if (inState <= WAIT_IMPATIENT_SEC) return 0;
      if (inState >= WAIT_HAIL_SEC) return 1;
      const span = WAIT_HAIL_SEC - WAIT_IMPATIENT_SEC;
      return (inState - WAIT_IMPATIENT_SEC) / span;
    }
    case "dining":
    case "paying":
      return Math.max(0, Math.min(1, 1 - guest.satisfaction));
    case "declined":
    case "leaving":
      return guest.walkAwayOnArrival ? 1 : 0;
    case "arriving":
    case "seated":
    case "sleeping":
    case "eating":
    case "serving":
      return 0;
  }
}

// src/strategic/ui/RoomCardPanel/deriveActions.ts
function derivePhase(day, simTime) {
  const p = day.period;
  if (p === "morning") return "morning";
  if (p === "afternoon") return "afternoon";
  if (p === "evening") return "evening";
  if (day.openingEndsAt !== null && simTime < day.openingEndsAt) return "opening";
  if (day.prepEndsAt !== null && simTime < day.prepEndsAt) return "prep";
  return "service";
}
function seatLabel(seatIndex) {
  return seatIndex === null ? "the door" : `seat ${seatIndex + 1}`;
}
var PREP_ITEM_FOR_ROLE = {
  kock: "stations",
  servit\u00F6r: "cutlery",
  v\u00E4rd: "napkins",
  l\u00E4rling: "garnish"
};
function weakestPrepItem(readiness) {
  const keys = Object.keys(readiness);
  if (keys.length === 0) return null;
  let min = Infinity, best = null;
  for (const k of keys) {
    if (readiness[k] < min) {
      min = readiness[k];
      best = k;
    }
  }
  return best;
}
function guestForTarget(staff, guests) {
  if (staff.targetGuestId === null) return null;
  return guests.find((g) => g.id === staff.targetGuestId) ?? null;
}
function dishName(_menu) {
  return "plate";
}
function deriveStaffAction(staff, guests, day, simTime, menu) {
  const phase = derivePhase(day, simTime);
  if (phase === "morning" || phase === "opening") {
    return { text: "Preparing today's plan", iconKey: "plan" };
  }
  if (phase === "prep" && staff.taskType === null) {
    return { text: "On break", iconKey: "pause" };
  }
  if (phase === "prep") {
    const weakest = weakestPrepItem(day.prepReadiness);
    if (weakest !== null && day.prepReadiness[weakest] < 0.5) {
      return { text: `Chasing ${weakest}`, iconKey: "chase" };
    }
    return {
      text: `Mise en place \u2014 ${PREP_ITEM_FOR_ROLE[staff.role]}`,
      iconKey: "prep"
    };
  }
  const target = guestForTarget(staff, guests);
  const targetLabel = target === null ? "a guest" : seatLabel(target.seatIndex);
  switch (staff.taskType) {
    case "greet":
      return { text: `Greeting ${targetLabel}`, iconKey: "hail-response" };
    case "seat":
      return { text: `Seating ${targetLabel}`, iconKey: "seat" };
    case "order":
      return { text: `Taking order at ${targetLabel}`, iconKey: "order" };
    case "welcomeDrink":
      return { text: `Pouring welcome drink for ${targetLabel}`, iconKey: "drink" };
    case "serve":
      return { text: `Serving ${dishName(menu)} to ${targetLabel}`, iconKey: "serve" };
    case "decant":
      return { text: `Decanting for ${targetLabel}`, iconKey: "decant" };
    case "flambe":
      return { text: `Flamb\xE9ing at ${targetLabel}`, iconKey: "flambe" };
    case "clear":
      return { text: `Clearing ${targetLabel}`, iconKey: "clear" };
    case null:
      break;
  }
  if (phase === "service" && day.serviceRhythm === "red") {
    return { text: "Standing by \u2014 room chasing itself", iconKey: "standby-strain" };
  }
  if (phase === "service") {
    return { text: "Standing by", iconKey: "standby" };
  }
  return { text: "Closing down", iconKey: "close" };
}
var WAIT_IMPATIENT_SEC = 30;
var WAIT_HAIL_SEC = 60;
function formatWait(sec) {
  if (sec < 90) return `${Math.round(sec)} s`;
  return `${Math.round(sec / 60)} m`;
}
function deriveGuestAction(guest, simTime, menu) {
  const inState = Math.max(0, simTime - guest.stateTime);
  const pattern = patternForGuest(guest, simTime);
  switch (pattern) {
    case "WALK":
      return { text: "Arriving", iconKey: "arriving" };
    case "HAIL":
      return { text: "Trying to catch someone's eye", iconKey: "hail" };
    case "IMPATIENT":
      if (guest.state === "waiting") {
        return { text: `Waiting \u2014 ${formatWait(inState)}`, iconKey: "waiting-impatient" };
      }
      return { text: "Ready to order", iconKey: "ready-to-order" };
    case "IDLE":
      if (guest.state === "waiting") {
        return { text: "Waiting to be seated", iconKey: "waiting" };
      }
      if (guest.state === "seated" && guest.hadWelcomeDrink) {
        return { text: "Sipping welcome drink", iconKey: "drink" };
      }
      if (guest.state === "paying") {
        if (guest.satisfaction >= 0.7) {
          return { text: "Paying \u2014 happy", iconKey: "pay-good" };
        }
        return { text: "Paying \u2014 quietly", iconKey: "pay-neutral" };
      }
      return { text: "At the table", iconKey: "waiting" };
    case "SIT DOWN":
      return { text: "Just seated", iconKey: "seated" };
    case "READ MENU":
      return { text: "Reading the menu", iconKey: "read-menu" };
    case "EAT":
      if (guest.satisfaction >= 0.7) {
        return { text: `Enjoying the ${dishName(menu)}`, iconKey: "eat-good" };
      }
      return { text: "Eating quietly", iconKey: "eat-neutral" };
    case "EXIT":
      if (guest.walkAwayOnArrival && guest.state === "leaving") {
        return { text: "Turned away at the door", iconKey: "walk-away" };
      }
      if (guest.state === "declined") {
        return { text: "Left before being seated", iconKey: "declined" };
      }
      return { text: "Leaving", iconKey: "exit" };
  }
}
function guestAttentionPriority(guest, simTime) {
  const inState = Math.max(0, simTime - guest.stateTime);
  if (guest.state === "waiting" && inState >= WAIT_HAIL_SEC) return 100;
  if (guest.state === "ordering" && inState >= WAIT_IMPATIENT_SEC) return 95;
  if (guest.state === "waiting" && inState >= WAIT_IMPATIENT_SEC) return 90;
  if (guest.state === "dining" && guest.satisfaction < 0.3) return 85;
  if (guest.state === "paying") return 60;
  if (guest.state === "ordering") return 55;
  if (guest.state === "dining" && guest.satisfaction < 0.7) return 50;
  if (guest.state === "waiting") return 45;
  if (guest.state === "seated") return 30;
  if (guest.state === "arriving") return 20;
  return 5;
}
function staffAttentionPriority(staff, day, simTime) {
  const phase = derivePhase(day, simTime);
  if (phase === "service") {
    if (day.serviceRhythm === "red" && staff.workload >= 0.7) return 92;
    if (staff.workload >= 0.85) return 88;
    if (staff.taskType !== null) return 70;
    return 40;
  }
  if (phase === "prep") return 60;
  if (phase === "opening") return 50;
  return 30;
}
export {
  WAIT_HAIL_SEC,
  WAIT_IMPATIENT_SEC,
  deriveGuestAction,
  derivePhase,
  deriveStaffAction,
  guestAttentionPriority,
  staffAttentionPriority
};
