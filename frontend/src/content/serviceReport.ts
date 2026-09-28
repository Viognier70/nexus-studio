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
      "Desserten gick ut naken — den kortade menyn lämnar avslutningen utan garnityr."
    ],
    morning_change: [
      "Vinreduktionen gick ut osilad — förberedelserna räckte inte efter morgonens menybyte.",
      "Uppläggningen föll isär på den nya rätten — bytet kom klockan åtta och köket har inte övat in den."
    ],
    short_prep: [
      "En sås gick ut ojusterad — temperingen ströks när mise en place drog ut på tiden.",
      "Ett garnityr improviserades på passet — förberedelserna hann aldrig till örtstationen."
    ],
    thin_team: [
      "En kock missade stekningen till bord 4 — två stationer och ett par händer.",
      "En tallrik gick ut okontrollerad från passet — den andra blicken är en person köket saknar i kväll."
    ],
    low_competence: [
      "Såsen skar sig till bord 4 — köket tempererade för varmt, och en junior stod på passet.",
      "En wallenbergare gick ut synbart rå till bord 3 — en andra blick hade fångat den.",
      "Dessertosten var för mogen — passet kollade inte mognaden innan tallriken gick ut."
    ],
    ingredient_tier_grund: [
      "Två lammportioner blev sega — lammet i grundsortimentet är inte jämnt styckat den här månaden.",
      "Fisken blev ojämn — storlekarna i grundsortimentet är ett lotteri från station till station."
    ],
    poor_morale: [
      "En wallenbergare gick ut synbart rå till bord 3 — laget släpar och ingen fångade den i andra blicken.",
      "En tallrik gick ut med fel garnityr — alla har huvudet nere och kontrollen på passet var slarvig."
    ],
    ambient: [
      "En allergianteckning missades vid uppläggningen.",
      "Dessertosten gick ut när den redan passerat sin bästa tid.",
      "En tallrik gick till fel bord."
    ]
  },

  // Ignorance — cultural (hospitality, pairing)
  service_slip: {
    scale_down: [
      "Ett dryckesförslag föll bort — den tunnade vinlistan lämnade servitören utan flaskan han skulle ha föreslagit."
    ],
    morning_change: [
      "Dessertalternativet erbjöds aldrig — menyn skrevs om klockan åtta och matsalen har inte hunnit ikapp.",
      "En gäst frågade om den nya rätten och servitören tvekade — morgonens genomgång nådde aldrig honom."
    ],
    short_prep: [
      "Smörkniven saknades vid tre kuvert — dukningen kortades när förberedelserna drog ut på annat håll."
    ],
    thin_team: [
      "Smörkniven saknades vid tre kuvert — två i matsalen hann inte duka hela salen under förberedelserna.",
      "Vinet hamnade hos fel gäst — servitören tar den som står närmast när han är för tunt bemannad.",
      "En allergi i bokningen kom aldrig fram till bordet — tre pass och en person för lite."
    ],
    low_competence: [
      "Ett vin hälldes upp åt fel gäst — servitören läser bordet efter ålder, inte efter bokningen.",
      "En stamgäst hälsades med fel namn — matsalen känner ännu inte sina gäster.",
      "Kaffet kom före digestifen vid bord 6 — ordningen sitter inte än."
    ],
    poor_morale: [
      "En stamgäst kom in och välkomnandet var platt — serveringen är sliten.",
      "Presentationen av rätten hoppades över vid bord 4 — servitören ställde ner tallriken och gick vidare."
    ],
    ambient: [
      "En vegetarian erbjöds en kötträtt först.",
      "Välkomstdrinken nådde aldrig ett väntande sällskap.",
      "En digestif kom ut innan kaffet var avdukat."
    ]
  },

  // Ignorance — cultural (supplier / ecological sourcing)
  delivery_short: {
    thin_team: [
      "Leveransbilen kom och åkte utan att någon kontrollerade lasten — köket var ensambemannat.",
      "Följesedeln låg oläst på bänken — varumottagningen var det ingen som hann med."
    ],
    ingredient_tier_grund: [
      "Grönsallaten kom vissen — grundsortimentets leverantör håller inte kylkedjan för bladgrönt.",
      "Fisken gick in i kylrummet med grå ton — grundsortimentet betyder gårdagens fångst till dagens pris."
    ],
    poor_morale: [
      "Grädden stod en kvart på lastkajen innan någon flyttade den — uppmärksamheten var någon annanstans hela morgonen.",
      "Följesedeln saknade ett kilo lax och ingen ringde tillbaka — dagen började trött."
    ],
    ambient: [
      "Leveransen saknade ett kilo lax och ingen ringde tillbaka.",
      "Hjortköttet kom med fel etikett.",
      "Citronkartongen var halvfull.",
      "Fisken kom utan kylklamp."
    ]
  },

  // Strain — kitchen bottleneck
  bottleneck: {
    scale_down: [
      "Desserten gick ut utan avslutning — den kortade menyn ger ingen reserv när det hopar sig på passet."
    ],
    morning_change: [
      "Köket låg ett slag efter på varje bong — menyn byttes klockan åtta och tiderna skrevs aldrig om.",
      "Den nya rätten stod två extra minuter på passet — tidsschemat ritades aldrig om."
    ],
    short_prep: [
      "Såsstationen jobbar ikapp på passet — reduktionen som skulle ha varit klar i morse görs nu.",
      "Ett garnityr improviserades mitt i servicen — förberedelseskålen var tom vid första bongen."
    ],
    thin_team: [
      "Fyra tallrikar staplades under värmelampan på pass 3 — en kock hinner inte två stationer vid femton kuvert.",
      "Sex bongar i kö — hela brigaden är en person kort i kväll.",
      "Rätten gick ut naken — konditorn står på såsen och avslutningen hoppades över."
    ],
    low_competence: [
      "Fyra bongar väntade på passet — juniorn hinner inte sätta igång och avsluta i samma takt.",
      "Tiderna gled isär över tre beställningar — den som läser passet ropar inte ut i förväg än."
    ],
    poor_morale: [
      "Tempot på passet är fel — andra felbeställningen på tio minuter.",
      "Köket ligger ett slag efter — passet började trött."
    ],
    ambient: [
      "En varmrätt gick ut före förrätten.",
      "Disken ligger efter — det är ont om rena tallrikar på passet.",
      "Tre tallrikar står under värmelampan och väntar på en springare."
    ]
  },

  // Strain — service coverage
  wait_stretched: {
    scale_down: [
      "Middagens kuvert är utspridda på en enda servitör — lunchen var stängd och matsalen är underbemannad."
    ],
    thin_team: [
      "Bord 6 väntade åtta minuter på notan — två i matsalen och en fast vid ett samtal i baren.",
      "En uppräckt hand i baren missades — ingen hade salen i blickfånget.",
      "En vinbeställning glömdes i vändan — servitören tog den och fick gå tillbaka efter två bord."
    ],
    low_competence: [
      "En uppräckt hand i baren missades två gånger — matsalen läser inte av rummet än.",
      "Två bord vinkade samtidigt och det närmaste vann med tio sekunder — ingen bedömde vem som väntat längst.",
      "Springaren gick förbi en vinkande hand — med blicken i bongen."
    ],
    poor_morale: [
      "Springaren gick förbi bord 9 utan att stanna — alla har huvudet nere efter gårdagens långa service.",
      "Vattenpåfyllningen glömdes två gånger vid samma bord — passet släpar."
    ],
    ambient: [
      "Vattnet fylldes inte på vid bord 3.",
      "Två bord räckte upp handen med några sekunders mellanrum.",
      "Bartendern var sen att uppmärksamma en nyanländ gäst."
    ]
  },

  // Both — house-standard slippage under load
  turnover_stumble: {
    thin_team: [
      "Omdukningen av bord 2 tog tolv minuter — värden dukade av ensam medan matsalen var mitt i servicen.",
      "Nästa sällskap stod två minuter för länge i dörren — ingen hade en hand ledig."
    ],
    low_competence: [
      "Besticken hamnade på fel sida efter omdukningen — den nyare i laget dukar efter minnet, inte efter mönstret.",
      "Bordsljuset tändes inte igen efter omdukningen — ingen såg över salen innan gästerna placerades."
    ],
    poor_morale: [
      "Servettvikningen blev slarvig vid omdukningen — uppmärksamheten sviktade efter två långa dagar.",
      "Ett vattenglas från förra sällskapet blev kvar på bordet — omdukningen gick för fort och blicken var nere."
    ],
    ambient: [
      "Ett bokningskort hamnade på fel bord.",
      "Salladsgarnityret blandades ihop mellan två bord.",
      "Ett kuvert flyttades en centimeter i vändan."
    ]
  }
} as const satisfies Record<string, CauseBank>;

export type ServiceReportAmbientKind = keyof typeof SERVICE_REPORT_AMBIENT;

// -------- prep banks (still plain, still short-clause) -----------------

export const SERVICE_REPORT_PREP = {
  prep_kitchen: {
    short_prep: [
      "Tiden tog slut för passlistan — halva menyn saknar tider.",
      "Reduktionen gick i grytan innan fonden hade satt sig — de tio minuterna för förberedelser tog slut för tidigt."
    ],
    morning_change: [
      "Stationen är upplagd för gårdagens meny — bytet kom aldrig med i morgonens genomgång.",
      "Receptutskriften vid såsstationen är gammal — bytet klockan åtta nådde aldrig väggen."
    ],
    low_competence: [
      "Mise en place kom igång tio minuter sent — ingen tog ledningen när köket kom in.",
      "Kryddhyllan var tom vid första tallriken — påfyllningen i morse hoppades över."
    ],
    thin_team: [
      "Förberedelsetiden tog slut med såsstationen halvfärdig — en kock som gör två.",
      "Passlistan är bara halvskriven — kökschefen stod vid spisen, inte vid tavlan."
    ],
    ambient: [
      "En sås från i går stod oprovad i frysen.",
      "Etiketterna till plastfilmen tog slut — datumen är gissningar i kväll.",
      "En garnityrbricka är inte skuren och första bongen är på väg."
    ]
  },
  prep_room: {
    short_prep: [
      "Baren sopades inte före öppning — dukningen av borden drog ut på tiden.",
      "Vinlistan kom ut i matsalen med två gamla priser — bytet kom klockan åtta och ingen dubbelkollade före öppning."
    ],
    morning_change: [
      "De nya priserna dubbelkollades inte före öppning — bytet kom klockan åtta.",
      "Menytavlorna var bara halvt uppdaterade — en vägg har fortfarande gårdagens fisk."
    ],
    thin_team: [
      "En värd sopar, dukar och håller genomgången — salen blir inte helt klar till öppning.",
      "Två bord var halvdukade vid öppning — värden fick prioritera bokningslistan före linnet."
    ],
    ambient: [
      "Lampan över baren tändes inte förrän första gästen kom.",
      "Två stolar stod snett sedan i går — ingen rättade till dem.",
      "Bokningslistan blev liggande vid värdpulpeten — matsalen läste den inte före service."
    ]
  },
  prep_delivery: {
    short_prep: [
      "Kylkedjan bröts en kvart under sorteringen — förberedelsetiden var för knapp för att jobba rent.",
      "En låda öppnades i fel ordning — sorteringen hann inte klart och det kommer att märkas senare."
    ],
    ingredient_tier_grund: [
      "Leveransen togs emot utan vägning — grundsortimentets toleranser känns inte värda extrasteget, men det borde de.",
      "Portioneringen gjordes på ögonmått i stället för på våg — grundsortimentets variation passerade obemärkt."
    ],
    thin_team: [
      "Grädden kom in och gick direkt till hyllan utan temperaturkontroll — ett par händer som sorterar och förbereder.",
      "En kartong fick fel etikett i brådskan — den underbemannade mottagningen upptäcker det inte förrän i servicen."
    ],
    ambient: [
      "Följesedeln ligger osignerad på bänken.",
      "Leverantören skickade en vara för lite och en dubbelt.",
      "Grönsakslådorna blockerade vägen till disken."
    ]
  }
} as const satisfies Record<string, CauseBank>;

export type ServiceReportPrepKind = keyof typeof SERVICE_REPORT_PREP;

// -------- prep-positive (flat, no cause — a good thing needs no reason)

export const SERVICE_REPORT_PREP_POSITIVE = {
  prep_kitchen: [
    "Mise en place var klar tjugo minuter före öppning.",
    "Reduktionen stod färdig och silad i sin gryta.",
    "Passlistan var skriven med hela menyn och alla tider.",
    "En överbliven sås provades och kastades utan tvekan.",
    "Köket gick igenom dagens meny tillsammans före första tallriken."
  ],
  prep_room: [
    "Alla bord var dukade tio minuter före öppning.",
    "Lamporna i baren och över borden tändes samtidigt, på signal.",
    "Vinlistan var aktuell och båda servitörerna hade läst den.",
    "Golvet vid entrén var moppat och torrt till öppning.",
    "Genomgången av bokningarna nådde alla tre stationerna."
  ],
  prep_delivery: [
    "Kylkedjan höll från lastbilen till kylrummet.",
    "Lådorna sorterades i rätt ordning — inget behövde lyftas två gånger.",
    "Följesedlarna signerades och arkiverades i samma minut som de kom.",
    "Leveransen stämde exakt med beställningen.",
    "Fisken vägdes vid ankomst och portionerades före service."
  ]
} as const;

// -------- positives during service (flat, plain, tight) ----------------
//
// Vision Owner (2026-08-10): "Strama åt. All text under service är
// plain. Att de positiva stunderna blir torrare är rätt — en bra
// sak som händer förtjänar inte mer röst än en dålig." The observer
// stays in the evening. Here the room reports itself.

export const SERVICE_REPORT_POSITIVE = [
  "Bordet vid fönstret beställde en andra flaska.",
  "En stamgäst hälsades välkommen vid namn i dörren.",
  "Köket justerade en sås på passet utan att någon bad om det.",
  "Ett bord bad att få sitta kvar över kaffet.",
  "Serveringen såg den andra flaskan komma innan bordet frågade.",
  "En wallenbergare kom ut perfekt och bordet sa det.",
  "Två extra sedlar lämnades i dricks på notan.",
  "Ett bord bokade igen på vägen ut."
] as const;

// -------- prep-carryover (plain, one line) ------------------------------
//
// Fires mid-service when the prep window closed with too many
// ignorance events. Names the fact and the consequence; no lament.

export const SERVICE_REPORT_PREP_CARRYOVER =
  "Den osilade såsen från förberedelserna slår till vid pass 7 — köket hoppar över den och rätten går ut naken.";
