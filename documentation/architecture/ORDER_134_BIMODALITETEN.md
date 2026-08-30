# ORDER 134 — Bimodaliteten

**Repo** `Viognier70/nexus-studio` · **Gren** `order-134` (från `main`)
**Klass** AUTONOM · **Utredning, ingen kalibrering**
**Datum** 2026-08-30
**Följer** ORDER 131 §6, följdorderförslag (1)

---

## 1. Läget

ORDER 131 svepte 200 seeds × 2 pass × 4 verksamheter — 460 000 samples per cell.
Svaret på bandfrågan var nej: restaurang, värdshus och ölkrog ligger över 0,95 i
56–70 % av tiden, food trucken i 17–33 %.

**Men det viktigaste fyndet var formen, inte talen.** Fördelningen är bimodal:
personalens belastning är antingen nära noll eller nära ett, sällan däremellan.

Det ändrar vad `hurried` betyder. Tröskeln mäter inte hur hårt personalen jobbar
— den rapporterar vilket av två lägen de befinner sig i. Att flytta bandet från
0,95 till något annat skulle inte hjälpa, eftersom det knappt finns någon massa
mellan lägena att flytta genom.

Fem gånger under projektet har någon velat kalibrera om bandet. Det här fyndet
förklarar varför det aldrig löste något.

---

## 2. Vad som ska fastställas

**2.1 Var uppstår tudelningen?** Är det ankomstschemat som är spikigt — gäster
kommer i klungor snarare än jämnt — eller uppstår det i hur arbete tilldelas
personalen?

Mät ankomsterna separat från belastningen. Är ankomstfördelningen jämn men
belastningen bimodal, ligger orsaken i tilldelningen.

**2.2 Hur länge varar ett läge?** Mät längden på sammanhängande perioder över
respektive under mitten. Sekunder eller minuter? Ett läge som varar två sekunder
är brus; ett som varar två minuter är spelupplevelse.

**2.3 Beror det på bemanningen?** Sveep över `staffCount` — blir fördelningen
mindre tudelad med fler i personalen, eller består formen?

**2.4 Gäller det food trucken också?** Den ligger 17–33 % över 0,95 mot de
andras 56–70 %. Är dess fördelning också bimodal, eller är den jämnare?

---

## 3. Vad som INTE får göras

**Inga trösklar kalibreras.** Inte `hurried`, inte något annat ansiktsband.

**Inga ankomstmultiplikatorer ändras.** Ordern mäter schemat, den ändrar det
inte.

**Inget värde föreslås.** Samma regel som ORDER 131 §4. Ordern levererar
underlag; vad som ska göras åt formen är ett designbeslut.

Sim-lagret rörs inte alls utöver mätskript.

---

## 4. Rapporten

`documentation/blueprints/`, bredvid ORDER 131:s.

Ska besvara rakt: **är tudelningen en egenskap hos ankomsterna eller hos
tilldelningen?** Och: är den ett problem, eller är det så en restaurangservice
faktiskt känns?

Den andra frågan är inte retorisk. Ett kök går ofta från lugnt till fullt utan
mellanläge. Om modellen fångar något verkligt ska det sägas — då är det
ansiktsvokabulären som ska beskriva två lägen, inte belastningen som ska jämnas
ut.

---

## 5. Definition of Done

1. §2.1 mätt — ankomstfördelning separat från belastningsfördelning.
2. §2.2 mätt — lägeslängder i sekunder, per verksamhet.
3. §2.3 mätt — svep över `staffCount`.
4. §2.4 mätt — food truckens form jämförd med de andra.
5. Histogram för varje mätning i rapporten.
6. Slutsats enligt §4, inklusive ställningstagandet om huruvida formen är ett
   fel eller en trogen modell.
7. Grep: inga ändrade tröskelvärden, inga ändrade ankomstmultiplikatorer.
8. Svepet incheckat som körbart test, som ORDER 131:s.
9. Typecheck grön, hela sviten grön, båda CI-jobben gröna.
10. Registerpost i samma commit.

---

## 6. Vad som väntar på detta

Per-fas-bandfrågan från ORDER 131 §6 — att dinner ligger 8–16 procentenheter
högre än lunch i andel över 0,95 — beställs inte förrän den här ordern
rapporterat.

Skälet: om tudelningen är den dominerande effekten kan skillnaden mellan lunch
och middag vara en bieffekt av hur ofta lägesskiften inträffar, snarare än en
skillnad i belastning. Då är per-fas-band fel svar på fel fråga.
