// ORDER 043 Addendum A + B — Swedish sentence banks for the service
// event stream, in the observer voice.
//
// The stream is the proprietor walking the room. Not a system
// reporting state. Voice has posture: it notices, it wonders, it
// lets some things go and stops at others. Every line has up to
// four movements (§5A.4 revised):
//   1. What happened — concrete, specific, numbers where numbers matter.
//   2. What it did to the room — the consequence lives inside the
//      sentence, before anyone names it.
//   3. Who failed to see it — station-tagged so the failure traces
//      to the team, not to the sim.
//   4. The observer's judgement, as a question — "hm", an unfinished
//      thought. Never a verdict, never an instruction.
//
// Most lines carry at least three movements. Some carry only one or
// two — a quiet evening does that. But the majority must have three
// or four or the voice disappears.
//
// Rewritten 2026-08-08 under Addendum B. Prior banks were correct
// and empty ("En förrätt saknar sin garnityr idag."); this pass
// replaces every line with the four-movement structure. No partial
// swap — all 111 sentences ship together per Vision Owner.

// -------- ambient banks — one array per event kind ------------------------

export const AMBIENT_TEXTS = {
  // Ignorance — scientific (kitchen technique)
  kitchen_slip: [
    'Dessertosten hade gått för långt — två gäster smakade en gång och la skedarna ner utan att säga något. Kocken hade den framme sedan morgonen; vet han vad som är moget och vad som är förfallet, eller är det bara ost för honom?',
    'Fyra av sex portioner kom ut med separerad sås — smöret hade rörts in för varmt. Bordet vid fönstret lämnade halva; märkligt att varken kocken vid stationen eller servitören som bar det såg det i tallriken.',
    'En huvudrätt gick ut utan att någon nämnde cashewnötterna — värden hade antecknat allergin i bokningen. Undrar om servitören läste noteringen innan hon bar ut plattan, eller om ingen gjorde det.',
    'Två fiskar gick ut kalla — någon platade dem för tidigt och de stod under värmelampan. Bordet vid tvåan lämnade halva utan kommentar; kocken vid grillen såg det inte, och servitören märkte inte att tallriken var sval i handen.',
    'Rostbiffen kom ut skuren mot fibern — gästen tuggade långsamt två gånger och la sedan gaffeln bredvid. Servitören noterade det på vägen ut men bar den vidare ändå; märkligt att ingen vände om vid passet.',
    'Salladen på tre förrätter kom ut med bladen platta — någon dressade dem fem minuter för tidigt. Bordet åt utan att säga något och lämnade skålen halv; märkligt att kocken som blandade och servitören som bar såg samma sak utan att stanna.',
    'Reduktionen på lammrätten blev för tjock — den satt fast i sked och gäst fick skrapa. Två av borden kommenterade det på skoj; undrar om kocken vid såsen inte kände lukten svänga över, eller om han hoppades att det skulle gå ändå.',
    'Ett wallenberg gick ut med tydligt rå kant — köket ropade tillbaka det men servitören hade redan satt tallriken framför gästen. Hm, den skammen kostar mer i ansikte än en ny wallenberg gör i tid; någon borde lära honom att kolla först.'
  ],
  // Ignorance — cultural (hospitality, pairing, knowing guests)
  service_slip: [
    'Servitören föreslog rött till sotare — bordet tackade artigt och beställde vatten istället. Undrar om värden vet vad sotare är, eller om han gick på "bordet ser ut som ett rödvinsbord".',
    'En stamgäst hälsades i entrén med fel namn — det äldre paret log tvärt och gick förbi utan att korrigera. Värden märkte inget; gästen kommer inte att säga det, men han kommer att komma mer sällan.',
    'Kaffet ställdes ner före digestivet på sexans bord — de tittade på varandra och sköt undan kopparna för att vänta. Hm, servitören är ny; vet någon om att han lärt sig sekvensen eller har vi antagit det?',
    'Ett bord fick tapasbrickan med fel bestick — den lilla gaffeln fattades och gästen försökte tugga med den stora tills servitören kom förbi. Undrar om kocken märkte att brickan gick ut utan alla delar; ingen frågade.',
    'En vegetarisk gäst fick förslaget som förra veckans meny — hon påminde artigt att hon inte äter kött. Servitören ursäktade sig utan att kolla dagens meny bredvid; märkligt att ingen uppdaterade honom i morse.',
    'Vinet hälldes till fel gäst — värden vid bordet var någon annan än den servitören valde. Ingen sa något, men vinet kommer att smaka fel för alla tre nu. Undrar om servitören läste bokningen eller gissade utifrån åldern.',
    'En allergi antecknad i bokningen missades vid dukningen — den lilla nötskålen stod kvar. Bordets värd upptäckte den och lyfte bort den själv innan gästen kom. Undrar var i kedjan noteringen försvann; värden till kocken till servitören är tre chanser.',
    'Efterrätten presenterades utan att alternativet till nöten nämndes — gästen frågade själv och servitören tvekade en sekund för länge. Hm, det räckte för att bordet ska tveka på hela vår kompetens; märkligt att köket inte förberedde svaret i morse.'
  ],
  // Ignorance — cultural (supplier relationships, ecological sourcing)
  delivery_short: [
    'Leverantören lämnade av under vad som beställdes — kartongerna innehöll ett kilo mindre lax än på fakturan. Ingen ringde tillbaka och ingen antecknade det; undrar om vi ens vet vad vi ska laga en portion färre av innan servisen märker.',
    'Rådjursköttet kom med grön etikett i stället för hängmärkning — det är inte hängt lika länge som förra veckan. Kocken tog emot utan att öppna påsen; hm, det kommer att märkas i tuggan senare i kväll om ingen kollar nu.',
    'Kartongen med citroner var halvfull — den andra kartongen står kvar hos leverantören. Ingen ringde för att fråga varför. Undrar om vi hinner klara fisken utan syra ikväll eller om någon springer till Torgets butik.',
    'En förpackning grädde var öppnad vid ankomst — locket kom loss någon gång under transporten. Kocken satte in den ändå; märkligt att ingen kollade om den var het under lastbilens plast, den kan vara död redan.',
    'Chevrén luktade surare än förra veckans — inget certifikat medföljde och ingen bad om ett. Kocken skar en bit och smakade själv, gjorde en grimas men satte in den. Undrar hur långt vi kan spänna det innan en gäst nämner det.',
    'Två häckar sallad såg ut att ha frostbits under transporten — bladen var mörka i kanterna. Ingen kastade dem, ingen ringde. Hm, halva sortimentet kan gå ut med visen sallad ikväll om vi inte sorterar innan mise en place är slut.',
    'Fisken levererades utan iskudde — bara plastad. Ingen mätte temperaturen i lådan innan den gick in i kylen. Undrar hur många timmar den varit över fyra grader innan vi tog emot den; någon borde ha frågat i porten.',
    'Fakturan matchade inte listan — två poster hade bytt namn. Ingen jämförde raden mot beställningen. Hm, det är så en leverantör börjar skicka det de har snarare än det vi bad om — vi lär oss det som ett mönster om en månad.'
  ],
  // Strain — kitchen bottleneck
  bottleneck: [
    'En huvudrätt dröjde på pass 3 — bordet frågade servitören andra gången. Hon svarade med en gest mot köket och skyndade vidare. Kocken vid grillen har fyra beställningar och en oöppnad kylskåpsdörr att öppna; undrar om han begärt hjälp eller om han försöker rädda det själv.',
    'Två beställningar kom ut i fel ordning — tvåan fick huvudrätten före förrätten. Bordet log obekvämt och började med huvudrätten ändå. Hm, köket hinner inte hålla listan när den är fem lång; någon borde stå med papperet, inte i minnet.',
    'Passet hopade sig — tre tallrikar stod och väntade under värmelampan medan servitören var vid entrén. När hon kom tillbaka var två av dem sneda i temperatur. Undrar om värden hade kunnat lyfta även om det var utanför hennes station idag.',
    'En förrätt gick ut kall när efterrätten från förra bordet fick företräde — kocken valde att låta det svalna hellre än att blanda ihop passordningen. Bordet åt utan kommentar; hm, det är hans andra kalla förrätt ikväll, båda på grund av samma sorterande instinkt.',
    'Kockparet vid grillen tappade takten mellan två order — det låter mer öppet i passet än det brukar. Nästa bord får vänta två minuter extra på huvudrätten. Undrar om det är utrustningen eller om någon inte hann äta lunch idag.',
    'En efterrätt kompromissades — dekoren hanns inte med och tallriken gick ut naken. Bordet märkte inte att den var tänkt att ha en gest till, men vi vet det. Hm, det är den tredje förenklingen ikväll utan att någon nämner det.',
    'Diskstationen svämmade över — tallrikar staplades oskurna medan servitörerna hämtade rena från förvaret. Ingen bad om avlastning; undrar om diskaren vet att hon kan säga stopp, eller om hon tror det räknas som svaghet.',
    'Ett bord fick huvudrätten före förrätten — köket hade hoppat över den utan att flagga. Servitören försökte förklara utan att skylla på någon och gästen bad om att få behålla båda samtidigt. Hm, det räddar situationen men gömmer felet.'
  ],
  // Strain — service coverage
  wait_stretched: [
    'Servitören missade bordet vid baren i vändningen — han var på väg till fyran med tre tallrikar och såg inte gästen som räckte upp handen. Bordet vinkade en gång till, sedan slutade de. Undrar hur lång tid som gick innan någon annan hittade dem.',
    'En påfyllning av vatten uteblev under ett samtal — servitören stod utanför bordet med kannan men vågade inte avbryta. Det gick ytterligare tio minuter innan hon vågade sig fram och då var det ändå fel ögonblick. Hm, hon behöver läras när ett samtal är en paus och när det är en vägg.',
    'Notan dröjde — bordet stod klart att gå och väntade med jackorna över armarna. En av dem tittade på klockan för tredje gången. Undrar om värden håller reda på vilket bord som räckt upp handen först eller om det är först-till-kvarn efter känsla.',
    'En gäst räckte upp handen på tvåan — ingen såg. Hon la ner den efter en halv minut och började leta ögonkontakt istället. Hm, det är två personal på golvet ikväll och tre bord kräver dem samtidigt; det borde inte gå att missa en handupplyft, men det gick.',
    'Två bord vinkade samtidigt — servitören valde det närmare och det andra fick vänta tre minuter. Det bordet drog inte tillbaka handen men vred på huvudet. Undrar om lärlingen hade kunnat ta det andra om han fått veta att han fick.',
    'En vinbeställning glömdes bort i vändningen mellan borden — servitören nickade och gick vidare, sedan blev det något annat. Bordet påminde efter tio minuter. Hm, det är okej första gången; det är inte okej andra gången samma kväll.',
    'Frackrocken vid entrén försvann när värden var ute i köket — en ny gäst fick själv gå in och leta upp någon. Han såg först ut som han skulle vända, men blev kvar. Undrar hur många som vänt utan att vi sett det ikväll.',
    'Ett bord fick sin efterrätt utan att servitören stannade för att presentera — hon lämnade tallriken och skyndade vidare. Bordet tittade på den utan att veta vad det var. Hm, den där lilla ceremonin är halva rätten; utan den är den bara mat.'
  ],
  // Both — house-standard slippage under load
  turnover_stumble: [
    'Ett bord dukades om långsamt — det nästa sällskapet hann titta två gånger på entrén innan värden vinkade in dem. De frågade om det var problem; han sa nej men de kom in med en misstänksamhet redan. Undrar om vi mäter tiden mellan sista notan och första välkomnandet, eller om den bara ligger där.',
    'En efterrätt åts halvt när nästa gästs bordskort låg på grannbordet — det första sällskapet såg det och blev tysta i två minuter innan de reste sig. Hm, det gick fort på golvet men det bar ett meddelande de inte skulle behövt läsa.',
    'En bordsomsättning som skulle tagit fem minuter tog femton — värden städade själv för att servitörerna var upptagna. Han gjorde det snabbt men grundligt; märkligt att vi inte har en tredje person som gör det som standard.',
    'Bestick sattes fel i vändningen — kniven låg till vänster på tre tallrikar. Ingen gäst kommenterade men ingen använde dem heller på rätt sätt. Undrar om lärlingen fick veta åt vilket håll, eller om han bara härmade den han såg senast.',
    'Servetten veks slarvigt när nästa gäst redan syntes i dörren — värden såg det men lät det gå. Bordet noterade det utan att säga något; hm, det är den där sortens detalj som inte skadar en gång men som blir en signal om det upprepas.',
    'Ett vattenglas stod kvar från förra sällskapet — det märktes först när gästen lyfte det för att dricka. Servitören bytte det snabbt utan att kommentera. Undrar hur många glas som stått kvar innan vi märkte det.',
    'Ljusen på bordet tändes inte om — nästa gäst satt i skugga tills servitören råkade komma förbi och ordnade det. Bordet flyttade sig i stolen mot ljuset från grannbordet under tiden. Hm, den där lilla obehagligheten är det man minns.',
    'Salladstillbehöret glömdes mellan två bord — köket blandade ihop dem och ingen upptäckte det förrän gästerna började äta. En av gästerna sa något halvt roligt om det; märkligt att vi inte har en check innan tallriken lämnar passet.'
  ]
} as const;

export type AmbientEventKind = keyof typeof AMBIENT_TEXTS;

// -------- prep banks — ignorance-polarity (things not going well) ---------
//
// Fire during the 2-min mise-en-place window. Weighted by team
// competence per axis. Same observer voice as ambient — the
// proprietor walking the empty room, noticing what did or did not
// get set up.

export const PREP_TEXTS = {
  prep_kitchen: [
    'Mise en place startade tio minuter efter tid — köket kom in senare än vanligt och ingen tog täten. Det är okej idag men det gör att sista genomgången försvinner; undrar om någon i laget vet vilket moment vi hoppar över när det stressar.',
    'Reduktionen sattes igång utan att grundbuljongen var silad — smaken kommer att sitta grumlig hela kvällen. Kocken hade den framme men vände sig bort en sekund för länge. Hm, den där sekunden är skillnaden mellan en sås och en bra sås.',
    'Passtavlan skrevs upp med halva menyn utan tider — köket kommer att gissa på "ungefär tre minuter" hela kvällen. Ingen bad någon fylla i det, och nu kommer beställningarna att komma ut i vändningar snarare än rytm. Undrar om det är slarv eller om ingen visste vem som skulle skriva.',
    'En sås stod kvar i frysen sedan igår — köket lyfte in en ny utan att kolla om den gamla var bra. Vi har nu två portioner av samma sås, en tinad och en glömd. Hm, det är småpengar men det är också en vana som säger något om ordningen.',
    'Kockparet började med två olika förberedelselistor — någon uppdaterade menyn men det nådde inte till kolleger. Halva stationen laddar för tisdagens rätter, andra halvan för dagens. Undrar hur långt in i servisen vi märker att bar syrar för fel sallad.',
    'Kryddställningen var inte påfylld — mitt i förarbetet gick kocken över för att hämta salt. Det var två minuter, men de två minuterna var precis när han skulle stå vid grillen. Hm, en påfyllning i morse hade sparat tio i kväll.',
    'En förrätt saknar sin garnityr — det färska kom inte in idag och ingen ringde för att fråga. Vi går ut med tomma sidor på fyra av kvällens rätter. Undrar om gästen märker eller om vi märker att vi vant oss vid att märkas.',
    'Kylens plaster märktes inte upp — vad är dagens och vad är gårdagens är nu en fråga snarare än ett svar. Kocken kommer att lukta sig fram hela kvällen. Hm, det är okej två gånger men det är hur "det luktar bra nog" börjar.'
  ],
  prep_room: [
    'Ett bord glömdes i utsträckningen — servetterna låg på nästa istället. Värden märkte det när första bokningen kom och fick byta framför näsan på gästen. Undrar om vi har en lista över borden eller om vi går på minne.',
    'Ljusen på baren tändes aldrig — bartendern öppnade i skugga. Ingen kollade förrän första gästen slog sig ner. Hm, den där halvminuten som han tände dem gav ett intryck som inte behövde synas.',
    'Två stolar stod kvar från förra kvällen, felvridna — värden ordnade det själv medan servitörerna la om vinlistan. Ingen frågade varför de stod så; det är den där sortens detalj som samlar sig utan att någon räknar.',
    'Vinlistan uppdaterades i sista minuten — några priser stod gamla och två servitörer såg olika belopp när de tittade. De valde det lägre för att inte förlora en gäst; undrar om vi har en aning om vad kvällen faktiskt kostar oss.',
    'Golvet vid entrén var inte moppat — spår av gårdagens middag syntes när första gästen klev in. Han sa inget men han tittade ner. Hm, den där blicken är svår att glömma om man är den som lämnar första intrycket.',
    'Bokningsöversikten skrevs ut men lämnades vid värdstationen — servitörerna gick ut utan att ha sett den. De kommer att gissa vilket bord som är förbokat hela kvällen. Undrar om det finns en genomgång eller om vi förutsätter att alla läser.',
    'Bordskorten lades på fel bord — värden hann byta två innan öppning men den tredje fick gästen läsa fel namn en sekund innan de förstod. Hm, det är den sekunden man ler urskuldande för utan att veta varför.',
    'Musiken gick på förra kvällens spellista — ingen bytte. Första bokningen kom in till en stämning som var för sen på kvällen för lunchöppning. Undrar vem som ansvarar; det är en småsak men det är också det första gästen hör.'
  ],
  prep_delivery: [
    'Kylkedjan pausades för länge medan kartongerna sorterades — färskvarorna stod ute i femton minuter. Kocken kollade inte temperaturen innan han la in dem. Undrar om vi kommer att märka det i tuggan senare, eller om vi märker det först när någon blir sjuk.',
    'En låda öppnades i fel ordning — färskvaror hamnade under torrvaror i sorteringen. Två av oss lyfte sedan om det utan att kommentera. Hm, det är den där ineffektiviteten som är svår att peka på men lätt att räkna på i slutet av månaden.',
    'Två notor från leverantören låg osignerade på diskbänken — ingen kollade om posterna stämde. Vi vet inte om vi betalar för det vi fick eller för det vi trodde vi beställde. Undrar om det finns en rutin för det, eller om det är chefens att göra på söndagen.',
    'Leverantören lämnade en varusammansättning som inte matchade beställningen — två saker saknades och en tredje kom dubbelt. Ingen ringde. Hm, en tredje leverans i månaden med samma avvikelse säger något om relationen som ingen samtalar om.',
    'Fisken lyftes in utan att vägas — nästa förrätt får uppskattad portion. Ingen vet om vi ligger över eller under kostnadskalkylen förrän vi räknar i eftermiddag. Undrar om det är lat eller om vågen står på fel plats för att räknas som en del av rutinen.',
    'Grönsakslådorna staplades i gången och blockerade diskstationen — under prepen fick alla gå runt dem. Ingen flyttade dem. Hm, det är den sortens hinder som förlänger allt med två minuter, och två minuter i prep är tio i service.',
    'En pall stod kvar på gården — glasflaskor hann inte in innan mise en place stängde. Servitören kommer att bära in dem i vändningar under kvällen istället. Undrar hur mycket av kvällens obalans som redan var satt i portens grus.',
    'Leverantörens temperaturlogg saknades — vi tog emot fisken utan att kunna verifiera kylkedjan. Kocken satte in den ändå. Hm, det är sådant som är osynligt tills det inte är det.'
  ]
} as const;

export type PrepEventKind = keyof typeof PREP_TEXTS;

// -------- prep banks — positive-polarity (things going well) --------------
//
// Fire when the prep floor triggers on a strong-competence team.
// Same observer voice — the proprietor noticing that a station is
// held. Not compliments issued by the system.

export const PREP_POSITIVE_TEXTS = {
  prep_kitchen: [
    'Mise en place låg klart tjugo minuter före öppning — kocken hade gått igenom hela menyn innan grillen ens var varm. Han står vid passet nu och läser tjänstelistan; undrar om det märks i kvällen att han hann tänka färdigt innan tempot började.',
    'Reduktionen stod färdig och silad i gryta med lock — kocken hade lämnat en tesked bredvid för att smaka innan servisen börjar. Den sortens omtanke syns i tallriken sex timmar senare utan att någon nämner den.',
    'Passtavlan skrevs upp med hela menyn och tider bredvid varje rätt — köket kommer att veta vad de gör innan gästen sitter. Undrar när vi började göra det som standard; det ser ut som att någon lärt någon annan utan att jag såg när.',
    'En sås som stod kvar från igår smakades av innan den kastades — kocken avgjorde själv att den inte skulle gå ut. Hm, den där bedömningen är hela skillnaden mellan en kock och någon som lagar mat; jag hoppas han vet att jag såg det.',
    'Kockparet gick igenom förändringarna i menyn tillsammans — de la fem minuter på att bli överens om vem som gör vad. De fem minuterna kommer att spara femton senare. Undrar om de vet att de gör det, eller om det bara är hur de arbetar.',
    'Kryddställningen var påfylld och prydligt sorterad före första gästen — någon hade gjort det utan att fråga. Det är den sortens tystare arbete som inte syns förrän man saknar det. Hm, det syns nu.',
    'En förrätts garnityr byttes ut mot något som råkade komma in i morse — kocken hade tänkt om menyn på tolv minuter. Servisen kommer att presentera det som en dagens variant; undrar om gästerna vet att det inte var planerat.',
    'Kylens plaster märktes upp med datum och innehåll — det tog kocken tre minuter i morse att gå igenom. Han vet nu vad han griper efter utan att titta. Den sortens ordning låter kvällen andas.'
  ],
  prep_room: [
    'Alla bord var utdukade tio minuter före öppning — värden gick själv igenom vinkeln på besticken. Hm, ingen bad honom göra det, men det märks när han står stilla framför ett bord och tittar tills han är nöjd.',
    'Ljusen på baren och i taket tändes samtidigt när klockan slog — någon hade lärt sig vår rutin utan att jag sa den. Undrar när det gick över från något jag ordnade till något som hände av sig självt.',
    'Stolarna stod rakt vid varje bord och två extra stod i förvaret utifall — värden hade räknat gästerna i bokningen och tänkt igenom både syn och nödsituation. Den sortens omsorg brukar man inte se förrän man saknar den.',
    'Vinlistan uppdaterades i god tid — priser stämde, servitörerna hade läst igenom den och båda kunde svara på "vad rekommenderar du". De kommer att lyckas byta öl mot vin på minst två bord i kväll utan att gästen tänker på det.',
    'Golvet vid entrén var moppat och nästan torrt när vi öppnade — värden ordnade det själv. Hm, den där sortens ordning brukar synas i första gästens hälsning; hon lämnade jackan utan att kolla var hon la handväskan.',
    'Bokningsöversikten låg framme på tre platser — värden hade tryckt en till varje station och gått igenom den med servisen. Alla vet vilket bord som väntar vem. Undrar om jag ens skulle märka om något gick fel i kväll, eller om laget har täckt luckorna innan de blev synliga.',
    'Bordskorten låg rätt och kalligrafin var lutad i samma vinkel på alla — någon hade tagit tid med det. Den sortens detalj registreras inte medvetet av gästen men gör att första ögonblicket vid bordet blir en aning bekvämare.',
    'Musiken var vald för kvällen — inte förra kvällens spellista utan något som passade väderrapporten och menyn. Undrar vem som gjorde det valet; det brukar vara jag men det är någon annan idag, och det låter rätt.'
  ],
  prep_delivery: [
    'Kylkedjan bröts aldrig — leverantören hade kylväskorna med sig och kocken tog emot dem in direkt i kylen. Temperaturloggen ligger bredvid för nästa vecka. Undrar när han började göra det utan att bli tillfrågad.',
    'Lådorna öppnades i rätt ordning — färskvaror först, torrvaror sist. Ingen behövde sortera om. Det är den sortens rutin som blir lugnare varje vecka utan att någon nämner det, och kvällen börjar tystare för det.',
    'Notorna signerades och lades i pärmen samma minut som de kom — kocken jämförde varje rad mot beställningen och märkte en avvikelse på ett kilo. Han ringde direkt. Hm, den där en-kilos-diskussionen är det som håller relationen ärlig i månader framöver.',
    'Leverantörens sammansättning stämde precis — inget saknades, inget kom i övertal. Vi bad om det vi behövde och fick det vi bad om. Undrar om det är för att kocken byggt relationen eller för att leverantören har haft en bra dag.',
    'Fisken vägdes vid ankomst och portionerades direkt — kocken vet nu exakt hur många förrätter han har att jobba med. Det tog fyra minuter i morse och sparar två vid varje beställning. Hm, det brukar kallas bra hushållning.',
    'Grönsakslådorna staplades snyggt utanför gångvägen — någon hade tänkt på flödet under prepen. Ingen behöver kliva över någonting. Undrar om det märks som en detalj eller om det är en av de saker som gör att kvällen bara känns lättare.',
    'Alla pallar kom in innan mise en place stängde — leverantören var i tid och laget hade en linje redo att bära in. Kvällen börjar i ordnat läge; det är sällsyntare än man tror att kunna säga det.',
    'Leverantörens temperaturlogg låg bredvid fisken vid mottagning — vi vet att den varit kall hela vägen. Kocken kan luta sig mot ett papper istället för sitt eget minne. Hm, det är den sortens småsak som gör att en kock kan lita på sin egen instinkt när det verkligen behövs.'
  ]
} as const;

// -------- carryover text — the one bottleneck line that fires mid-service
//          when the prep window ended with too many ignorance events.
//
// Same observer voice. Not a rules message; a moment noticed and
// wondered about.
export const PREP_CARRYOVER_TEXT =
  'Såsen som inte silades i morse dyker upp vid pass 7 — köket får hoppa över den och gästen får sin rätt naken. Hm, det är kvällens andra spår från förberedelserna som når fram till tallriken; jag hoppades att vi skulle klara oss från det.';

// -------- positive-events bank — ambient positive during service ----------
//
// The good moments a service produces when things are going right.
// Same voice as ambient — the proprietor noticing, not the system
// congratulating. Fires only during service post-prep, gated by
// calmness × competence.

// -------- value-quota bank — sentences som nämner sambandet mellan
//          pris/råvara och gästens val (§5.1 ORDER 117) ---------------
//
// Emitteras vid service-close när valueQuota() från valueQuota.ts har
// legat under- eller över tröskeln under servicen. Fördröjningen mellan
// spelarens prisbeslut och gästbeteendet (§2) gör orsak-verkan svår att
// avläsa i sim-siffror; strömmen bär sambandet i naturligt språk.
//
// Två polariteter — VALUE_LOW för dålig kvot (dyrt eller sparsamt),
// VALUE_HIGH för bra kvot (rimligt eller generöst). Observationstext:
// samma proprietor-röst som resten av strömmen. Prisen nämns i sin
// konkreta form (lammet, grädden, priset) — DoD §6.8 kräver att
// meningarna innehåller det som gästen faktiskt reagerar på.

export const VALUE_LOW_TEXTS = [
  'Två sällskap vände i dörren — priset på lammet nämndes när de tittade på tavlan, och sedan gick de vidare mot torget. Undrar om det var själva siffran eller att den var där utan förklaring; ett skyltat "höjt idag" hade kanske hållit dem kvar.',
  'Ett par läste priset på specialen två gånger — den yngre höjde ögonbryn, den äldre svepte ihop menyn och nickade mot uteserveringen tvärs över gatan. Hm, priserna märks nu på ett sätt de inte gjorde i förra veckan.',
  'Nya bordet vid entrén stannade vid menyn — de tittade på gästen som just fått sin tallrik, tittade på priset, gick ut igen. Undrar om det var portionen eller siffran som avgjorde; från kanten såg det ut som båda.',
  'Servitören hörde ett bord jämföra vår vagns pris med den som stod på Kalastorget förra veckan — de sa "hon tog sextio, vi står här på nittio". Hm, priset finns i minnet på gatan och vi konkurrerar mot igårs siffra utan att veta det.',
  'En stamgäst räknade högt vid notan — "två portioner för det här, är det värt?" Han la pengarna men han sa det. Undrar om han kommer tillbaka nästa vecka eller om han kommer med sällskap som lyssnat på hans räkning.'
] as const;

export const VALUE_HIGH_TEXTS = [
  'Ett bord frågade var vi köpt in lammet — de smakade och nickade mot varandra innan de sa något. Servitören svarade "lokalt, från gården uppåt sjön" och de log; hm, det där svaret betalar sig i tio nya gäster till helgen.',
  'En gäst räckte upp handen efter förrätten och bad att få tacka kocken personligen — hon nämnde grädden. Undrar om han vet att det märks direkt i första skedhalvan, eller om han bara ler och tar det för givet.',
  'Två nya sällskap ställde sig i kön efter att ha pratat med paret framför — priset kom aldrig upp, bara "smakade det verkligen". Hm, den där rekommendationen är vad ekologiskt betalar för sig med, inte i marginalen utan i kön.',
  'Ett bord bad om vår leverantörslista efter dessertsen — de driver en catering och ville köpa av samma. Servitören skrev ner det på en bakremsa; undrar om vi tänker på oss som en av leden i deras kedja, eller om det är dags att.',
  'Notan lämnades utan att någon räknade — bordet nämnde "det där var värt varje krona" på väg ut. Hm, det är den meningen priset finns till för; den kommer att sägas till andra i veckan utan att vi hör det.'
] as const;

export const POSITIVE_TEXTS = [
  'Bordet vid fönstret beställde en flaska till — de har suttit i två timmar och verkar inte ha någonstans att gå. Servitören föreslog en av dyrare sorterna utan att fråga om budget; hm, hon lärde sig det utan att vi lärde henne det.',
  'En stamgäst hälsade värden vid namn i entrén och de började prata om helgen — samtalet höll i sig tills paret satt sig. Undrar om värden vet att det är en av de gäster som kommer att nämna oss för andra i veckan.',
  'Kocken smakade av på pannan mitt i vändningen — han rättade sig själv med en nypa salt utan att någon frågat. Hm, den där automatiska självjusteringen är det som skiljer en tredje gången från en femtiote.',
  'Ett bord bad att få stanna kvar en stund efter kaffet — de vill sitta av vinet innan de går ut i kylan. Servitören sa att det var självklart utan att titta på klockan. Undrar om nästa bokning tar illa upp; för oss är det en gest som räknas.',
  'En förrätt gick ut med en spontan uppgradering — köket hade lite oxfilé över och la den till en bricka som beställt något enklare. Ingen frågade om att få det; gästen tittade upp och log. Hm, den sortens generositet syns i tipsen om två veckor.',
  'Notan lämnades med två sedlar dricks utöver summan — bordet sa något om att kvällen varit precis vad de behövt. Undrar vilken av små stunderna vi räknar den där responsen till.',
  'Ett bord bad om att få reservera igen till nästa vecka innan de gick — de hade inte ätit här förut. Värden bokade in dem själv i telefonen och skrev anteckningen om vad de gillat. Hm, det är hur en stamgäst börjar bli det.',
  'En gäst fångade värdens öga och nickade mot vinlistan — hon förstod utan att han sa något. Andra flaskan är redan på väg innan bordet visste att den ville ha den. Undrar var i värden det där instinktet sitter; jag kan inte peka på var vi tränar det.'
] as const;
