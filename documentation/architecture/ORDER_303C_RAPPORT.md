# ORDER 303c — Halva i trappan (rapport)

**Underlag:** Anders 2026-10-05:
- "Halva" ska stänga 30–50 % av säsongerna, inte 19 av 20.
- `wrongCashShare` rörs inte.
- Spaken väljs fritt, till exempel kvällens grundintäkt eller de fasta kostnaderna.
- Alla andra mål gäller:
  - de bästa slutar på 70 000–90 000 kr;
  - stjärnan når minst 70 % med 0,85 rätt per steg, 20–40 % med 0,75 och 0 % med 0,6;
  - "alltid fel" går med förlust och blir aldrig 1:a efter vecka 1;
  - den slarviga stänger alltid.
- Tabellen körs tillsammans med 305, alltså med kvitt eller dubbelt påslaget (ORDER 305b).

Gren `order-303c` från `main` efter 305b (`ccf241b`). Harnessens spelare går alltid vidare i kvitt eller dubbelt.

## Varför halva stänger

**"Halva"** (varannan raket rätt hela vägen) förlorar 8 000–10 000 kr i veckan från vecka 3 (`kalib/R1/trappa-halva.json` `byWeek`). Intäkten är omkring 42 000 kr i veckan, mot mentorns 55 000.

**Stängningen** kommer efter tre avräkningar i rad med kassan under noll (`sim/economy.ts` `belowZeroInRow`). Med startkassan 15 000 kr går halva under noll vecka 4–5 och stänger vecka 6–8.

**Spakar som verkar lika för alla räcker inte:**
- **Lägre hyra** (`R1–R3`): 25 % i stället för 32 % gav de bästa 97 000 kr, medan halva fortfarande stängde 19 av 20.
- **Golvet av sällskap** (`F13–F19`): flyttade halva lite. Det fick "alltid fel" att bli 1:a 4–5 kvällar av 24 vecka 2, vilket bryter målet.

**Tre saker behövdes:**
- **Avståndet** mellan den som har rätt och den som har hälften rätt minskades:
  - stegen släpper inte längre in gäster, bara en klarad raket gör det (`G1–G2`);
  - stämningens uppsida och avec togs bort.
- **Halva** behövde tid innan kassan går under noll.
- **De bästa** fick inte gå över 90 000 kr.

**Startkassan prövades** (`S1–S6`, 45 000–56 000 kr) och nådde målen. Men speldesignen har Vision Owners beslut 2026-10-02: "Startkassan sänks kraftigt."

**Valet blev hyran.** Samma effekt kommer från de fasta kostnaderna: ingen hyra säsongens fyra första veckor (`H1–H3`).

## Talen

`balance.ts`:

| Tal | Före | Nu |
|---|---|---|
| `RENT.introWeeks` / `introShareOfNormalWeeklyRevenue` | 2 veckor / 17 % | **4 veckor / 0 %** |
| `CONSEQUENCES.moodBillPerLiftUp` | 0,12 | **0** |
| `CONSEQUENCES.right.avecShare` | 0,07 | **0** |
| `INCIDENTS.guestsPerClearedStep` | 1 | **0** (en klarad raket släpper fortfarande in en gäst) |

`wrongCashShare` (1) är orört, och så är felens följder.

## Tabellen (303c med 305b)

Talen står i `frontend/reports/order303c/efter/`:
- `trappa-*.json`, 20 säsonger;
- `trappa-halva-40.json`, 40 säsonger;
- `stjarna-*.json`, 40 säsonger;
- `kvallar-*.json`.

### Ekonomins trappa

| Spelaren | Stängda | Kassa vid säsongens slut (303b → 303c) |
|---|---|---|
| Mentorn | 0 av 20 | 79 567 → **89 443 kr** |
| Den kloka | 0 av 20 | 82 335 → **90 106 kr** |
| Per | 0 av 20 | 79 567 → 89 443 kr |
| Den förnuftiga | 0 av 20 | 57 970 → 76 434 kr |
| Halva | **6 av 20 (30 %)**; med 40 säsonger **14 av 40 (35 %)** | −28 370 → −20 930 kr |
| Alltid fel | 20 av 20 | −60 529 → −38 157 kr |
| Den slarviga | 20 av 20 | −88 380 → −60 601 kr |

### Stjärnan (stjärnjägaren, 40 säsonger)

| Rätt per steg | Når stjärnan | Vecka i snitt | Stängda |
|---|---|---|---|
| 0,85 | **37 av 40 (92 %)** | 5,7 | 0 |
| 0,75 | **16 av 40 (40 %)** | 5,9 | 0 |
| 0,6 | **0 av 40** | — | 6 |

### "Alltid fel" och 0,5 rätt per steg (vinbaren vecka 1–3, 24 kvällar per vecka)

| Spelaren | Vecka | Kassa − insats | Förlust | 1:a | Medelplats |
|---|---|---|---|---|---|
| Alltid fel | 1 | −1 485 kr | 19 av 24 | 6 | 4,4 |
| | 2 | −2 009 kr | 22 av 24 | **0** | 5,0 |
| | 3 | −1 865 kr | 20 av 24 | **0** | 5,0 |
| 0,5 rätt per steg | 1 | +99 kr | 13 av 24 | 10 | 3,2 |
| | 2 | −1 124 kr | 20 av 24 | 1 | 4,1 |
| | 3 | −1 283 kr | 16 av 24 | 3 | 4,6 |

### Målen

- **Halva stänger 30–50 %:** uppfyllt, 30 % med 20 säsonger och 35 % med 40.
- **De bästa slutar på 70 000–90 000 kr:**
  - mentorn och Per på 89 443 kr;
  - den kloka på 90 106 kr, alltså 106 kr över gränsen ("ungefär").
- **Stjärnan:** uppfyllt, 92 %, 40 % och 0 %. Med 0,75 ligger andelen på bandets övre kant.
- **"Alltid fel"** går med förlust de flesta kvällar och blir aldrig 1:a efter vecka 1: uppfyllt.
- **Den slarviga** stänger alltid: uppfyllt. Mentorn och den förnuftiga stänger aldrig.

## Det som ändrades utöver målen

1. **Introduktionshyran** var Vision Owners beslut 2026-10-02 (ORDER 294): 17 % veckorna 1–2. Nu är det ingen hyra veckorna 1–4. Det beslutet ändras alltså av det här.
2. **Rätt svar ger mindre i rummet:**
   - inget avec (`ANSWER_EFFECTS`-texten "stannar för avec" visas inte längre);
   - ingen merförsäljning när stämningen lyfter;
   - inga gäster per klarat steg.
   - **Det som står kvar:** ett glas till, mer dricks, ryktet, ordet på gatan, en gäst när raketen klaras, och krediterna i kvitt eller dubbelt.
3. **Fel kostar som förut.** Felens kostnader (grad, nota, stämning nedåt) är oförändrade.
4. **"Alltid fel" och den slarviga** förlorar mindre över säsongen, eftersom de första veckorna är hyresfria. De stänger ändå varje gång.

## Tester och bygge

- **Ändrade tester:**
  - `order294IntroRent`: fyra hyresfria veckor;
  - `economy.test`: ingen hyresrad en hyresfri vecka, full hyra vecka 5;
  - `order276GuestFlow`: en kväll med rätta svar säljer mer; antalet gäster skiljer inte längre över en kväll.
- **Typecheck, hela sviten och bygget:** se commit.
