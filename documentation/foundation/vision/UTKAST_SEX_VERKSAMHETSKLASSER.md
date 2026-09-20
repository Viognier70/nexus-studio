# Sex verksamhetsklasser och kunskapsprogressionen

**Status** Beslut, Vision Owner 2026-08-30 + 2026-09-20. Säkerhetsnivåerna,
tröskeln, misslyckandeläget, omgångens längd, action-knappens funktion och
första monterade klassen är fastställda (§3, §3b, §3c, §3d, §5, §6.new).
Marknadsandelar och paviljong-innehåll väntar fortfarande på Vision Owner
och INFRA-2-mätning — se §6.
**Historik** Ersatte utkastet om "fem restauranger i olika storlek" den
2026-08-29. Vision Owner-besluten 2026-08-30 stängde struktur- och
namnfrågan; tidigare beslut om att dagens lokal blir vinbaren utgår (§2).
Vision Owner-besluten 2026-09-20 stängde §3-progressionens säkerhetsnivåer,
tröskeln, misslyckandeläget, omgångens längd, action-knappens funktion och
första klassen att monteras — allt via ORDER "En hel dag" §0. Från och med
den commit där de skrevs in är dokumentet inte längre ett utkast; filnamnet
byts i egen omgång.
**Rör** R4 (verksamhetsklassen), R3 (kreditekonomin), R2 (paviljongerna),
R5 (handlingar), R7 (omgången), A1

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

### 3a. Säkerhetsnivåer per nivå

**Vision Owner-beslut 2026-09-20 (ORDER "En hel dag" §0 beslut 1).**
Säkerhetsnivån uttrycks som **andel av normal dagsintäkt**:

| Nivå | Säkerhetsnivå |
| --- | ---: |
| Brons | 15 % |
| Silver | 30 % |
| Guld | 55 % |
| Platina | 90 % |

**Aldrig 100 %.** Servicen ska alltid betyda något — säkerhetsnivån är ett
golv, inte en garanti på hela intäkten. Kurvan är brant nära platina så att
skillnaden mellan guld och platina känns.

"Normal dagsintäkt" definieras i R3 mot varje klass baseline och mäts efter
etapp A (INFRA-2 kalibrering).

### 3b. Tröskel för att stiga en nivå

**Vision Owner-beslut 2026-09-20 (ORDER "En hel dag" §0 beslut 2).** Tröskeln
mäts som **andel rätta svar per paviljong**, inte som absolut antal. Riktvärde:
**tre fjärdedelar.** Exakt tal justeras när frågeinnehållet finns (etapp E) och
mätningen visar hur svårighetskurvan landar.

Andel-tröskeln undviker den perversa incitamentet att låta paviljongens frågepool
växa långsamt för att hålla en lägre absolut tröskel: en spelare som når 75 %
av tio frågor har visat samma sak som en som når 75 % av hundra, i den mening
tröskeln försöker fånga.

### 3c. Misslyckande — tvingad nedgradering, inte konkurs

**Vision Owner-beslut 2026-09-20 (ORDER "En hel dag" §0 beslut 3).** Kassan
kan sjunka under noll — säkerhetsnivån är ett golv för intäkten, inte en
absolut skyddsmatta mot kostnader. Om **kassan står under noll i tre dagar i
följd** tvingas spelaren sälja lokalen och **gå ner en klass**. Ingen konkurs,
ingen ny start från noll.

**Kunskapskapitalet följer med.** En spelare som spelat sig upp till platina i
Metodköket och tvingas gå från vinbar till foodtruck bär platinan med sig —
mekaniskt en direkt fördel i den nya klassen. Kunskapen förfaller inte som
straff.

### 3d. Omgångens längd

**Vision Owner-beslut 2026-09-20 (ORDER "En hel dag" §0 beslut 4).** En omgång
är **sju dagar**, samma som kontrakten löper. En omgång är alltså en
kontraktscykel: sju services (eller sju service-blocks om lunch och dinner räknas
var för sig — se etapp A DoD), avräkning efter varje dag, kontraktsförnyelse i
slutet.

Detta stänger också R7:s runda-fråga: säkerhetsnivåerna i §3a mäts mot en
sju-dagars sammanlagd intäkt, inte mot en enskild dag.

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

## 5. Action-knappen (R5)

**Vision Owner-beslut 2026-09-20 (ORDER "En hel dag" §0 beslut 5).**
Spelaren **tar en uppgift ur TaskQueue och utför den själv.** Att hoppa in i
värdens roll för att greeta en gäst, att stå vid passet och lämna över en
tallrik, att stå bakom baren och blanda en drink — samma task-typ som personalen
utför, nu spelar-utförd i stället.

**Effekten:** sänker belastningen (den task lämnas inte till en redan-strainad
personal), **kostar uppmärksamhet** (spelaren ser inte resten av rummet under
handlingen, och nästa scenario/fråga kan dyka upp medan spelaren är upptagen).

Detta är R5:s specifikation som saknades — knappen är en väg in i rummet, inte
en abstrakt strategisk hävstång.

Mekanikens exakta form (vilka task-typer som är gripbara, hur långt tag och hur
"uppmärksamhets-kostnaden" mäts) byggs i etapp C. Ingen buffer-avstängning under
handlingen: rummet fortsätter röra sig.

---

## 5b. Öppna frågor

Två strukturfrågor kvarstår från 2026-08-30 (beslut 2026-09-20 stängde
uppgraderingsfrågan; den låg tidigare här som §5.3).

**5b.1 Är Gastronomiska Teatern en sjätte nivåstege?** Den matar alla tre
axlarna och bär båda spåren. Kanske är den inte ett område alls, utan det som
öppnas när de fyra andra nått platina.

**5b.2 Progressionen är ojämn mellan spåren.** Måltidsbiblioteket och Kalastorget
saknar yrkesspår; Stensöta och Metodköket är spårbundna. En sommelier och en
kock får därmed olika många områden att stiga i.

---

## 6. Vad som blockerar

**Innehållet.** Sex frågor finns totalt över fem paviljonger — fyra
formatmallar från ORDER 107 och två seed-platshållare. Filens egen not säger att
de ska ersättas av Vision Owner-arbete.

Brons till platina kräver att det finns tillräckligt att kunna i varje område.
Tio frågor per paviljong före hundra, som §5b en gång formulerade det. Sex räcker
inte till en enda nivå.

**Talen.** Säkerhetsnivåernas struktur är beslutad (§3a: 15/30/55/90 %) men
"normal dagsintäkt" per klass mäts fortfarande i INFRA-2 efter att etapp A ger
en sluten dygns-slinga. Marknadsandelen per nivå (`shareFactor`-kopplingen från
ORDER 167) hänger på samma mätning.

**Och presentationen.** Fem av sex klasser saknar skepnad i main. Design har
levererat rumsfiler för fyra av dem i `handoff/`
(`restaurantRoom.ts`, `brewpubRoom.ts`, `wineBarRoom.ts`, `innRoom.ts`);
nattklubben återstår att formge. Rumsfilerna kopieras in i egna orders enligt
mönstret ORDER 121 (figureRig) och ORDER 125 (ölkrogen).

### 6a. Första klassen att monteras: vinbaren

**Vision Owner-beslut 2026-09-20 (ORDER "En hel dag" §0 beslut 6).** Av de fem
klasser som saknar skepnad i main väljs **vinbaren** som första. Design har
levererat `handoff/wineBarRoom.ts` (20 platser, lounger, DJ-plats — se §1) och
den behöver inte gästtillståndsmaskinen som foodtrucken och nattklubben kräver.

Etapp D i ORDER "En hel dag" är alltså vinbaren, inte gästgiveriet.

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
- **"Normal dagsintäkt"-baselinen** per klass mäts i INFRA-2 efter etapp A
  (ORDER "En hel dag"). Säkerhetsnivåernas struktur (15/30/55/90 %, §3a) är
  beslutad, men procenten multipliceras mot ett tal som ännu inte är kalibrerat.
- **Paviljong-innehållet** väntar på Vision Owner-arbete — se §6.
- **Nattklubbens rumsfil** finns inte i `handoff/` ännu — kommer separat från
  Design.
