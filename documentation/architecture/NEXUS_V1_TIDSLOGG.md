# Nexus v1 — tidslogg

**Ordern** `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md` §5 (tillägg 2026-09-25)

Uppskattningen skrivs innan etappen börjar. Faktisk tid fylls i när etappen är klar.

**Hur faktisk tid mäts.** Från att etappens gren skapas till mergen, enligt `git reflog` (Vision Owner 2026-09-25: "det är bättre"). Kolumnen *Commit-spann* (första till sista commit, orderns ursprungliga mått) står kvar för etapp 0 där den redan var ifylld.

| Etapp | Order | Filer (uppskattat) | Uppskattad tid | Största risk | Filer (faktiskt) | Commit-spann | Gren | Avvikelse |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 — Grunden | 262 | ~15 | 1–2 h *(uppskattad i efterhand)* | Testet som läser speldesignen och hävdar att alla tal finns i `balance.ts`: räkneord, procent och tal som inte är spelvärden gör matchningen skör | 20 (`git diff --stat b2965c9 3d53084`) | 0 min (11:59–11:59) | 15 min (11:44–11:59) | Från 11:31, då speldesignen kom på plats (mappens ändringstid), till mergen 11:59 gick 28 min, varav 13 min gick åt till läsning innan grenen skapades. Commit-spannet blev 0 min eftersom allt committades i slutet. Risken slog in: testet missade först 1000 → 999 och fick rättas. |
| 1 — Tiden | 263 | ~25: kalender (ny), `types.ts`, `reducer.ts`, `arrivals.ts`, `activities.ts`, `model.ts`, sparmodul (ny), tre–fyra UI-paneler, `strings.sv.ts`, tester, playwright-skript, rapport | 4–6 h | Veckodagsfaktorn i ankomsterna flyttar talen i de många kalibrerade simtesterna med fast frö (ORDER 253–260); sparat läge måste vara serialiserbart i sin helhet | 83 (`git diff --stat e251d14..73c01e2`), varav 29 skärmdumpar och en JSON-rapport | — | 1 h 19 min (12:10–13:29) | Kortare än uppskattat. Risken med de kalibrerade simtesterna bet bara i tre tester. Det som tog tid var verifieringen i spelarens vy (tre veckokörningar à ~20 min: dev, en avbruten mot fel server, produktion) och två fel den hittade (menyn gick inte att klicka, dagsmärket på mobil). |
| 2 — Kunskapen | 264 | ~30: medaljer och besök i tillståndet (`types.ts`, `reducer.ts`), paviljongsmodul (urval, prov, Teatern, platina), kvällens axel och quiz, `balance.ts`, fyra nya paneler (paviljong, fråga med förklaring, medaljer, kvällsquiz), strängar, avstängning av frågor under servicen, tester, playwright-skript, rapport | 5–7 h | Att stänga av frågorna under servicen och ändra kvällens övergång rör de många testerna från ORDER 224–260 och veckoskriptet från etapp 1 | 47 (`git diff --stat 73c01e2..972f040`), varav 10 skärmdumpar och en JSON-rapport | — | 32 min (13:31–14:03) | Mycket kortare än uppskattat. Risken med de kalibrerade testerna gav 13 mekaniska justeringar (kvällens längd, ankarfrågor), inte omkalibrering. Verifieringen i spelarens vy tog en körning, en rättning (namnskylten över dialogen) och en omkörning, cirka 6 min vardera. |
| 3 — Ekonomin och bankmötet | 265 | ~25: ekonomimodul (golv, lån, marknad, nedgradering, klassbyte), `balance.ts`, `types.ts`, `reducer.ts`, `arrivals.ts`, veckoharness (ny) + mätskript, bankmöte och avräkning i gränssnittet, strängar, tester, rapport | 1,5–2,5 h | Marknadstaket och det nya lånet flyttar kassan och ankomsterna i de kalibrerade testerna; normal veckointäkt per klass måste mätas innan golvet kan sättas | | | | |

## Omräkning efter etapp 2

Se `ORDER_264_RAPPORT.md`, avsnittet *Omräkning av återstående etapper*: ungefär 18–30 h för etapp 3–13.
