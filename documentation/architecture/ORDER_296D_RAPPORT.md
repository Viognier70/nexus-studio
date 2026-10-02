# ORDER 296d — Spelaren som siktar på stjärnan (rapport)

**Vision Owners beslut 2026-10-02:** stjärnans gränser godkänns tills vidare:
- ryktet minst 60;
- minst 70 % klarade raketer av minst 5;
- två veckor i rad;
- guld i Gastronomiska Teatern.

Lägg till en spelare som siktar på stjärnan. Målet:
- hen når den i ungefär hälften av säsongerna, någon gång mellan vecka 5 och 7;
- mentorns spelare når den sällan.

Gränserna får justeras om det behövs. Gren `order-296d` från `main` (`3ac0561`). Talen pekar på filer under `frontend/reports/order296d/`.

## 1. Spelaren

**Stjärna** (`order296Karnan.test.ts` `PLANS.stjarna`) väljer klokt som den kloka spelaren:
- nålarna;
- butiken;
- den extra handen.

Varje morgon tar den ett prov på vägen mot guld i Teatern (`STAR_PATH`):
1. silver i Stensöta;
2. silver i Metodköket (Teatern är låst till silver i två);
3. Teatern brons, silver och guld.

**Spelarens kunskap.** Varje fråga är rätt med sannolikheten 0,65, och 0,55 i Teatern (`STAR_SKILL`). Antalet rätt dras ur fröet och dagen, och sex av åtta ger medaljen.
- Med 7 rätt varje gång fick spelaren guld redan vecka 1; det beskrev ingen riktig spelare.
- Med kunskapen kommer guldet vecka 2–7, oftast vecka 3 (`stjarna-slut.json` `goldWeeks`).

## 2. Ryktet var gränsen som ingen nådde

**Med ryktet minst 60 fick ingen spelare stjärnan.** Ryktet vid veckoavräkningen, i snitt per vecka (`stjarna-3.json` `meanRepAtSettlement`):

| Spelaren | Ryktet |
|---|---|
| Mentorns spelare | 0,29–0,38 |
| Den kloka | 0,37–0,48 |
| Stjärnspelaren | 0,33–0,46 |

**Omdömet** (andelen klarade raketer) var 100 % för alla, eftersom harnessens spelare svarar rätt. Gränsen 70 % binder inte här; den gäller spelare som svarar fel.

## 3. Gränserna prövade

Stjärnan påverkar spelet bara genom fackets tredje plats. Gränserna är därför först prövade på samma säsongers veckor (`stjarna-3.json`, 20 säsonger, stjärnspelaren):

| Veckor i rad | Ryktet minst | Får stjärnan | Varav vecka 5–7 | Veckorna |
|---|---|---|---|---|
| 2 | 0,36 | 15 | 10 | 3, 3, 4, 5, 5, 5, 5, 5, 6, 7, 7, 7, 7, 8, 8 |
| 2 | 0,38 | 13 | 8 | 3, 3, 4, 5, 5, 5, 5, 6, 7, 7, 7, 8, 8 |
| **2** | **0,40** | **10** | **5** | 3, 3, 4, 5, 7, 7, 7, 7, 8, 8 |
| 2 | 0,42 | 7 | 3 | |
| 3 | 0,36 | 9 | 6 | 4, 5, 6, 6, 6, 6, 7, 8, 8 |
| 3 | 0,38 | 8 | 5 | |

Mentorns spelare får aldrig stjärnan med någon av gränserna, eftersom den inte tar guld i Teatern.

## 4. Det som ändrats

**Ryktet: minst 40 av 100** (`balance.ts` `STAR.reputationAtLeast`, förut 60). Övriga gränser står kvar:
- två veckor i rad;
- minst 70 % klarade av minst 5 raketer;
- guld i Teatern.

**I spelet** (`stjarna-slut.json`, 20 säsonger, med fackets tredje plats):

| Spelaren | Får stjärnan | Veckorna | Har den vid säsongens slut |
|---|---|---|---|
| Stjärnspelaren | 9 av 20 (45 %) | 3, 3, 4, 5, 7, 7, 7, 8, 8 | 4 (de andra tappade den en svagare vecka) |
| Mentorns spelare | 0 av 20 | | |
| Den kloka | 0 av 20 (inget guld i Teatern) | | |

**Utfallet mot målet:**
- **Antalet stämmer:** ungefär hälften av säsongerna.
- **Tidpunkten stämmer bara till hälften:** 4 av 9 får stjärnan vecka 5–7, 3 tidigare och 2 vecka 8. Den som tar guld i Teatern redan vecka 2 kan få stjärnan vecka 3–4.

**Alternativet:** tre veckor i rad och ryktet minst 36 ger 9 av 20, varav 6 vecka 5–7. Det ändrar regeln två veckor och lägger ryktesgränsen på mentorns nivå, så jag har valt två veckor och 40. Vill Vision Owner hellre ha tidpunkten är det alternativet.

## 5. Öppet

- Gränserna gäller tills vidare. Ryktet 40 är *högt* i förhållande till vad spelare når i dag, inte mot startvärdet 60. Om ryktets jämvikt höjs senare bör gränsen följa med.
- Omdömet (70 %) är inte prövat mot spelare som svarar fel på en del raketer.

Hela sviten (2 298) och bygget är gröna.
