# Nexus v1 — tidslogg

## Överlämning (2026-09-26, SPELSTOPP 1)

**Var vi är.**
- Etapp 0–5 (ORDER 262–267) är mergade till `main` och pushade. Senaste merge: `47305aa`.
- Vi står vid **SPELSTOPP 1**. Vision Owner spelar en vecka. Ingen etapp 6 förrän Vision Owner svarat, och svaren förs in i `NEXUS_V1_OPPNA_FRAGOR.md` och i speldesignen först.
- En hel vecka går att spela från bussen till söndagstidningen, verifierat i produktionsbygget (`frontend/reports/order267/week-from-bus.json`).

**Öppet.**
1. **Vägen tillbaka efter nedgradering.** Den ska rättas först efter spelstoppet, se första punkten i `NEXUS_V1_OPPNA_FRAGOR.md`. Det enda förväntade felet i sviten (`order265WeekHarness`).
2. **Slumpmålet är inte nått:** 55 % mot ungefär 75 % (`frontend/reports/order267/randomness.json`). Vision Owner väljer väg (`ORDER_267_RAPPORT.md` §3).
3. **Vision Owners bekräftelse** av F31–F36: sittiden, marknadens takt, den första verksamheten, tidningen, slumpmålets definition och sparfilen version 2.
4. **Platshållare:** mentorns gestalt, tidningens utseende, spelarens figur vid insatsen och Teaterns frågor. Äldre paneler har kvar engelsk text (CLAUDE.md regel 7).
5. **Kvar från provspelet att bekräfta:** att "Fortsätt" i VS001-dialogen svarar på första klicket, och tiden till första verksamheten för en människa (målet är 20 min).

**Läs först i nästa session.**
1. `documentation/architecture/ORDER_267_RAPPORT.md`: vad som byggdes, hur man startar spelet, platshållarna.
2. `documentation/architecture/NEXUS_V1_OPPNA_FRAGOR.md`: punkten överst, och Vision Owners svar under **Svar**.
3. `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md`: etapp 6 till 10 (food trucken först).
4. Den här filen: uppskattningen för nästa etapp skrivs innan grenen skapas.

---

**Ordern** `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md` §5 (tillägg 2026-09-25)

Uppskattningen skrivs innan etappen börjar. Faktisk tid fylls i när etappen är klar.

**Hur faktisk tid mäts.** Från att etappens gren skapas till mergen, enligt `git reflog` (Vision Owner 2026-09-25: "det är bättre"). Kolumnen *Commit-spann* (första till sista commit, orderns ursprungliga mått) står kvar för etapp 0 där den redan var ifylld.

| Etapp | Order | Filer (uppskattat) | Uppskattad tid | Största risk | Filer (faktiskt) | Commit-spann | Gren | Avvikelse |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 — Grunden | 262 | ~15 | 1–2 h *(uppskattad i efterhand)* | Testet som läser speldesignen och hävdar att alla tal finns i `balance.ts`: räkneord, procent och tal som inte är spelvärden gör matchningen skör | 20 (`git diff --stat b2965c9 3d53084`) | 0 min (11:59–11:59) | 15 min (11:44–11:59) | Från 11:31, då speldesignen kom på plats (mappens ändringstid), till mergen 11:59 gick 28 min, varav 13 min gick åt till läsning innan grenen skapades. Commit-spannet blev 0 min eftersom allt committades i slutet. Risken slog in: testet missade först 1000 → 999 och fick rättas. |
| 1 — Tiden | 263 | ~25: kalender (ny), `types.ts`, `reducer.ts`, `arrivals.ts`, `activities.ts`, `model.ts`, sparmodul (ny), tre–fyra UI-paneler, `strings.sv.ts`, tester, playwright-skript, rapport | 4–6 h | Veckodagsfaktorn i ankomsterna flyttar talen i de många kalibrerade simtesterna med fast frö (ORDER 253–260); sparat läge måste vara serialiserbart i sin helhet | 83 (`git diff --stat e251d14..73c01e2`), varav 29 skärmdumpar och en JSON-rapport | — | 1 h 19 min (12:10–13:29) | Kortare än uppskattat. Risken med de kalibrerade simtesterna bet bara i tre tester. Det som tog tid var verifieringen i spelarens vy (tre veckokörningar à ~20 min: dev, en avbruten mot fel server, produktion) och två fel den hittade (menyn gick inte att klicka, dagsmärket på mobil). |
| 2 — Kunskapen | 264 | ~30: medaljer och besök i tillståndet (`types.ts`, `reducer.ts`), paviljongsmodul (urval, prov, Teatern, platina), kvällens axel och quiz, `balance.ts`, fyra nya paneler (paviljong, fråga med förklaring, medaljer, kvällsquiz), strängar, avstängning av frågor under servicen, tester, playwright-skript, rapport | 5–7 h | Att stänga av frågorna under servicen och ändra kvällens övergång rör de många testerna från ORDER 224–260 och veckoskriptet från etapp 1 | 47 (`git diff --stat 73c01e2..972f040`), varav 10 skärmdumpar och en JSON-rapport | — | 32 min (13:31–14:03) | Mycket kortare än uppskattat. Risken med de kalibrerade testerna gav 13 mekaniska justeringar (kvällens längd, ankarfrågor), inte omkalibrering. Verifieringen i spelarens vy tog en körning, en rättning (namnskylten över dialogen) och en omkörning, cirka 6 min vardera. |
| 3 — Ekonomin och bankmötet | 265 | ~25: ekonomimodul (golv, lån, marknad, nedgradering, klassbyte), `balance.ts`, `types.ts`, `reducer.ts`, `arrivals.ts`, veckoharness (ny) + mätskript, bankmöte och avräkning i gränssnittet, strängar, tester, rapport | 1,5–2,5 h | Marknadstaket och det nya lånet flyttar kassan och ankomsterna i de kalibrerade testerna; normal veckointäkt per klass måste mätas innan golvet kan sättas | 40 (`git diff --stat main..order-265`), varav 4 skärmdumpar och 3 JSON-rapporter | — | 1 h 41 min (14:05–15:46) | Inom spannet. Mer än hälften gick åt till två saker utanför koden: att få en väg tillbaka efter nedgradering (F22 fick göras om efter att harnessen visat en spiral), och att hitta en krasch i ölkrogens lampor som bara syntes i produktionsbygget (tre körningar à ~15 min, en utan minifiering för stacken). |
| 4 — Servicen | 266 | ~30: action-knappen (sim + panel + täckning av rummet), ryktets golv och återhämtning, lagerprognos i ord, tre händelser (inspektion, recensent, banken), kvällsberättelsen med det som gick bra först, borttagning av `proud`, avklingningen, `balance.ts`, strängar, tester, playwright-skript, rapport | 2–3 h | Att i spelarens vy få fram en gäst som verkligen var på väg att gå och se den stanna: kräver kö och missnöje vid rätt tidpunkt, och spelarens figur saknas i Designs material | se `git diff --stat main..order-266` | — | 2 h 13 min (15:47–18:00) | Stoppad vid DoD och mergad efter Vision Owners beslut (DoD 1 till etapp 5). Tiden gick till att få fram en gäst "på väg att gå" i spelarens vy: fem körningar på ~15 min, och felsökningen som visade att harnessen mätte ett annat rum än spelaren ser (rättat). DoD 1 kräver ett beslut om servicens tryck (F30). |
| 5 — Vinbaren och introduktionen | 267 | ~35: kön utan tyst tak och sittiden (Vision Owners beslut), vinbarens rum i spelet (20 platser, rumskontraktet), interiörens synlighet (order-173, ORDER 174 Fynd 2), introduktionen (bussen, mentorn, övning, prov, bankmötet), söndagstidningen, slumpmålet (1 000 veckor), DoD 1 från etapp 4, playwright-skript, rapport | 5–8 h | Interiörens synlighet (fjorton ordrar av historik kring kameran och väggarna) och att bussen från VS001 ska in i samma flöde som strategiska spelet | ~60 (`git diff --stat main..order-267`), varav 18 skärmdumpar och 5 JSON-rapporter | — | 2 h 20 min (18:01–20:21) | Kortare än uppskattat. Interiörens synlighet var redan löst på main. Tiden gick till tre fel som ingen mätning visat förut: platsbuggen som gav bort samma plats (därför ingen kö), marknadens tak som fylldes under första halvan av kvällen, och vinbarens rum utan `seatFacings` som fick gästrenderingen att kasta varje bildruta i produktionsbygget. Slumpmätningen (1 000 veckor) tog 10 min, och veckokörningen från bussen ~20 min per körning, fyra körningar. |

## Omräkning efter etapp 2

Se `ORDER_264_RAPPORT.md`, avsnittet *Omräkning av återstående etapper*: ungefär 18–30 h för etapp 3–13.
