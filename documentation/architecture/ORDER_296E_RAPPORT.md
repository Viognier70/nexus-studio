# ORDER 296e — Stjärnan med tre veckor, och raketerna med 0,75 per steg (rapport)

**Vision Owners beslut 2026-10-03:**
- Stjärnan kräver tre veckor i rad med ryktet minst 0,36, i stället för två veckor med 0,40. Den ska belöna en jämn nivå.
- En vecka under någon gräns tar fortfarande stjärnan.
- Stjärnspelaren svarar rätt på raketerna med en verklighetstrogen sannolikhet, 0,75 per steg, så att kravet på 70 % klarade raketer prövas. Rapportera hur ofta hen då når stjärnan.

Gren `order-296e` från `main` (`9e7ff13`). Talen pekar på filer under `frontend/reports/order296e/`.

## 1. Det som ändrats

**Stjärnan** (`balance.ts` `STAR`):
- ryktet minst 0,36;
- tre veckor i rad (`weeksToEarn`);
- övrigt oförändrat: guld i Teatern, minst 70 % klarade raketer av minst 5, en vecka under någon gräns tar stjärnan.

Söndagstidningen säger nu *Tre veckor i rad …* och hur många veckor som är kvar.

**Harnessen.** Svaret `'skill'` (`weekHarness.ts`, `ROCKET_SKILL`, förvalt 0,75) ger rätt svar på varje raketsteg med den sannolikheten, dragen ur fröet, raketen och steget. Stjärnspelaren använder det.

**Veckans avräkning** sparar också andelen rätta *steg* (`EveningRecord.rockets.steps` och `stepsRight`, `SettlementRecord.star.stepShare`), bredvid andelen klarade raketer, så att de två måtten kan jämföras.

## 2. Hur ofta stjärnspelaren når stjärnan

`stjarna-075.json`, 20 säsonger:

| Spelaren | Får stjärnan |
|---|---|
| Stjärnspelaren | 0 av 20 |
| Mentorns spelare | 0 av 20 |
| Den kloka | 0 av 20 |

**Två saker stoppar den**, och båda följer av att spelaren svarar fel ibland:

1. **Omdömet.**
   - En raket har tre steg och klaras bara om alla är rätt: 0,75³ ≈ 0,42.
   - Stjärnspelaren klarade 44 % av raketerna i snitt och nådde 70 % i 6 av 160 veckor.
   - Andelen rätta steg var 75 %. Spelaren fick omkring 14 raketer i veckan.
2. **Ryktet.**
   - Raketer som faller kostar rykte och gäster. Stjärnspelarens rykte vid avräkningen är i median 0,31 (kvartilerna 0,22 och 0,40).
   - Det är lägre än mentorns spelare, som i harnessen svarar rätt på allt: median 0,33.
   - Gränsen 0,36 nås sällan tre veckor i rad.

## 3. Andra gränser, prövade på samma veckor

Inget av detta är ändrat i spelet. Tre veckor i rad, guld i Teatern och minst 5 raketer i veckan gäller hela tabellen.

| Omdömet | Ryktet minst | Får stjärnan | Varav vecka 5–7 |
|---|---|---|---|
| raketer ≥ 70 % (i dag) | 0,36 | 0 | 0 |
| steg ≥ 70 % | 0,36 | 0 | 0 |
| steg ≥ 70 % | 0,34 | 3 | 1 |
| steg ≥ 70 % | 0,30 | 7 | 3 |
| steg ≥ 70 % | 0,28 | 10 | 6 |
| steg ≥ 70 % | 0,26 | 11 | 7 |
| raketer ≥ 35 % | 0,30 | 6 | 3 |

**Slutsats.** Med ett verklighetstroget svar når ingen stjärnan med dagens gränser. Det som får hälften dit (stegen ≥ 70 % och ryktet ≥ 0,28) lägger ryktesgränsen under mentorns spelares median. Då är det inte längre *högt rykte* som belönas.

**Det som behöver bestämmas:**
- **Omdömet:** mätt på raketer eller på steg. Stegen speglar spelarens kunskap direkt; 0,75 per steg ger 75 % steg men bara 42 % raketer.
- **Ryktet:** att ett fel kostar så mycket rykte att en kunnig spelare ligger under den som svarar rätt på allt är kanske riktigt. Men då behöver en kunnig spelare ett sätt att hålla ryktet uppe, eller så ska gränsen följa ryktets nivå i dag.

Jag har inte ändrat något av det i väntan på provspelet.

## 4. Tester

- `order296cStar.test.ts` läser antalet veckor ur `STAR.weeksToEarn`.
- Hela sviten (2 298) och bygget är gröna.
