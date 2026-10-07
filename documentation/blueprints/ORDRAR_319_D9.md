# ORDER 319 och D9: liv och autenticitet vid foodtrucken

Beslut från Anders 2026-10-07 efter provspel av b412a276. **Går före resten av 306b.** Code gör klart det steg av 306b som pågår, committar på grenen och tar sedan 319.

## Vad provspelet visade

- **Gästerna dyker upp och försvinner** mitt i bilden, och föremål hoppar fram och försvinner.
- **Inga frågor eller situationer** kommer kopplade till foodtrucken och dess sammanhang.
- **Allt är passivt.** Spelaren tittar på, men har inget att göra.
- **Platsen saknar det som gör den verklig:** nyfikna förbipasserande, uteservering, servering, produkter, servetter, sopkorg och väder.

**Principen (konstitutionen):** simuleringen skapar problemen, och kunskapen löser dem. Vid luckan ska det hela tiden hända saker som spelaren kan läsa av, förstå och handla på.

---

## ORDER 319a – Rätta det som är trasigt (Code, först)

1. **Ingen gäst får uppstå eller försvinna i bild.** Gäster kommer gående från byns gator och går därifrån till en gata eller ett hus. Gör ett test: ingen gäst skapas eller tas bort inom kamerans synfält vid nivå Z, eller närmare än 40 m från vagnen.
2. **Inga föremål får hoppa fram.** Leta reda på orsaken, som avstånd för detaljnivå, saker som laddas sent eller att flera saker försöker synas på samma ställe. Tona in och ut i stället för att byta på en gång. Rapportera vad det var.
3. **Situationerna i foodtrucken:** kontrollera och rapportera:
   - om foodtruckens egna situationer, med de 20 frågorna som beslutades 2026-10-07 i del 3, är inbyggda;
   - hur många som utlöses per kväll i harness och i spelet.

   Målet är 4–6 per kväll, som i 314. De ⚖-märkta frågorna (3, 4, 9, 10, 15 och 20) är dolda tills de är granskade, men de övriga 14 ska vara med. Saknas de: bygg in dem nu, i formen som gäller för situationer.
4. **Situationerna ska synas innan de kommer.** En situation utlöses av något som syns: en gäst går fram till luckan och pekar, det börjar regna eller en leverans kommer. Kortet kommer inte ur tomma intet.

## ORDER 319b – Nyfikna gäster (Code, efter 319a)

Det här blir foodtruckens grundloop mellan situationerna. Kunskapen omvandlas till gäster.

1. **Förbipasserande stannar.** De saktar in, läser menyskylten, känner doften från grillen och pekar. En del går vidare och en del ställer sig i kön.
2. **Spelaren kan prata med en nyfiken gäst** genom att klicka på hen. Då kommer en kort fråga, en enda fråga utan kvitt eller dubbelt, ur foodtruckens frågebank, till exempel *"Vad är det för korv?"* eller *"Är den här stark?"*
   - **Rätt svar:** gästen ställer sig i kön, och ibland tar hen med sig en vän.
   - **Ok:** gästen tvekar och köper kanske.
   - **Fel:** gästen går vidare.
   - Krediterna är små, och evidensen bokförs i portfolion.
3. **Takten:** högst en nyfiken gäst åt gången, med en markering ovanför huvudet (Design ritar den). Den som inte får något svar går vidare efter 20 s.
4. **Harness:** mät hur mycket de nyfikna gästerna lägger till i intäkt för spelartyperna. De ska ge en tydlig skillnad mellan den som kan och den som inte kan, men inte bli den största inkomstkällan.

## ORDER 319c – Platsen och vädret (Code, med D9)

1. **Uteserveringen:** ståbord, en bänk och marschaller eller värmare kvällstid. Gästerna äter vid borden, torkar sig med servetten och slänger den i sopkorgen innan de går.
2. **Serveringen vid luckan:** korv i bröd eller på tallrik, drycker, senap och ketchup, en hållare med servetter, menyskylten och rök från grillen.
3. **Det som blir kvar:** skräp och servetter på borden när det är mycket folk. Det städas av medhjälparen, eller av spelaren om ingen har tid.
4. **Vädret:**
   - **Sol:** fler förbipasserande.
   - **Regn:** gästerna söker skydd under markisen, färre stannar och borden blir blöta.
   - **Blåst:** servetterna blåser iväg, och markisen fladdrar.
   - **Svalt på kvällen:** gästerna samlas kring värmaren.

   Vädret påverkar antalet gäster och kan utlösa situationer, till exempel *"Det börjar regna. Vad gör du med borden?"* Använd byns befintliga väder om det finns, annars en enkel prognos per kväll som också syns på morgonen.
5. **Test:** varje föremål på platsen finns med i layoutkontrollen, och ingenting står i vägen för gästernas gångvägar.

Ordning för Code: **319a → 319b → 319c**, sedan resten av 306b. Rapportera och merga efter varje del, så att Anders kan provspela emellan.

---

## Till Design: D9 – Livet vid luckan

1. **Gäster som är nyfikna:** klipp för att sakta in, läsa skylten, lukta och peka, och tveka eller ställa sig i kön. Ta med markeringen som visar att en gäst är nyfiken och går att prata med.
2. **Gäster som äter:** klipp för att stå vid bordet och äta korv, torka sig med servetten, slänga den i sopkorgen och gå därifrån.
3. **Föremålen:**
   - ståbord och bänk;
   - marschaller eller värmare;
   - sopkorg;
   - hållare med servetter;
   - senap och ketchup;
   - menyskylt (svensk grill);
   - korv i bröd och på tallrik, och drycker;
   - rök från grillen.
4. **Vädret vid vagnen:** sol, regn med blöta bord och gäster under markisen, blåst med servetter som flyger och fladdrande markis, och sval kväll med folk kring värmaren.
5. **Ljuset en kväll:** från dagsljus till skymning, med marschallerna tända.

Använd spelets riktiga karta (`grythyttan-world.json`) för vagnens plats vid Torget. Leverera i det vanliga formatet, med kontrollbilder i 1440 × 900 och 1280 × 720.
