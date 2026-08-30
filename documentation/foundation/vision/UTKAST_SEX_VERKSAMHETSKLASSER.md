# Sex verksamhetsklasser och kunskapsprogressionen

**Status** Struktur-beslut, Vision Owner 2026-08-30. Tal (säkerhetsnivåer,
marknadsandelar, uppgraderingskostnader) och paviljong-innehåll väntar på
INFRA-2 och Vision Owner-arbete — se §6.
**Historik** Ersatte utkastet om "fem restauranger i olika storlek" den
2026-08-29. Vision Owner-besluten 2026-08-30 stänger struktur- och
namnfrågan; tidigare beslut om att dagens lokal blir vinbaren utgår
(§2 nedan).
**Rör** R4 (verksamhetsklassen), R3 (kreditekonomin), R2 (paviljongerna), A1

---

## 1. Sex klasser — namn, storlek, särdrag

Namn i **bestämd form genomgående** (Vision Owner-beslut 2026-08-30 §1).
Vokabulärbytet i `BusinessClass`-typen i `types.ts` hör till en egen order —
den här filen fastställer namnen, inte hur koden uppdateras.

| Klass | Platser | Kök | Särdrag |
| --- | --- | --- | --- |
| Foodtrucken | — | minimalt | mobil, kön på gatan, redan byggd mekanik |
| Kvarterskrogen | **16** | ordinärt | dagens matsal — bär den befintliga kalibreringen |
| Ölkrogen | 20 | litet, rejäl mat, få rätter | **bryggeri i lokalen** |
| Vinbaren | 20 | litet, smårätter | lounger, DJ |
| Gästgiveriet | 100 | stort, flera stationer | soignée servering, mycket personal, dygnsstruktur |
| Nattklubben | 150 | enkelt | flera barer, volym och flöde |

**Progressionen** blir **16 → 20 → 20 → 100 → 150**, plus foodtrucken utanför
storleksstegen (mobil, egen mekanik). Vision Owner-beslut 2026-08-30 §4:
tidigare 60-platsaren utgår. En sjunde klass kan tillkomma senare om steget
mellan 20 och 100 behöver fyllas.

**Ölkrogen och vinbaren är lika stora men helt olika verksamheter.** Det gör
startvalet till ett riktigt val, inte ett svårighetsläge.

---

## 2. Kvarterskrogen är dagens 16-platsare — vinbaren får egen byggnad

**Vision Owner-beslut 2026-08-30 §2 och §3.**

Dagens lokal i `frontend/src/strategic/scene/Restaurant.tsx` — den enda klass
som är helt byggd i 3D och bär figurriggen — blir **kvarterskrogen**. Den
behåller sina 16 kuvert och sin nuvarande kalibrering. Design har levererat
`handoff/restaurantRoom.ts` (16 platser, `TOTAL_SEATS = 16`, header: "Ersätter
Restaurant.tsx") som dess rum.

**Beslutet från 2026-08-29 om att dagens lokal blir vinbaren utgår.** Design
har byggt `restaurantRoom.ts` och `wineBarRoom.ts` som separata rum —
vinbaren får en egen byggnad, inte en omtolkning av kvarterskrogen. Skylten
`VINBAREN` i dagens vy hör till vinbaren när den byggs, inte till lokalen
den råkar visas i just nu.

**Vad detta stänger:**
- Kapacitetsändring 16 → 20 i dagens lokal utgår (kvarterskrogen behåller 16)
- Loungeytor och DJ-plats byggs i `wineBarRoom.ts`, inte i dagens lokal
- Kalibreringsarbetet i ORDER 121, 123, 127, 128, 132, 137 gäller kvarterskrogen
  och behöver inte omprövas för att verksamheten döps om

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

## 5. Tre frågor som fortfarande inte är avgjorda

**5.1 Är Gastronomiska Teatern en sjätte nivåstege?** Den matar alla tre
axlarna och bär båda spåren. Kanske är den inte ett område alls, utan det som
öppnas när de fyra andra nått platina.

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

**Och presentationen.** Fem av sex klasser saknar skepnad i main. Design har
levererat rumsfiler för fyra av dem i `handoff/`
(`restaurantRoom.ts`, `brewpubRoom.ts`, `wineBarRoom.ts`, `innRoom.ts`);
nattklubben återstår att formge. Rumsfilerna kopieras in i egna orders enligt
mönstret ORDER 121 (figureRig) och ORDER 125 (ölkrogen).

---

## 7. Vad som talar emot

Sex klasser medan en är färdig. Risken är att bredden växer snabbare än djupet
och att varje klass blir en tunn variant.

Motargumentet är att säkerhetsnivån gör kunskapen till spelets ekonomiska
ryggrad i stället för en sidoaktivitet — och för ett spel om kunskapsinlärning
är det skillnaden mellan ett tema och en mekanik.

---

## 8. Vad som INTE ingår i denna omskrivning

- **`BusinessClass`-typen i `types.ts` rörs inte här.** Vokabulärbytet från
  dagens `restaurant | foodtruck | värdshus | ölkrogen` till de nya
  bestämd-form-namnen är en egen order. Denna fil fastställer namnen på
  produktnivå; koduppdateringen genomförs separat och ska inte tolkas som
  auto-implementerad av det här beslutet.
- **Talen** (säkerhetsnivåer, marknadsandelar, uppgraderingskostnader) väntar
  fortfarande på INFRA-2 — se §6.
- **Paviljong-innehållet** väntar på Vision Owner-arbete — se §6.
- **Nattklubbens rumsfil** finns inte i `handoff/` ännu — kommer separat från
  Design.
