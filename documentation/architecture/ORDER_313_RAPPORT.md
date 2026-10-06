# ORDER 313 — Åsa, början och tydligheten (rapport)

**Underlag:** `~/Downloads/ORDRAR_313_D6.md`, Anders provspel 2026-10-06. Beslut från Anders, kör.

**Gren:** `order-313` från `main` (`03eefec4`).

Formerna (Åsas modell, porträtt och pratbubbla, avsändarmärkena, teckenförklaringen, kurskortet, "Byn just nu" och det låsta) kommer från Design i D6. Här är logiken och texten byggda, med enkla former i designsystemet som byts när D6 kommer.

## §1 Intendent Åsa

- Mentorn heter **Intendent Åsa** (en. *Intendant Åsa*) i alla texter:
  - `role.mentor`, `introduction.mentor`, `screens.mentor.label` ("Intendent Åsa · från Campus");
  - bankens repliker ("Åsa sa att du gjorde provet i dag …");
  - händelseströmmen (`simEvent.mentor`, "Åsa: …");
  - öppningens nål (`prologue.mentor`, "Intendent Åsa, din mentor");
  - Designs referenskopia `design/openingStrings.ts`.
- Per står kvar som hovmästare.
- Monogrammet visar **Å** (`Monogram.tsx` hoppar över titeln).
- Testet `order313AsaBorjan.test.ts` §1: "Ingrid", "Mentorn" och "The Mentor" finns inte i strängtabellerna, varken på svenska eller engelska.
- Ingrid finns kvar bara i kodkommentarer i öppningen (`OpeningMentor.tsx`, `openingTimeline.ts`, `oppningManus.js`). Figuren i öppningen byts när D6 levererar Åsas modell.
- `order273NoSwedishPlayerText`: egennamnet "Åsa" tillåtet.

## §2 Spelaren börjar från noll

- `sim/introduction.ts`:
  - `investLocked(s)` är sant när `s.startLocked` är satt och ingen medalj finns (`firstExamPassed`).
  - `startLocked` sätts när ett nytt spel börjar (`beginIntroduction`). Spel och fixturer från före ORDER 313 saknar flaggan och låses inte.
- **Låst:**
  - satsningarna på morgonen: `pickActivity` i reducern; i panelen `MorningActivityPanel` med raden "Öppnas när du klarat ditt första prov";
  - butiken: `SHOP_BUY`, `SHOP_SLOT`, `BUY_SUPPLIER`, `OPEN_EQUIPMENT` och `BUY_EQUIPMENT` i reducern; i `ShopScreen` raden `shop-locked`, och knappen säger "Öppnas när du klarat ditt första prov";
  - "Stå för ditt svar": `canStartBack` och `whyNotBack` ger `'locked'`, med samma rad.
- **Öppna under tiden:** att öva och göra prov i Måltidens hus.
- **Åsas replik när låset släpper:** *"Nu har du visat vad du kan. Banken lyssnar, och du kan börja satsa."*
  - I introduktionen står den först i bankens steg (`introduction.steps.bank`).
  - Klarar spelaren sitt första prov efter introduktionen (till exempel med foodtrucken utan medalj) visas den en gång som Åsas kort (`mentor.ts` steget `unlocked`, `SAY_UNLOCKED`).
- **Harness och trappan:**
  - Säsongernas harness (`order296Karnan.test.ts`) börjar efter bankmötet med tre bronsmedaljer (`randomness.ts PLAYERS.baseline`). Låset gäller bara före första medaljen och släpper därför direkt i harness, även med `startLocked` satt (testet §2, fjärde fallet).
  - Trappan från 311b påverkas inte. Ingen ny körning behövdes för att visa det.
  - Harness prövar inte vägen före banken (övning och prov).

## §3 Avsändarna

- `ui/SenderTag.tsx` sätter ett märke överst i meddelandet: Åsa, Banken, Per, Byn eller Måltidens hus (`strings.senders`). Det finns i:
  - Åsa: M1, M2 och kortet när låset släpper (`MentorPanel.tsx`), raden i morgonens schema (`DayActionBar.tsx`) och kommentaren i rummet (`MentorComment.tsx`);
  - Banken: varje replik i `BankDialog.tsx` (`Say`);
  - Per: nålens kort (`HostViews.tsx`);
  - Byn: recensionskortet (`MorningReviewLine.tsx`), tidningen (`NewspaperDialog.tsx`) och byns händelser (`VillageNotice.tsx`);
  - Måltidens hus: provets resultat (`MaltidensHusDialog.tsx`).
- Åsas repliker står i en enkel pratbubbla (`nx-speech`) bredvid monogrammet. Designs form i D6 ersätter den.
- **Utan avsändare än:** personalens repliker i rummet (`RoomNotices.tsx`, "personalen tog över"). De är varken Åsas, Bankens, Pers, Byns eller Måltidens hus. Frågan går till Design i D6: ska de få ett eget märke?

## §4 Tre sätt att kunna

- Texten står ordagrant enligt specen, på svenska och engelska (`houseIntro`):
  - Episteme, Techne, Phronesis;
  - slutet ("Det räcker inte att veta …");
  - utmaningen i kursiv;
  - "Läs mer" → Kunskapsgrunden i Måltidsbiblioteket.
- Hänvisningen till Anders är borttagen från skärmen. Den står kvar i Kunskapsgrunden och i eftertexterna.
- Tester:
  - `order301Kunskapsgrund.test.ts` är uppdaterat: ingen Crichton, Herdenstam eller Anders i `houseIntro` på något språk;
  - `order283SommelierDrafts.test.ts` har ordningen Episteme, Techne, Phronesis.

## §5 Laget

- Överst: *"Laget är de som jobbar i kväll. Den du anställer stannar i sju dagar."*
- Varje rad, både de anställda och de som går att anställa, säger vad, vad det kostar och vad det ger. Till exempel: *"Servitör · 1 000 kr/kväll · tar beställningar och bär ut till borden"*.
- Kostnaden är den som ekonomin drar: dagslönen gånger kvällens koncept (`sim/economy.ts wageFactor`, samma som `dailyWagesSek`).
- Avvikelse mot specens exempel: laget har rollerna värd, servitör, kock och lärling (`simulation/team.ts`). Sommeliern finns som figur i rummet men inte som anställningsbar roll, så "Sommelier · 1 200 kr/kväll" finns inte.

## §6 Kurskortet

Kortet (`ShopScreen.tsx`, `shop-card-rows`) har fyra rader i ordning:
1. **Vad kursen lär ut** (`ab.<id>.teaches`, ny för alla 13 förmågor), till exempel "Sommeliern lär sig sälja in en hel flaska."
2. **Vad den ger** (`ab.<id>.fx`). Sommeliern har specens text: "Vid loungerna säger fler ja till en flaska i stället för glas."
3. **När den gäller:** "Från i morgon kväll."
4. **Vad den kräver:** ✓ eller ✗ och medaljen, och "Kostar {pris} krediter · du har {n}".

Knappen är avstängd med texten "Du behöver {n} krediter till" när krediterna inte räcker.

## §7 Teckenförklaringen

- `ui/StatusLegend.tsx` visar personalens ringar i rollens färg, orken (fylld och streckad ring) och trivseln (tre lägen), samt gästernas fem stämningssymboler.
  - Färgerna och symbolerna läses ur samma källor som renderingen: `staffRing.ts ROLE_COLOUR`, `staffStatus.ts ORK_RING` och `WELLBEING_SYMBOL`, `MoodSymbol` med `MOODS`.
  - Förklaringen står i hörnet i statusläget (S) och i menyn under "Spelets regler" (`RulesPanel`).
- Avvikelse: `staffStatus.ts ROLE_RING` har en annan färg för kocken (`#ffffff`) än `staffRing.ts ROLE_COLOUR` (`#7fa8ff`). Förklaringen följer ringen under figuren (`staffMarks`).

## §8 Fel i rummet

**Servitörerna på samma plats.**
- `wineBarDirector.ts workSpot` ger varje bord fem arbetsplatser: mitten och 0,7 m och 1,4 m åt sidorna längs bordet. Den som tilldelas en uppgift tar den första plats där ingen annan i personalen står under samma tid. Passet och baren hämtas på samma sätt.
- Testet `order313Arbetsplatser.test.ts` kör en full kväll med alla tjugo platserna. Två i personalen som står stilla närmare än 0,3 m från varandra:
  - före: 74 prov (`reports/order313/arbetsplatser-fore.json`);
  - efter: 0 (`arbetsplatser.json`).
  - Den första rättningen gällde bara borden och gav 17 kvar, alla vid passet (CORR_X, 2,7). Därför gäller arbetsplatserna också passet.

**Flaskorna.** Rekvisitan ur `tableware.ts` före ordern:
- Inkopplad via regissörens ägarbok (`theatreStage.ts LEDGER_PROP`): tallriken (`plate`), glaset (`wineGlass`) och flaskan (`wineBottle`). Flaskan fanns bara vid loungerna, där sommeliern bär den.
- I händerna: menyn, blocket, notamappen, servetten, gaffeln, kniven och brickan.
- Vinväggens flaskor ritas av rummet (`wineBarRoom.ts`), inte av `tableware.ts`.
- **Inte inkopplat:** `sidePlate`, `soupBowl`, `waterGlass`, `waterBottle`, `carafe`, `spoon`, `breadBasket`, `decanter`, `flute` och `crate` i vinbarens vardag. Händelsernas rekvisita går genom `eventTheatre.ts`.
- **Inkopplat nu** (`TheatreStage.dress` och `props`):
  - fyra vinflaskor på bardisken, i barens östra ände utanför gästernas platser;
  - en vattenkaraff (`carafe`) på varje bord (lounge och tvåbord) så länge något av sällskapets står där.
- Testet `order313Arbetsplatser.test.ts`, andra fallet.

## §9 Byn just nu

- Panelen (`ui/host/VillageNowPanel.tsx`, under bandet Byn i kväll under servicen) visar varje krog med antal gäster nu, en pil och spelarens krog markerad.
  - Pilen är uppåt när krogen drar gäster minst lika fort de senaste 10 spelminuterna som de 10 dessförinnan, och nedåt annars.
  - Raden under sammanfattar, till exempel: *"Torgkrogen drar flest gäster i kväll. Du är tvåa."*
- Reglerna står i `sim/villageNow.ts`. Gästerna kommer ur `villageLive`, samma som bandet.
- Avvikelse: bandets placering räknar nöjda gäster vid bord (ORDER 303 B), medan panelen räknar gäster, som specen säger ("antal gäster nu"). Placeringen i bandet och raden i panelen kan därför skilja sig.

## Körningar och kontroll i spelarens flöde

- `npm run typecheck`: grönt. `npm run build`: grönt.
- `npx vitest run`: 182 filer gröna, 12 hoppade; 2 498 tester gröna, 1 förväntat fel (vinbarens kameraprov, ORDER 312b), 16 överhoppade.
- **Nya tester:**
  - `src/sim/__tests__/order313AsaBorjan.test.ts`: §1–§3, §5–§7 och §9;
  - `src/strategic/scene/__tests__/order313Arbetsplatser.test.ts`: §8.
- **Spelarens flöde i produktionsbygget** (`scripts/order313-check.mjs`, 1440 × 900): startskärmen, Nytt spel, namnet, öppningen hoppas över, regelkortet, Åsas första skärm, morgonen och Måltidens hus. Texten läses ur sidan.
  - På svenska och engelska (`reports/order313/check-sv.json`, `check-en.json` `checks`):
    - Åsa på M1, med avsändaren Åsa;
    - inget "Ingrid" eller "Mentorn";
    - Tre sätt att kunna i ordningen Episteme, Techne, Phronesis, utan hänvisning till Anders.
  - De åtta satsningarna står låsta med raden (`activitiesLocked` 8).
  - Bilderna heter `check-<sv|en>-01-asa.png`, `-02-morgonen.png` och `-03-tre-satt.png`.
- **Inte kontrollerat i spelarens flöde:**
  - kurskortet, laget, teckenförklaringen, Byn just nu och rummet (arbetsplatserna, flaskorna). De kräver en verksamhet och en kväll;
  - låset efter introduktionen (foodtrucken utan medalj).
  - De prövas i testerna ovan.

## Väntar på Design (D6)

Åsas modell, porträtt, pratbubbla och tre klipp; avsändarmärkena; teckenförklaringen; kurskortet; Byn just nu; det låsta i början. Öppningens figur står kvar som Ingrids tills modellen kommer.
