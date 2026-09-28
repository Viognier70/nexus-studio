# INSTRUKTION till Claude Code — leverans 2026-09-28

**Från** Claude Design
**Gäller** Provspelet 2026-09-28, steg 1 av 3 (gemensam form och engelska), rollringarna och fem av de sju rättelserna från SVAR §1–50

Den här mappen kompletterar `nexus-leverans-2026-09-27`. Allt som inte står här gäller som i den leveransen.

## Filer

| Fil | Status | Var | Vad |
| --- | --- | --- | --- |
| `nexusStrings.ts` | ny | `frontend/src/content/` | Strängtabell med `sv` och `en` sida vid sida, `t(lang, key, vars)` och `serviceClock(lang, min)`. Slås ihop med `strings.sv.ts`: finns strängen redan, behåll repots nyckel och lägg till `en`. |
| `figureActs.ts` | ersätter paket 5 | `strategic/scene/` | Nytt: `createStaffRing(uniform)`, `createPlayerRing()`, `STAFF_RING`, `PLAYER_RING`. Allt annat oförändrat. |
| `wineBarRoom.ts` | ersätter paket 1 | `strategic/scene/` | `PLAYER_CAMERA` = spelets kamera (fov 42°, 50°, 24 m). Bartendern och sommeliern står på z ±0,74, diskaren 0,45 m österut, som i ORDER 271. |
| `innRoom.ts` | ersätter 2026-08-30 | `strategic/scene/` | Trapporna flyttade 1,8 m ut i gården med en bro till loftgången (SVAR §42). |
| `innDay.ts` | ersätter paket 5 | `strategic/scene/` | Loftgången tunnas inte längre ut. Bara utebarens pergola gör det. |
| `skarmar/G1 … G6` | nya | — | Den gemensamma formen på engelska: HUD med klockan, raketkortet, övningen, banken, schemat och tidningen. |
| `bilder/ringar-01, -02` | nya | — | Rollringarna från spelarens kamera och nära baren. |

## 1. Den gemensamma formen

Formen är `system.css` (nx-*) som redan finns i repot. Den ska gälla på **alla** ytor, också de som i dag har egna stilar:

- **Service-HUD:** dagens mörka genomskinliga paneler, rundade hörn, serifknappen "Bakåt" och de pillerformade tempoknapparna utgår. Alla paneler får `nx-panel`, en ljus grund med 2 px bläckkant, och en rubrikrad i `nx-label`. Se G1.
- **Frågorna** i Måltidens hus och raketkortet har samma svarsrader: 80–96 px höga, siffra i en bläckruta och tangent 1–4. Rätt svar fylls med bläck, fel svar streckas. Se G2 och G3.
- **Banken och schemat** använder samma rubrikrad, 12-kolumnsrutnät och knappar. Se G4 och G5.
- **Tidningen** har samma typsnitt. Namnhuvudet är Archivo 800 och uppställningen fyra spalter med 4 px linje under huvudet. Det finns ingen serif och ingen papperston. Se G6.
- **Utvecklaröverlägget** (DEV-raden) ska inte synas i provspelsbygget.

## 2. Engelska

Spelet går på engelska som standard och byter språk med en inställning. Alla texter hämtas med nyckel ur `nexusStrings.ts`. Enheter och klockslag är också strängar: "109 tkr" / "SEK 109k" och "18.00" / "18:00". Namnen följer SVAR §26: "the Mentor" och "The Grythyttan Local". Inga påhittade personer eller banker.

## 3. Klockan

`serviceClock(lang, minutesSince18)` ger klockslag, tid kvar och andel. Klockan visas överst i mätarpanelen med klockslag, "1 h 42 min left" och en stapel som töms mot 23:00. De sista 30 minuterna blir stapeln accentfärgad och texten "Last orders" visas.

## 4. Rollringarna

| Vem | Ring | Montering |
| --- | --- | --- |
| Personal | Tunn, 0,34–0,38 m, i uniformens färg | `rig.root.add(createStaffRing(uniform).group)` |
| Spelaren | Bredare, 0,40–0,50 m, spelarens röda med vit innerkant | `rig.root.add(createPlayerRing().group)` |
| Gäst | Ingen ring. Undantag: gästen en raket gäller får insatsringen (0,53–0,62 m, accentfärgad, fylls med stegets tid) medan raketen pågår | `createActionRing()` + `updateActionRing()` |

De tre storlekarna överlappar inte, så ringarna blandas aldrig ihop. Ringarna är `MeshBasicMaterial` och påverkas inte av kvällsljuset.

## 5. Kvar från SVAR

- **Kameraprovet för paket 2–5** mot spelets kamera är inte omkört. Kör `checkPitchView`, `checkCameraView` och `checkInnCameraView` med `PLAYER_CAMERA` ur den nya `wineBarRoom.ts` när klasserna monteras i sina etapper.
- **Vem som tar över vid fel** (SVAR §49: kök → kock, sommelieri → servitör, phronesis → värd) kommer i steg 2, eftersom hovmästaren och värden införs där.

## Nästa

- **Steg 2, servicen:** rekvisita (tallrikar, glas, bestick, brickor, karaffer, brödkorgar), ritualerna, synliga roller (runner, servitör, sommelier, hovmästare) och fler gester.
- **Steg 3, introduktionen:** bussen i 3D i förstaperson, hållplatsen, mentorn och inskrivningen på Campus.
