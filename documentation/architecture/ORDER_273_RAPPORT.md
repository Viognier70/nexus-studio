# ORDER 273 — Spelet på engelska (rapport)

**Ordern** (Vision Owner 2026-09-28, efter provspel):
- Allt i spelet är på engelska, både text och repliker.
- Raketerna, skärmarna, mentorn och strängarna skrivs på engelska, och de svenska filerna sparas.
- CLAUDE.md regel 7 ändras till engelska.
- ORDER 272 översätter inte längre. Det är gjort i ORDER 272 före mergen.

## 1. Vad som byggdes

**En ingång för strängarna:**
- `frontend/src/content/strings.ts` exporterar de engelska strängarna, och alla 52 filer som läste `strings.sv` läser nu den.
- `strings.en.ts` har samma form som `strings.sv.ts`. Typen kräver varje nyckel, tupellängd och funktionssignatur (`Widen<typeof Sv>`, eftersom den svenska filen är `as const`).

**Engelska systerfiler** (de svenska står kvar oförändrade):
- `collapse.en.ts`, `eveningAccount.en.ts` och `eventStream.en.ts`.
- `content/incidents/vinbar.text.en.json`: raketbankens 31 raketer, som `sim/incidentBank.ts` nu läser.

**Engelska direkt i koden:**
- Simuleringens texter: kassaboken, strömmen, satsningarna, scenarierna och `serviceReport.ts`.
- Komponenterna: PlayerPanel, ScaleDownPanel, TeamPanel, AboutPanel, kontrollerna, EveningAccountPanel, OpeningPanel och RoomCardPanel.
- Talformatet är `en-GB`. Valutan skrivs "SEK" och "k SEK".
- Rollernas namn visas via `strings.team.roleLabel`, medan nycklarna `'värd'`, `'lärling'` och så vidare står kvar i koden.

**Frågebanken:** `activeBankLanguage()` ger alltid `en`.

**CLAUDE.md regel 7** (Engelska i spelet) är omskriven, och det står också i F9.

**Namnen:**
- Egennamn på platser, byggnader och paviljonger står kvar på svenska: Grythyttan, Måltidens hus, Måltidsbiblioteket, Metodköket, Stensöta, Kalastorget och Gastronomiska Teatern.
- Konkurrenterna heter fortfarande Kvarnkrogen, Prästgatans krog, Bergsmansöl och Torgets vinkällare.
- Ordval att godkänna: "Kassa" → "Cash", "Grythyttedagarna" → "Grythyttan Days", "kvarterskrogen" → "The Restaurant" och "egenkontroll" → "food safety check" eller "food safety log".

## 2. Verifiering

**`frontend/src/__tests__/order273NoSwedishPlayerText.test.ts`:**
- Testet läser varje strängliteral och template-text i `frontend/src` med TypeScripts parser och flaggar å, ä, ö eller minst två svenska småord.
- Egennamnen och kodens interna nycklar är undantagna, liksom felmeddelanden och konsolutskrifter.
- Några filer har ingen spelartext och undantas med skäl i testet: Designs rumsmodeller, kartans data, `balance.ts`, bankernas validerare, den engelska kunskapsbanken, mallfrågorna från ORDER 107 och matkärrans arketyper. `START_EXAM` anropas inte från gränssnittet, så mallfrågorna når aldrig spelaren.
- Testet prövar också den engelska raketbanken och att de svenska filerna finns kvar.

**Hela sviten:** typkontrollen, `vitest run` (2 094 tester) och bygget är gröna.

**Spelarens flöde:** `frontend/scripts/order271-dod-from-start.mjs` körs med `REPORT_ORDER=order273` från normal start genom en vecka. Bilderna och stegen står i `frontend/reports/order273/dod.json` och `dod-*.png`. Skriptet söker nu uppmaningarna "Talk" och "Register".

## 3. Kvar

- Designs rumsmodeller har svenska anteckningar och flaggor. De visas inte.
- `foodtruck/archetypes.ts` och `guestFaces.ts` har svenska etiketter. De visas inte.
- Den svenska raketbanken och `strings.sv.ts` följer inte med i framtida ändringar av den engelska texten. De är sparade som de var 2026-09-28.

## Tillägg 2026-09-28 — strängtabellen (gren `order-273-strangar`)

**Uppdraget** (Vision Owner 2026-09-28): Designs `nexusStrings.ts` är grunden för strängtabellen, svenska och engelska sida vid sida; Designs ordval gäller där de skiljer sig. Spelet går på engelska som standard och byter språk med en inställning.

**Beslut:**
- `frontend/src/content/nexusStrings.ts` genereras av `frontend/scripts/order273-strings-table.mjs` (TypeScripts kompilator-API; läser `strings.sv.ts`/`strings.en.ts` ur git, `--rev`). Designs del står ordagrant; spelets `TABLE` har samma nästlade form som förut, med `{ sv, en }` per löv. Designs ordval, nya löv och borttagna löv står som listor i skriptet; utdata med antal löv och varje ändring (från → till): `frontend/reports/order273/strings-table.json`.
- `strings.sv.ts` och `strings.en.ts` är borttagna; texten finns i tabellen och i git (`4376789`).
- `content/strings.ts` exporterar `strings` som en levande vy (Proxy) över `pickLang(TABLE, språk)`. Skäl: femton moduler håller en nod på modulnivå (`const T = strings.panels.cash`); en utbytt `let` hade lämnat dem kvar på det gamla språket. Löven lämnas ut som de är.
- `content/language.ts`: standard `en`, sparas i `localStorage` (`nexus.lang`) inom try/catch. Menyn (`TopRightMenu`) har English/Svenska. Roten (`StrategicApp`, `main.tsx`) ritas om vid byte, utan remount, så speltillståndet står kvar. Text som simuleringen redan skrivit (händelser, klockslag i raketerna) står kvar på språket den skrevs på.
- Klockan (Designs §3): `SITTING.lastOrdersMinutes` (30) i `sim/balance.ts`, `lastOrders` i `sim/serviceClock.ts`; `formatClock` skriver klockslaget via tabellen (`18:00` / `18.00`).

**Konflikt att lösa i CLAUDE.md:** regel 7 säger att de svenska filerna (`*.sv.ts`) sparas och att spelartext skrivs i `strings.en.ts`. Efter den här ordern står den svenska och engelska texten i `content/nexusStrings.ts`. Förslag: regel 7 och stack-avsnittet pekar på `nexusStrings.ts` (en ny sträng skrivs som `{ sv, en }`).
