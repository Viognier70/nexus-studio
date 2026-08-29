# Utkast — Sex verksamhetsklasser och kunskapsprogressionen

**Status** Utkast, inte beslut. Ersätter det tidigare utkastet om
"fem restauranger i olika storlek", som byggde på en felaktig premiss.
**Väckt av** Vision Owner 2026-08-29
**Rör** R4 (verksamhetsklassen), R3 (kreditekonomin), R2 (paviljongerna), A1

> Skrivet för att strukturen inte ska försvinna i en chatt. Talen kan inte
> sättas förrän R3 har mätunderlag från INFRA-2.

---

## 1. Sex klasser

Food trucken är kvar. Fem tillkommer. Värdshuset ersätts av gästgiveriet — samma
mekanik, tydligare namn.

| Klass | Platser | Kök | Särdrag |
| --- | --- | --- | --- |
| Food truck | — | minimalt | mobil, kön på gatan, redan byggd mekanik |
| Ölkrog | 20 | litet, rejäl mat, få rätter | **bryggeri i lokalen** |
| Vinbar | 20 | litet, smårätter | lounger, DJ |
| Restaurang | 60 | stort | matsal och bar |
| Gästgiveri | 100 | stort, flera stationer | soignée servering, mycket personal, dygnsstruktur |
| Nattklubb | 150 | enkelt | flera barer, volym och flöde |

**Ölkrog och vinbar är lika stora men helt olika verksamheter.** Det gör
startvalet till ett riktigt val, inte ett svårighetsläge.

---

## 2. Dagens byggda lokal blir vinbaren

Restaurangen i `main` — den enda klass som är helt byggd i 3D och bär
figurriggen — omtolkas till **vinbaren**.

Skälen: skylten i vyn säger redan `VINBAREN`. Stensöta är sommellerie och får
ett hem direkt. Och ölkrogen kräver ett bryggeri, alltså ett helt produktionsrum
som den byggda lokalen inte har utrymme för.

**Modifieringar som följer:** kapacitet 16 → 20 kuvert, loungeytor och DJ-plats,
mindre kök med färre stationer än `interiorLayout` har i dag.

**Inte nu.** Restaurangen bär figurriggen och ORDER 123 patchar just den koden.
Omdöpning plus kapacitetsändring blir en egen order efter att
presentationsarbetet landat.

---

## 3. Kunskapen som progression

Fyra nivåer per område: **brons, silver, guld, platina.**

Varje nivå bär en **säkerhetsnivå** — en garanterad minimiintäkt efter varje
runda, tillika investeringsutrymme. Ju mer spelaren kan, desto större andel av
marknaden går att ta.

Platina i ett område öppnar möjligheten att utforska nästa. Taket är alltså en
tröskel, inte en gräns: kunskapen blir en portfölj att prioritera i, inte en hög
att fylla.

**Detta besvarar A1.** `ACCUMULATE_KNOWLEDGE` får ett tak per område, och taket
är det som låser upp bredd.

---

## 4. Områdena är paviljongerna

De fem finns redan i `knowledge/pavilions.ts` och bär axlarna snarare än att
vara parallella med dem:

| Paviljong | Axel | Spår |
| --- | --- | --- |
| Måltidsbiblioteket | episteme | — |
| Kalastorget | fronesis | — |
| Stensöta | techne | sommellerie |
| Metodköket | techne | kök |
| Gastronomiska Teatern | alla tre | sommellerie + kök |

En spelare når platina i Metodköket, inte i "techne". Platsen är konkret, axeln
är vad den mäter.

Verksamhetsklasserna kopplar naturligt: vinbaren mot Stensöta, ölkrogen mot
Metodköket (bryggeriet är produktion i rummet), gästgiveriets soignée servering
mot Kalastorget och Metodköket tillsammans.

---

## 5. Tre frågor som inte är avgjorda

**5.1 Är Gastronomiska Teatern en sjätte nivåstege?** Den matar alla tre axlarna
och bär båda spåren. Kanske är den inte ett område alls, utan det som öppnas när
de fyra andra nått platina.

**5.2 Progressionen är ojämn mellan spåren.** Måltidsbiblioteket och Kalastorget
saknar yrkesspår; Stensöta och Metodköket är spårbundna. En sommelier och en
kock får därmed olika många områden att stiga i.

**5.3 Uppgraderingen mellan klasser.** Vad kostar ett steg, går det att gradera
ner, och vad händer med rykte, personal och kunskapskapital vid byte?

---

## 6. Vad som blockerar

**Innehållet.** Sex frågor finns totalt över fem paviljonger — fyra
formatmallar från ORDER 107 och två seed-platshållare. Filens egen not säger att
de ska ersättas av Vision Owner-arbete.

Brons till platina kräver att det finns tillräckligt att kunna i varje område.
Tio frågor per paviljong före hundra, som §5 en gång formulerade det. Sex räcker
inte till en enda nivå.

**Talen.** Säkerhetsnivåernas storlek, marknadsandelen per nivå och
uppgraderingskostnaderna hänger på svårighetskurvan och antal varv. De ska mätas
i INFRA-2, inte gissas.

**Och presentationen.** Fem av sex klasser saknar skepnad. Strukturen kan
beslutas nu; byggandet väntar på att en verksamhet går att spela hela vägen
igenom.

---

## 7. Vad som talar emot

Sex klasser medan en är färdig. Risken är att bredden växer snabbare än djupet
och att varje klass blir en tunn variant.

Motargumentet är att säkerhetsnivån gör kunskapen till spelets ekonomiska
ryggrad i stället för en sidoaktivitet — och för ett spel om kunskapsinlärning
är det skillnaden mellan ett tema och en mekanik.
