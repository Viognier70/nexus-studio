# ORDER 137 — Bakgrundsarbetet

**Repo** `Viognier70/nexus-studio` · **Gren** `order-137` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-30
**Följer** ORDER 134, alternativ B — Vision Owner-beslut 2026-08-30

---

## 1. Vad som beslutats

ORDER 134 fastställde att belastningens tudelning ligger i **tilldelningen**, inte
i ankomsterna. Ankomsterna är jämna, 0,022 per tick. Det är
`workload`-konstanterna som håller personalen på 1 så länge kön inte är tom, och
på ~0 när den är tom.

Food trucken är trogen — tio sekunders lägen, varje order en diskret uppgift.
Restaurangen är förenklad: fem minuters höglägen, 8 % mittmassa, och inget som
håller belastningen mellan uppgifterna.

**Vision Owner valde alternativ B: bygg ut task-modellen med bakgrundsarbete.**

Skälet är att det som saknas är verkligt. Ett kök diskar, förbereder, fyller på
och städar mellan direkta gäster. Utan det lagret mäter `hurried` inte
belastning utan vilket av två lägen personalen befinner sig i — och då hjälper
ingen tröskeljustering.

---

## 2. Vad som byggs

Ett lager bakgrundsarbete som personalen utför när inga direkta uppgifter finns.

**2.1 Arbetet ska vara igenkännbart.** Inte en konstant som fyller ut, utan
uppgifter med namn — mise en place, diskning, påfyllning, städning. Vilka som
finns avgörs av vad sim-lagret redan känner till; uppfinn inga nya begrepp som
saknar grund i modellen.

**2.2 Det ska vara avbrytbart.** En direkt uppgift går alltid före. Bakgrundsarbete
som blockerar en väntande gäst är värre än ingen modell alls.

**2.3 Och det ska vara olika per verksamhet.** Food trucken har lite
bakgrundsarbete — den är redan trogen. Restaurangen och gästgiveriet har mer.
Ölkrogens bryggeri är produktion och kan bära eget arbete, men det ligger utanför
den här ordern.

---

## 3. Vad som INTE får göras

**Inga trösklar kalibreras.** `hurried` på 0,95 och de andra ansiktsbanden är
orörda. Sjätte gången den frestelsen uppstår, och den här gången är hela poängen
att fördelningen ska ändras — inte gränsen.

**Ankomstmodellen rörs inte.** ORDER 134 visade att den är jämn och alltså inte
orsaken.

**`capacityFor` rörs inte.** Presentationslagret rörs inte alls — inga
ansiktsuttryck, ingen figurrigg, inga rum.

---

## 4. Måttet på om det fungerade

**Kör om ORDER 134:s svep.** Samma test, samma seeds, samma metod.

Mittmassan ska stiga för restaurangen — från 8,3 % till något som visar att
personalen faktiskt befinner sig mellan lägena. Ett riktigt kök ligger på 0,3–0,6
mellan direkta uppgifter; det är riktmärket, inte ett krav.

**Food truckens siffra ska inte försämras.** Den är redan trogen på 32 %. Blir
den mer utjämnad har bakgrundsarbetet lagts på fel verksamhet.

Redovisa före och efter, per verksamhet, med histogram.

---

## 5. Definition of Done

1. Bakgrundsarbete implementerat enligt §2, med namngivna uppgifter.
2. Test som hävdar §2.2: en väntande gäst avbryter bakgrundsarbete.
3. Test som hävdar att personal utan direkta uppgifter och utan kö ändå har
   belastning över noll.
4. ORDER 134:s svep omkört, före/efter redovisat per verksamhet med histogram.
5. Restaurangens mittmassa mätbart högre; food truckens inte försämrad.
6. Grep: inga ändrade tröskelvärden, ingen ändrad ankomstmultiplikator, ingen
   ändrad `capacityFor`.
7. `git diff` visar presentationslagret orört.
8. Typecheck grön, hela sviten grön, båda CI-jobben gröna.
9. Registerpost i samma commit, och ORDER 134:s rad uppdaterad så att
   alternativvalet inte står öppet.

---

## 6. Om något inte går

Om bakgrundsarbetet gör belastningen jämn men **kön växer** — gäster får vänta
för att personalen städar — är §2.2 inte uppfylld. Det är ett fel, inte en
avvägning.

Och om mittmassan inte rör sig trots att arbetet finns, är orsaken något annat än
det ORDER 134 pekade ut. Rapportera och stanna hellre än att lägga på mer arbete
tills siffran ger med sig.

---

## 7. Vad som väntar på detta

Per-fas-bandfrågan från ORDER 131 §6.2, som ORDER 134 avrådde från. När
fördelningen har en mitt går den att pröva på nytt — dessförinnan flyttar den
bara en gräns mellan två lägen.
