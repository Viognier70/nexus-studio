# ORDER 307b — Varje koncept går att driva (rapport)

**Underlag:** Anders 2026-10-05:
- "Varje koncept ska gå att driva för den som kan."
- **Mål i harness:**

| Koncept | 0,85 rätt per steg | 0,6 rätt per steg |
|---|---|---|
| Enkel | stänger aldrig, 40 000–60 000 kr | stänger 30–50 % |
| Bistro | 90 000–100 000 kr (turisterna kommer till bistron) | — |
| Soigné | tjänar mest av alla, 110 000–130 000 kr | stänger alltid |

- **Övriga mål:**
  - halva i bistron stänger 30–50 %;
  - stjärnan: 0,85 → minst 70 %, 0,75 → 20–40 %, 0,6 → 0 %;
  - "alltid fel" blir aldrig 1:a efter vecka 1;
  - den slarviga stänger alltid.
- **Spakar:**
  - enkel: lägre personalkostnad och billigare varor;
  - soigné: högre pris och betalningsvilja.
- **Vinkylen:** förmågan "Vinkyl" tas bort, och utrustningen "Finare vinkyl" behålls.

Gren `order-307b` från `main` (`508822e`). `main` med 308b och 310b (låset och väntan) är inmergad, och slutkörningen gjordes på den koden.

## 1. Vinkylen

- **Förmågan Vinkylen är borttagen** ur butiken (`sim/shop.ts`, `balance.ts SHOP`, Designs `hostShop.ts`, strängarna `ab.wineFridge.*`).
- **Utrustningen Finare vinkyl** ger dess verkan: den som dricker vin blir nöjdare (`EQUIPMENT.vinkyl.satisfaction`, `guestOrders.ts`).

## 2. Spakarna

`balance.ts CONCEPT`:

| Spak | Enkel | Bistro | Soigné | Var |
|---|---|---|---|---|
| Personalens dagslön (`wageFactor`) | 0,63 | 1 | 1,4 | `economy.ts dailyWagesSek`, efter kvällens koncept |
| Varornas inköpspris (`goodsCostFactor`) | 0,81 | 1 | 1,8 | `packages.ts packageCostSek`, efter varans nivå |
| Notan (`billFactor`) | 0,94 | 1,005 | 1,6 | `reducer.ts`, när gästen betalar |
| Ett fel svars förlust (`wrongFactor`) | 1 | 1 | 1,5 | `incidents.ts applyOutcome`. `wrongCashShare` (1) är orörd. |
| Turisterna av medelgruppen (`touristOfMiddle`) | 0,1 | 0,3 | 0,3 | turisterna betalar 1,1 |
| De betalningsstarka fullt vid konceptets rykte (`highFullAt`) | — | — | 1,0, det vill säga i proportion till ryktet | `guestTypes.ts typeShares` |

- **Konceptets rykte** drar mot krogens rykte med 0,05 per natt (förut 0,1).
- **Stjärnans gräns** för klarade raketer är 0,40 (förut 0,42). Med turisterna i bistro nådde 0,85 annars 68 %.

**Utöver Anders spakar** behövdes tre saker:
- **Personalen i soigné** (1,4). Notan skalar med intäkten och gynnar den som kan, medan lönen drabbar alla lika. Tillsammans blir skillnaden mellan 0,85 och 0,6 större.
- **Lägre nota i enkel** (0,94) av samma skäl, åt andra hållet.
- **Felets förlust i soigné** (1,5), efter 304: "Ju högre klass … hårdare följder av fel svar".

## 3. Spelarna i harness

- **"Den som kan"** i varje koncept spelar som stjärnjägaren: proven mot guld i Teatern, kloka val i butiken och på nålarna, och 0,85 eller 0,6 rätt per steg.
- **Bistro med 0,85** är alltså stjärnjägaren med 0,85.
- **Varukorgarna:**
  - enkel: soppa, linser, kyckling, desserter, öl, alkoholfritt och lite husets vin (nivå 0,31);
  - bistro: baspaketet (0,74);
  - soigné: vilt, lamm, kantareller och Pinot Noir på glas och flaska (1,48).
- **En spelare utan butik och prov** (bara baspaketet och 0,85) slutade på 33 000 kr i bistro. Därför räknas målet på den som kan (`reports/order307b/kalib/B0–V3b`).

## 4. Tabellen

Talen står i `frontend/reports/order307b/efter/`:
- `koncept-*.json`, 20 säsonger per spelare;
- `trappa-*.json`, 20 säsonger, och `trappa-halva-40.json`, 40 säsonger;
- `stjarna-*.json`, 40 säsonger;
- `kvallar-fel.json`.

Kalibreringen, 21 varianter, står i `kalib/` (`varianter/` har talen per variant).

| Koncept | Rätt per steg | Stängda | Kassa vid säsongens slut | Mål |
|---|---|---|---|---|
| Enkel | 0,85 | **0 av 20** | **58 673 kr** | uppfyllt |
| Enkel | 0,6 | **7 av 20 (35 %)** | −23 417 kr | uppfyllt |
| Bistro | 0,85 | 0 av 20 | **92 343 kr** | uppfyllt |
| Soigné | 0,85 | 0 av 20 | **120 636 kr**, mest av alla | uppfyllt |
| Soigné | 0,6 | **16 av 20 (80 %)** | −54 418 kr | **inte uppfyllt** |

| Övriga | Utfall | Mål |
|---|---|---|
| Halva (bistro) | 7 av 20 (35 %); med 40 säsonger 16 av 40 (40 %) | uppfyllt |
| Stjärnan 0,85 / 0,75 / 0,6 | 78 % / 32 % / 0 % | uppfyllt |
| Alltid fel | 1:a vecka 1: 9 av 24 kvällar; vecka 2–3: 0 | uppfyllt |
| Den slarviga | 20 av 20 stängda | uppfyllt |
| Mentorn / den kloka / den förnuftiga | 97 708 / 100 293 / 79 136 kr, ingen stängd | — |

**Soigné med 0,6** stänger 16 av 20. Av de fyra som klarar sig har tre kassan under noll vecka 8 (frö 8, 17 och 18). De hinner inte få tre avräkningar under noll innan säsongen slutar. Bara en (frö 15) klarar sig på riktigt.

Skälet är de hyresfria veckorna 1–4 (303c). De ger alla en buffert de första veckorna, så förlusterna i soigné hinner inte alltid fram.

Spakarna i soigné (notan, personalen, felets förlust och ryktet) flyttade utfallet mellan 16 och 19 av 20 i elva varianter, utan att nå 20.

## 5. Att besluta

1. **Soigné med 0,6 stänger 80 %.** Ska det räcka? Vägar till 100 %:
   - de hyresfria veckorna gäller inte soigné;
   - ett krav på kassa för att välja soigné;
   - eller att stängningen räknas också efter säsongens sista vecka.
2. **Lönen i soigné (1,4), notan i enkel (0,94) och felets förlust i soigné (1,5)** ligger utöver de spakar Anders angav. Behålla?
3. **"Den som kan"** räknas som stjärnjägaren, med prov, butik och nålar. Rätt tolkning?

## 6. Tester och bygge

- **`order307Konceptet.test.ts`:** soigné-blandningen i proportion till ryktet.
- **`order296Shop.test.ts`:** en annan låst förmåga i stället för vinkylen.
- **Harnessen:** spelarna `enkel`, `bistro` och `soigne` som den som kan, i `order296Karnan.test.ts`.
