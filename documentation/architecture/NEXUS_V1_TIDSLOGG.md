# Nexus v1 — tidslogg

**Ordern** `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md` §5 (tillägg 2026-09-25)

Uppskattningen skrivs innan etappen börjar. Faktisk tid fylls i när etappen är klar.

**Hur faktisk tid mäts.** Ordern mäter från första till sista commit, och det talet står i kolumnen *Commit-spann*. Om alla commits görs i slutet mäter det talet bara själva committandet. Därför står också *Gren*, som är tiden från att grenen skapades till mergen enligt `git reflog`. Från och med etapp 1 committas arbetet i steg under etappen, så att commit-spannet går att använda.

| Etapp | Order | Filer (uppskattat) | Uppskattad tid | Största risk | Filer (faktiskt) | Commit-spann | Gren | Avvikelse |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 — Grunden | 262 | ~15 | 1–2 h *(uppskattad i efterhand)* | Testet som läser speldesignen och hävdar att alla tal finns i `balance.ts`: räkneord, procent och tal som inte är spelvärden gör matchningen skör | 20 (`git diff --stat b2965c9 3d53084`) | 0 min (11:59–11:59) | 15 min (11:44–11:59) | Från 11:31, då speldesignen kom på plats (mappens ändringstid), till mergen 11:59 gick 28 min, varav 13 min gick åt till läsning innan grenen skapades. Commit-spannet blev 0 min eftersom allt committades i slutet. Risken slog in: testet missade först 1000 → 999 och fick rättas. |

## Omräkning efter etapp 2

*(fylls i efter etapp 2)*
