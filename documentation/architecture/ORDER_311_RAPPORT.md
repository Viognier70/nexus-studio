# ORDER 311 — Säsongens slut (rapport)

**Underlag:** Anders 2026-10-06:
- **Säsongens slut:** står kassan under noll i det sista bokslutet räknas det som konkurs, alltså "Stängd".
- **Harness körs igen**, med de här målen:
  - soigné med 0,6 stänger alltid;
  - halva i bistron och enkel med 0,6 stänger 30–55 %;
  - övriga mål som i ORDER 307b.
- **De extra spakarna står kvar:** personalen i soigné, notan i enkel och felen i soigné.
- **"Den som kan"** är stjärnjägaren, med proven, butiken och nålarna. Godkänt.

Gren `order-311` från `main` (`51c7cbb7`).

## 1. Regeln

- **`balance.ts RISK.closeBelowZeroAtSeasonEnd`:** när veckoavräkningen är säsongens sista (vecka `SEASON.weeks`, åtta) och kassan står under noll, stänger krogen (`sim/economy.ts settleWeek`).
- **Skälet sparas** i `economy.risk.closedReason`: `inRow` (tre bokslut i rad) eller `seasonEnd`.
- **Stängningen** säger: "Kassan står under noll i säsongens sista bokslut. Det är konkurs …" (`risk.closed.bodySeasonEnd`).
- **Sidan Spelets regler** har raden "Står kassan under noll i säsongens sista bokslut är det konkurs, och krogen stänger." (`rules.seasonEnd`).
- **Regel 1** på kortet dag 1 är oförändrad (Anders text).
- **Testet** `sim/__tests__/order311Sasongsslut.test.ts`, med 3 tester:
  - konkurs vid vecka 8;
  - inte vid vecka 7;
  - inte med kassa över noll.

## 2. Effekten med 307b:s tal

Första körningen, med 307b:s tal och den nya regeln. **Filerna skrevs över** av slutkörningen i `efter/`, så talen här är obestyrkta enligt CLAUDE.md:
- **Halva:** stängde 34 av 40.
- **Enkel med 0,6:** stängde 40 av 40.
- **Soigné med 0,6:** stängde 39 av 40.

Halva och enkel med 0,6 slutar i snitt under noll, så regeln stängde dem nästan alltid.

## 3. Kalibreringen

Varianterna står i `reports/order311/kalib/` (W1–Z2, `varianter/`).
- **Enkel:**
  - felen kostar mindre, med fel svars förlust gånger `wrongFactor` 0,75;
  - rummet beställer mindre efter fel svar, gånger `moodDownFactor` 0,4, en ny spak (`reducer.ts`);
  - personalen 0,71.
  - Mildare följder i lägre klass är samma princip som 304:s hårdare följder i högre.
- **Bistro:**
  - personalen 0,88; notan oförändrad 1,005;
  - en lägre nota gjorde krogen billigare i byns val, så att fler gäster kom och "alltid fel" blev 1:a vecka 2–3 (X1–X2).
- **Soigné:**
  - personalen 1,47;
  - notan 1,65;
  - rummet beställer mindre efter fel svar, gånger 1,25.

## 4. Tabellen

| Koncept | Rätt per steg | Stängda | Kassa vid säsongens slut | Mål |
|---|---|---|---|---|
| Enkel | 0,85 | 0 av 20 | 56 476 kr | stänger aldrig, 40 000–60 000 kr: **uppfyllt** |
| Enkel | 0,6 | 7 av 20 (35 %); **15 av 40 (38 %)** | 4 522 kr | 30–55 %: **uppfyllt** |
| Bistro | 0,85 | 0 av 20 | **112 865 kr** | 90 000–100 000 kr: **inte uppfyllt** |
| Soigné | 0,85 | 1 av 20; 1 av 40 | 118 994 kr; 121 051 kr med 40 säsonger | 110 000–130 000 kr och mest av alla: **delvis** (se nedan) |
| Soigné | 0,6 | 20 av 20; **40 av 40** | −68 516 kr | stänger alltid: **uppfyllt** |

| Övriga | Utfall | Mål |
|---|---|---|
| Halva (bistro) | 11 av 20 (55 %); **24 av 40 (60 %)** | 30–55 %: **nästan**, 5 procentenheter över med 40 säsonger |
| Stjärnan 0,85 / 0,75 / 0,6 | 78 % / 35 % / 0 % | uppfyllt |
| Alltid fel | 1:a vecka 1: 9 av 24; vecka 2–3: 0 | uppfyllt |
| Den slarviga | 20 av 20 stängda | uppfyllt |
| Mentorn / den kloka / den förnuftiga | 118 444 / 121 029 / 99 872 kr, ingen stängd | — |

## 5. Det som inte går ihop

1. **Bistro med 0,85 och halva.**
   - Med konkurs i sista bokslutet måste halva sluta över noll i nästan hälften av säsongerna. Det kräver omkring 20 000 kr mer över säsongen än i 307b.
   - Billigare personal ger lika mycket till alla, så bistro med 0,85 hamnar då på 113 000 kr.
   - En lägre nota i bistro skulle sänka den som kan mer än halva, men den gör krogen billigare i byns val, och då blir "alltid fel" 1:a.
   - Med de spakar som finns går det inte att nå båda målen. **Valt:** halva nära målet (55–60 %) och bistro 0,85 över (113 000 kr).
   - **Alternativ:**
     - höja målet för bistro till omkring 115 000 kr;
     - låta halva stänga upp till 65 %;
     - eller ta bort glaset som ett rätt svar ger. Det skulle sänka den som kan mer än halva (rätt svar ger mindre).
2. **Soigné med 0,85 är "mest av alla"** bara jämfört med de andra koncepten.
   - Den kloka (bistro, alltid rätt) slutar på 121 029 kr. Soigné med 0,85 slutar på 118 994 kr med 20 säsonger och 121 051 kr med 40.
   - Den kloka har svarat rätt på allt; soigné-spelaren har 0,85.

## 6. Tester och bygge

- **Nytt test:** `order311Sasongsslut.test.ts`.
- **Typecheck och bygget** är gröna. **Hela sviten:** 2 448 gröna och 16 överhoppade.
