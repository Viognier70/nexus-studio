# För granskning efter ORDER 323

*Samlad 2026-10-10 på Anders beslut efter ORDER 323. Underlaget kommer ur spelets källfiler på `main` efter ORDER 323 (`0ba2c48d`). Inget i filen är ändrat i spelet än.*

Filen har två delar:

1. Foodtruckens fem nya fikadilemman, på svenska. Texterna är utkast som skrevs i ORDER 323 §5 och har inte granskats.
2. Listan över termval, onaturlig engelska och svenska fel från genomgången av de engelska texterna i ORDER 323 §7. Det som var rent fel rättades redan i ordern (se `documentation/architecture/ORDER_323_RAPPORT.md` §7). Här står det som väntar på ett beslut.

**Vad granskaren ombeds göra**

- Del 1: läs varje dilemma som en riktig kväll i en foodtruck i Grythyttan. Gäller frågan något som händer i en vagn? Är de tre svaren rimliga och olika? Stämmer nivåerna, och förklarar förklaringen varför? Kontrollera lagtexterna mot lagrummen.
- Del 2: välj en term per rad, och godkänn eller ändra förslagen.

---

## Del 1. Vagnens fem fikadilemman

**Hur fikat fungerar.** Efter stängning kommer någon i laget fram med en kopp och ställer en fråga. I foodtrucken är det alltid Nils, medhjälparen i vagnen. Spelaren väljer ett av svaren och får en nivå. Bedömningen är mjuk och utan rött. Spelaren kan också gå hem utan att svara. Dilemmat väljs bland dem vars utlösare har inträffat under kvällen. Vinbarens tolv dilemman kommer aldrig i vagnen, och vagnens fem kommer aldrig i vinbaren eller bistron.

Varje nivå ger samma följder i alla dilemman (`frontend/src/sim/balance.ts` `FIKA`):

| Nivå | Lagets trivsel | Nils förtroende | Krediter i Phronesis |
|---|---|---|---|
| Väl grundat | +2 | +2 | 3 |
| Delvis grundat | +1 | 0 | 1 |
| Svagt grundat | −2 | −2 | 0 |

Utöver detta har vissa svar en egen följd, som står i kolumnen *Följd* nedan. "Nils funderar på att sluta" sänker hans förtroende med ytterligare 3.

**Lagtexterna (⚖).** Två av dilemmana har en lagtext. Den visas inte i spelet förrän en granskare har bekräftat den (`legalReviewed`).

**En fråga till granskaren.** I kylboxen kostar svar A 600 kr, som "slänger en del av varorna". Svaret säger att allt som legat varmt slängs. Ska det i stället kosta som att slänga alla varor (900 kr, som i vinbarens kyldilemma)?

Källor: frågor, svar och förklaringar finns i `frontend/src/content/fikaStrings.ts` (svenska och engelska sida vid sida). Nivåer, utlösare och lagrum finns i `frontend/src/content/fika/dilemmas.ts`.

### `fika-vagn-kylboxen` (tema: food-safety)

**Utlöses av:** situation i kväll (`ft04-leveransen`, `ft11-slut`); varor köpta i dag.

**Nils frågar:** ”Kylboxen under disken stod i solen hela eftermiddagen, och korvarna låg på tolv grader när vi öppnade. Jag grillade dem ändå, de blir ju genomvarma. Gjorde jag fel?”

| Svar | Nivå | Text | Följd |
|---|---|---|---|
| A | Väl grundat | Det som legat varmt slänger vi, och vi skriver upp temperaturen. I morgon står boxen i skuggan, med en termometer i. | Det kostar 600 kr. |
| B | Svagt grundat | Grillen tar det mesta. Det gick ju bra. | Risken för tillsyn är högre de närmaste kvällarna. |
| C | Delvis grundat | Nästa gång frågar du mig innan du grillar något som legat varmt. | – |

**Förklaringen:** Svinnet vägdes mot gästernas säkerhet. Att korven blir varm på grillen tar inte bort allt som hunnit växa medan den låg varm. En vagn i solen behöver en rutin för kylan, inte en person som ska minnas att fråga.

**Lagen (⚖, visas inte förrän den granskats; `legalReviewed: false`):** Livsmedelslagen och EU:s förordning om livsmedelshygien kräver att företagaren har en egenkontroll som håller varorna i rätt temperatur, också i en vagn. Lagrum: SFS 2006:804, EG 852/2004.

### `fika-vagn-kon` (tema: service)

**Utlöses av:** gäster som gav upp; sällskap gick vidare från kön; situation i kväll (`ft01-rusningen`).

**Nils frågar:** ”Kön var så lång vid sju att några gick innan de hann beställa. En sa att han aldrig kommer tillbaka. Jag stod och vände korv och kunde inte göra något.”

| Svar | Nivå | Text | Följd |
|---|---|---|---|
| A | Väl grundat | Nästa gång går en av oss längs kön, tar beställningar och säger hur lång väntan är. Då kan de välja själva. | – |
| B | Svagt grundat | Folk får vänta. Det är en foodtruck. | – |
| C | Delvis grundat | De kvällar det är mycket stryker vi en rätt från tavlan, så går det fortare. | – |

**Förklaringen:** Kön vägdes mot vad vagnen hinner. Den som vet hur lång väntan blir kan välja att stanna; den som inte vet går. En kortare meny hjälper takten men tar bort något som gästerna kom för.

**Lagen:** ingen lagtext till det här dilemmat.

### `fika-vagn-dricksen` (tema: equality)

**Utlöses av:** kvällens dricks över gränsen.

**Nils frågar:** ”Det låg mycket i dricksburken i kväll. Förra veckan lade du den i kassan. Är dricksen till vagnen eller till oss som står i luckan?”

| Svar | Nivå | Text | Följd |
|---|---|---|---|
| A | Väl grundat | Dricksen delas lika mellan oss som jobbade i kväll, och vi säger det högt, så att alla vet hur det går till. | – |
| B | Svagt grundat | Den går till vagnen. Det är vagnens gäster. | – |
| C | Delvis grundat | Ta du den i kväll, du slet mest. | – |

**Förklaringen:** Vad som är rättvist vägdes mot att regeln är känd i förväg. En regel som alla känner till skyddar mot misstankar, också när summan är liten. Att ge den som slet mest kan kännas generöst men gör nästa kväll oklar.

**Lagen:** ingen lagtext till det här dilemmat.

### `fika-vagn-benen` (tema: work-environment)

**Utlöses av:** någon i laget har lite ork vid stängning; lagets ork i snitt låg; någon i laget trivs dåligt.

**Nils frågar:** ”Mina ben är slut. Vi står fem timmar i luckan utan att sätta oss, och i kväll var det kallt i vagnen. Hur länge ska det vara så här?”

| Svar | Nivå | Text | Följd |
|---|---|---|---|
| A | Väl grundat | Vi tar en paus var, i tur och ordning, varje timme. Och jag skaffar en matta att stå på och ett element vid luckan. | – |
| B | Svagt grundat | Så är det att jobba i en vagn. | Nils funderar på att sluta. |
| C | Delvis grundat | Sätt dig när det är lugnt. | – |

**Förklaringen:** Tröttheten vägdes mot att vagnen ska hålla öppet. Pauser som är bestämda i förväg blir av; pauser när det är lugnt blir sällan av. En varm och skonsam plats att stå på är arbetsgivarens sak, inte den anställdes.

**Lagen (⚖, visas inte förrän den granskats; `legalReviewed: false`):** Arbetsmiljölagen och Arbetsmiljöverkets föreskrifter kräver att arbetsgivaren förebygger ohälsa, också av långvarigt stående arbete och kyla. Arbetstidslagen kräver rast efter högst fem timmars arbete. Lagrum: SFS 1977:1160, AFS 2023:2, SFS 1982:673.

### `fika-vagn-kortet` (tema: communication)

**Utlöses av:** situation i kväll (`ft10-kortet`, `ft13-priset`); fredag eller lördag.

**Nils frågar:** ”När kortläsaren krånglade sa jag åt två gäster att de fick betala med Swish eller gå. Den ena blev sur. Det står ingenstans hur man kan betala hos oss.”

| Svar | Nivå | Text | Följd |
|---|---|---|---|
| A | Väl grundat | Vi sätter upp en skylt om hur man kan betala, och har en reserv när tekniken krånglar, en andra läsare eller att de får betala nästa gång. | – |
| B | Svagt grundat | Den som inte kan betala får ingen mat. | – |
| C | Delvis grundat | När läsaren krånglar bjuder vi. | – |

**Förklaringen:** Gästen vägdes mot kassan. Det som står på skylten i förväg undviker grälet vid luckan, och en reserv gör att ett fel i tekniken inte blir ett fel mot gästen. Att bjuda varje gång blir dyrt och säger inget om nästa gång.

**Lagen:** ingen lagtext till det här dilemmat.

---

## Del 2. Termval, onaturlig engelska och svenska fel

I spelet visas svenska som standard. Engelska är ett val i menyn. Alla rader nedan gäller texter som spelaren ser. Förslagen kommer från genomgången i ORDER 323 §7 och är inte införda.

### 2.1 Samma svenska term med olika engelska namn

| Svensk term | Engelska i spelet i dag | Förslag |
|---|---|---|
| kassan (spelarens pengar) | "Cash", "Takings" (samma mätare), "the till", "the account" (risktexterna) | "cash" för spelarens pengar, "till" bara för den fysiska kassan. Mätarens två etiketter ska vara lika. |
| ork / trivsel | "Stamina" eller "Energy" / "Wellbeing" eller "Morale" | ett par, till exempel Stamina / Morale |
| Kvarteret (nivå C) | "The District", "Quarter", "the quarter", "the district", "The block" (Byn i kväll) | "The district" överallt |
| krogen (spelarens) | "the bar" ("Back to the bar", "The bar puts together …"), "Your place" | "Back to your place", "The house puts together …", "your venue's contact" |
| satsningar (morgonens) | "Initiatives", "Investments", "Investment: …", "Investment effect" | "Initiatives" också i bokföringen |
| dryckeslistan | "Wine list" (morgonens inköp) och "drinks list" | "Drinks list", eftersom listan har öl |
| vagnen | "Van" (Byn i kväll, `cmp.van`), annars "truck" | "Truck" |
| sopbilen | "refuse truck" och "bin lorry" | "bin lorry" överallt |
| kronor i engelsk text | "kr" på sju ställen, annars "SEK n" | "SEK n" överallt |
| golvet (inkomstgolvet) | "the floor", som krockar med matsalen ("To the floor") | "the income floor" |
| Kvällen / Kvällskassan i HUD:en | båda heter "Tonight" | Kvällskassan: "Tonight's takings" |
| hovmästare / kock / diskare | "head waiter" eller "Maître d'" / "cook" eller "Chef" / "kitchen porter" eller "dishwasher" (fikat) | en per roll, till exempel "maître d'", "chef", "kitchen porter" |
| grepp (förståelse, ORDER D8) | "Half grip", "Full grip"; i rekvisitan betyder "grip" att hålla något | "Half grasp", "Full grasp". Krockar med det etablerade "the double grip", så det ska avgöras tillsammans. |
| fikats nivåer | "Well/Partly/Weakly founded" på fikakortet, "grounded" i skalan på samma skärm | "Well/Partly/Weakly grounded" |
| insatsen vid avräkningen | "the rest of the stake", medan samma skärm säger "outlay" | "the rest of the outlay" |
| pulten | "desk", "host's desk", "Host stand", "the stand" | "host stand" överallt (delvis infört) |

### 2.2 Onaturlig engelska (betydelsen är rätt)

| Var | Svenska | Engelska nu | Förslag |
|---|---|---|---|
| `nexusStrings` `ladder.truckMenu` | Varorna köps in efter hur kön går. | The goods are bought in as the queue goes. | Stock is bought in to match the queue. |
| `nexusStrings` `guests.lost` | Sällskapet gick med, en till. | Their party left with them, one more. | The rest of their party left too (one more). |
| `nexusStrings` `morningBuy.less` / `more` | Ett parti färre / till {vara} | One batch less {name} / One more batch {name} | One batch fewer: {name} / One more batch: {name} |
| `nexusStrings` `newspaper.reviewTitleBad`, `simEvent.cutShort` | … som inte höll / köket höll inte. | … that did not hold / the kitchen did not hold | … that fell apart / the kitchen could not keep up |
| `nexusStrings` salvage `options.b` | Kallt på tallrik som i går | Cold on the plate, as yesterday's | Served cold on the plate, as yesterday |
| `nexusStrings` `village.compare.place` | Din krog kom 3 av 7 i gäster i kväll. | Your place came 3 of 7 in guests tonight. | Your place ranked 3 of 7 for guests tonight. |
| `nexusStrings` `rules.rule1` | bokslut under noll | accounts below zero | settlements below zero (som risktexterna) |
| `fikaStrings` `wellbeingUp` / `Down` | Laget trivs bättre / sämre. | The team feels better / worse. | The team's morale rises / drops. |
| `d6Strings` `start.invest.sub` | Banken lånar ut till kvällen | The bank lends for the evening | The bank lends you money for the evening |
| `moodStrings` `mood.why.bday.gestRight` | Elin bjuder grannarna på fördrinken … | Elin brings the neighbours the aperitif … | Elin treats the neighbours to an aperitif … |
| `pyramidStrings` `pyramid.full.sub` | Vad, hur, när och varför. Du visste alla tre. | What, how, when and why. You knew all three. | Räknar upp fyra och säger tre, på båda språken. Formuleringen avgörs av den som äger pyramiden. |
| vinbar `vb02-rosen.guestLine.b` | Vi har cyklat från Hjulsjö. | … from the next village | We've cycled all the way from Hjulsjö … (ortnamnet står kvar enligt regel 7) |
| vinbar `vb07-provningen` steg 2, svar C | Omtänksamt, men ett eget glas är fortfarande att sitta bredvid. | … a glass of their own is still sitting on the side. | … a glass of their own still leaves them on the sidelines. |
| vinbar `vb21-skuren-hand` steg 2, svar C | Laget blir tunt. | The team gets thin. | Sending them home leaves the team short-handed. |
| vinbar `vb29-brak` steg 3, svar C | prata avsides | talk aside | take them aside |
| vinbar `vb32-fodelsedagen` steg 3, svar A | be sällskapet vänta med sången | ask the party to wait with the song | ask the party to hold off on the song |
| vinbar `vb32-fodelsedagen.guestLine.a` | sitter två gäster i ett affärssamtal | two guests sit in a business conversation | two guests are deep in a business discussion |
| vinbar `vb22-recensenten` steg 2, fel | Gästen skriver en lång rad. | The guest writes a long line. | The guest writes at length. |
| vinbar `vb40-karaffen.guestLine.b` | I dag är det femton år sedan. | It's fifteen years ago today. | We were married fifteen years ago today. |
| meny `mn06-lingon` steg 3, svar B | Den alkoholfria lingondrickan: … | The alcohol-free lingonberry sparkling: … | The alcohol-free lingonberry drink: … |
| nyfikna `n03.options.b` | … som namnet säger … | … as the name says … | … as the Swedish name says … ("crispy onions" säger inget om ugnen) |
| nyfikna `n06.options.b` | Skånsk, det tar alla. | Skåne mustard, everyone has that. | Skåne mustard, everyone goes for that. |
| foodtruck `ft10-kortet`, personalen lyckas | Swish går bra! | Swish is fine! | We take Swish! |
| foodtruck `ft11-slut` steg 1, svar A | Precis. Sex tar en korv … | Just. Six take … | Only just. Six take … |
| foodtruck `ft08-regnet` steg 3, svar A | Det håller både värmen och kvällen. | It keeps both the warmth and the evening. | It saves both the heat and the evening. |
| foodtruck `ft02-drycken` steg 2, svar D | … kostar på alla andra. | … costs on everyone else. | … and costs you on every other sale. |
| foodtruck `ft02-drycken` steg 2, svar B | ställer ut skärmtaket | put out the shelter | put out the awning (som i ft01) |
| foodtruck `ft03-rullen` steg 3, svar C och D | Rullar löst … / Delar den i två … | Rolls it loosely … / Cuts it … | Roll it loosely … / Cut it … (som de andra svaren) |
| foodtruck `ft05-allergin` steg 3, svar B | Rätt. Kylan först, sedan anteckningen … | Right. The cold first, then the note … | Right. Get it cold first, then make the note … |

### 2.3 Frågebanken och utkasten

`bank.text.en.json` prövas mot källfilen i dokumentationen och ändrades därför inte i ORDER 323. Ändringen behöver göras i båda samtidigt.

| Fråga | Engelska nu | Förslag |
|---|---|---|
| `stensota-brons-02` | … a fatty, well-hung rib-eye? | … a fatty, well-aged rib-eye? ("well-hung" har en grov dubbelbetydelse) |
| `kalastorget-brons-06` | I don't think we ordered this bottle on the bill. | I don't think we ordered this bottle that's on the bill. Could you look into it? |
| `stensota-brons-10`, svar 2 | … clear acidity and little sweetness | … clear acidity and a touch of sweetness (som `stensota-brons-03`). Gränsfall: förklaringen säger "low sweetness". |
| utkastet `somm-dg2`, svar 3 | … harder to measure but easier to understand | … harder to measure but has great power to build understanding ("hög förståelsekraft") |
| utkastet `somm-h2`, svar 2 | Stand it upright for 24 hours … | Svenskan har "i rumstemperatur", som saknas i engelskan. |

### 2.4 Svenska fel

| Var | Svenska nu | Förslag |
|---|---|---|
| meny `mn02-pinot` steg 2, svar C | … i ett vitt glas | … i ett vidt glas (engelskans "wide glass" är rätt) |
| foodtruck `ft06-stangningen` steg 2, svar A | Kyler dem i varmhållningen och säljer dem i morgon. | Motsäger sig själv. Engelskan följer svenskan, så båda behöver skrivas om. |
| foodtruck `ft13-priset`, halvt grepp | … varje korv ger nu nästan hälften så mycket. | 13 av 23 kr är 57 %: "… bara lite mer än hälften så mycket", på båda språken. |
| utkastet `somm-h7`, förklaringen | mustig | möglig |
| `nexusStrings` | Måltidbiblioteket | Måltidsbiblioteket |
| `pyramidStrings` `pyramid.full.sub` | Du visste alla tre. | Se 2.2. |
