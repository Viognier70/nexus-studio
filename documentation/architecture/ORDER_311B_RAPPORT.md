# ORDER 311b — Bistron tillbaka mot 1,0 (rapport)

**Underlag:** Anders 2026-10-06:
- Halva i bistron får stänga upp till 65 % av säsongerna.
- Bistrons personalkostnad återställs mot 1,0, så att den som har 0,85 rätt slutar på 90 000–100 000 kr.
- Soigné med 0,85 tjänar mest av alla, också minst 10 % mer än den kloka i bistron.
- Övriga mål gäller, och glaset vid rätt svar står kvar.
- Tabellen rapporteras över 40 säsonger.

Gren `order-311b` från `main` (`7dd7939f`).

## Talen

`balance.ts CONCEPT`:
- **`wageFactor`:**
  - bistro 0,88 → **0,96**;
  - soigné 1,47 → **1,4**, så att soigné med 0,85 når 10 % över den kloka.
- **`billFactor`:** soigné 1,65 → **1,68**.

Mätningarna står i `reports/order311b/kalib/`:
- bistrons personal 0,95 och 0,92 (`bw095/`, `bw092/`), 40 säsonger;
- soigné-personalen 1,4 och 1,35 (`sw1.4/`, `sw1.35/`).

## Tabellen, 40 säsonger

Talen står i `frontend/reports/order311b/efter40/`. Stjärnan och "alltid fel" står i `efter/`, med 40 respektive 24 kvällar per vecka.

| Spelaren | Stängda | Kassa vid säsongens slut | Mål |
|---|---|---|---|
| Enkel 0,85 | 0 av 40 | 56 048 kr | stänger aldrig, 40 000–60 000 kr: **uppfyllt** |
| Enkel 0,6 | 15 av 40 (38 %) | 2 114 kr | 30–55 %: **uppfyllt** |
| Bistro 0,85 | 0 av 40 | 98 760 kr | 90 000–100 000 kr: **uppfyllt** |
| Soigné 0,85 | 3 av 40 | 124 402 kr | mest av alla och minst 10 % över den kloka (120 195 kr), 110 000–130 000 kr: **uppfyllt** |
| Soigné 0,6 | 40 av 40 | −62 979 kr | stänger alltid: **uppfyllt** |
| Halva (bistro) | **32 av 40 (80 %)** | −12 163 kr | högst 65 %: **inte uppfyllt** |
| Den kloka (bistro, alltid rätt) | 0 av 40 | 109 268 kr | — |
| Mentorn | 0 av 40 | 105 191 kr | — |
| Den förnuftiga | 0 av 40 | 87 568 kr | — |
| Alltid fel | 40 av 40 | −37 157 kr | — |
| Den slarviga | 40 av 40 | −57 928 kr | stänger alltid: **uppfyllt** |

| Övriga | Utfall | Mål |
|---|---|---|
| Stjärnan 0,85 / 0,75 / 0,6 (40 säsonger) | 78 % / 35 % / 0 % | uppfyllt |
| Alltid fel 1:a | vecka 1: 9 av 24; vecka 2–3: 0 | uppfyllt |

## Halva och bistro med 0,85

Med bistrons personal 1,0 stänger halva 85 % (ORDER 311:s första körning). Personalen rör båda lika mycket:

| Bistrons personal | Bistro 0,85 | Halva stänger (40 säsonger) | Källa |
|---|---|---|---|
| 0,96 (valt) | 98 760 kr | 80 % | `efter40/` |
| 0,95 | 100 468 kr | 78 % | `kalib/bw095/` |
| 0,92 | 105 593 kr | 68 % | `kalib/bw092/` |
| 0,88 (ORDER 311) | 112 865 kr | 60 % | `reports/order311/efter/` |

**65 % för halva kräver personalen omkring 0,90, och då slutar bistro med 0,85 på omkring 109 000 kr.**

Den andra spaken som skiljer de två åt är en lägre nota i bistron. Men den gör krogen billigare i byns val, och då blir "alltid fel" 1:a (ORDER 311, X1–X2). Glaset vid rätt svar står kvar enligt beslutet.

**Valt:** Anders uttryckliga mål för bistro med 0,85 (personalen 0,96). Halva stänger då 80 %.

## Att besluta

Halva i bistron, 80 % i stället för högst 65 %:
- Godta 80 %.
- Eller välj personalen 0,90, med bistro 0,85 på omkring 109 000 kr.
- Eller låt byns val läsa menyns pris i stället för notan. Då kan bistrons nota sänkas utan att fler gäster kommer, och båda målen kan nås. Det ändrar byns val för alla klasser, så det behöver en egen order.

## Tester och bygge

- **Typecheck och bygge:** gröna.
- **Inga testfiler ändrade.** Talen läses ur `balance.ts`.
