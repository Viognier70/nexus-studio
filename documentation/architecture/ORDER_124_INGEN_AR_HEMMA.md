# ORDER 124 — Ingen är hemma

**Repo** `Viognier70/nexus-studio` · **Gren** `order-124` (placering) / följdgren `order-124-exec` (utförande, från `main`)
**Klass** AUTONOM
**Datum** 2026-08-29

> Nummer 124 verifierat mot `ORDER_REGISTRY.md` 2026-08-29: 100–123 populerade,
> 124 nästa lediga.

---

## 1. Läget

Observerat i dev-servern 2026-08-29, dag 1 lunch: alla tre roller visar
`On break` medan `waiting=2`. Gäster står i kön och ingen i personalen reagerar.

**Andra observationen samma dag, dag 1 lunch, service 9:18 in:** `waiting=4`,
`seated=0/16`, alla tre roller `On break`. Värre än den första — kön har växt
till fyra gäster och ingen sätts, samtidigt som personalen står stilla.
Bekräftar att mönstret inte är en engångshändelse i sim-uppstart utan
återkommer när servicen är i gång.

Orsaken är att två system grindar på olika begrepp:

| System | Grindar på |
| --- | --- |
| Ankomster (`arrivals.ts`) | `period` — lunch 0,6 / middag 1,0 |
| Personalens handlingar (`deriveActions.ts` rad 131) | `phase` — `prep` ger `On break` |

Gäster spawnar alltså under hela passet, inklusive `prep`, medan personalen står
still tills `simTime` passerar `prepEndsAt`.

**Koden gör vad den säger.** Det är inte en krasch och inte ett undantag. Men
spelaren ser en restaurang där ingen är hemma medan folk väntar — och det är
precis den läsning presentationsarbetet finns för att undvika.

---

## 2. Vad som ska utredas innan något byggs

Två grundorsaker är möjliga och de kräver olika åtgärd:

**(a) Handlingarna är för trubbiga.** Personalen borde reagera på väntande
gäster oavsett fas — åtminstone värden. Då ligger fixen i `deriveStaffAction`.

**(b) `prepEndsAt` sätts för sent.** Preppen överlappar med ankomstfönstret, och
då ligger fixen i reducerns `openService`.

Ordern ska **fastställa vilket** innan den bygger. Redovisa var `prepEndsAt`
sätts, vilket värde det får, och när det första ankomstfönstret öppnar — som tal,
inte som resonemang.

Är det (b) ska (a) inte byggas som plåster.

---

## 3. Vad som får byggas

Den grundorsak §2 fastställer. Inte båda, inte den andra "för säkerhets skull".

Om det är (a): en väntande gäst ska ge personalen en handling som läses som
respons. Vilken roll som reagerar, och vad handlingen heter, avgörs av vad
`deriveStaffAction` redan har för vokabulär — ingen ny sträng uppfinns utan att
det redovisas.

Om det är (b): fasgränsen justeras så att ankomster och prep inte överlappar.

---

## 4. Vad som INTE får göras

**Inga trösklar kalibreras.** Inte ankomstmultiplikatorerna, inte
ansiktsbanden, inte `capacity`. Det här är en grind-fråga, inte en
balansfråga.

Om fixen frestar till att ändra ett tal i simuleringen är det ett tecken på att
grundorsaken inte är fastställd. Stanna och rapportera.

---

## 5. Definition of Done

1. Grundorsaken fastställd enligt §2, med tal, i rapporten.
2. Endast den grundorsaken åtgärdad.
3. Test som hävdar tillståndet: gäster väntar i kön **och** minst en i
   personalen har en handling som inte är `On break`.
4. Regressionstest: personalen står fortfarande stilla när ingen väntar och
   passet inte börjat. Fixen får inte göra rasten omöjlig.
5. Grep: inga ändrade värden i tröskeltabeller eller ankomstmultiplikatorer.
6. Typecheck grön, hela sviten grön, båda CI-jobben gröna.
7. Registerpost i samma commit.

---

## 6. Avgränsningar

Presentationslagret rörs bara om grundorsaken ligger där. `deriveFaces`,
ansiktsbanden och figurriggen är orörda i båda fallen.

Fynd 1 (`seatedIds` osynk med `guests`) hör till egen order och rörs inte här,
även om den ser besläktad ut.
