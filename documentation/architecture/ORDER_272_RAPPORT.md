# ORDER 272 — Utkast till raketer och provfrågor ur gusto.science (rapport)

**Ordern** (Vision Owner 2026-09-27 och 2026-09-28):
- Ett skript som läser artiklar per ämne från gusto.science och skriver utkast till provfrågor och raketer, med referensen från artikeln.
- Varje utkast har status "utkast" och visas inte för spelaren förrän Vision Owner har granskat det.
- Skriptet körs manuellt, aldrig i spelet. Det använder aldrig service_role-nyckeln.

**Beslut:**
- Läsrätten går via ett eget konto, inte via anon-läsning: betalväggen i gusto.science står kvar.
- En raket per artikel, med ett steg ur vart och ett av de tre avsnitten.
- Episteme kommer från "What the research supports", samma text oavsett roll.
- Techne kommer från `culinary_pro` för köksämnena (`culinary_science`, `fermentation_science`, `food_science`, till Metodköket) och från `sensory_pro` för vin och sensorik (`sommellerie`, `sensory_evaluation`, `flavor_science`, till Stensöta).
- Phronesis kommer från `hospitality_mgmt` (Kalastorget och servicen).
- Skriptet översätter till svenska och sparar den engelska originaltexten i ett eget fält.
- Modellen är `claude-opus-5-5`, i en konstant. Skriptet visar uppskattad kostnad och frågar innan det börjar.
- `@anthropic-ai/sdk` och `@supabase/supabase-js` är devDependencies och följer inte med i spelets bygge.

**Gren:** `order-272` från `order-271`, eftersom ORDER 270 och 271 inte är mergade.

## 1. Vad som byggdes

`frontend/scripts/order272-gusto-drafts.mjs`:

```
node scripts/order272-gusto-drafts.mjs --topic culinary_science --limit 5
```

1. **Miljön:** läser `frontend/.env.local` med `GUSTO_SUPABASE_URL`, `GUSTO_SUPABASE_ANON_KEY`, `GUSTO_EMAIL`, `GUSTO_PASSWORD` och `ANTHROPIC_API_KEY`. Mallen är `frontend/.env.local.example`. Skriptet vägrar köra om inloggningen ligger i `VITE_`-variabler, eftersom de bakas in i bygget.
2. **Inloggningen:** loggar in med anon-nyckeln och kontot.
3. **Artiklarna:**
   - Metadata och urval kommer från `articles_public`: ämnet, de som har triad-analys, ordnade efter citeringar.
   - Texterna kommer från `get_articles_full`. Funktionen kräver `profiles.is_pro` eller en aktiv provperiod, och annars stoppar skriptet med ett tydligt fel.
   - Artiklar som redan finns i utkasten hoppas över.
4. **Kostnaden:** skriptet räknar in-token med `countTokens`, uppskattar ut-token och visar kostnaden i USD och kronor. Det frågar sedan `[j/N]`.
5. **Claude:**
   - Ett anrop per artikel: `claude-opus-5-5`, effort `high`, strukturerad JSON (`output_config.format`) och en cachad systemprompt.
   - `fallbacks: "default"` används om ett svar avböjs.
   - Skriptet kontrollerar varje svar: frågetecken, fyra alternativ, exakt ett rätt och personalens rad. Ett ogiltigt svar görs om en gång.
6. **Utkasten:** filerna skrivs efter varje artikel, så att ett avbrott inte kostar det som redan är gjort.
   - `frontend/src/content/incidents/gusto.draft.json`: raketerna. `meta` och `text` har samma form som vinbarens bank. Utfallen är medelvärden tills Vision Owner sätter dem.
   - `frontend/src/content/questions/gusto.draft.json`: provfrågorna i frågebankens form. Nivån är brons och ankaret servicen, tills Vision Owner ändrar.
   - Varje post har `status: "utkast"` och `reference`: titel, länk till artikeln på gusto.science, DOI och källänk.
   - Varje post har också `source`: den engelska originaltexten med de tre avsnitten.
   - Alternativen blandas med en fast ordning per artikel, så att det rätta svaret inte alltid står först.

Spelet läser inte filerna.

## 2. Verifiering

- `frontend/src/sim/__tests__/order272GustoDrafts.test.ts` bygger utkast ur ett påhittat svar med skriptets egen funktion. Raketen klarar `validateIncidentBank` och provfrågorna `validateBank`. Det rätta svaret följer med när alternativen blandas. Testet kontrollerar också modellkonstanten och fördelningen.
- Produktionsbygget innehåller ingenting från Anthropic eller Supabase: `grep` i `dist/assets` ger inga träffar.
- **Skriptet är inte kört mot gusto.science eller Claude.** Inloggningen och API-nyckeln saknas tills Vision Owner lägger dem i `.env.local`. Första körningen bör vara `--limit 1`.

## 3. Öppet

- Den uppskattade kostnaden bygger på 9 000 ut-token per artikel (`EST_OUTPUT_TOKENS`), och kronorna på 10 kr per dollar. Båda är antaganden tills en körning har mätts. Skriptet skriver den faktiska förbrukningen efter körningen.
- Ämnen utanför fördelningen, till exempel `servicescape` och `hospitality`, avvisas.
- Frågebankens egna frågor ligger i `frontend/src/strategic/content/questions/`. Utkasten ligger i `frontend/src/content/questions/`, som ordern angav.
