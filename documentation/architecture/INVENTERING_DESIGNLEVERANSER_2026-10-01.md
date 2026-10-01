# Inventering: Designs leveranser mot koden (2026-10-01)

**Beställd av** Vision Owner 2026-10-01: "Lista vad från Designs leveranser som inte är inbyggt, särskilt nexus-leverans-2026-09-28 (G1–G6, ritualerna och rumsfilerna). Rapportera innan du bygger."

**Metod.**
- Varje `.ts`-fil i `documentation/leveranser/` jämfördes med filen med samma namn under `frontend/src/`: finns den, är den ändrad sedan leveransen (`cmp`), och importeras den av någon annan fil i spelet (tester räknas inte).
- Strängfilerna kontrollerades med upp till 20 unika svenska texter per fil.
- Klippen räknades per id i `figureClips.ts` mot alla andra filer.
- Läget är `main` `ea51830`.

**Beslut efter inventeringen** (Vision Owner 2026-10-01):
- Rusningarna byggs i simuleringen, med köplatser räknade i koden och sommeliern som värd vid dörren.
- Det som redan är levererat kopplas in i ORDER 292: samspelen, `IDLE_RULE`, otåligheten och turordningen, handrekvisitan och klippen `bar.wipe` och `guest.riseGreet`.
- `truckPitch.ts` och `innDay.ts` väntar till sina etapper.

## Leveransen 2026-09-28

**G1–G6, den gemensamma formen:** ersatt, inte saknad.
- Den varma formen (leveransen 2026-09-29) ersatte den ljusa formen med bläckkant. Dess not säger att den ersätter G6-regeln om tidningen utan serif.
- G1 (service-HUD:en) ersattes av serviceläget (2026-09-30).
- DEV-raden visas inte i produktionsbygget (`DevPanel.tsx` returnerar null utanför `import.meta.env.DEV`).

**Rollringarna** (`figureActs.ts`):
- Spelarens ring och personalens tunna ring används inte; personalens ring kommer ur ringleveransen 2026-09-30 (`staffRing.ts`).
- Gästens insatsring (`createActionRing`) används vid raketer.

**Klockan och engelskan:** inbyggda.

**Rumsfilerna:**

| Fil | Läge |
|---|---|
| `wineBarRoom.ts` | Monterad (vinbaren) |
| `brewpubRoom.ts` | Monterad (ölkrogen) |
| `restaurantRoom.ts` | Monterad som kvarterskrogen |
| `innRoom.ts`, `foodTruckRoom.ts`, `nightClubRoom.ts` | I rumskontraktet (`businessRoom.ts`), inte monterade i scenen |
| `innDay.ts` (gästgiveriets dygn) | Saknas, både paket 5 och 2026-09-28. Väntar till sin etapp |
| `truckPitch.ts` (food truckens plats, paket 2) | Saknas. Väntar till etapp 6 |

**Kameraprovet för paket 2–5** (`checkPitchView`, `checkCameraView`, `checkInnCameraView`) är inte kört.

## Övriga leveranser

**Teaterns grund (2026-09-29):**
- **Klippen:** 46 klipp är inbyggda, och alla utom `bar.wipe` och `guest.riseGreet` används.
- **Samspelen** (`figureInteractions.ts`: beställningen, överlämningen vid passet, vinserveringen, skålen, samtalet, mötet i gången, betalningen och tallriken till disken) importeras inte.
- **`figureProps.ts`** (handrekvisita och huvudbonader) importeras inte.
- **`theatreStrings.ts`** är prototypens etiketter och är inte inbyggd.

**Servicekoreografin** (`serviceScore.ts`):
- Nio poser används: `poseDine`, `poseTakeOrder`, `poseOffer`, `poseNod`, `posePoint`, `poseSignal` (i `figureActs.ts`) och `poseSetDown`, `poseSitTransition`, `poseAttend` (i `WineBarFigures.tsx`).
- Inte använda:
  - `IDLE_RULE` (ingen står overksam i bild mer än 2 s; servitören och kocken `poseFillWork`, värden vid sin plats mot entrén med `poseAttend`);
  - `poseWelcome` och `poseFillWork`;
  - partituret (`SERVICE_SCORE`, `resolveScore`).

**Paket 6** (`serviceFlow.ts`):
- Spelet använder rummets geometri: borden (`groupsFor`), vägarna och gångfarten.
- Kvällens koreografi (`createServiceFlow`) används inte. Den har sällskap som kommer och sätts, väntan som blir otålighet (`IMPATIENT_AFTER` 10 s), personal som tilldelas den som är framme först, och personalens belastning (`staffLoad`).
- Den räknar hela kvällen i förväg utan slumptal och kan därför inte driva spelets gäster, som kommer ur simuleringen. Delarna kan användas.
- Paketets raketer (`ROCKETS`) är ersatta av händelsebanken.

**Början i Grythyttan** (`arrivalStrings.ts`): inte inbyggd, ingen av 20 kontrollerade texter finns. Manuset väntar på en egen order.

**Strängfilerna för kassan och den varma formen:** inbyggda men omformulerade. Texter med platshållare är funktioner i `nexusStrings.ts`.

## Ritualerna

`serviceRituals.ts` finns inte, varken i leveranserna eller i koden. Ritualerna nämns i leveransen 2026-09-28 som "steg 2, servicen" och står i speldesignen (Servicen > Ritualerna): välkomna och placera, beställningen, bröd och vatten, fördrinken, vinet på bricka, dukningen, tallriksserveringen och dekanteringen.

- **Klipp finns** för beställningen, brickan, tallriken och vinet.
- **Klipp saknas** för att välkomna i dörren, bröd och vatten, fördrinken, att duka upp och att dekantera.

## Rusningarna, kön och värden

- **Värden finns inte i vinbaren.** Rollen spelas av sommelierfiguren (`wineBarDirector.ts`: `värd: 'sommelier'`). Rummet har en entré men ingen plats för värden och inga köplatser.
- **Ringens färger** följer leveransen 2026-09-30 (`staffRing.ts`): inget rött eller grönt, och värden (hovmästaren) har grädde. Ingen senare färgleverans finns.
