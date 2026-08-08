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

// -------- outcome banks — keyed by (scenarioId, choice) --------------------
//
// Fire deterministically after RESOLVE_SCENARIO to close the loop
// ORDER 042's flat responses left open: what the choice did in the
// room, in the room's voice, before the mentor line arrives.
//
// Cycle-1 scenarios: walk-in-of-five (§ORDER 042 §3.3 rescaled).
// Each choice gets two outcomes at t+6 s and t+18 s (relative to
// resolveAt). Written to sit inside the SCENARIO_SETTLE_AFTER (35 s)
// window so the sequence reads: choice → outcome — outcome — mentor.

export const OUTCOME_TEXTS = {
  'walk-in-of-five': {
    // Choice A — seat all five by combining the 4-top with a 2-top
    A: [
      'Fyran och tvåan slås ihop — grannbordet tappar armbågsrymden.',
      'Sällskapets ordering kommer i klump — passet får en spik.'
    ],
    // Choice B — seat four at the 4-top, fifth at the bar (welcome drink on)
    B: [
      'Fyra vid fyran, en vid baren — den femte försöker verka nöjd.',
      'Bartendern hälsar sent — den femte har hunnit vänta ut sin egen tystnad.'
    ],
    // Choice C — refuse the party
    C: [
      'Två av sällskapet vänder redan i entrén — de andra följer efter.',
      'En stamgäst vid fönsterbordet höjer på ögonbrynen — noterar.'
    ]
  }
} as const;

export type AmbientEventKind = keyof typeof AMBIENT_TEXTS;
