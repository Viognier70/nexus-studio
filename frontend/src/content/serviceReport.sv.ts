// ORDER 291 — servicerapportens rader på svenska (Vision Owner 2026-09-30:
// "Allt innehåll ska finnas på båda språken"). Samma form som
// serviceReport.ts (den engelska texten); eventStream.ts väljer bank efter
// spelarens språk. Typerna nedan kräver samma nycklar som den engelska
// banken, så att en rad inte kan saknas på ett språk.

import type {
  SERVICE_REPORT_AMBIENT as EN_AMBIENT,
  SERVICE_REPORT_PREP as EN_PREP,
  SERVICE_REPORT_PREP_POSITIVE as EN_PREP_POSITIVE
} from './serviceReport';

type Shape<T> = { readonly [K in keyof T]: T[K] extends readonly string[] ? readonly string[] : Shape<T[K]> };

export const SERVICE_REPORT_AMBIENT_SV: Shape<typeof EN_AMBIENT> = {
  kitchen_slip: {
    scale_down: [
      'Desserten gick ut naken — den kortade menyn lämnar avslutningen utan garnityr.'
    ],
    morning_change: [
      'Vinreduktionen gick ut osilad — förberedelserna räckte inte efter morgonens menybyte.',
      'Upplägget föll isär på den nya rätten — bytet kom klockan åtta och köket har inte övat på den.'
    ],
    short_prep: [
      'En sås gick ut ojusterad — tempereringen ströks när mise en place blev sen.',
      'Ett garnityr improviserades vid passet — förberedelserna nådde aldrig örtstationen.'
    ],
    thin_team: [
      'En kock missade stekytan till bord 4 — två stationer och ett par händer.',
      'En tallrik lämnade passet okontrollerad — den andra blicken är en person köket saknar i kväll.'
    ],
    low_competence: [
      'Såsen skar sig till bord 4 — köket tempererade den för varmt, och en junior stod vid passet.',
      'En wallenbergare gick ut synligt rå till bord 3 — en andra blick hade fångat den.',
      'Dessertosten var för mogen — passet kontrollerade inte mognaden innan tallriken gick ut.'
    ],
    ingredient_tier_grund: [
      'Två lammportioner var sega — grundsortimentets lamm är inte jämnt styckat den här månaden.',
      'Fisken blev ojämn — storlekarna i grundsortimentet är ett lotteri från station till station.'
    ],
    poor_morale: [
      'En wallenbergare gick ut synligt rå till bord 3 — laget släpar och ingen fångade den med en andra blick.',
      'En tallrik gick ut med fel garnityr — alla har huvudet nere och kontrollen vid passet var slarvig.'
    ],
    ambient: [
      'En allergianteckning missades vid upplägget.',
      'Dessertosten gick ut när den redan var över sin bästa tid.',
      'En tallrik gick till fel bord.'
    ]
  },
  service_slip: {
    scale_down: [
      'Ett dryckesförslag föll bort — den tunnade vinlistan lämnade servitören utan flaskan hen hade föreslagit.'
    ],
    morning_change: [
      'Dessertalternativet erbjöds aldrig — menyn skrevs om klockan åtta och matsalen har inte hunnit med.',
      'En gäst frågade om den nya rätten och servitören tvekade — morgonens genomgång nådde aldrig fram.'
    ],
    short_prep: [
      'Smörkniven saknades vid tre kuvert — dukningen kortades när förberedelserna blev sena på annat håll.'
    ],
    thin_team: [
      'Smörkniven saknades vid tre kuvert — två i matsalen hann inte duka hela rummet under förberedelserna.',
      'Vinet hamnade hos fel gäst — servitören tar den som står närmast när salen är för tunt bemannad.',
      'En allergi i bokningen nådde aldrig bordet — tre stationer och en person för lite.'
    ],
    low_competence: [
      'Ett vin hälldes upp åt fel gäst — servitören läser bordet efter ålder, inte efter bokningen.',
      'En stamgäst hälsades med fel namn — matsalen känner ännu inte sina gäster.',
      'Kaffet kom före avecen vid bord 6 — ordningen sitter inte än.'
    ],
    poor_morale: [
      'En stamgäst kom in och välkomnandet var platt — salens personal är slutkörd.',
      'Rätten presenterades inte vid bord 4 — servitören ställde ner tallriken och gick vidare.'
    ],
    ambient: [
      'En vegetarian erbjöds en kötträtt först.',
      'Välkomstdrinken nådde aldrig ett väntande sällskap.',
      'En avec kom ut innan kaffet var undanplockat.'
    ]
  },
  delivery_short: {
    thin_team: [
      'Leveransbilen kom och for utan att någon kontrollerade lasten — köket var bemannat av en.',
      'Följesedeln låg oläst på bänken — ingen hade tid för varumottagningen.'
    ],
    ingredient_tier_grund: [
      'Grönsallaten kom vissen — grundsortimentets leverantör håller inte kylkedjan för bladgrönt.',
      'Fisken gick in i kylrummet med en grå ton — grundsortimentet betyder gårdagens fångst till dagens pris.'
    ],
    poor_morale: [
      'Grädden stod en kvart på lastkajen innan någon flyttade den — uppmärksamheten var någon annanstans hela morgonen.',
      'Följesedeln saknade ett kilo lax och ingen ringde tillbaka — dagen började trött.'
    ],
    ambient: [
      'Leveransen saknade ett kilo lax och ingen ringde tillbaka.',
      'Hjortköttet kom med fel etikett.',
      'Citronlådan var halvfull.',
      'Fisken kom utan kylklamp.'
    ]
  },
  bottleneck: {
    scale_down: [
      'Desserten gick ut utan sin avslutning — den kortade menyn lämnar inget utrymme när passet korkar igen.'
    ],
    morning_change: [
      'Köket låg ett slag efter på varje bong — menyn byttes klockan åtta och tiderna skrevs aldrig om.',
      'Den nya rätten stod två extra minuter vid passet — tidsplanen ritades aldrig om.'
    ],
    short_prep: [
      'Såsstationen tar igen vid passet — reduktionen som skulle ha varit klar i morse görs nu.',
      'Ett garnityr improviserades mitt i servicen — förberedelseskålen var tom vid första bongen.'
    ],
    thin_team: [
      'Fyra tallrikar staplades under värmelampan vid pass 3 — en kock kan inte täcka två stationer vid femton kuvert.',
      'Sex bongar i kö — hela brigaden är en person kort i kväll.',
      'Rätten gick ut naken — konditorn står vid såsen och avslutningen hoppades över.'
    ],
    low_competence: [
      'Fyra bongar väntade vid passet — junioren kan inte börja och avsluta i samma takt.',
      'Tiderna gled isär över tre beställningar — den som läser passet ropar inte i förväg än.'
    ],
    poor_morale: [
      'Tempot vid passet är fel — den andra felbeställningen på tio minuter.',
      'Köket ligger ett slag efter — passet började trött.'
    ],
    ambient: [
      'En varmrätt gick ut före förrätten.',
      'Disken ligger efter — det är brist på rena tallrikar vid passet.',
      'Tre tallrikar står under värmelampan och väntar på en springare.'
    ]
  },
  wait_stretched: {
    scale_down: [
      'Middagens kuvert är utspridda på en enda servitör — lunchen stängdes och matsalen är underbemannad.'
    ],
    thin_team: [
      'Bord 6 väntade åtta minuter på notan — två i matsalen och en fast i ett samtal i baren.',
      'En uppräckt hand i baren missades — ingen hade rummet i blicken.',
      'En vinbeställning glömdes på vägen — servitören tog den och fick gå tillbaka efter två bord.'
    ],
    low_competence: [
      'En uppräckt hand i baren missades två gånger — matsalen läser inte rummet än.',
      'Två bord vinkade samtidigt och det närmaste vann med tio sekunder — ingen bedömde vem som väntat längst.',
      'Springaren gick förbi en vinkande hand — blicken på bongen.'
    ],
    poor_morale: [
      'Springaren gick förbi bord 9 utan att stanna — alla har huvudet nere efter gårdagens långa service.',
      'Vattnet fylldes inte på två gånger vid samma bord — passet släpar.'
    ],
    ambient: [
      'Vattnet fylldes inte på vid bord 3.',
      'Två bord räckte upp handen med några sekunders mellanrum.',
      'Bartendern var sen att lägga märke till en nyanländ gäst.'
    ]
  },
  turnover_stumble: {
    thin_team: [
      'Att duka om bord 2 tog tolv minuter — värden plockade av ensam mitt i servicen.',
      'Nästa sällskap stod två minuter för länge i dörren — ingen hade en hand ledig.'
    ],
    low_competence: [
      'Besticken hamnade på fel sida efter omdukningen — den nyare i laget dukar ur minnet, inte efter mönstret.',
      'Bordsljuset tändes inte igen efter omdukningen — ingen såg över rummet innan gästerna satte sig.'
    ],
    poor_morale: [
      'Servettvikningen blev slarvig vid omdukningen — uppmärksamheten gled efter två långa dagar.',
      'Ett vattenglas från förra sällskapet blev kvar på bordet — omdukningen gick för fort och blicken var nere.'
    ],
    ambient: [
      'Ett bokningskort hamnade på fel bord.',
      'Salladsgarnityret förväxlades mellan två bord.',
      'Ett kuvert flyttades en centimeter vid omdukningen.'
    ]
  }
};

export const SERVICE_REPORT_PREP_SV: Shape<typeof EN_PREP> = {
  prep_kitchen: {
    short_prep: [
      'Tiden tog slut för passlistan — halva menyn saknar tider.',
      'Reduktionen gick i grytan innan fonden hade satt sig — de tio minuternas förberedelse tog slut för tidigt.'
    ],
    morning_change: [
      'Stationen är uppställd för gårdagens meny — bytet kom aldrig med i morgonens genomgång.',
      'Receptutskriften vid såsstationen är gammal — bytet klockan åtta nådde aldrig väggen.'
    ],
    low_competence: [
      'Mise en place började tio minuter sent — ingen tog ledningen när köket kom in.',
      'Kryddhyllan var tom vid första tallriken — morgonens påfyllning hoppades över.'
    ],
    thin_team: [
      'Förberedelsetiden tog slut med såsstationen halvfärdig — en kock gör tvås arbete.',
      'Passlistan är bara halvskriven — köksmästaren stod vid spisen, inte vid tavlan.'
    ],
    ambient: [
      'En sås från i går stod oprovad i frysen.',
      'Etiketterna till plastfilmen tog slut — datumen är gissningar i kväll.',
      'En garnityrbricka är inte skuren och första bongen är på väg.'
    ]
  },
  prep_room: {
    short_prep: [
      'Baren sopades inte före öppning — dukningen blev sen.',
      'Vinlistan gick ut i matsalen med två gamla priser — bytet kom klockan åtta och ingen dubbelkollade före öppning.'
    ],
    morning_change: [
      'De nya priserna dubbelkollades inte före öppning — bytet kom klockan åtta.',
      'Menytavlorna var bara halvt uppdaterade — en vägg har fortfarande gårdagens fisk.'
    ],
    thin_team: [
      'En värd sopar, dukar och håller genomgången — rummet är inte riktigt klart till öppning.',
      'Två bord var halvdukade vid öppning — värden fick sätta bokningslistan före linnet.'
    ],
    ambient: [
      'Lampan över baren tändes inte förrän första gästen kom.',
      'Två stolar hade stått snett sedan i går — ingen rätade upp dem.',
      'Bokningslistan blev kvar vid värdpulten — matsalen läste den inte före servicen.'
    ]
  },
  prep_delivery: {
    short_prep: [
      'Kylkedjan bröts en kvart under sorteringen — förberedelsetiden var för knapp för att arbeta rent.',
      'En låda öppnades i fel ordning — sorteringen blev inte klar och det kommer att synas senare.'
    ],
    ingredient_tier_grund: [
      'Leveransen togs emot utan vägning — grundsortimentets toleranser känns inte värda det extra steget, men de är det.',
      'Portioneringen gjordes på ögonmått i stället för på vågen — grundsortimentets variation passerade obemärkt.'
    ],
    thin_team: [
      'Grädden kom in och gick direkt till hyllan utan temperaturkontroll — ett par händer som sorterar och förbereder.',
      'En låda fick fel etikett i brådskan — den underbemannade varumottagningen märker det inte förrän i servicen.'
    ],
    ambient: [
      'Följesedeln ligger osignerad på bänken.',
      'Leverantören skickade en vara för lite och en två gånger.',
      'Grönsakslådorna spärrade vägen till disken.'
    ]
  }
};

export const SERVICE_REPORT_PREP_POSITIVE_SV: Shape<typeof EN_PREP_POSITIVE> = {
  prep_kitchen: [
    'Mise en place var klar tjugo minuter före öppning.',
    'Reduktionen stod färdig och silad i sin gryta.',
    'Passlistan var skriven med hela menyn och alla tider.',
    'En överbliven sås provades och slängdes utan tvekan.',
    'Köket gick igenom dagens meny tillsammans före första tallriken.'
  ],
  prep_room: [
    'Alla bord var dukade tio minuter före öppning.',
    'Lamporna i baren och över borden tändes tillsammans, på given signal.',
    'Vinlistan var aktuell och båda servitörerna hade läst den.',
    'Golvet vid entrén var moppat och torrt till öppningen.',
    'Genomgången av bokningarna nådde alla tre stationerna.'
  ],
  prep_delivery: [
    'Kylkedjan höll från lastbilen till kylrummet.',
    'Lådorna sorterades i rätt ordning — ingenting behövde lyftas två gånger.',
    'Följesedlarna signerades och sattes in i pärmen samma minut de kom.',
    'Leveransen stämde exakt med beställningen.',
    'Fisken vägdes vid ankomst och portionerades före servicen.'
  ]
};

export const SERVICE_REPORT_POSITIVE_SV: readonly string[] = [
  'Bordet vid fönstret beställde en andra flaska.',
  'En stamgäst välkomnades med namn i dörren.',
  'Köket justerade en sås vid passet utan att någon bad om det.',
  'Ett bord bad att få sitta kvar över kaffet.',
  'Salen såg den andra flaskan komma innan bordet frågade.',
  'En wallenbergare kom ut perfekt och bordet sa det.',
  'Två extra sedlar lämnades som dricks på notan.',
  'Ett bord bokade igen på vägen ut.'
];

export const SERVICE_REPORT_PREP_CARRYOVER_SV =
  'Den osilade såsen från förberedelserna slår till vid pass 7 — köket hoppar över den och rätten går ut naken.';
