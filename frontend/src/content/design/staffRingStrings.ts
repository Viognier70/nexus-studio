// staffRingStrings.ts — etiketten över ringen: roll och uppgift. 23 nycklar, { sv, en }.
// Slås in i STRINGS i nexusStrings.ts.

export const STAFF_RING_STRINGS = {
  "ring.role.host": { sv: "Hovmästare", en: "Maître d'" },
  "ring.role.waiter": { sv: "Servitör", en: "Waiter" },
  "ring.role.sommelier": { sv: "Sommelier", en: "Sommelier" },
  "ring.role.bartender": { sv: "Bartender", en: "Bartender" },
  "ring.role.cook": { sv: "Kock", en: "Chef" },
  "ring.role.dishwasher": { sv: "Diskare", en: "Kitchen porter" },
  "ring.role.dj": { sv: "DJ", en: "DJ" },
  "ring.task.idle": { sv: "Ledig", en: "Free" },
  "ring.task.walk": { sv: "På väg", en: "On the way" },
  "ring.task.order": { sv: "Tar beställningen", en: "Taking the order" },
  "ring.task.carry": { sv: "Bär ut", en: "Carrying out" },
  "ring.task.serve": { sv: "Serverar", en: "Serving" },
  "ring.task.clear": { sv: "Dukar av", en: "Clearing" },
  "ring.task.bill": { sv: "Lämnar notan", en: "Bringing the bill" },
  "ring.task.wine": { sv: "Serverar vinet", en: "Serving the wine" },
  "ring.task.pour": { sv: "Häller upp", en: "Pouring" },
  "ring.task.cook": { sv: "Lagar mat", en: "Cooking" },
  "ring.task.plate": { sv: "Lägger upp", en: "Plating" },
  "ring.task.wash": { sv: "Diskar", en: "Washing up" },
  "ring.task.pickUp": { sv: "Hämtar i passet", en: "Collecting at the pass" },
  "ring.task.setDown": { sv: "Ställer ned", en: "Putting down" },
  "ring.task.dodge": { sv: "Väjer", en: "Stepping aside" },
  "ring.chip": { sv: "{role} · {task}", en: "{role} · {task}" },
} as const;
