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
// Language: Swedish (spelartext per CLAUDE.md regel 7; översatt när
// Vision Owner ville ha "inga engelska paneler"). Filename
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
      "The dessert went out bare — the shortened menu leaves the finish without a garnish."
    ],
    morning_change: [
      "The wine reduction went out unstrained — the prep did not stretch after the morning's menu change.",
      "The plating fell apart on the new dish — the change came at eight and the kitchen has not practised it."
    ],
    short_prep: [
      "A sauce went out unadjusted — the tempering was cut when mise en place ran late.",
      "A garnish was improvised at the pass — the prep never reached the herb station."
    ],
    thin_team: [
      "A chef missed the sear for table 4 — two stations and one pair of hands.",
      "A plate left the pass unchecked — the second look is a person the kitchen is missing tonight."
    ],
    low_competence: [
      "The sauce split for table 4 — the kitchen tempered it too hot, and a junior was on the pass.",
      "A wallenbergare went out visibly raw to table 3 — a second look would have caught it.",
      "The dessert cheese was too ripe — the pass did not check the ripeness before the plate went out."
    ],
    ingredient_tier_grund: [
      "Two lamb portions were tough — the basic-range lamb is not evenly cut this month.",
      "The fish came out uneven — the sizes in the basic range are a lottery from station to station."
    ],
    poor_morale: [
      "A wallenbergare went out visibly raw to table 3 — the team is dragging and nobody caught it on a second look.",
      "A plate went out with the wrong garnish — everyone has their head down and the check at the pass was sloppy."
    ],
    ambient: [
      "An allergy note was missed at plating.",
      "The dessert cheese went out when it was already past its best.",
      "A plate went to the wrong table."
    ]
  },

  // Ignorance — cultural (hospitality, pairing)
  service_slip: {
    scale_down: [
      "A drinks suggestion fell away — the thinned wine list left the waiter without the bottle they would have suggested."
    ],
    morning_change: [
      "The dessert option was never offered — the menu was rewritten at eight and the dining room has not caught up.",
      "A guest asked about the new dish and the waiter hesitated — the morning briefing never reached them."
    ],
    short_prep: [
      "The butter knife was missing at three covers — the table setting was cut short when prep ran late elsewhere."
    ],
    thin_team: [
      "The butter knife was missing at three covers — two in the dining room could not set the whole room during prep.",
      "The wine ended up with the wrong guest — the waiter takes whoever is closest when the floor is too thinly staffed.",
      "An allergy in the booking never reached the table — three stations and one person short."
    ],
    low_competence: [
      "A wine was poured for the wrong guest — the waiter reads the table by age, not by the booking.",
      "A regular was greeted by the wrong name — the dining room does not yet know its guests.",
      "The coffee came before the digestif at table 6 — the order has not settled in yet."
    ],
    poor_morale: [
      "A regular came in and the welcome was flat — the floor staff are worn out.",
      "The dish was not presented at table 4 — the waiter put the plate down and moved on."
    ],
    ambient: [
      "A vegetarian was offered a meat dish first.",
      "The welcome drink never reached a waiting party.",
      "A digestif came out before the coffee was cleared."
    ]
  },

  // Ignorance — cultural (supplier / ecological sourcing)
  delivery_short: {
    thin_team: [
      "The delivery van came and went without anyone checking the load — the kitchen was staffed by one.",
      "The delivery note lay unread on the counter — nobody had time for goods-in."
    ],
    ingredient_tier_grund: [
      "The green salad arrived wilted — the basic-range supplier does not keep the cold chain for leafy greens.",
      "The fish went into the cold room with a grey tone — the basic range means yesterday's catch at today's price."
    ],
    poor_morale: [
      "The cream stood a quarter of an hour on the loading dock before anyone moved it — attention was elsewhere all morning.",
      "The delivery note was a kilo of salmon short and nobody rang back — the day started tired."
    ],
    ambient: [
      "The delivery was a kilo of salmon short and nobody rang back.",
      "The venison came with the wrong label.",
      "The box of lemons was half full.",
      "The fish came without an ice pack."
    ]
  },

  // Strain — kitchen bottleneck
  bottleneck: {
    scale_down: [
      "The dessert went out without its finish — the shortened menu leaves no slack when the pass backs up."
    ],
    morning_change: [
      "The kitchen was a beat behind on every ticket — the menu changed at eight and the timings were never rewritten.",
      "The new dish stood two extra minutes at the pass — the timing plan was never redrawn."
    ],
    short_prep: [
      "The sauce station is catching up at the pass — the reduction that should have been ready this morning is being made now.",
      "A garnish was improvised mid-service — the prep bowl was empty at the first ticket."
    ],
    thin_team: [
      "Four plates stacked up under the heat lamp at pass 3 — one chef cannot cover two stations at fifteen covers.",
      "Six tickets in the queue — the whole brigade is one person short tonight.",
      "The dish went out bare — the pastry chef is on the sauce and the finish was skipped."
    ],
    low_competence: [
      "Four tickets waited at the pass — the junior cannot start and finish at the same pace.",
      "The timings drifted apart across three orders — whoever reads the pass does not call ahead yet."
    ],
    poor_morale: [
      "The pace at the pass is off — the second wrong order in ten minutes.",
      "The kitchen is a beat behind — the shift started tired."
    ],
    ambient: [
      "A main course went out before the starter.",
      "The washing-up is behind — clean plates are short at the pass.",
      "Three plates stand under the heat lamp waiting for a runner."
    ]
  },

  // Strain — service coverage
  wait_stretched: {
    scale_down: [
      "Dinner's covers are spread over a single waiter — lunch was closed and the dining room is understaffed."
    ],
    thin_team: [
      "Table 6 waited eight minutes for the bill — two in the dining room and one stuck in a conversation at the bar.",
      "A raised hand at the bar was missed — nobody had the room in view.",
      "A wine order was forgotten on the turn — the waiter took it and had to go back after two tables."
    ],
    low_competence: [
      "A raised hand at the bar was missed twice — the dining room does not read the room yet.",
      "Two tables waved at once and the nearer one won by ten seconds — nobody judged who had waited longest.",
      "The runner walked past a waving hand — eyes on the ticket."
    ],
    poor_morale: [
      "The runner walked past table 9 without stopping — everyone has their head down after yesterday's long service.",
      "The water top-up was forgotten twice at the same table — the shift is dragging."
    ],
    ambient: [
      "The water was not topped up at table 3.",
      "Two tables raised a hand a few seconds apart.",
      "The bartender was slow to notice a newly arrived guest."
    ]
  },

  // Both — house-standard slippage under load
  turnover_stumble: {
    thin_team: [
      "Resetting table 2 took twelve minutes — the host cleared alone while the dining room was mid-service.",
      "The next party stood two minutes too long at the door — nobody had a hand free."
    ],
    low_competence: [
      "The cutlery ended up on the wrong side after the reset — the newer team member sets from memory, not from the pattern.",
      "The table candle was not relit after the reset — nobody looked over the room before the guests were seated."
    ],
    poor_morale: [
      "The napkin folding got sloppy on the reset — attention slipped after two long days.",
      "A water glass from the previous party was left on the table — the reset went too fast and eyes were down."
    ],
    ambient: [
      "A reservation card ended up on the wrong table.",
      "The salad garnish was mixed up between two tables.",
      "A cover was moved a centimetre on the turn."
    ]
  }
} as const satisfies Record<string, CauseBank>;

export type ServiceReportAmbientKind = keyof typeof SERVICE_REPORT_AMBIENT;

// -------- prep banks (still plain, still short-clause) -----------------

export const SERVICE_REPORT_PREP = {
  prep_kitchen: {
    short_prep: [
      "Time ran out for the pass list — half the menu has no timings.",
      "The reduction went into the pot before the stock had settled — the ten minutes of prep ran out too early."
    ],
    morning_change: [
      "The station is set up for yesterday's menu — the change never made it into the morning briefing.",
      "The recipe printout at the sauce station is old — the eight o'clock change never reached the wall."
    ],
    low_competence: [
      "Mise en place started ten minutes late — nobody took the lead when the kitchen came in.",
      "The spice shelf was empty at the first plate — this morning's restock was skipped."
    ],
    thin_team: [
      "Prep time ran out with the sauce station half done — one chef doing the work of two.",
      "The pass list is only half written — the head chef was at the stove, not at the board."
    ],
    ambient: [
      "A sauce from yesterday sat untasted in the freezer.",
      "The labels for the cling film ran out — the dates are guesses tonight.",
      "A garnish tray is not cut and the first ticket is on its way."
    ]
  },
  prep_room: {
    short_prep: [
      "The bar was not swept before opening — setting the tables ran late.",
      "The wine list went out to the dining room with two old prices — the change came at eight and nobody double-checked before opening."
    ],
    morning_change: [
      "The new prices were not double-checked before opening — the change came at eight.",
      "The menu boards were only half updated — one wall still has yesterday's fish."
    ],
    thin_team: [
      "One host sweeps, sets the tables and runs the briefing — the room is not quite ready for opening.",
      "Two tables were half set at opening — the host had to put the booking list before the linen."
    ],
    ambient: [
      "The lamp over the bar was not switched on until the first guest arrived.",
      "Two chairs had stood crooked since yesterday — nobody straightened them.",
      "The booking list was left at the host stand — the dining room did not read it before service."
    ]
  },
  prep_delivery: {
    short_prep: [
      "The cold chain broke for a quarter of an hour during sorting — prep time was too tight to work cleanly.",
      "A crate was opened in the wrong order — the sorting was not finished and it will show later."
    ],
    ingredient_tier_grund: [
      "The delivery was taken in without weighing — the basic range's tolerances do not feel worth the extra step, but they should.",
      "The portioning was done by eye instead of on the scale — the basic range's variation passed unnoticed."
    ],
    thin_team: [
      "The cream came in and went straight to the shelf without a temperature check — one pair of hands sorting and prepping.",
      "A box got the wrong label in the rush — the understaffed goods-in will not notice until service."
    ],
    ambient: [
      "The delivery note lies unsigned on the counter.",
      "The supplier sent one item short and one twice.",
      "The vegetable crates blocked the way to the dish station."
    ]
  }
} as const satisfies Record<string, CauseBank>;

export type ServiceReportPrepKind = keyof typeof SERVICE_REPORT_PREP;

// -------- prep-positive (flat, no cause — a good thing needs no reason)

export const SERVICE_REPORT_PREP_POSITIVE = {
  prep_kitchen: [
    "Mise en place was ready twenty minutes before opening.",
    "The reduction stood finished and strained in its pot.",
    "The pass list was written with the whole menu and all the timings.",
    "A leftover sauce was tasted and thrown out without hesitation.",
    "The kitchen went through the day's menu together before the first plate."
  ],
  prep_room: [
    "Every table was set ten minutes before opening.",
    "The lamps in the bar and over the tables came on together, on cue.",
    "The wine list was up to date and both waiters had read it.",
    "The floor by the entrance was mopped and dry for opening.",
    "The briefing on the bookings reached all three stations."
  ],
  prep_delivery: [
    "The cold chain held from the lorry to the cold room.",
    "The crates were sorted in the right order — nothing had to be lifted twice.",
    "The delivery notes were signed and filed the minute they arrived.",
    "The delivery matched the order exactly.",
    "The fish was weighed on arrival and portioned before service."
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
  "A regular was welcomed by name at the door.",
  "The kitchen adjusted a sauce at the pass without anyone asking.",
  "A table asked to stay on over coffee.",
  "The floor saw the second bottle coming before the table asked.",
  "A wallenbergare came out perfect and the table said so.",
  "Two extra notes were left as a tip on the bill.",
  "A table booked again on the way out."
] as const;

// -------- prep-carryover (plain, one line) ------------------------------
//
// Fires mid-service when the prep window closed with too many
// ignorance events. Names the fact and the consequence; no lament.

export const SERVICE_REPORT_PREP_CARRYOVER =
  "The unstrained sauce from prep hits at pass 7 — the kitchen skips it and the dish goes out bare.";
