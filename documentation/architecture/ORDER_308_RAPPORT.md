# ORDER 308 — Öppningen före första morgonen (rapport)

**Underlag:** Anders beslut 2026-10-05: Designs omtag av öppningen (`documentation/leveranser/nexus-leverans-2026-10-04-oppningen-omtag/`, LEVERANSNOT, `oppningManus.js`, `openingStrings.ts`, prototypen och skärmarna) ersätter den tidigare D2. Den spelas före första morgonen i ett nytt spel.

Gren `order-308` från `67650e0`. Talen och bilderna pekar på `frontend/reports/order308/`.

## 1. Var öppningen ligger

Ordningen är nu:
- startskärmen → Nytt spel → namn och samtycke → **öppningen** → första morgonen (regelkortet, sedan mentorn).

Öppningen ligger **efter** namn och samtycke. Leveransnoten säger inget om kortet. Den säger att öppningen slutar i den svärta som nästa scen tonar upp ur, utan klipp (LEVERANSNOT 2026-10-03 §4). Bussen är borttagen ur starten (ORDER 300 §4), så första morgonen tar bussens plats. Ett kort mellan svärtan och morgonen skulle bryta det. Språket och namnet är också valda innan öppningen börjar.

Flödet är en liten reducer, `strategic/opening/newGameFlow.ts`, som `main.tsx` använder. Öppningen spelas i samma `StrategicApp` som morgonen. Morgonen tonar upp ur svärtan på 1 s, utan att scenen laddas om.

## 2. Hur den är byggd

Allt ligger i `frontend/src/strategic/opening/`.

- **Manuset** är Designs fil, oförändrad: `oppningManus.js`, med typerna i `oppningManus.d.ts`.
- **Tidslinjen** (`openingTimeline.ts`) är prototypens funktioner som rena funktioner av tiden: bilderna och övertoningarna, svärtan, raderna, nålarna, kvällen och kamerorna.
- **Byn** är spelets egen scen under ett överlägg. Kameran ställs varje bildruta på manusets läge, utan dämpning. Flygturen landar i spelets nivåer (`camera/eveningLevels.ts` `levelTarget`), som Designs `frameAt`.
- **Kvällen** går från e 0,05 till 0,34 och byns ljusnivå är 0,9, som i manuset. Gatlyktorna och fönstren tänds efter den (`reports/order308/check.json` `summary.streetLampsLit`).
- **Vinbaren** är två små teatrar på egna dukar (`openingBar.ts`): spelets `wineBarRoom.ts` och spelets teater (`eventTheatre.ts`), med teaterns ljus och strålkastare. Den tomma vinbaren och glimtarna spelas ur manusets `emptyBar()` och `glimpses()`.
- **Ingrid** står i dörren till Måltidens hus från 30 s (`OpeningMentor.tsx`), i spelets figurrigg och klippet `staff.idle`. Hon tittar ut mot vägen en gång.
- **Rummet är tomt** när taket lyfts: vinbarens egna figurer är dolda medan öppningen pågår (bild `oppning-taket-lyfts-1280x720.png`).
- **Raderna och nålarna** ligger över bilden i Designs mått: rad 1 och 2 nere till vänster, en rad i taget efter flygturen, nålarna med ring, stjälk och namn (`opening.css`). Nålarna följer spelets kamera.
- **HUD:en och byns etiketter** är dolda medan öppningen pågår. Regelkortet syns först efter (`summary.rulesHiddenDuringOpening`, `summary.villageLabelsDuringOpening`).

## 3. Hoppa över, minskad rörelse, inget nät

- **Hoppa över** syns efter 3 s, som noten säger. En knapp, en tangent eller ett klick tar spelaren till svärtan och morgonen. En tangent före 3 s gör ingenting och går inte vidare till spelet.
- **Den som har sett öppningen** (`nexus.openingSeen` i webbläsaren) kan hoppa över den direkt.
- **Minskad rörelse** (`usePrefersReducedMotion`): kameran står still i varje bild, raderna lyfts inte. Klippen, texten och figurerna är desamma. Bilderna hålls på 660 m, 42 m med nålen, 12 m i vinbaren, glimtarnas första ruta och 36 m vid Ingrid (`openingTimeline.ts` `REDUCED_HOLD`).
- **Inget hämtas från nätet.** Prototypen hämtar three.js och Babel från ett CDN; spelet bygger allt i kod. Under hela kontrollen gick inga anrop utanför förhandsvisningens server (`summary.externalRequests`).

## 4. Texten

Spelets rader står i `content/nexusStrings.ts`, grenen `prologue`, på svenska och engelska. Grenen heter `prologue` eftersom `opening` redan är dörröppningens panel. Texten är Designs, ordagrant. Designs fil ligger oförändrad i `content/design/openingStrings.ts` och är facit för testet. Prototypens panel (`open.*`) används inte i spelet. Spelet lägger till två egna: `skip` (Hoppa över / Skip) och `label` (Öppningen / The opening).

## 5. Kontrollen i spelarens flöde

`scripts/order308-check.mjs`, produktionsbygget, 1280 × 720, `reports/order308/check.json`:
- **Ordningen** start → registrering → öppning → regelkort (`summary.order`).
- **Skärmarna** vid Designs sex tider, med texten som syns i varje (`summary.shotsWithText`): `oppning-texten`, `-nalen-din-vinbar`, `-raden-tom`, `-raden-det-du-vet`, `-nalen-ingrid`, `-raden-stjarnan`. Dessutom `oppning-taket-lyfts` och `oppning-morgonen-efter`.
- **Ingrid** syns vid nålen (`summary.mentorAtPin`).
- **Hoppa över:** dold före 3 s, tangenten före 3 s ignorerad, knappen vid 3 s, och tiden från klick till regelkortet (`summary.skipHiddenBefore3s`, `earlyKeyIgnored`, `skipShownAt3s`, `skipToRulesMs`).
- **Minskad rörelse:** kamerans avstånd står still i flygturen och i nedstigningen (`summary.reducedCameraStillInFly`, `reducedCameraStillInDescend`; avstånden i `flows.reduced`).
- **Engelska:** raderna och nålen på engelska (`summary.english`, bilderna `*-en-1280x720.png`).
- **Fel och nät:** inga sidfel, inga anrop utåt (`summary.errors`, `summary.externalRequests`).

## 6. Layouten

`scripts/order300-layout.mjs` mäter nu öppningen (skärmen `oppningen`, med Hoppa över) och hoppar sedan över den. Alla 13 skärmar i alla fem storlekar är godkända, 65 av 65, öppningen inräknad (`reports/order308/layout/layout.json`). Bilderna av öppningen ligger i samma mapp; övriga bilder är inte incheckade.

`order300b-check.mjs` och de fem skripten som startar från början (`order267-week-from-bus`, `order270-evening-from-bus`, `order271-winebar-figures`, `order271-dod-from-start`, `order301-check`) hoppar över öppningen. De fem är syntaxkontrollerade men inte körda hela vägen.

## 7. Tester och bygge

- `sim/__tests__/order308Oppningen.test.ts`: flödet, tidslinjen, Hoppa över, minskad rörelse, byns nivåer, nålarnas ankare, Ingrid utanför väggen, strängarna sv och en mot Designs fil, och inget nät.
- `sim/__tests__/order308OppningenOverlagget.test.tsx`: överlägget i jsdom med falsk klocka (tangent före och efter 3 s, knappen, minskad rörelse).
- `sim/__tests__/order300Borjan.test.ts` §4 läste `type Flow` ur `main.tsx`; det läser nu reducern (`newGameFlow.ts`).
- **Typecheck och bygge** är gröna.
- **Hela sviten:** 2 368 gröna, 16 överhoppade och 3 röda i en körning. En var `order300Borjan` §4 ovan, rättad och grön. De två andra tog för lång tid under belastning och var röda redan före ordern på `67650e0` (samma körning utan ändringar): `smoke.test.ts` (30 s, grön när den körs ensam) och `order131LoadSweep.test.ts` (svepet över 200 frön).

## 8. Avvikelser från leveransnoten

- **Platsen:** efter namn och samtycke och före första morgonen, i stället för före bussen (§1).
- **Den som har spelat förut** ser öppningen, men kan hoppa över den direkt. Noten föreslår att den inte visas alls.
- **Byns ljus är spelets.** Byn ritas av spelets kvällsljus (`EveningLighting`), som är mörkare och brunare än Designs bilder.
- **Gatans nivå** har spelets mål (krogen, ORDER 300 §7), inte Designs [9, −2]. Flygturen följer spelets nivåer.
- **Kamerans höjd och synfält:** spelets kamera tittar alltid mot marken (y = 0). Manusets målhöjd (0,9–1,2 m) gäller därför inte i byn. Synfältet följer spelets avstånd: vid Ingrid omkring 35° i stället för 34°.
- **Ingrid** står 2,2 m längre norrut än i prototypen. Spelet ritar Måltidens hus 2,2 m norr om OSM-läget (`CraftedLandmarks`), och dörren räknas mot väggarna som syns (`openingTimeline.ts` `renderedPoly`). Annars stod hon inne i väggen.
- **Studenterna** som går förbi Ingrid kommer inte; byns liv på morgonen är spelets, och noten säger att de kan saknas.
- **Glimtarnas figurer** har spelets figurrigg utan ansiktena i Designs bilder.
- **Ljud** levererades inte och finns inte.
- **Omfånget:** fem befintliga filer har små krokar för öppningen, utöver flödet: `DayLighting.tsx` och `EveningLighting.tsx` (kvällen och ljusnivån), `StreetLamps.tsx` och `VillageWindows.tsx` (ljusen tänds efter manusets kväll) och `StrategicScene.tsx` (Ingrid). Utan dem vore byn i morgonljus.

## 9. Öppet

- **Målet är stjärnan:** Design frågar om stjärnan ska förbli en överraskning till första morgonen. Raden står kvar som levererad.
- **Rad 2** (*Från midsommar till kräftskiva*) är fortfarande Designs förslag.
- **Den som har spelat förut:** ska öppningen inte visas alls (noten), eller visas med Hoppa över direkt (nu)?
- **Din vinbar:** nålen säger vinbar redan innan banken har öppnat verksamheten. Spelet ritar redan vinbarens rum där.
