# ORDER 129 — De tjugoen hålen

**Repo** `Viognier70/nexus-studio` · **Gren** `order-129` (från `main`)
**Klass** AUTONOM · Docs, ingen produktionskod
**Datum** 2026-08-29
**Följer** ORDER 118 audit, fynd A2

---

## 1. Läget

ORDER 118 fann 21 ordernummer som citeras i repot utan att ha en registerrad:
**017, 054–059, 062–075.** De ligger nu som `Gap — ej utredd`.

Flera har känt innehåll citerat på annat håll:

| Nummer | Vad som är känt |
| --- | --- |
| 054 | Skala/kamera/assetpolicy Del A, verbalt utfärdad 2026-08-11. Refererad 43 gånger. ORDER 053-radens body säger "closed by ORDER 054 Del A" |
| 055 | `CLAUDE.md` §Renderregler citerar "ORDER 055 Del A" som källa för `transparent`-opacity och `castShadow`. Refererad 21 gånger |
| 057 | `CLAUDE.md` §Enhetskontrakt citerar "ORDER 057 §3" för humanoid-toleransbandet 1,55–1,90 m. Refererad 28 gånger |
| 059 | ORDER 060-radens body säger "removes ORDER 059 DoubleSide workaround" |
| 017 | Endast citerad indirekt via `017a`-varianten |

Resten är okända, med referensantal mellan 1 och 23.

---

## 2. Vad som ska göras

För varje av de 21 numren, sök i repot efter vad ordern faktiskt gjorde. Källor
att pröva:

- Kodkommentarer och strängar som nämner numret
- `CLAUDE.md` och andra styrande dokument
- Andra registerraders body-text
- Commit-meddelanden i historiken, inklusive `git log --all --grep`
- Filer i `documentation/` som refererar numret

**Skriv raden av det som faktiskt hittas.** En rad som säger vad ordern gjorde,
med sha-hänvisningar eller filreferenser som attestering — samma form som
112-raden fick.

---

## 3. Tre utfall per nummer

Varje nummer landar i ett av tre lägen. Ordern ska ange vilket, för alla 21.

**Utredd.** Innehållet fastställt ur repot, raden skriven med attestering.

**Reference only.** Numret utfärdades verbalt, arbetet finns i kod, men inget
orderdokument existerar. Samma mönster som 112, SD-001 och SD-003 rev. 2.

**Vakant.** Numret hoppades över och inget arbete gjordes. Kräver bevis — att
inget hittas är inte samma sak som att inget finns. Ange vad som söktes.

---

## 4. Vad som INTE får göras

**Ingen rad gissas.** En rad som beskriver vad numret *troligen* gjorde är värre
än en rad som säger `Gap — ej utredd`, eftersom den ser besvarad ut.

Om innehållet inte går att fastställa ska raden stå kvar som gap, med en not om
vad som söktes och varför det inte räckte.

**Ingen produktionskod rörs.** Inga saknade orderdokument skrivs — att 054 aldrig
fick en fil är ett fynd att redovisa, inte ett hål att fylla.

**Sorteringen rörs inte.** Registret är osorterat efter rad 045 (fynd B1). Det
är en egen order.

---

## 5. Rapporten

`documentation/architecture/GAP_AUDIT_017_075.md`.

Tabell över alla 21 med utfall enligt §3, sorterad efter nummer. Följt av en kort
sammanfattning: hur många utredda, hur många reference only, hur många vakanta.

**Rapporten får inte dölja ett dåligt resultat.** Om femton av 21 förblir okända
ska det stå rakt ut. Det säger något om hur mycket av projektets tidiga historia
som bara finns i chattar.

---

## 6. Definition of Done

1. Alla 21 nummer prövade, inget överhoppat.
2. Varje nummer i ett av §3:s tre lägen, med motivering.
3. Utredda och reference only-nummer har uppdaterade registerrader med
   attestering.
4. Vakanta och fortsatt okända står kvar som gap, med not om vad som söktes.
5. Rapporten enligt §5 incheckad.
6. `git diff main..HEAD -- frontend/` tomt.
7. Registerpost för denna order i samma commit.

---

## 7. Om något inte går

Om sökningen visar att ett nummer har **motstridiga** spår — två olika
beskrivningar av vad det gjorde — är det ett fynd av eget slag. Redovisa båda och
avgör inte.

Och om mönstret visar sig vara att allt efter en viss punkt är verbala ordrar
utan dokument, säg det. ORDER 118 noterade att allt efter 102 är verbalt; om
samma sak gäller bakåt är det en systemförklaring och inte 21 enskilda hål.
