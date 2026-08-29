# ORDER 127 — Bandet blir zonmedvetet

**Repo** `Viognier70/nexus-studio` · **Gren** `order-127` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-29
**Lyder under** SD-004 §3.3 med preciseringen 2026-08-29 (ORDER 122)
**Löser** ORDER 125 §7-fynden; låser upp dess uppskjutna DoD 8

> Nummer 127 verifierat mot `ORDER_REGISTRY.md` 2026-08-29: 100–126 populerade,
> 127 nästa lediga.

---

## 1. Läget

ORDER 123 byggde `silhouetteContrast.ts` med bandet `MIN_FLOOR_CONTRAST_RATIO`
1,8 och `MAX` 3,6, plus `MIN_ROLE_DISTINCTION_DELTA_E` 12. Det kalibrerades mot
restaurangens enda golv, `#a89577`.

ORDER 125 gav ölkrogen två golv. Två avvikelser föll ut:

| Par | Kontrast | Under MIN |
| --- | --- | --- |
| `servitör #6b6260` mot `floorBrew #7d776c` | 1,33:1 | 0,47 |
| `paying #e8c99e` mot `floorDining #a49b8a` | 1,74:1 | 0,06 |

Den andra är en avrundning. **Den första är fyndet:** en servitör i bryggeriets
zon läses inte, och det var precis vad ORDER 125 §7 förutsade.

---

## 2. Vad problemet faktiskt är

Bandet antog **ett golv per verksamhet.** Ölkrogen har två. Vinbaren får
sannolikt ett tredje med loungezonen, gästgiveriet och nattklubben fler.

Att välja ny hue för servitören löser dagens siffra och återskapar problemet vid
nästa rum. **Bandet ska i stället bli zonmedvetet:** en uniform ska hålla mot
varje golv den kan stå på.

---

## 3. Vad som byggs

**3.1 Zonregistret.** Varje verksamhetsklass redovisar sina golvfärger som data
— inte som spridda konstanter i scenfilerna. Restaurangen ett golv, ölkrogen
två.

**3.2 Kontrollen blir uttömmande.** `silhouetteContrast.ts` prövar varje
figurfärg mot varje golv i den klass figuren kan förekomma i. En uniform som
klarar matsalen men inte bryggeriet ska falla, inte passera på medelvärdet.

**3.3 Paletten justeras så att kontrollen går grön.** Servitörens `#6b6260` är
den som måste flytta — den ligger nära `floorBrew` i både ljushet och ton.

**Rollskillnaden ska bevaras.** `MIN_ROLE_DISTINCTION_DELTA_E = 12` gäller
oförändrad; värd, servitör, kock och lärling ska fortfarande gå att skilja åt.

---

## 4. Vad som INTE får göras

**Golven ändras inte.** `brewpubRoom.ts` är Designs leverans och scen-kopian är
byte-identisk med handoff. Att ljusa bryggeriets betong för att en uniform ska
passera vore att lösa fel ände — och det bryter §2:s kopieintegritet i ORDER 125.

**Figurerna görs inte större.** Inte heller får de kontur eller egen belysning.
Samma förbud som ORDER 123 §7.

**Bandkonstanterna sänks inte.** 1,8 är golvet. Att flytta det för att en färg
ska passera är samma fel som ORDER 088 gjorde när `hurried` flyttades från 0,85
till 0,95 — att måla om mätaren i stället för att åtgärda det som mäts.

---

## 5. `paying` på 1,74

Två vägar, och ordern ska välja en och motivera den:

**Justera färgen** så den klarar 1,8, eller **redovisa den som accepterad
avvikelse** med skäl — 0,06 under ett band som i sig är valt, i ett tillstånd
som varar kort.

Vad som inte går är att låta den ligga oförklarad i ett test som heter "kända
avvikelser". En känd avvikelse utan beslut blir en glömd avvikelse.

---

## 6. Definition of Done

1. Zonregistret enligt §3.1 — golvfärger som data per klass.
2. Kontrollen uttömmande enligt §3.2; test som hävdar att en färg som klarar ett
   golv men faller på ett annat **fångas**.
3. Servitörens kontrast mot `floorBrew` över 1,8, uppmätt och redovisad.
4. `paying` avgjord enligt §5, med motivering i koden.
5. Rollskillnaden bevarad — parvis ΔE över 12 för alla fyra uniformer, mätt.
6. Restaurangens värden oförändrade eller förbättrade; ORDER 123:s kalibrering
   får inte försämras. `git diff` på restaurangens golvfärg tomt.
7. `brewpubRoom.ts` orörd — `git diff main..HEAD -- frontend/src/strategic/scene/brewpubRoom.ts`
   tomt, och `cmp` mot `handoff/brewpubRoom.ts` fortsatt identisk.
8. Bandkonstanterna oförändrade — grep visar 1,8 / 3,6 / 12.
9. **ORDER 125 DoD 8 körd** — den uppskjutna playwright-verifikationen, i
   dagsljus och kvällsljus, i båda zonerna. Skärmdumpar checkade in.
10. Typecheck grön, hela sviten grön, båda CI-jobben gröna.
11. Registerpost i samma commit, och ORDER 125:s rad uppdaterad så att DoD 8 och
    §7-fynden inte längre står öppna.

---

## 7. Om något inte går

Om servitörens färg inte kan flyttas tillräckligt utan att kollidera med värd,
kock eller lärling, är det ett fynd. Då är fyra uniformer mot två golv fler
begränsningar än paletten rymmer, och svaret kan vara zon-specifik uniform eller
en femte hue-familj — men det avgörs efter rapporten, inte i den.

Rapportera och stanna. Bygg inte runt det.
