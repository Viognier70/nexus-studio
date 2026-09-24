# ORDER — Konkurrenterna rör sig

**Repo** `Viognier70/nexus-studio` · **Gren** `order-NNN` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-31
**Följer** ORDER 166 §7-fyndet — Vision Owner-beslut 2026-08-31

> Numret tas ur `ORDER_REGISTRY.md`.

---

## 1. Läget

ORDER 166 byggde `shareFactor` och den fungerar som specad. Bandet håller,
spiralen finns inte, klassnärheten mäts.

**Men tiodagarsmätningen visade att formen inte bär.** Spelaren når taket 1,25
dag 6 och stannar där. Vid rykte 0,80 mot fältets 0,68 är fyra av sex
konkurrenter passerade, och de två kvarvarande går inte att påverka eftersom
deras rykte är fruset i data.

Konkurrensen är alltså över efter en dryg vecka. Det är inte ett fel i talet —
det är att konkurrenterna inte gör något.

---

## 2. Vad som byggs

**Konkurrenternas rykte blir rörligt.**

De ska fortfarande **inte simuleras** — ingen personal, ingen meny, ingen kassa.
Bara talet ska sluta vara fruset.

Formen avgörs av den som bygger, men den ska uppfylla tre villkor:

**2.1 Rörelsen ska vara begriplig.** En konkurrent vars rykte hoppar
slumpmässigt är brus, inte konkurrens. Rörelsen ska gå att förklara i en
mening — den driver mot ett medel, den reagerar på spelarens framgång, den
följer en egen bana.

**2.2 Spelaren ska inte kunna springa ifrån fältet permanent.** Det är hela
poängen. Men taket ska heller inte bli en gummivägg som gör förbättring
meningslös — en spelare som blir bättre ska få *något*, bara inte allt för
alltid.

**2.3 Konkurrenterna ska vara olika.** Ett fält där alla rör sig likadant är en
enda konkurrent i sex kopior. Minst en ska vara trög, minst en känslig — och
skillnaden ska vara mätbar i test.

---

## 3. Vad som INTE byggs

**Ingen simulering av konkurrenternas verksamhet.** Ingen kassa, ingen
bemanning, ingen meny. De har ett rykte som rör sig, inget mer.

**Ingen global efterfrågansfördelning.** Alternativ B står kvar som eget beslut.
Om den här ordern inte räcker är det argumentet för att ta det.

**`shareFactor` rörs inte.** Formeln, bandet 0,80–1,25 och klassnärheten
0,4/0,7/1,0 är oförändrade. Det är indata som ändras, inte funktionen.

**Och inga andra faktorer kalibreras.** Rykteskurvan, periodvikterna,
väderfaktorn, econR och `BASE_ARRIVAL_RATE` är orörda.

---

## 4. Måttet på om det fungerade

**Kör om ORDER 166:s tiodagarsmätning, och förläng den till trettio.**

Samma seed, samma metod, samma spelarbana som steg 0,02 per dag. Redovisa
`share=` per dag, före och efter.

Frågan rapporten ska besvara: **når spelaren fortfarande taket, och stannar
hen där?**

- Om `share=` planar ut på 1,25 igen — bara senare — är det samma fynd, och
  svaret är alternativ B.
- Om den rör sig över hela trettio dagar utan att fastna, bär formen.
- Och om spelaren aldrig kommer över 1,0 har gummiväggen blivit för stark.

Alla tre utfallen är giltiga. Rapporten ska säga vilket det blev, inte försöka
nå ett av dem.

---

## 5. Definition of Done

1. Rörligt rykte enligt §2, med rörelsen förklarad i en mening i koden.
2. Test: §2.3 — trög och känslig konkurrent skiljer sig mätbart.
3. Test: konkurrenternas rykte håller sig inom rimliga gränser. En konkurrent
   som driver mot noll eller ett är inte längre konkurrent.
4. **Trettiodagarsmätning** enligt §4, före och efter, med kurva i rapporten.
5. Slutsats enligt §4:s tre utfall, uttryckligen angiven.
6. **Mätvärden spårbara per ORDER 160** — filnamn och variabel för varje tal.
7. Grep: `shareFactor`-formeln, bandet och klassnärheten oförändrade.
8. Grep: inga ändrade värden i rykteskurvan, periodvikterna, väderfaktorn,
   econR eller `BASE_ARRIVAL_RATE`.
9. Typecheck grön, hela sviten grön, alla fyra CI-jobb gröna på PR:en.
10. Registerpost i samma commit, och ORDER 166:s rad uppdaterad så att
    §7-fyndet inte står öppet.

---

## 6. Om något inte går

Om ett rörligt rykte inte går att göra begripligt utan att konkurrenterna
simuleras — om varje form blir antingen brus eller en gummivägg — **stanna och
rapportera.**

Det är i så fall det starkaste argumentet för alternativ B, och det beslutet är
Vision Owners. Bygg inte en halv simulering för att undvika att ställa frågan.
