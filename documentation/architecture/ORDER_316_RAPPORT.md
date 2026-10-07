# ORDER 316 — Fikat efter stängning (rapport)

**Underlag:**
- `~/Downloads/BESLUT_2026-10-07.md`, del 1 (Anders 2026-10-07: "Beslut från Anders, kör").
- Utkastet `documentation/blueprints/ORDER_316_UTKAST/DILEMMAN.md`.
- Instruktionen i sessionen: texter märkta ⚖ byggs in med `legalReviewed: false` och visas inte förrän de är granskade.

**Gren:** `order-316` från `main` (`0d6acc1e`).

Varje tal pekar på en fil under `frontend/reports/order316/`.

## 1. Vad som är byggt

**Dilemmana.**
- De tolv dilemmana står som data, med metadatan skild från texten:
  - `content/fika/dilemmas.ts`: tema, utlösare, vem som frågar, nivån per svar, ekonomin och lagarna;
  - `content/fikaStrings.ts`: frågan, svaren, förklaringen och lagtexten, på svenska och engelska.
- Texten finns i strängtabellen som `strings.fika` (`TABLE.fika` i `nexusStrings.ts`).
- Den engelska texten är ny.

**Kvällen.**
- Kvällens dilemma väljs när servicen stänger (`sim/fika.ts planFika`). Det gäller både den vanliga stängningen i `reducer.ts` och kvällen som faller ihop i `collapse.ts`.
- Kortet kommer efter lärdomen och berättelsen, före byn i kväll och butiken (`EVENING_STEP` `'fika'`, `scenario/FikaScreen.tsx`).
- Högst ett dilemma per kväll. Har ingen utlösare hänt kommer inget dilemma.

**Valet av dilemma** läser inte simuleringens slump (`rngState`) utan `hashKey(frö, dag)`. Fikat flyttar därför inte resten av kvällen.

## 2. Anders svar på frågorna i 316

1. **Nivån syns mjukt.** "Väl grundat", "Delvis grundat" eller "Svagt grundat" står ovanför förklaringen (`fika-grade`), utan rött.
   - Testet prövar ordningen och att ingen klass eller stil på kortet har rött, fel eller fara.
   - Testet prövar också att `fika.css` saknar rött.
2. **Samma dilemma kan komma igen**, tidigast efter 14 dagar (`FIKA.repeatAfterDays`). Det kommer alltid i en ny kväll.
   - Portfolion är `state.fika.log`, med dagen, dilemmat, svaret och nivån. När dilemmat kommer igen får posten `changed`.
   - Kortet visar det förra svarets nivå och raden "Ditt svar har förändrats" eller "Du svarade som förra gången".
3. **Talen** står i `balance.ts FIKA`:
   - trivsel +2/+1/−2 och lojalitet +1/0/−1;
   - krediter i Phronesis 3/1/0;
   - "Gå hem" −1 i trivsel för hela laget.
   - En poäng trivsel är 0,03 på skalan 0–1 (`wellbeingPerPoint`). En poäng lojalitet är 0,05 (`loyaltyPerPoint`), och lojaliteten börjar på 0,6.
   - Den som frågade påverkas dubbelt.
4. **Lagtexten** (lagarna och `legalNote`) visas bara när dilemmat har `legalReviewed: true`. Alla åtta ⚖-märkta har `false`, och resten av dilemmat visas.
   - De åtta är kylen, allergin, baren, gränsen, skämten, beskedet om schemat, passen och golvet.
   - Granskaren är inte utsedd.

## 3. Ändringarna i texterna

- **Kylen:** "stod öppen i ungefär en timme i kväll". C är delvis grundat. Förklaringen säger att laxen ska förvaras kallare än crème fraichen.
- **Gränsen och skämten:** märkningen är AFS 2023:2. AFS 2015:4 står inte i datan.
- **Beskedet om schemat:** märkt ⚖ (medbestämmandelagen och kollektivavtal). Lagtexten om MBL är skriven och dold.
- **Diskaren heter Linnea.** Hon nämns i dricksen, kollegan som är långsam och genvägen vid stängning.
- **Avvikelse, "schemat":** ordet "schema" får inte stå i spelarens text (ORDER 300, testet `order300Borjan` §3). Det betyder morgonens val där. Fyra repliker är därför omskrivna:
  - "hur vi gör schemat" → "hur vi fördelar passen";
  - "att schemat inte bygger på kön" → "att passen inte fördelas efter kön";
  - "Ni får se schemat" → "Ni får se passlistan";
  - "vi ser över schemat" → "vi ser över passen".
- **Lagarna** står som nycklar i datan (till exempel `SFS 1977:1160`). Namnen står på båda språken i `strings.fika.laws`.

## 4. Utlösarna

Utlösarna läser kvällens tillstånd (`sim/fika.ts triggerHolds`):
- situationer som kommit i kväll, till exempel kylen, allergin, den berusade och vasen;
- eftersläp i köket och dagens inköp;
- dricksen, minst 600 kr;
- fredag och lördag;
- ändring i laget (`teamChangedDay`, satt vid anställning och uppsägning);
- sällskap som vände vid full kö, och gäster som gav upp eller gick;
- trivsel och ork.

**Mätt i vinbaren:** den bästa spelaren, fyra veckor och tre frön (`reports/order316/utlosare.json`).
- Dilemma kom 53 av 72 kvällar (`none` 19).
- 10 av 12 dilemman kom (`counts`).
- Beskedet om schemat kräver en anställning, och harnessens spelare anställer inte. Skämten kräver trivsel under 0,7, och det nåddes inte.

**Trösklarna för ork och trivsel** är satta efter vad spelet når vid stängning (`utlosare.json` `staminaMin`, `wellbeingMin`):
- orken är 0,92–1,0 och trivseln 0,75–0,99;
- lägsta ork under 0,94 (`lowStaminaBelow`) och lagets snitt under 0,95 (`tiredTeamBelow`);
- trivsel under 0,7 (`lowWellbeingBelow`), alltså under vilovärdet 0,75, så att ett vanligt lag inte räknas.

## 5. Följderna och ekonomin

**Trivseln** gäller lagets roller i simuleringen (`state.staff`).
- Värden, servitören och kocken har roller i laget. Frågar Per, Sara eller Jonas får deras roll dubbelt.
- Sommeliern, bartendern och diskaren finns i rummet men inte som roller i laget. Frågar Elin, Mira eller Linnea får laget den vanliga ändringen, och den dubbla delen går bara till lojaliteten.

**Lojaliteten** är ny och står per person i `state.fika.loyalty`. Den läses ännu inte av något annat i spelet.

**Ekonomin** (`balance.ts FIKA.economy`):

| Dilemma | Svar | Följd |
|---|---|---|
| Kylen | A | kassan −900 kr |
| Kylen | C | kassan −600 kr |
| Passen | A | en extra hand, kassan −500 kr |
| Kylen | B, D | tillsynen kommer oftare tre kvällar |
| Golvet | B, C | tillsynen kommer oftare tre kvällar |
| Gränsen | B | Elin funderar på att sluta: lojaliteten −3 extra |
| Passen | B | Jonas funderar på att sluta: lojaliteten −3 extra |
| Allergin | A | kortet säger att Allergenkort finns i butiken |

- Tillsynen: när den kan komma blir den kvällens situation med sannolikheten 0,35 (`inspectionShare`, `sim/incidents.ts chooseIncident`).
- **Inte byggt:** att någon säger upp sig eller blir sjuk, klagomål, en arbetsskada och en recension på rad i morgontidningen. Det står i utkastet som risker. Här syns det bara som lojalitet och som tillsynens risk.

**Gå hem** finns alltid. Ett dilemma som står obesvarat när kvällen tar slut räknas som Gå hem (`goHomeFika` vid natten).

## 6. Rättat: personalens ork sjönk aldrig

- **Felet:** `reducer.ts` tömde orken bara när `day.doorsOpenAt !== null`, men fältet nollas i samma stund som dörrarna öppnar. Orken stod därför på 1,0 hela kvällen sedan ORDER 303.
- **Rättningen:** villkoret är nu `day.doorsOpenedThisService`.
- **Följd:** personalen går saktare och hanterar situationer något sämre mot slutet av kvällen (`staffCondition.ts slowFactor`, `staffEffect`).
- Säsongernas harness körs om i 315c, med 315:s kalibrering. Talen i 314:s tabell gäller orken som den var.

## 7. Harness

- Spelarna svarar på fikat som på situationerna (`weekHarness.ts answerFika`). Den bästa väljer väl grundat och den sämsta svagt grundat.
- Den som ignorerar svarar inte, och det räknas som Gå hem.

## 8. Körningar och spelarens flöde

- `npm run typecheck`: grönt. `npm run build`: grönt.
- `npx vitest run`: 183 filer gröna och 13 hoppade; 2 507 tester gröna, 2 förväntade fel (312b och 314) och 18 överhoppade.
  - Lastsvepet `order131LoadSweep` gick över 300 s en gång när hela sviten körde parallellt. Ensamt och i nästa hela körning var det grönt.
- **Nytt test:** `src/sim/__tests__/order316Fikat.test.tsx`, 13 fall. Det prövar:
  - texten på båda språken och Anders ändringar;
  - utlösarna och upprepningen efter två veckor;
  - följderna och Gå hem;
  - kvällens ordning;
  - kortet: nivån ovanför förklaringen, inget rött och lagtexten dold.
- **Mätningen:** `src/strategic/testHarness/__tests__/order316Utlosare.test.ts` (`ORDER316_OUT=1`) skriver `utlosare.json`.
- **Spelarens flöde i produktionsbygget:** `scripts/order316-fika-flow.mjs`, efter `order289-evening-flow.mjs`. Det använder sparfilen måndag vecka 2 i vinbaren och spelar två kvällar på engelska och svenska (`fika-flow-en.json`, `fika-flow-sv.json`, `ok: true`).
  - Ordningen båda kvällarna: S1 → T1 → R1 → L1 → K1 → fika → J1 → shop → morning.
  - Kväll 1: den äldre gästen. Svaret A ger "Väl grundat" ovanför förklaringen.
  - Kväll 2: kollegan som är långsam. Gå hem ger raden "Chefen hade inte tid i kväll."
  - Ingen lagtext står på sidan (`legalShown`, `lawTextOnPage` false).
  - Bilderna heter `fika-<sv|en>-<1|2>-fraga.png` och `-svar.png`.
- Skriptet `order289-evening-flow.mjs` väntar på `event-stream` och känner inte igen överföringen (T1). Det är äldre än 290 och inte rättat här.

## 9. Iakttaget, inte rättat

Överföringens skärm (`ui/evening/TransferScreen.tsx`) visar monogrammet "IM" vid Åsas rad. 313 bytte monogrammet till Å på andra ställen.

## 10. Frågor

1. **Lojaliteten** finns nu men läses inte av något annat. Ska låg lojalitet få en följd, till exempel att personen slutar?
2. **Granskaren** av de åtta ⚖-märkta dilemmana.
3. **Formen:** kortet är byggt av designsystemets enkla delar. Ska Design rita fikat?
