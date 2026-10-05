# ORDER 309 — Designs D5 i spelet (rapport)

**Underlag:** Anders 2026-10-05. Designs D5, `documentation/leveranser/nexus-leverans-2026-10-04-foljderna-och-konceptet/`, ersätter spelets egna former från ORDER 303 (rapporten §C, §E–G). Bokslutets rad om social hållbarhet står kvar som vår (D5 ritade den inte).

**Gren:** `order-309`, från `order-307` (`d557743`, "ORDER 307 (pågår)"). Avvikelse: ordern sa "från worktreets HEAD" (`67650e0`), men den saknar både D5-paketet och 307:s gästtyper och `state.equipment`, som ordern bygger på. Grenen kan mergas först när 307 är mergad.

## Vad som är inslaget

| D5-fil | I spelet | Hur |
|---|---|---|
| `staffStatus.ts` | `scene/staffStatus.ts` (oförändrad) | Orkringen i rummet: `scene/orkRing.ts`, tre bågar à 108° med 12° glipa, 0,64–0,76 m. Ringen står som 3D, inte på en duk, så att väggar och disken skymmer den. Trivselplattan: `scene/wellbeingLayer.ts`, med D5:s `drawWellbeing`. Ringen syns i statusläget vid all personal, annars bara vid den som är slut. |
| `hudLayout.ts` | `ui/hudLayout.ts` (oförändrad) | Fokusläget: `ui/focusState.ts` + `ui/FocusMode.tsx` (på under 14 m, av över 15,5 m, H växlar, fälls på 280 ms). `checkAll()` i testet. Kortets plats: `ui/cardPlacement.ts` `placeCardAmong`, med D5:s regler mot HUD:ens verkliga paneler. |
| `morningReviews.ts` | `ui/morningReviews.ts` (oförändrad) | Tidningens kort: `ui/MorningReviewLine.tsx` `MorningReviewCard`. Raderna byggs i `sim/morningReview.ts` `reviewLines`: högst fyra, största ändringen först, och summan är ändringen. |
| `guestGroups.ts` | `scene/guestGroups.ts` (oförändrad) | Gästtypen ger gruppen: `scene/guestLooks.ts`. middle och social blir bybor, high och billionaire affärsfolk (billionaire i guld). |
| `equipment.ts` | `scene/equipment.ts` (oförändrad) | `scene/roomEquipment.ts`: modellen står på hemplatsen när krogen äger saken. Den hänger i rummets grupp. |
| `figureClips.ts` | `scene/figureClips.ts` (ersatt) | Två lokala rader som förut: `EVENT_FLOOR` exporteras och `_u`. Valet görs i `scene/conditionClips.ts`: `staff.tiredIdle` när orken är slut och personen står still, och `staff.hesitate` i början av varje steg när raketens område saknas. Den som tvekar har området som sin roll: vin sommeliern, mat kocken, service servitören. |
| `foljderStrings.ts` | `nexusStrings.ts` TABLE `foljder` (tillagt sist) | Designs ord. Nya citat och skäl till recensionerna, sv + en. |

**Borttaget ur 303:**
- den gräddvita ringen i `WineBarFigures.tsx`;
- `GuestStatusCard.tsx`;
- läget i `StaffRingTag`;
- knappen Status (S) i nivåraden. Den är nu `ModeKeys`, med Status (S) och Fokus (H).

**Vagnarnas klipp och lågan** (`trolley.*`, `cheese.cut`, `flambe.*`, `setFlame` och `setCloche`) finns tillgängliga. Händelserna som använder dem kommer med frågebanken (ORDER 306). Tills dess står vagnarna parkerade.

## Verifiering

**Tester** (`src/strategic/__tests__/order309Foljder.test.ts`, 23 st), alla gröna:
- orkens lägen, bågarna och när ringen syns;
- trivselns lägen;
- `checkAll()` 0 överlapp;
- kortet aldrig över en panel (D5:s HUD och spelets mått, alla ankare);
- fokuslägets fördröjning (hysteres);
- recensionernas ordning, summa och röst;
- gästgrupperna per typ och att riggen bara bär sin grupps tecken;
- utrustningen som visas när den ägs;
- klippen.

**Ändrat test:** `order286aTheatre` säger nu 122 klipp i stället för 115.

**Spelarens flöde** (`scripts/order309-check.mjs`, produktionsbygget, 1440 × 900): `frontend/reports/order309/check.json`.
- **Sparfilen är ändrad:** `sim.equipment` har alla fem sakerna (`saveEdit` i filen). De kräver silver och guld, och sparfilen har brons. Resten är spelarens flöde.
- **Utrustningen i rummet:** `steps.room.roomEquipment`, bild `check-rummet-utrustning-och-grupper.jpg`.
- **Gästgrupperna:** `steps.room.guestGroups` och `steps.focusNear`, bild `check-fokuslaget-under-14m-grupperna.jpg`.
- **Statusläget:** `steps.status` (`orkRings`, `wellbeingPlates`, `panels.overlaps`), bild `check-statuslaget.jpg`.
- **Kortet för personal:** `steps.staffCard`, bild `check-kortet-personal.jpg`.
- **Kortet för gäst:** `steps.guestCard`, bild `check-kortet-gast.jpg`. Klicken står i `steps.clicks`.
- **Fokusläget med H:** `steps.focusKey`, bild `check-fokuslaget-h.jpg`.
- **Fokusläget under 14 m och tillbaka ut:** `steps.focusNear` och `steps.focusBackOut`.
- **Recensioner i morse:** nästa morgon efter en spelad kväll, `steps.review` och `steps.reviewNext`, bild `check-recensioner-i-morse.jpg`.

**Layouten:** `scripts/order300-layout.mjs` mäter nu också statusläget med kortet öppet och fokusläget. Kortet och raketens list räknas bland panelerna. Utfall i `frontend/reports/order309/layout/layout.json`: 14 skärmar i 5 storlekar.

**Paletten:** `frontend/reports/order309/palett.json`. Se öppna frågor.

**Hela sviten (`npx vitest run`):** de fel som återstår fanns redan på grenens bas, ORDER 307 (pågår):
- `order273` gäller "Västerbotten" i 307:s engelska;
- `order270`, `order278` och 287a ×2 gäller 307:s gästtyper och meny;
- `order131LoadSweep` tar 337 s och når tidsgränsen.

Övrigt om sviten:
- `smoke`, `day`, `order265`, `order266` och `order267` nådde tidsgränsen när sviten körde samtidigt med webbläsarkontrollen. De är gröna när de körs ensamma.
- `balance.test` fällde ett tal i `sim/morningReview.ts`. Det är rättat: gränsen läses ur D5:s `staminaOf`.

**Typecheck och `npm run build`:** gröna.

## Avvikelser från leveransnoten

1. **Raketkortet fälls inte medan det frågar** (`data-mode` ask eller right). Raketens kamera glider till 12 m, alltså under 14 m, och kortet är då det spelaren svarar i. I övriga lägen fälls det till listen "Raketen", och ett klick fäller ut det igen.
2. **Nålkorten stängs inte i fokusläget.** I spelet öppnar spelaren dem själv, och de har en egen klocka.
3. **Klockan, kassan och mätaren krymper** till 62 % i stället för till en rad på 5,4 % av höjden. Ställningen blir en tunn rad, och raden går inte att fälla ut med klick.
4. **Kortets plats** räknas mot spelets verkliga paneler. D5:s `placeCard` räknar mot prototypens `layout()`. Reglerna är desamma: sidan, 4 % till figuren och aldrig över en panel.
5. **"Kan" har spelets tre områden** (vin, köket, service), och ett område är bara känt eller saknat, utan nivåer. Ett känt område visas med tre prickar. D5:s sex områden med 0–3 prickar väntar på varukorgens frågor.
6. **"Dricks i kväll"** är personalens pott delad lika (ORDER 280).
7. **Gästkortets namn** är "Sällskap om N", eftersom simuleringen inte har sällskapsnamn.
8. **Kort finns bara för personal som finns i simuleringen** (värd, servitör, kock och lärling). I statusläget öppnar ett klick på personalen kortet, inte Flytta.
9. **Recensionskortet** ligger över morgonskärmen. Esc eller ett klick utanför stänger det, och i högerspalten står sedan en rad som öppnar det igen. "Till inköpen" och Enter öppnar inköpen.

## Öppna frågor

- **Paletten:** åtta av D5:s tio kroppsfärger ligger utanför bandet 1,8–3,6 mot vinbarens golv (`palett.json` `outside`). De ljusa är för ljusa och plommon och kol för mörka. Bara affärsfolkets två ligger inom. D5 §6 sa att de låg inom. Fråga till Design.
- **"Ryktet som bistro":** talen är krogens rykte (0–100), inte konceptets rykte (`reputationByTier`), eftersom konceptets värde när kvällen började inte sparas. Ska kortet visa konceptets rykte, så att 307 sparar startvärdet?
- **`AnswerReview.guestType`** är tillagt i `sim/incidents.ts` (rösten i recensionen). Det är en rad i 307:s område.
