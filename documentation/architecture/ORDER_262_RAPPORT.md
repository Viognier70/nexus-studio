# ORDER 262 — Nexus v1 etapp 0: Grunden (rapport)

**Order** `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md`, etapp 0
**Speldesign** `documentation/foundation/vision/NEXUS_SPELDESIGN_V1.md`
**Gren** `order-262` från `main` `b2965c9`
**Datum** 2026-09-25

Ordernumret är 262 eftersom 261 är upptaget av grenen `order-261`, där registerraden ligger (commit `5aa8737`).

---

## 1. Vad som byggdes

**Dokumenten på plats**
- Speldesignen låg i repots rot. Den ligger nu i `documentation/foundation/vision/NEXUS_SPELDESIGN_V1.md`. Ordern ligger i `documentation/orders/` och designspecifikationen i `documentation/briefs/`.
- ORDER 100 har fått avsnittet *SCOPE OF VERSION 1*, som räknar upp det som inte byggs i v1 och pekar på speldesignen. Konstitutionens egen text är orörd.
- Registret: ORDER 044 är satt till godkänd, och raden för 262 är tillagd.
- `documentation/architecture/NEXUS_V1_OPPNA_FRAGOR.md` är skapad med frågorna F1–F8.

**`frontend/src/sim/balance.ts`**
- Filen innehåller alla tal ur speldesignen, grupperade efter speldesignens rubriker: säsong, dag, vecka, högtider, paviljonger, öva, prov, frågebank, medaljer, quiz, golv, lån, marknad, slump, nedgradering, klasser, uppgradering, action-knappen, rykte, mognad, introduktion och sparande.
- Varje grupp bär `section`, som är rubriken i speldesignen.
- Ordern kräver också tal som speldesignen bara beskriver i ord, till exempel gästfaktorerna per veckodag och högtid. De talen är valda, bär `openQuestion` och står i F1–F5.

**Frågebanken som data**
- `frontend/src/strategic/content/questions/bank.meta.json` innehåller metadata: paviljong, nivå, frågeställare, axel, spår, rätt svar, ankare och platshållarflagga.
- `bank.text.en.json` innehåller spelartexten på engelska, som är källan.
- `bank.text.sv.draft.json` innehåller det svenska utkastet. Det har `status: "draft"` och är översatt i en körning för enhetlig ton och terminologi, som repliker från en person i rummet.
- Schema och validering ligger i `frontend/src/strategic/knowledge/questionBank.ts`: `validateMeta`, `validateText` och `validateBank`. Filen har också `questionsFor(pavilion, level)`.
- Språk: spelet läser engelska tills det svenska utkastet har status `reviewed`. Det styrs av `activeBankLanguage()`.
- Platshållare: nivåerna silver–platina lånar paviljongens bronsfrågor. De märks `placeholder: true` och får id:t `<bronsid>@<nivå>`.
- De fyra modulerna `*Brons.ts` innehåller inte längre egna kopior av frågorna. De läser banken, så deras anropare (ankarpickern och testerna) är oförändrade.

## 2. Hur det verifierades i spelarens vy

- **Ingen synlig ändring i den här etappen.** Bronsmodulerna ger samma frågor som förut. Det visar de befintliga testerna `metodkoketBrons.test.ts`, `stensotaBrons.test.ts`, `maltidbiblioteketBrons.test.ts` och `kalastorgetBrons.test.ts`, som jämför modulerna fält för fält mot `PAVILJONGFRAGOR_BRONS.md` och är gröna.
- Inga skärmdumpar är tagna, eftersom inget i spelarens vy har ändrats.
- Etappens DoD prövas med tester:
  - `src/strategic/knowledge/__tests__/questionBank.test.ts` visar att schemat validerar alla 40 frågor på båda språken. Det visar också att metadata och text hålls isär, att det svenska utkastet inte används och att platshållarna märks.
  - `src/sim/__tests__/balance.test.ts` läser speldesignen och hävdar fyra saker: varje `section` är en rubrik i speldesignen, varje tal i speldesignen finns i balance.ts, ingen annan fil under `src/sim/` har talvärden, och golvstegen 15/30/55/90 står ingen annanstans i `src/`.
- **Mutationsprövning** gjordes för att se att testerna slår till, och varje ändring återställdes efteråt:
  - Ändrad rubrik → testet föll.
  - Tal i en ny fil under `src/sim/` → testet föll.
  - Golvstegen i en annan fil → testet föll.
  - `simulatedWeeks` 1000 → 999 → testet föll.
  - `shareCapPerMedalStep` 0,03 → 0,04 → testet föll.
  - Första versionen av testet missade 1000 → 999: procentregeln lät 1000/100 = 10 matcha ryktets golv. Nu gäller /100 bara när "%" eller "procent" följer talet i speldesignen.
- Gränsen för punkt 3: i etapp 0 finns ingen annan fil under `src/sim/`, så punkten skyddar kommande etapper men prövar inget i dag.
- Typecheck och `npm run build` är gröna. Hela sviten är grön med samma 4 förväntade fel som efter ORDER 260.

## 3. Veckoharnessens tal

Ej tillämpligt. Veckoharnessen körs från etapp 3 (ordern §1.2).

## 4. Avvikelser från speldesignen och varför

### 4.1 Befintlig kod som säger emot speldesignen

Detta är den kartläggning som ordern §4 kräver innan kod skrivs. Stickprov är kontrollerade mot källraden. Konflikterna rättas i den etapp som bygger respektive del. Etapp 0 ändrar inget av detta.

| Speldesign | Speldesignen säger | Koden gör | Källa | Rättas i |
| --- | --- | --- | --- | --- |
| Tiden | Tre faser per dag, en service | Sex perioder, lunch- och middagsservice | `strategic/types.ts:595-605`, `simulation/reducer.ts:1023` | 1 |
| Tiden | Service 4–5 min | Spelaren väljer 3–30 min (5/10/15/30) | `types.ts:611-612`, `scenario/ServiceLengthPicker.tsx:22` | 1 |
| Tiden | Två schemaplatser, söndag fyra | `MAX_ACTIVITIES_PER_DAY = 3`; separat provtak `MAX_EXAM_SLOTS_PER_ROUND = 3` som aldrig nollställs | `simulation/activities.ts:76`, `reducer.ts:54` | 1–2 |
| Tiden | Vecka, söndag stängd, åtta veckor, högtider | Bara `dayNumber`; ingen veckodag, vecka, säsong eller högtid | `types.ts:661`, `reducer.ts:1555` | 1 |
| Kunskapen > Öva och pröva | Öva 5; prov 8 av 10, 6 rätt, nivån under krävs | Ett "prov" om 5 frågor (`QUESTIONS_PER_EXAM = 5`), ingen nivå, gräns eller öva-läge | `knowledge/examMechanic.ts:22` | 2 |
| Kunskapen > Frågebanken | Bronsbankens 40 frågor används | Proven drar ur 6 mall- och seedfrågor; de 40 används bara av ankarpickern | `reducer.ts:61-64`, `knowledge/questionTemplates.ts:157-171` | 2 |
| Kunskapen > Medaljerna | Medaljer per paviljong, förloras aldrig | Inget medaljtillstånd finns | — | 2 |
| Spelslingan ("kunskapen kan inte gå förlorad") | Kunskap följer med genom allt | `NIGHTLY_ENABLER_DECAY = 0.05` minskar kunskapsvärden varje natt | `simulation/reputation.ts:170` | 2 |
| Kunskapen > Paviljongerna | Teatern låst till silver i två | Alla fem öppna | `knowledge/pavilions.ts` | 2 |
| Kunskapen > Quizen efter servicen | 3 frågor efter kvällen, +1/−1 | Ankarfrågor under servicen, högst 3, +0,05, aldrig minus | `knowledge/anchorQuestionPicker.ts:45`, `reducer.ts:2970` | 2 |
| Ekonomin > Golvet | Golv efter medaljer, påfyllnad vid veckoavräkning | Finns inte | — | 3 |
| Ekonomin > Lånet | Amortering på 8 veckor, 5 % | `loan.principal: 2400`, `interestRatePerDay: 0.00025` (~9 % per år), amorteras aldrig | `simulation/model.ts:388-389` | 3 |
| Ekonomin > Lånet, Verksamhetsklasserna | Banken beviljar efter medaljer; ingen brons ger inget lån | Banken läser kreditvektorns vinkel (konor 45°) | `simulation/businessProfile.ts:21-28` | 3 |
| Ekonomin > Marknaden | Gästpool, tak 20 % + 3 pe per medaljsteg | Ankomstfaktor 0,55–1,4 mot konkurrenterna, ingen pool | `simulation/competitors.ts:72,83` | 3 |
| Ekonomin > Nedgradering | Tre dagsavslut under noll ger nedgradering | Kassan kan vara negativ utan följd | — | 3 |
| Verksamhetsklasserna | Sex klasser med huvudpaviljong och krav | Fem klasser (ingen nattklubb), `kvarterskrogen` som start, inga krav | `business/businessClass.ts:25,63-131`, `model.ts:321` | 3, 5–10 |
| Verksamhetsklasserna > Uppgradering | Ryktet halveras vid klassbyte | Klassbyte bara via bankmötet, ryktet orört | `reducer.ts:913-920` | 3 |
| (inte i speldesignen) | Tillväxt genom klassbyte | Food truckens uteplats låses upp automatiskt | `business/uteplatsUnlock.ts` | 6 |
| Servicen > Action-knappen | Tre insatser, tjugo spelsekunder | Finns inte | — | 4 |
| Servicen > Ryktet | Golv 10 av 100 | Skala 0–1, golv 0, start 0,6 | `simulation/reputation.ts:235,246`, `model.ts:291` | 4 |
| Servicen > Satsningarna | Personalfest, utbildning, ekologiska råvaror | Katalogen saknar personalfest | `simulation/activities.ts:27-67` | 1 |
| Servicen > Händelser | Händelser ur simuleringen med orsak | Handskrivna scenarier dras slumpvis; världsfaktorer slumpas | `simulation/scenarios.ts`, `simulation/worldFactors.ts:27-30` | 4 |
| Servicen > Medgång | Kvällsberättelsen börjar med det som gick bra | Kollaps-grenen kommer först | `simulation/eveningAccount.ts:13-19` | 4 |
| Servicen > Medgång | Ta bort `proud` | `proud` finns kvar | `ui/RoomCardPanel/deriveFaces.ts:24,32` | 4 |
| Ramar > Sparande | Autospar, veckokopia, tre platser | Inget sparande alls (ingen `localStorage` eller `indexedDB` i `src/`) | — | 1 |
| Professionell mognad och portfolio | Mognadssteg och portfolio | Finns inte | — | 12 |

Befintliga tal som motsvarar speldesignens mekanik ligger kvar i den gamla koden och flyttas till `balance.ts` när etappen bygger om mekaniken. Det gäller `QUESTIONS_PER_EXAM`, `MAX_ACTIVITIES_PER_DAY`, `MAX_EXAM_SLOTS_PER_ROUND`, `MAX_ANCHOR_QUESTIONS_PER_SERVICE`, `SERVICE_LENGTH_*`, lånetalen i `model.ts`, `SHARE_FACTOR_*` och ryktets gränser. Talen beskriver den gamla mekaniken, inte speldesignens. Därför är testets fjärde punkt (golvstegen) den enda som prövar befintlig kod i dag.

### 4.2 Konflikter mellan dokument

1. **Språk.** Speldesignen säger "Spelet är på svenska i version 1". CLAUDE.md regel 7 och registrets Observation 6 (2026-08-09) säger engelska. Speldesignen gäller enligt ordern §0, men CLAUDE.md har inte ändrats, eftersom ordern inte säger det. **Förslag:** att regel 7 ändras till "svenska i v1, spelartext och metadata separerade så att engelska kan läggas till", och att Observation 6 markeras som upphävd. Tills Vision Owner har granskat utkastet läser spelet den engelska frågetexten, enligt ordern etapp 0.
2. **ORDER 100:s status.** ORDER 100:s egen statusrad säger att den "carries no binding force" (`SUPERSEDING_DIRECTIVE_002.md` §3). Ordern kallar den däremot källa nummer 2, och speldesignen säger att den "är styrande för ORDER 100". Statusraden är orörd. Vision Owner bör avgöra om den ska skrivas om.
3. **Paviljongnamn.** Speldesignen skriver "Måltidsbiblioteket". Koden har id:t `maltidbiblioteket`, utan s, sedan ORDER 104; visningsnamnet har redan s. Id:t behålls, eftersom det är nyckel i data.

## 5. Öppna frågor

Se `documentation/architecture/NEXUS_V1_OPPNA_FRAGOR.md`, F1–F8. De viktigaste för Vision Owner:

- **F3:** vad "fem procents ränta" avser.
- **F4:** om medaljstegen till marknadstaket summeras över alla paviljonger.
- **F5:** första veckans färre gäster mot midsommarens höga efterfrågan i samma vecka.
- **F8:** klassernas normala veckointäkt och startlån saknar tal i speldesignen och behövs i etapp 3.
- Det svenska utkastet väntar på granskning: `frontend/src/strategic/content/questions/bank.text.sv.draft.json`.
