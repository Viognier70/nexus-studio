// ORDER 043 Addendum A — Swedish sentence banks for the service event
// stream. Every entry is hand-authored, per the Vision Owner's note
// that "the language decides whether the stream reads as an evening
// or as a log — more than the weighting does."
//
// Voice guidance (from the model report):
//   * Ignorance events use CAPABILITY-language — what the team did
//     not know: "känner inte igen", "föreslår fel", "utan besked".
//   * Strain events use CAPACITY-language — what the team did not
//     have time for: "hinner inte", "dröjer", "missar i vändningen".
//
// The player reads the two apart by vocabulary and by temporal shape
// (ignorance = flat carpet, strain = wave). No colour-coding, no
// severity badges (§A.3 forbids symbols); severity comes from what
// the line describes.

// -------- ambient banks — one array per event kind ------------------------

export const AMBIENT_TEXTS = {
  // Ignorance — scientific (kitchen technique)
  kitchen_slip: [
    'Köket känner inte igen dessertosten som mögnat för långt.',
    'En sås separerar för att smöret rördes in för varmt.',
    'En huvudrätt går ut utan besked om nötallergen.',
    'Fisken går ut kall — inte hunnit vänta ut sin egen tallrik.',
    'En rostbiff skärs mot fibern — servitören noterar men säger inget.',
    'Grönsakerna dressas för tidigt — bladen har hunnit lägga sig.',
    'En reduktion får för hög värme och smalnar ihop.',
    'Ett wallenberg går ut med rå kant — köket ropar tillbaka.'
  ],
  // Ignorance — cultural (hospitality, pairing, knowing guests)
  service_slip: [
    'Servitören föreslår rött till sotare.',
    'En stamgäst kallas vid fel namn i entrén.',
    'Kaffet serveras före digestivet — sekvensen missas.',
    'Ett bord får fel bestick till tapasbrickan.',
    'En vegetarisk gäst får förslaget som förra veckans meny.',
    'Vinet hälls till fel gäst — värden vid bordet var någon annan.',
    'En allergi antecknad i bokningen missas vid dukningen.',
    'Ett efterrättsval presenteras utan att alternativet till nöten nämns.'
  ],
  // Ignorance — cultural (supplier relationships, ecological sourcing)
  delivery_short: [
    'Leverantören levererar under vad som beställdes — inget besked.',
    'Rådjursköttet kom med grön etikett i stället för hängmärkning.',
    'Kartongen med citroner är halvfull — den andra är kvar hos leverantören.',
    'En förpackning grädde är öppnad vid ankomst.',
    'Chevrén luktar surare än förra veckans — inget certifikat medföljer.',
    'Två häckar sallad ser ut att ha frostbits vid transporten.',
    'Fisken är levererad utan iskudde — bara plastad.',
    'Fakturan matchar inte listan — två poster har bytt namn.'
  ],
  // Strain — kitchen bottleneck
  bottleneck: [
    'En huvudrätt dröjer — bordet frågar redan andra gången.',
    'Två order kommer i fel ordning — köket hinner inte hålla listan.',
    'Passet hopar sig — tre tallrikar väntar under värmelampan.',
    'En förrätt går ut kall när efterrätten från förra bordet får företräde.',
    'Kockparet vid grillen tappar takten — nästa bord får vänta.',
    'En efterrätt kompromissas — dekoren hinns inte med.',
    'Diskstationen svämmar över — tallrikar staplas oskurna.',
    'Ett bord får sin huvudrätt före förrätten — köket har hoppat över.'
  ],
  // Strain — service coverage
  wait_stretched: [
    'Servitören missar bordet vid baren i vändningen.',
    'En påfyllning av vatten uteblir under ett samtal.',
    'Notan dröjer — bordet står klart och väntar.',
    'En gäst räcker upp handen — ingen ser.',
    'Två bord vinkar samtidigt — servitören väljer det närmare.',
    'En vinbeställning glöms bort i vändningen mellan borden.',
    'Frackrocken vid entrén försvinner — någon får själv gå in.',
    'Ett bord får sin efterrätt utan att servitören stannar för att presentera.'
  ],
  // Both — house-standard slippage under load
  turnover_stumble: [
    'Ett bord dukas om långsamt — nästa sällskap hinner titta två gånger på entrén.',
    'En efterrätt äts halvt när nästa gästs bordskort ligger på grannbordet.',
    'En bordsomsättning som skulle tagit fem minuter tar femton.',
    'Bestick sätts fel i vändningen — kniven ligger till vänster.',
    'Servetten viks slarvigt när nästa gäst redan syns i dörren.',
    'Ett vattenglas står kvar från förra sällskapet — märks först vid serveringen.',
    'Ljusen på bordet tänds inte om — nästa gäst sitter i skugga.',
    'Salladstillbehöret glöms mellan två bord — köket blandar ihop dem.'
  ]
} as const;

// Outcome banks were previously here as OUTCOME_TEXTS, keyed by
// (scenarioId, choice). Moved to simulation/scenarios.ts alongside
// the rest of each scenario's authored content (subject, situation,
// choice labels, mentor lines, register writes) — one file owns
// each scenario's voice, rather than the outcomes being one hop
// away in a content-side table.

export type AmbientEventKind = keyof typeof AMBIENT_TEXTS;

// ORDER 043 Addendum A mise en place — prep events fire only during
// the 2-min prep window before service begins. Weighted like ambient
// events (per-role competence), so a thin team is legible before the
// doors open. Vocabulary reads with worry, not atmosphere: the lines
// name what is late, missed, or wrong — not what is happening.
//
// Three kinds, mapped to the same competence axes as ambient events:
//   prep_kitchen  → scientific (kitchen technique / mise en place)
//   prep_room     → practical  (house standard / dukning)
//   prep_delivery → cultural   (supplier relationships / mottagning)
//
// All three carry causeTag: 'ignorance' — a competent team barely
// generates prep events, an incompetent one leaks them. Prep has no
// strain component (no guests yet).
export const PREP_TEXTS = {
  prep_kitchen: [
    'Mise en place är sen — köket startade tio minuter efter tid.',
    'En reduktion sätts igång utan att grundbuljongen är silad.',
    'Passtavlan skrivs upp — halva menyn saknar tider.',
    'En sås står kvar i frysen, glömd sedan igår.',
    'Kockparet börjar med två olika förberedelselistor.',
    'Kryddställningen är inte påfylld — måste hämtas mitt i förarbetet.',
    'En förrätt saknar sin garnityr — inget färskt in idag.',
    'Kylens plaster märks inte upp — vad är dagens och vad är gårdagens?'
  ],
  prep_room: [
    'Ett bord glöms i utsträckningen — servetterna ligger på nästa.',
    'Ljusen på baren tänds aldrig.',
    'Två stolar står kvar från förra kvällen, felvridna.',
    'Vinlistan uppdateras i sista minuten — några priser står gamla.',
    'Golvet vid entrén är inte moppat — spår av gårdagens middag syns.',
    'Bokningsöversikten skrivs ut men lämnas i värdstationen.',
    'Bordskorten läggs på fel bord — värden hinner byta innan öppning.',
    'Musiken går på förra kvällens spellista — ingen bytte.'
  ],
  prep_delivery: [
    'Kylkedjan pausas för länge medan kartongerna sorteras.',
    'En låda öppnas i fel ordning — färskvaror hamnar under torrvaror.',
    'Två notor från leverantören ligger osignerade på diskbänken.',
    'Leverantören lämnade en varusammansättning som inte matchar beställningen.',
    'Fisken lyfts in utan att vägas — nästa förrätt får uppskattad portion.',
    'Grönsakslådorna staplas i gången och blockerar diskstationen.',
    'En pall står kvar på gården — glasflaskor hann inte in.',
    'Leverantörens temperaturlogg saknas — kylkedjan går att gissa.'
  ]
} as const;

export type PrepEventKind = keyof typeof PREP_TEXTS;

// Carryover text — the single ambient-bottleneck line that fires
// mid-service when the prep window ended with too many ignorance
// events. One line, hand-authored — the point is "this is what
// wasn't done in mise en place coming home to roost", not variety.
export const PREP_CARRYOVER_TEXT =
  'En sås som inte silades i morse dyker upp — köket måste hoppa över den mitt i passet.';
