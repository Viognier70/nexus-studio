// ORDER 048 §2.1 + ORDER 052 §9 step 1 (2026-08-10) — the plain
// service report, cause-aware.
//
// Vision Owner (2026-08-10): "A butter knife was missing — what does
// that mean? It is the consequence of having taken on cheaper staff,
// or staff who do not care." A line that reports a symptom without
// its cause is not worth the space it takes.
//
// ORDER 052 §4: rewrite the banks so lines arising from a traceable
// condition NAME the condition. Ambient texture stays ambient; any
// line that is a consequence must say what of. Plain register per
// §48.2 preserved — short clauses, no interpretation, no observer
// voice during service.
//
// Bank shape: per event kind, a nested record keyed by cause with an
// `ambient` fallback array. The runtime picker (eventStream.ts)
// detects the dominant cause from state and picks from the matching
// sub-bank; if the cause has no variants for the kind, or no cause
// dominates, it falls through to `ambient`.
//
// **Cause priority order** (first match wins; Vision Owner-approved
// 2026-08-10; ingredient-tier promoted above morale so the most
// specific condition names the line — a tough lamb portion is grund
// tier before it is a tired team):
//
//   scale_down > morning_change > short_prep > thin_team
//     > low_competence > ingredient_tier_grund > poor_morale > ambient
//
// Language: English (game text per CLAUDE.md rule 7). Filename
// locale-free: renamed from serviceReport.sv.ts 2026-08-10.

// -------- cause taxonomy ------------------------------------------------

export type CauseKey =
  | 'scale_down'
  | 'morning_change'
  | 'short_prep'
  | 'thin_team'
  | 'low_competence'
  | 'ingredient_tier_grund'
  | 'poor_morale'
  | 'ambient';

export const CAUSE_PRIORITY: readonly CauseKey[] = [
  'scale_down',
  'morning_change',
  'short_prep',
  'thin_team',
  'low_competence',
  'ingredient_tier_grund',
  'poor_morale',
  'ambient'
];

// A cause bank per event kind. Every kind must supply `ambient` as a
// fallback. Sub-cause keys are optional — a kind that has no natural
// scale-down manifestation simply omits the key and the picker falls
// through.
export type CauseBank = {
  readonly [K in Exclude<CauseKey, 'ambient'>]?: readonly string[];
} & { readonly ambient: readonly string[] };

// -------- ambient banks (during service) -------------------------------

export const SERVICE_REPORT_AMBIENT = {
  // Ignorance — scientific (kitchen technique)
  kitchen_slip: {
    scale_down: [
      "The dessert went out plain — the shortened menu leaves the finish without its garnish."
    ],
    morning_change: [
      "The wine reduction went out unstrained — prep ran short after the morning menu change.",
      "The plating sequence broke on the new dish — the change hit at 8am and the kitchen hasn't drilled it yet."
    ],
    short_prep: [
      "A sauce went out uncalibrated — the tempering step was cut when prep ran long on the mise.",
      "A garnish improvised at the pass — the prep run didn't reach the herb station."
    ],
    thin_team: [
      "One cook missed the sear window on table 4 — two stations and one pair of hands.",
      "A plate went out unchecked at the pass — the second look is a person the kitchen doesn't have tonight."
    ],
    low_competence: [
      "The sauce split on table 4 — the kitchen tempered too warm, junior at the pass.",
      "A wallenberg went to table 3 visibly raw — a second look would have caught it.",
      "The dessert cheese was past — the pass didn't check ripeness before the plate went out."
    ],
    ingredient_tier_grund: [
      "Two lamb portions came off tough — grund tier lamb this month isn't cut consistently.",
      "The fish came off uneven — grund tier's sizing is a lottery station to station."
    ],
    poor_morale: [
      "A wallenberg went to table 3 visibly raw — the team is dragging and no one caught it on the second look.",
      "A plate went out with the wrong garnish — heads are down; the check at the pass was cursory."
    ],
    ambient: [
      "An allergy note was missed at plate-up.",
      "The dessert cheese went out past its edge.",
      "A single plate went out to the wrong table."
    ]
  },

  // Ignorance — cultural (hospitality, pairing)
  service_slip: {
    scale_down: [
      "A pairing suggestion missed — the thinned wine list left the waiter without the bottle he'd have offered."
    ],
    morning_change: [
      "The dessert alternative wasn't offered — the menu was rewritten at 8am and the floor is still catching up.",
      "A guest asked about the new dish and the waiter hesitated — the morning briefing didn't reach him."
    ],
    short_prep: [
      "A butter knife missed three settings — the setup was cut short when prep ran long elsewhere."
    ],
    thin_team: [
      "A butter knife missed three settings — a floor of two couldn't set the whole room in the prep window.",
      "The wine went to the wrong guest — the waiter reads by whoever is nearest when he's stretched thin.",
      "An allergy noted in the booking went unset at the table — three passes short a person."
    ],
    low_competence: [
      "A wine was poured to the wrong guest — the waiter reads the table by age, not the booking.",
      "A regular was greeted with the wrong name — front-of-house doesn't yet know the room.",
      "Coffee went out before the digestif at table 6 — the sequence isn't learned yet."
    ],
    poor_morale: [
      "A regular walked in and the greeting was flat — the front-of-house is drained.",
      "The dish presentation was skipped at table 4 — the waiter set the plate and moved on."
    ],
    ambient: [
      "A vegetarian was offered a meat dish first.",
      "The welcome drink didn't reach a waiting party.",
      "A digestif went out before the coffee cleared."
    ]
  },

  // Ignorance — cultural (supplier / ecological sourcing)
  delivery_short: {
    thin_team: [
      "The delivery truck came and went with no one checking the load — the kitchen was single-handed.",
      "The invoice sat unread on the counter — receiving is a job no one had time for."
    ],
    ingredient_tier_grund: [
      "The greens came in wilted — grund tier's supplier doesn't cold-chain the leafy stuff.",
      "The fish went into the walk-in looking grey — grund tier means yesterday's catch as today's price."
    ],
    poor_morale: [
      "The cream sat fifteen minutes on the loading bay before someone moved it — attention was elsewhere all morning.",
      "The invoice was short a kilo on salmon and no one called back — the day started tired."
    ],
    ambient: [
      "The delivery was short a kilo on salmon and no one called back.",
      "The venison came with the wrong label.",
      "The lemon carton was half full.",
      "The fish arrived without an ice pack."
    ]
  },

  // Strain — kitchen bottleneck
  bottleneck: {
    scale_down: [
      "The dessert went out without its finish — the shortened menu leaves no fallback when the pass stacks."
    ],
    morning_change: [
      "The kitchen ran a beat behind on every ticket — the menu changed at 8am and the timings weren't rewritten.",
      "The new dish held two extra minutes at the pass — the timing sheet was never redrawn."
    ],
    short_prep: [
      "The sauce station is catching up at the pass — the reduction that should have been ready this morning is being made now.",
      "A garnish was improvised mid-service — the prep bowl was empty at first ticket."
    ],
    thin_team: [
      "Pass 3 stacked four plates under the lamp — one cook can't cover both stations at fifteen covers.",
      "The ticket queue is at six — a full brigade is a person short tonight.",
      "The dish went out plain — the pastry hand is on the sauce line and the finish got skipped."
    ],
    low_competence: [
      "Four tickets held at the pass — the junior can't fire and finish at the same pace.",
      "The timings drifted across three orders — the pass reader isn't calling ahead yet."
    ],
    poor_morale: [
      "The pace at the pass is off — the second wrong-order call in ten minutes.",
      "The kitchen is running a beat behind — the shift started tired."
    ],
    ambient: [
      "A main went out before the starter.",
      "The dishwasher is behind — clean plates are short at the pass.",
      "Three plates stack under the lamp waiting for a runner."
    ]
  },

  // Strain — service coverage
  wait_stretched: {
    scale_down: [
      "The dinner covers are stretched thin over one waiter — lunch was closed and the floor is short-planned."
    ],
    thin_team: [
      "Table 6 waited eight minutes for the check — two on the floor and one on a call at the bar.",
      "A raised hand at the bar was missed — no one was in the room's line of sight.",
      "A wine order was forgotten in the turn — the waiter took it and had to double back after two tables."
    ],
    low_competence: [
      "A raised hand at the bar got missed twice — the floor doesn't scan the room yet.",
      "Two tables signalled at once and the closer one won by ten seconds — no read of relative wait.",
      "The runner walked past a waving hand — head down on the ticket."
    ],
    poor_morale: [
      "The runner walked past table 9 without stopping — heads are down after yesterday's long service.",
      "A water refill was forgotten twice on the same table — the shift is dragging."
    ],
    ambient: [
      "A water top-up was missed on table 3.",
      "Two tables raised hands within seconds of each other.",
      "The bar hand was slow to acknowledge a new arrival."
    ]
  },

  // Both — house-standard slippage under load
  turnover_stumble: {
    thin_team: [
      "The reset on table 2 took twelve minutes — the host cleared it alone while the floor was in service.",
      "The next party stood at the door two minutes longer than they should have — no one had a hand free."
    ],
    low_competence: [
      "The cutlery went down on the wrong side after a reset — the newer hand is copying by memory, not by pattern.",
      "A table light wasn't relit after the reset — no one checked the room before seating."
    ],
    poor_morale: [
      "The napkin fold went slack on the reset — attention slipped after two long days.",
      "A water glass from the previous party was left on the table — the reset was rushed and eyes were down."
    ],
    ambient: [
      "A booking card ended up on the wrong table.",
      "A salad garnish was mixed up between two tables.",
      "A place setting shifted a centimetre in the turn."
    ]
  }
} as const satisfies Record<string, CauseBank>;

export type ServiceReportAmbientKind = keyof typeof SERVICE_REPORT_AMBIENT;

// -------- prep banks (still plain, still short-clause) -----------------

export const SERVICE_REPORT_PREP = {
  prep_kitchen: {
    short_prep: [
      "The pass sheet ran out of time — half the menu has no timings written.",
      "The reduction went into the pot with the stock unsettled — the ten-minute prep window closed too early."
    ],
    morning_change: [
      "The station is laid out for yesterday's menu — the change wasn't propagated in the morning brief.",
      "The recipe printout at the sauce station is stale — the change at 8am never reached the wall."
    ],
    low_competence: [
      "Mise en place started ten minutes late — no one took the lead when the kitchen came in.",
      "The spice rack was empty at first plate — the fill-up in the morning was skipped."
    ],
    thin_team: [
      "The prep window closed with the sauce station half laid — one cook doing two.",
      "The pass sheet is only half-written — the head hand was on the line, not the board."
    ],
    ambient: [
      "A sauce from yesterday sat in the freezer un-tasted.",
      "The label on the plastic wrap ran out — dates are guesswork tonight.",
      "A garnish tray isn't cut and the first ticket is coming."
    ]
  },
  prep_room: {
    short_prep: [
      "The bar wasn't swept before opening — the setup ran long on the tables.",
      "The wine list went to the floor with two prices still old — the change hit at 8am and no one crosschecked before opening."
    ],
    morning_change: [
      "The new prices weren't crosschecked before opening — the change hit at 8am.",
      "The menu boards were half-updated — one wall still has yesterday's fish."
    ],
    thin_team: [
      "One host is doing sweep and setup and briefing — the room won't all be right at open.",
      "Two tables were half-set at open — the host had to prioritise the booking sheet over the linen."
    ],
    ambient: [
      "The light over the bar wasn't switched on until first customer.",
      "Two chairs sat askew from yesterday — no one straightened them.",
      "The bookings sheet stayed at the host station — the floor didn't read it before service."
    ]
  },
  prep_delivery: {
    short_prep: [
      "The cold chain paused fifteen minutes during sort — the prep window was too tight to work clean.",
      "A box was opened out of order — the sort ran short and it will surface later."
    ],
    ingredient_tier_grund: [
      "The delivery was accepted without weighing — grund tier's tolerances aren't worth the extra step, but they should be.",
      "The portioning went by eye rather than by scale — grund tier variance passed through unnoticed."
    ],
    thin_team: [
      "The cream came in and went straight to the shelf without a temp check — one pair of hands doing sort and prep.",
      "A carton got mislabelled in the rush — the shorthanded receive won't catch it until service."
    ],
    ambient: [
      "The invoice sits unsigned on the counter.",
      "The supplier sent one item short and one duplicated.",
      "The vegetable crates blocked the dish return path."
    ]
  }
} as const satisfies Record<string, CauseBank>;

export type ServiceReportPrepKind = keyof typeof SERVICE_REPORT_PREP;

// -------- prep-positive (flat, no cause — a good thing needs no reason)

export const SERVICE_REPORT_PREP_POSITIVE = {
  prep_kitchen: [
    "Mise en place was clean twenty minutes before open.",
    "The reduction stood finished and strained in its pot.",
    "The pass sheet was written with the whole menu and timings.",
    "A leftover sauce was tasted and cast off without hesitation.",
    "The kitchen went through the day's menu together before first plate."
  ],
  prep_room: [
    "Every table was set clean ten minutes before open.",
    "The lights on the bar and above the tables came on together on cue.",
    "The wine list was current and both waiters had read it.",
    "The entrance floor was mopped and dry by open.",
    "The bookings brief was given to all three stations."
  ],
  prep_delivery: [
    "The cold chain held from truck to walk-in.",
    "The boxes were sorted in the right order — nothing had to be lifted twice.",
    "Invoices were signed and filed the same minute they came in.",
    "The delivery matched the order exactly.",
    "The fish was weighed at arrival and portioned before service."
  ]
} as const;

// -------- positives during service (flat, plain, tight) ----------------
//
// Vision Owner (2026-08-10): "Strama åt. All text under service är
// plain. Att de positiva stunderna blir torrare är rätt — en bra
// sak som händer förtjänar inte mer röst än en dålig." The observer
// stays in the evening. Here the room reports itself.

export const SERVICE_REPORT_POSITIVE = [
  "The table by the window ordered a second bottle.",
  "A regular was greeted at the door by name.",
  "The kitchen adjusted a sauce mid-pass without being asked.",
  "A table asked to stay on for coffee.",
  "The front-of-house saw the second bottle coming before the table asked.",
  "A wallenberg came out clean and the table said so.",
  "A tip of two extra notes was left on the check.",
  "A table booked again on the way out."
] as const;

// -------- prep-carryover (plain, one line) ------------------------------
//
// Fires mid-service when the prep window closed with too many
// ignorance events. Names the fact and the consequence; no lament.

export const SERVICE_REPORT_PREP_CARRYOVER =
  "The unstrained sauce from prep hits at pass 7 — the kitchen skips it and the dish goes out plain.";
