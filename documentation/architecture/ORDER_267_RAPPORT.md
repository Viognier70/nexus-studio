# ORDER 267 — Nexus v1 etapp 5: Vinbaren och introduktionen (rapport)

**Ordern** `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md`, etapp 5
**Speldesign** `documentation/foundation/vision/NEXUS_SPELDESIGN_V1.md`
**Gren** `order-267` från main `d925bbe`
**Vision Owners beslut före etappen (2026-09-25):** ta bort `ACTIVE_GUEST_CAP`, sittiden i `balance.ts` (60–90 min), mät fredag och lördag vecka 2 med vinbarens 20 platser; etapp 4:s DoD 1 flyttas hit.

## 1. Vad som byggdes

**Tryck i rummet (Vision Owners beslut)**
- `ACTIVE_GUEST_CAP` är borttaget (`arrivals.ts`).
- **Platsbuggen.** Städningen av `seatedIds` mätte gästens *nuvarande* position (`service.ts`). En gäst som fått en plats längre än 2 m bort föll ur listan medan hon gick dit, och platsen gavs bort igen. Mätt i vinbarens rum: 43 sittande gäster på 20 platser, 38 av dem på plats 8. Därför blev det aldrig kö, varken i ORDER 266:s mätningar eller i spelet. Städningen mäter nu mot gästens mål.
- Vinbaren har egna platsgrupper och en egen preferensordning (tvåbord, bar, lounger). Förut fick den bara 16 av sina 20 platser.
- **Sittiden (F31)** ligger i `balance.ts` `SITTING`:
  - servicen är 18–23 i speltid, alltså en halv spelminut per simsekund;
  - en gäst stannar 75 min (vardaglig) eller 90 min (formell), skalat med det sociala kapitalet mot startvärdet;
  - går beställningen långsamt blir sittningen längre.
- **Marknadens takt (F32).** Dagens tak fördelas över minuterna med öppna dörrar. Förut fylldes taket under första halvan av kvällen, och sedan kom ingen. Poolen (F21, 134) är oförändrad.

**Vinbaren i spelet**
- `WineBarScene` monterar `wineBarRoom` (20 platser, lounger, DJ-plats) via samma kontrakt som ölkrogen. `BrewpubScene.tsx` är nu en generisk `ContractRoomScene`.
- `V1_CLASS_TO_ROOM.vinbar` är `'vinbaren'`.
- Ett nytt spel och veckoharnessen startar i rummet (`makeNewGameState`).
- Sparfilen har format 2, och en fil i version 1 får rummet satt efter klassen när den laddas (F36).
- Namnskylten visar v1-klassen ("Vinbar …") i stället för det fasta "Restaurang".

**Introduktionen (F33)**
- Flödet: startrutan (Nytt spel, eller fortsätt ett sparat spel) → bussen (VS001: titeln, bussen, den andra sökande, registreringen) → Fortsätt → det strategiska spelet på måndag morgon utan verksamhet.
- Mentorn leder: öva i Stensöta, provet i Stensöta, banken. Bankens knapp heter "Öppna en vinbar". Sedan väljer spelaren namn, och mentorn tar avsked.
- **Regeln för den första verksamheten.** Den kräver brons i klassens huvudpaviljong ("startvalet mellan vinbar och ölkrog styrs av vad spelaren har valt att lära sig"). Klasstabellens krav gäller alla senare byten.
- Introduktionens besök tar ingen schemaplats. "Stäng dagen" är dold under introduktionen.
- `src/sim/introduction.ts`, `ui/MentorPanel.tsx`, `main.tsx` (flödet), `App.tsx` `onFinished`.
- **PLACEHOLDER_DESIGN:** mentorns gestalt. Mentorn talar i en textruta.

**Söndagstidningen (F34)**
- Söndag morgon öppnas "Söndagsnumret" av sig själv. Det kan läsas igen från morgonraden.
- Tidningen har fyra delar, alla i ord utan siffror:
  - en recension av kvällen som flyttade ryktet mest (veckans bästa eller sämsta);
  - marknaden;
  - banken (avräkningen i ord och vad som saknas för nästa klass);
  - nästa högtid.
- Kvällarna registreras när servicen stänger, också när den faller ihop. Förut försvann två kvällar av sex ur veckans lista.
- `src/sim/newspaper.ts`, `economy/NewspaperDialog.tsx`.
- **PLACEHOLDER_DESIGN:** tidningens utseende. Den visas som en enkel spalt.

**Slumpmålet (F35)**
- `testHarness/randomness.ts` spelar 1 000 veckor.
- Sviten kör fyra veckor; hela mätningen körs med `RANDOMNESS_WEEKS=1000`. Se §3.

**Förväntade fel**
- Tre av de fyra från etapp 4 är gröna igen:
  - ryktets band läses ur `reputation.ts`;
  - intäkten för båda servicerna vaktas mot ledgern i stället för den gamla tröskeln 13 000 SEK;
  - idle-kostnaden har en tolerans för flyttalsbrus.
- Kvar står `order265WeekHarness` (vägen tillbaka efter nedgradering). Det blir grönt i etapp 6.

## 2. Hur det verifierades i spelarens vy

**DoD — "en hel vecka kan spelas från bussen till söndagstidningen i spelarens vy, utan dev-flaggor": UPPNÅDD.**

- **Skriptet:** `frontend/scripts/order267-week-from-bus.mjs`. Produktionsbygget (`vite build` + `preview`), start på `/` utan flaggor, bara spelarens knappar och tangenter.
- **Utdata:** `frontend/reports/order267/week-from-bus.json` (fälten `steps`, `mentor`, `bank`, `nameBody`, `days`, `intervention`, `newspaper`, `errors`) och skärmdumparna `w01`–`w13`.
- **Steg:**
  - startrutan (`w01-startrutan.png`) → Nytt spel;
  - titeln och bussen (`w02-bussen.png`, `w03-framme.png`);
  - fram till den andra sökande med W, samtalet med E och en replik (`w04-samtalet.png`);
  - fram till registreringen med W, registrering med E (`w05-registreringen.png`) → Fortsätt;
  - mentorn (`w06-mentorn-ova.png`): övningsbesök i Stensöta, provet med brons (`w07-brons.png`);
  - banken, som säger "Du har visat att du kan vin och dryck" och erbjuder "Öppna en vinbar" (`w08-banken.png`);
  - namnet, där texten är "Banken lånar ut till en vinbar vid torget. Vad ska den heta?" (`w09-namnet.png`);
  - mentorns avsked och kameran i vinbaren (`w10-mentorns-avsked.png`);
  - måndag–lördag, med den första kvällen i vinbarens rum (`w11-forsta-kvallen.png`);
  - söndag morgon: tidningen öppnas av sig själv (`w12-sondagstidningen.png`).
- **Tid från "Nytt spel" till att verksamheten har ett namn:** 1,2 min i skriptet (fältet `minutesToBusiness`). En människa läser texterna och svarar själv på 13 frågor, vilket tar längre tid; målet är 20 minuter. Vision Owners provspel mäter det.
- **Inga sidfel** under veckan (`errors` är tom).
- **Söndagstidningen i spelet:**
  - Recensionen heter "En fredagskväll hos Vinbaren vid torget som inte höll": "Det var fullt, och kön ringlade ut mot torget. Ryktet fick sig en törn."
  - Marknaden: "Vinbaren fick de flesta av gästerna den kunde få den här veckan."
  - Banken, och nästa högtid: "Grythyttedagarna om två veckor."

**Etapp 4:s DoD 1 — "rycka in och se en gäst stanna som annars hade gått, och se det nämnas i strömmen": UPPNÅDD**, i samma körning (fältet `intervention`).
- Fredag vecka 1 (midsommar), i 2×:
  - kön har en gäst märkt "på väg att gå" (`w-fredag-1-ko-pa-vag-att-ga.png`);
  - spelaren väljer "Lugna gästen som väntar", och rummet täcks: "Du står med gästen i kön. Resten av rummet ser du inte just nu." (`w-fredag-2-rummet-skymt.png`);
  - när rummet syns igen står i strömmen: "Du lugnade gästen i kön. Gästen stannade kvar i stället för att gå." (`w-fredag-3-strommen.png`).
- Kvällsberättelsen samma kväll: "Du ryckte in vid rätt tillfälle, och en gäst som var på väg att gå stannade."

**Fel som verifieringen hittade**
- **Vinbarens rum saknade `seatFacings`.** Gästrenderingen kastade ett fel varje bildruta, 24 518 sidfel i en körning, och sittande gäster ritades inte. Rättat i `wineBarRoom.ts`, och `InteriorGuests.tsx` tål nu ett saknat fält.
- **Dialogens knapp i VS001.** Playwrights klick träffade panelen i stället för knappen, se §5.
- **Gången till registreringen.** Ett sidosteg i skriptet gick för långt på en lång bildruta, och skriptet gick nu rakt fram. Det gäller skriptet, inte spelet.

**Trycket, i simuleringen med spelarens rum.**
- `frontend/src/strategic/testHarness/__tests__/order267Pressure.test.ts` skriver `frontend/reports/order267/pressure.json` (vecka 2, vinbarens 20 platser, brons i tre, standardfrö).
- Testet hävdar Vision Owners mål ur samma körning, med fälten `maxQueue`, `gaveUp` och `sittingGameMinutes`:
  - måndag och tisdag: ingen kö, ingen ger upp;
  - fredag och lördag: kö, och gäster som ger upp i kön;
  - sittiden inom 60–90 spelminuter.

**Svit:** typecheck och build är gröna. Vitest: 2024 godkända, 1 förväntat fel (`order265WeekHarness`, etapp 6) och 2 överhoppade (mätningar).

## 3. Veckoharnessens tal

**Veckoharnessen** (`frontend/reports/order267/week-harness.json`, skriven av `order267WeekHarness.test.ts` med `WRITE_REPORTS=1`)
- Ryktet går aldrig under golvet: fältet `lowestReputation` är 0,10, och det nås i nedgraderingsscenariot.
- **Vanlig vecka i vinbarens rum:** servicen faller ihop torsdag och lördag, med färre gäster de kvällarna (`days[].guests`). Kollapsen är den gamla mekaniken (`collapse.ts`, svagaste kompetensaxeln), som med kön nu får tryck att verka på.
- **Nedgradering och väg tillbaka:** food trucken redan vid första avräkningen, sedan ingen verksamhet, och ingen väg tillbaka. Det är den kända avvikelsen från etapp 4 (`order265WeekHarness`, `it.fails`), som byggs om i etapp 6.

**Slumpmålet** (`frontend/reports/order267/randomness.json`, 1 000 veckor, fält `winShare`, `meanResultSek`)
- Den bättre förberedda spelaren vinner **55 %** av veckorna (`betterWins` 550, `ties` 2). Speldesignens mål är ungefär 75 %.
- Genomsnittligt veckoresultat är 21 224 SEK mot 19 886 SEK. Skillnaden är liten mot spridningen mellan veckor.
- **Tolkning:** två medaljsteg till betyder för lite mot veckans slump. Marknadstaket ger A fler gäster på fulla kvällar, men resten av kvällen, med väder, kollaps och personalens tempo, väger tyngre.
- **Möjliga vägar (Vision Owners beslut):**
  1. Låta kunskapen verka i servicen, inte bara i taket (t.ex. kollapsrisk eller tempo efter medaljer).
  2. Minska slumpen i kvällen (kollapsens sannolikhet, vädrets spann).
  3. Definiera "bättre förberedd" bredare (morgonens satsningar, menyn, personalen) och mäta igen.

## 4. Avvikelser från speldesignen och varför

- **Slumpmålet är inte nått** (55 % mot ungefär 75 %), se §3. Etappens DoD kräver att mätningen redovisas, inte att målet nås. Kalibreringen är ett beslut om spelbalans.
- **Introduktionens första verksamhet (F33).** Speldesignen har ett prov i introduktionen men kräver brons i tre för vinbaren. Den första verksamheten kräver brons i huvudpaviljongen.
- **Tidningens recension (F34)** väljer kvällen som flyttade ryktet mest.
- **Interiörens synlighet.** Grenen `order-173` byggdes inte om:
  - ORDER 174 Fynd 2 (spelarens byggnad renderad två gånger) är redan löst på main: `LANDMARK_BUILDING_IDS` innehåller `PLAYER_BUSINESS_BUILDING_IDS`, och `OsmBuildings` filtrerar bort den.
  - `NeighbourhoodFade` från grenen ändrar delade material (alla hus inom 25 m, och därmed materialen i hela byn) och bryter skuggregeln (ORDER 055).
  - I skärmdumparna syns interiören i servicevyn och i närvyn efter namnet utan att väggar eller grannhus skymmer (`w10-mentorns-avsked.png`, `w11-forsta-kvallen.png`, `w-fredag-1-ko-pa-vag-att-ga.png`).
- **Vinbarens särdrag.** Rummet har lounger, DJ-plats och bar. Smårätter, vinlista och ett mindre kök är ännu dagens meny och kök. De hör till klassens eget spel och följer när vinbarens gästlogik byggs ut.
- **Engelsk text** står kvar i äldre paneler (strömmen, menyn, satsningarna). Den översätts i en egen omgång (CLAUDE.md regel 7).
- **Mentorns ruta** ligger över personalpanelen till vänster under introduktionen. Mentorn är platshållare.

## 5. Öppna frågor

- F31 sittiden och kvällens klocka, F32 marknadens takt, F33 den första verksamheten, F34 tidningen, F35 slumpmålets definition, F36 sparfilen (`NEXUS_V1_OPPNA_FRAGOR.md`).
- **Slumpmålet (§3):** vilken väg?
- **Dialogens knapp i VS001.** Playwrights klick på "Fortsätt" träffade panelen i stället för knappen: dialogen ritas om medan den visas. Skriptet klickar direkt på knappen. En människa bör prova att den svarar på första klicket.

## Starta spelet (SPELSTOPP 1)

```bash
cd frontend
npm install
npm run build && npm run preview   # http://localhost:4173
```

Öppna `http://localhost:4173/` utan flaggor. Välj **Nytt spel**. Bussen går av sig själv. Gå med W A S D och se dig om med musen. Prata med den andra sökande med E och registrera dig vid bordet med E. Klicka **Fortsätt** och följ mentorn. En vecka är måndag–lördag med en kväll per dag. Söndag morgon kommer tidningen.

**Platshållare (PLACEHOLDER_DESIGN):**
- mentorns gestalt (textruta);
- söndagstidningens utseende;
- spelarens figur vid insatsen (rummet täcks med en mening);
- Teaterns frågor (lånade från två paviljonger);
- det mesta av utseendet utanför rummen: Designs leveranser 1 och 2 i designspecifikationen saknas ännu.
