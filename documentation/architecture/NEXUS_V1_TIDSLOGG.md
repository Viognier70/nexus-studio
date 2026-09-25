# Nexus v1 — tidslogg

**Ordern** `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md` §5 (tillägg 2026-09-25)

Uppskattningen skrivs innan etappen börjar. Faktisk tid fylls i när etappen är klar.

**Hur faktisk tid mäts.** Från att etappens gren skapas till mergen, enligt `git reflog` (Vision Owner 2026-09-25: "det är bättre"). Kolumnen *Commit-spann* (första till sista commit, orderns ursprungliga mått) står kvar för etapp 0 där den redan var ifylld.

| Etapp | Order | Filer (uppskattat) | Uppskattad tid | Största risk | Filer (faktiskt) | Commit-spann | Gren | Avvikelse |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 — Grunden | 262 | ~15 | 1–2 h *(uppskattad i efterhand)* | Testet som läser speldesignen och hävdar att alla tal finns i `balance.ts`: räkneord, procent och tal som inte är spelvärden gör matchningen skör | 20 (`git diff --stat b2965c9 3d53084`) | 0 min (11:59–11:59) | 15 min (11:44–11:59) | Från 11:31, då speldesignen kom på plats (mappens ändringstid), till mergen 11:59 gick 28 min, varav 13 min gick åt till läsning innan grenen skapades. Commit-spannet blev 0 min eftersom allt committades i slutet. Risken slog in: testet missade först 1000 → 999 och fick rättas. |
| 1 — Tiden | 263 | ~25: kalender (ny), `types.ts`, `reducer.ts`, `arrivals.ts`, `activities.ts`, `model.ts`, sparmodul (ny), tre–fyra UI-paneler, `strings.sv.ts`, tester, playwright-skript, rapport | 4–6 h | Veckodagsfaktorn i ankomsterna flyttar talen i de många kalibrerade simtesterna med fast frö (ORDER 253–260); sparat läge måste vara serialiserbart i sin helhet | | | | |

## Omräkning efter etapp 2

*(fylls i efter etapp 2)*
