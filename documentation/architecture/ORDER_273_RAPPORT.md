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
