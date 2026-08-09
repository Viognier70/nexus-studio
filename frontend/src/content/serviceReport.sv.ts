// ORDER 048 §2.1 — the plain service report.
//
// Vision Owner: "What is happening in the dining room and the
// kitchen, right now, in short concrete sentences. Neutral. No
// interpretation, no 'Hm', no question."
//
// This replaces the ambient stream's observer voice during service.
// Sentence = a clause, not a paragraph. Present tense, station-
// tagged, no reflection. The room reports itself; the observer
// voice moves to the evening account per §2.3.
//
// One bank per ambient event kind, same key set as the observer-
// voice AMBIENT_TEXTS in eventStream.sv.ts. Kept in a separate
// file so the copy is authorable in one place and diffable against
// the previous voice without cross-file rewrites.

export const SERVICE_REPORT_AMBIENT = {
  // Ignorance — scientific (kitchen technique)
  kitchen_slip: [
    'Två förrätter kom ut med separerad sås.',
    'En huvudrätt gick ut kall från passet.',
    'En rostbiff serverades skuren mot fibern.',
    'Dessertosten hade gått för långt — två gäster åt inte klart.',
    'En allergi missades vid utlämningen.',
    'Reduktionen brast; såsen gick ut kornig.'
  ],
  // Ignorance — cultural (hospitality, pairing)
  service_slip: [
    'Fel vin föreslogs till bord fem.',
    'En stamgäst hälsades med fel namn.',
    'Kaffet ställdes fram före digestivet på bord sex.',
    'Vinet hälldes till fel gäst.',
    'Ett bord fick bestick utan smörknivar.',
    'En vegetarisk gäst fick köttförslag först.'
  ],
  // Ignorance — cultural (supplier / ecological sourcing)
  delivery_short: [
    'Leverantören lämnade under beställd mängd lax.',
    'Rådjursköttet kom med fel märkning.',
    'Kartongen med citroner var halvfull.',
    'Fisken levererades utan iskudde.',
    'Chevrén luktade sur; ingen bad om certifikat.',
    'Två häckar sallad frostbitna vid ankomst.'
  ],
  // Strain — kitchen bottleneck
  bottleneck: [
    'Passet ligger tre minuter efter.',
    'Kocken vid grillen har fyra beställningar liggande.',
    'Två tallrikar står under värmelampan.',
    'Bord fyra väntar på huvudrätt.',
    'Diskstationen svämmar över.',
    'En efterrätt gick ut utan garnityr.'
  ],
  // Strain — service coverage
  wait_stretched: [
    'Bord vid baren räckte upp handen — ingen såg.',
    'Notan dröjer på bord sju; sällskapet står klart att gå.',
    'En vinbeställning glömdes i vändningen.',
    'Två bord vinkade samtidigt.',
    'En gäst räckte upp handen två gånger.',
    'Värden är ute i köket — entrén står tom.'
  ],
  // Both — house-standard slippage under load
  turnover_stumble: [
    'Bordsomsättningen tog femton minuter för lång.',
    'Bestick sattes fel på tre bord.',
    'Servetten veks slarvigt inför nästa gäst.',
    'Ett vattenglas stod kvar från förra sällskapet.',
    'Ljusen tändes inte om vid bord tre.',
    'Salladstillbehöret glömdes mellan två bord.'
  ]
} as const;

export type ServiceReportAmbientKind = keyof typeof SERVICE_REPORT_AMBIENT;

// -------- prep-window banks (plain voice, still short-clause) ------------

export const SERVICE_REPORT_PREP = {
  prep_kitchen: [
    'Mise en place startade tio minuter efter tid.',
    'Reduktionen sattes igång utan silad grundbuljong.',
    'Passtavlan skrevs utan tider.',
    'En sås från igår stod kvar i frysen.',
    'Kockparet delade upp arbetet fel — dubbelarbete.',
    'Kryddställningen var inte påfylld.'
  ],
  prep_room: [
    'Ett bord glömdes i utsträckningen.',
    'Ljusen på baren tändes inte.',
    'Två stolar stod kvar felvridna från igår.',
    'Vinlistan hade gamla priser.',
    'Golvet vid entrén var inte moppat.',
    'Bokningsöversikten stannade vid värdstationen.'
  ],
  prep_delivery: [
    'Kylkedjan pausades femton minuter under sortering.',
    'En låda öppnades i fel ordning.',
    'Notor från leverantören låg osignerade.',
    'Leveransen matchade inte beställningen.',
    'Fisken lyftes in utan att vägas.',
    'Grönsakslådor blockerade diskstationen.'
  ]
} as const;

export const SERVICE_REPORT_PREP_POSITIVE = {
  prep_kitchen: [
    'Mise en place låg klart tjugo minuter före öppning.',
    'Reduktionen stod färdig och silad i gryta.',
    'Passtavlan skrevs med hela menyn och tider.',
    'En gammal sås smakades av och kastades.',
    'Kockparet gick igenom menyn tillsammans.',
    'Kryddställningen var påfylld och prydligt sorterad.'
  ],
  prep_room: [
    'Alla bord dukade tio minuter före öppning.',
    'Ljusen på bar och tak tändes när klockan slog.',
    'Stolarna stod rakt vid varje bord.',
    'Vinlistan uppdaterad och läst av båda servitörerna.',
    'Golvet vid entrén moppat och torrt.',
    'Bokningsöversikten låg framme på tre stationer.'
  ],
  prep_delivery: [
    'Kylkedjan bröts aldrig — direkt in i kylen.',
    'Lådorna öppnades i rätt ordning.',
    'Notor signerade och lagda i pärmen.',
    'Leveransen stämde precis mot beställningen.',
    'Fisken vägdes vid ankomst och portionerades.',
    'Grönsakslådorna staplade utanför gångvägen.'
  ]
} as const;

// -------- positives during service (plain, factual) ---------------------

export const SERVICE_REPORT_POSITIVE = [
  'Bord vid fönstret beställde en flaska till.',
  'Stamgäst hälsades vid namn i entrén.',
  'Kocken justerade en sås utan att bli tillfrågad.',
  'Ett bord bad att få sitta kvar efter kaffet.',
  'En förrätt fick spontan uppgradering från köket.',
  'Notan lämnades med två sedlar dricks.',
  'Ett bord bokade om till nästa vecka innan de gick.',
  'Andra vinflaskan var redan på väg utan att bordet frågat.'
] as const;

// -------- carryover (plain, still one-line) -----------------------------

export const SERVICE_REPORT_PREP_CARRYOVER =
  'Såsen som inte silades i morse dyker upp vid pass sju — köket hoppar över den.';
