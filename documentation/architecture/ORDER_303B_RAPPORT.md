# ORDER 303b — Ekonomin efter följderna (rapport)

**Underlag:** Anders 2026-10-05, beslut efter ORDER 303:s rapport (punkt B, "Att besluta"):
- `INCIDENTS.wrongCashShare` står kvar på 1, så ett fel svar kostar fullt.
- Belöningen för rätt svar sänks i stället (dricksen, merförsäljningen och ryktets effekt på ekonomin) tills:
  - de bästa spelarna slutar säsongen på 70 000–90 000 kr (1,5–2 gånger 299b:s 46 000 kr);
  - stjärnan når 298b:s mål: minst 70 % med 0,85 rätt per steg, 20–40 % med 0,75 och 0 % med 0,6;
  - 303 B gäller: "alltid fel" går med förlust och blir aldrig 1:a efter vecka 1, och "hälften rätt" hamnar i mitten;
  - trappan håller: mentorn och den förnuftiga stänger aldrig, den slarviga alltid.

Gren `order-303b` från `main` (`9ad033b`). Grenen har också beslutet om namnformen i ORDER 301 (`ORDER_301_RAPPORT.md` §4).

## Hur det mättes

Samma harness som ORDER 303, med varianterna prövade i minnet (`KARNAN_VARIANT`, `FOLJD_VARIANT`):
- **Trappan:** `order296Karnan.test.ts`, 20 säsonger per spelare, åtta veckor.
- **Stjärnan:** stjärnjägaren 40 säsonger med 0,85, 0,75 och 0,6 rätt per steg (`ROCKET_SKILL`), som 298b.
- **303 B:** `order303Foljderna.test.ts`, vinbaren vecka 1–3 med fröna 1–4: "alltid fel" och 0,5 rätt per steg.

Utgångsläget (talen före 303b) är ORDER 303:s filer (`reports/order303/trappa-*.json`). Omkörningen gav samma tal.

## Kalibreringen

Filerna står i `frontend/reports/order303b/kalib/V1–V4/`. Där är `runs` och `rows` borttagna, och summeringen står kvar.

| Variant | Stämningens uppsida | Avec | Dricksen per steg / raket | Stjärnans gräns | De bästa (mentorn, den kloka) | Stjärnan 0,85 / 0,75 / 0,6 |
|---|---|---|---|---|---|---|
| Före (303) | 0,9 | 0,2 | 0,03 / 0,04 | 0,45 | 236 000 / 249 000 kr | 78 / 18 / 0 % |
| V1 | 0,3 | 0,1 | 0,015 / 0,02 | 0,45 | 119 000 / 121 000 kr | 75 / 20 / 0 % |
| V2 | 0 | 0,05 | 0,015 / 0,02 | 0,45 | 53 000 / 59 000 kr | 65 / 12 / 0 % |
| **V3 (valt)** | **0,12** | **0,07** | **0,015 / 0,02** | **0,42** | **80 000 / 82 000 kr** | **82 / 25 / 0 %** |
| V4 | 0,15 | 0,08 | 0,015 / 0,02 | 0,40 | 84 000 / 88 000 kr | 72 / 20 / 0 % |

**Stjärnan krävde en ändrad gräns.**
- En lägre belöning sänker inte bara kassan utan också ryktet något (färre gäster). Med gränsen kvar på 0,45 nådde 0,75 rätt per steg stjärnan i 12–20 % av säsongerna.
- Den som har 0,75 rätt per steg klarar i snitt 0,447 av raketerna (V1 `meanJudgement`), alltså precis vid gränsen 0,45. Ryktet är under 0,2 i omkring en tredjedel av veckorna från vecka 4.
- Gränsen för klarade raketer är därför sänkt från 0,45 till 0,42 (`STAR.judgementAtLeast`). Målen är 298b:s andelar, inte 298b:s gränser. Med 0,6 rätt per steg klaras omkring 0,24 av raketerna, så den spelaren når fortfarande inte stjärnan.
- Spelets regler (`rules.*`) läser gränsen ur `balance.ts` och säger nu "minst 42 % av veckans raketer".

**Ryktet per svar är oförändrat** (`CONSEQUENCES.right.stepReputation` 0,3 och `clearedReputation` 1). Att sänka det skulle sänka stjärnans andelar ytterligare.

## Talen i spelet

`balance.ts`:
- `CONSEQUENCES.moodBillPerLiftUp`: 0,9 → 0,12 (merförsäljningen när stämningen lyfter).
- `CONSEQUENCES.right.avecShare`: 0,2 → 0,07.
- `MENU_ROCKETS.tipBonusPerClearedStep`: 0,03 → 0,015, och `tipBonusOnRocketCleared`: 0,04 → 0,02 (dricksen går till personalens pott, och orken och trivseln följer den).
- `STAR.judgementAtLeast`: 0,45 → 0,42.
- `INCIDENTS.wrongCashShare`: kvar på 1.

## Tabellen efter 303b

Talen står i `frontend/reports/order303b/efter/`: `trappa-*.json` (20 säsonger), `stjarna-*.json` (40) och `kvallar-*.json`.

### Ekonomins trappa

| Spelaren | Stängda | Kassa vid säsongens slut, medel (303 → 303b) | Veckomålet nått |
|---|---|---|---|
| Mentorn | 0 av 20 | 236 454 → **79 567 kr** | 100 % |
| Den kloka | 0 av 20 | 249 084 → **82 335 kr** | 100 % |
| Per | 0 av 20 | 236 454 → **79 567 kr** | 100 % |
| Den förnuftiga | 0 av 20 | 208 954 → 57 970 kr | 99 % |
| Halva | **19 av 20** (303: 8) | 6 102 → −28 370 kr | 66 % |
| Alltid fel ("halvbra") | 20 av 20 | −60 529 kr (oförändrad) | 2 % |
| Den slarviga | 20 av 20 | −88 380 kr (oförändrad) | 0 % |

### Stjärnan (stjärnjägaren, 40 säsonger)

| Rätt per steg | Når stjärnan | Vecka i snitt | Behåller den till vecka 8 | Stängda | Kassa vid säsongens slut |
|---|---|---|---|---|---|
| 0,85 | **33 av 40 (82 %)** | 5,6 | 19 | 0 | 57 410 kr |
| 0,75 | **10 av 40 (25 %)** | 6,2 | 4 | 5 | 9 439 kr |
| 0,6 | **0 av 40** | — | — | 39 | −24 635 kr |

### 303 B (vinbaren vecka 1–3, 24 kvällar per vecka)

| Spelaren | Vecka | Kassa − insats | Förlust | 1:a | Medelplats |
|---|---|---|---|---|---|
| Alltid fel | 1 | −1 485 kr | 19 av 24 | 6 | 4,4 |
| | 2 | −2 009 kr | 22 av 24 | **0** | 5,0 |
| | 3 | −1 865 kr | 20 av 24 | **0** | 5,0 |
| 0,5 rätt per steg | 1 | −431 kr | 14 av 24 | 9 | 3,9 |
| | 2 | −749 kr | 17 av 24 | 2 | 4,0 |
| | 3 | −1 695 kr | 20 av 24 | 2 | 4,5 |

**Ett svar i dag** (`summary.answers`): fel −2,6 till −2,7 i rykte och −121 till −130 kr; rätt +1,4 i rykte och +228 kr.

### Målen

- **De bästa spelarna 70 000–90 000 kr:** uppfyllt, 79 567–82 335 kr.
- **Stjärnan:** uppfyllt, 82 %, 25 % och 0 %.
- **"Alltid fel"** går med förlust och blir aldrig 1:a efter vecka 1: uppfyllt (oförändrat, felen kostar som förut).
- **"Hälften rätt" i mitten:** uppfyllt för platsen, 3,9–4,5 av omkring sju. Kassan går nu med förlust, −431 till −1 695 kr per kväll (303: −983 till +115 kr). Den går alltså inte längre "ungefär jämnt upp".
- **Trappan:** uppfylld. Mentorn och den förnuftiga stänger aldrig, den slarviga alltid.

### Det som ändrades utöver målen

1. **Trappans "halva" stänger 19 av 20 säsonger** (303: 8 av 20). Målet från 296c, att "halva" stänger i 30–50 % av säsongerna, nås inte längre. 303:s rapport förutsåg det: med en lägre uppsida stänger "halva" oftare. Beslut: står det kvar, eller ska "halva" få ett annat mål nu?
2. **Stjärnjägaren med 0,75 stänger 5 av 40 säsonger** (303: 0) och slutar på 9 439 kr i snitt. Med 0,6 stänger den 39 av 40.

## Tester och bygge

- Typecheck grön.
- Testerna som läser talen (`order279QuestionsAndStake`, `order296cStar`, `order300Borjan`, `order303Foljderna`, `order296bBalans`, `balance`) är gröna. Hela sviten körs vid merge.
