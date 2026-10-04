# ORDER 297 — Byn i kvällsljus (rapport)

**Underlag:** Designs leverans Byn i kvällsljus, 10-01 (`documentation/leveranser/`), med D3, omtaget av 10-02 (`nexus-leverans-2026-10-02-byn-omtag-2`).
**Vision Owner 2026-10-04:** "Fortsätt sedan med ORDER 297, byn i kvällsljus, med D3". Ansiktena på manusfigurerna kopplas in "gärna i 297".

Gren `order-297` från `main`. Varje tal pekar på en fil under `frontend/reports/order297/`.
- `check-1440x900.json` och `check-1280x720.json`: produktionsbygget, med fyra nivåer vid 18.20, 19.30, 21.00 och 22.50, fredagens sparfil.
- `ute/check-1440x900.json`: kl. 19.45, hus med sällskapet ute.
- `raketen/`: kontrollen från ORDER 299, körd om efter att rummet vänts.
- `ljus-kalibrering.json`: luminansen mot Designs bilder.

Designs `villageEvening.ts` ligger oförändrad i `src/strategic/village/`. Allt nedan läser sina tal därifrån: LIGHTS, COLOURS, BLEND och LEVELS.

## 1. Entrén som data, rummet mot Torget

`venueEntrance.ts` (Designs fil) ger entrén. `interiorLayout.ts` `playerObb` bygger rummets ram ur den.
- Rummet är vänt mot Torget: vinkeln är −1,693 och entrén står vid (30,79, −23,34).
- Testet `order297Byn.test.ts` prövar att entrén vetter mot Torget.

## 2. Nivåerna 660 / 90 / 42 / 24 m

`camera/eveningLevels.ts` ger nivåernas mål i rummets ram, som Designs `toWorld`. `viewLevels.ts` läser dem.
- FOV interpoleras logaritmiskt från 34° till 42° (`fovForDistance`).
- `maxDistance` är 760.
- `LevelBar` väljer den närmaste nivån.

**Produktionsbygget** (`check-*.json` `camDistance`/`camTarget`/`camFov`):
- kameran landar på 659–660, 90, 42 och 24 m;
- FOV är 34, 34, 34 och 42 i båda storlekarna.

## 3. Kvällsljuset

`EveningLighting.tsx` styrs av kvällens gång e (`clock.ts` `eveningProgress`, `balance.ts` `VILLAGE_EVENING` 18.00 → stängning + upphämtning).
- Himlen, månen och dimman följer e.
- Exponeringen följer nivån.
- Ljusnivån kan ställas i menyn ("Ljusnivå").

Spelets palett är ljusare än Designs. Därför har kvällsljuset en faktor per nivå (`PALETTE_BY_LEVEL`), kalibrerad mot Designs bilder.

**Luminans i bildens mitt** (`ljus-kalibrering.json`):

| Nivå, kväll 19.30 | Spelet | Design |
|---|---|---|
| Byn 660 m | 72,2 | 73,6 |
| Kvarteret 90 m | 80,7 | 81,6 |
| Gatan 42 m | 98,6 | 98,8 |
| Krogen 24 m | 115,8 | 141,4 (krogen-2-24m-kon) |

- Byn i skymningen (18.20): 81,8 mot 95,2.
- Byn på natten (22.50): 56,2 mot 61,0.
- **Krogen är mörkare än Designs bild.** Där dominerar teaterns egna ljus (ORDER 290), och Designs bild visar en kö i fullt ljus vid dörren. Jag har inte jagat ikapp den skillnaden.

## 4. Gatlyktorna

`StreetLamps.tsx` är skriven om efter Designs `byKvall.js`:
- en lykta var 30:e meter längs bilgatorna, växelvis på var sin sida;
- ingen lykta i vårt rum;
- var och en tänds på sitt eget e, med fladder;
- ljuscirkeln tonar ned på byns nivå;
- de sex lyktorna närmast dörren har en riktig ljuskälla.

**Produktionsbygget** (`streetLamps`, `streetLampsLit`): 187 lyktor. Vid 18.20 är 55–93 tända medan kameran går nedåt genom nivåerna. Från 19.30 är alla 187 tända.

## 5. Fönstren och krogarnas lägen

`VillageWindows.tsx` lägger fönster bara på hus som OSM-husen ritar, med husets väggar. Det är 2 341 fönster i hem, skolor, hotellets rum och de andra krogarna. Reglerna kommer ur LIGHTS:
- ett hem är mörkt medan sällskapet är ute;
- campus följer studenterna;
- krogarna lyser efter läge.

`ProceduralFacades.tsx` släcker också sina hem medan sällskapet är ute (sista committen).

**Produktionsbygget** (`villageWindowsLit`):
- 1 234 tända fönster vid 18.20 och 1 804 vid 19.30;
- 1 479–1 699 vid 22.50, beroende på nivå;
- 0 efter stängningen (23.40, `roomGrade` `afterClose`).

**Hus med sällskapet ute** (`ute/check-1440x900.json`, kl. 19.45):
- 4–10 hem har sällskapet ute (`villageOutHomes`);
- 3–5 av dem är ProceduralFacades-hus och mörka (`villageHomesDark`);
- resten ritas av VillageWindows, som redan följer regeln.

Krogarnas fyra lägen kommer från `venueLight.ts`: förberedelserna (köket lyser), öppet (allt lyser), städningen (köket lyser efter stängning) och släckt. Glorian växer med gästerna. Sällskapen kommer från hus inom 260 m från krogen, och studenterna från campus om krogen ligger inom 380 m.

## 6. Taket som lyfts

`village/roofBlend.ts`:
- mellan 40 och 26 m lyfts vinbarens tak 5 m och tonar ut;
- skuggan följer `depthWrite` (ORDER 055);
- väggarna kapas under 33 m;
- scenljuset följer krogens läge.

Rummets nålar, ringar och symboler syns först när taket har lyfts.

## 7. Kön vid vår dörr

`balance.ts` `VILLAGE_QUEUE` läser servicens tal: platserna, tålamodet, gränsen för otålig och köns tak.
- Vid full kö väljer sällskapet den närmaste öppna krogen.
- Det hände aldrig i fredagens sparfil, där kön aldrig nådde taket (`villageTurnedAway` = 0 i alla stopp).
- Unittestet täcker det.

## 8. Gästerna på nivåerna

`VillageLife.tsx`:
- figurerna ritas i nivåns förstoring närmare än 135 m;
- längre ut är sällskapen lyktor;
- i kvarteret är de en fläck;
- gästflödets band ritas inte.

**Produktionsbygget** (`villageOnWay`, `villageGroups`): vid 19.30 var 8–10 sällskap på väg och 5–12 grupper syntes.

## 9. Namnen i byn

När namnen krockar läggs vår krogs namn först och ritas överst. Strängarna är Designs `villageEveningStrings.ts`, inlagda i `nexusStrings.ts` med `sv` och `en`.

## 10. Ansiktena på manusfigurerna

`scene/scriptFaces.ts` har Designs tidslinjer ur D1 (`stamningManus` `initialFaces` och `beats.face`):
- **Födelsedagen:** ansiktena byter efter rakets sista svar.
- **Gästen som vinglar:** de byter efter händelsens första svar.
- Personalen är nöjd.

Uttrycken byts en i taget från 0,6 s, med 0,18 s mellan gästerna. Testet står i `order297Byn.test.ts`.

## 11. ORDER 299 efter att rummet vänts

`raketen/check-*.json`:
- rummet tar 71,1 % (1440 × 900) och 70,6 % (1280 × 720) av bildens mitt;
- hastigheten går 4× → 1× → 4×;
- kameran går in till 6,09–6,43 m;
- mätaren går nöjd → glad efter rätt svar och glad → missnöjd efter fel.

## 12. Bildfrekvens

Produktionsbygget, `fps` per stopp: 25–45. Lägst är byn på 660 m: 25,4–34,9. Kvarteret och gatan ligger på 33–45, och storleken 1280 × 720 ligger något lägre.

## 13. Inte byggt, avvikelser

- **Designs färgkorrigering och vinjett.** Ingen efterbehandling utan beslut (CLAUDE.md regel 6).
- **Kyrktornets ljus, lastbilens ljusslinga och sjöns färg.** Inte gjorda.
- **Skenet per nivå.** Bara delvis, som det fanns förut.
- **Riktiga ljuskällor vid de andra krogarna.** Inte gjorda, av hänsyn till bildfrekvensen. Ljuscirklar och glorian står i stället.
- **Stoppet 21.00** fick inte sina nivåtangenter fullt ut: en raket låg uppe, och kontrollen väntar ut den. Därför står krogen tre gånger i den stoppen.
- **Krogens luminans** är lägre än Designs bild, se §3.

## 14. Tester och bygge

- `sim/__tests__/order297Byn.test.ts`, med 8 tester.
- Hela sviten: 2 326 gröna och 15 överhoppade.
- Typecheck och bygge är gröna.
- Kontrollen i spelet: `scripts/order297-check.mjs` (`CHECK_CLOCKS`, `CHECK_SIZES`).
