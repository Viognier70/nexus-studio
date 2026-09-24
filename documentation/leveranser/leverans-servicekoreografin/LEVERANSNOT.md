# Leveransnot — servicekoreografin

**Projekt** nexus-studio · strategiska spåret
**Order** BRIEF_DESIGN_SERVICEKOREOGRAFIN
**Levererat** `Servicekoreografin.dc.html` (modellen), `serviceScore.ts` (datat)

---

## Vad som ligger i repot

`serviceScore.ts` — ren TypeScript, enda importen är projektets egen
`figureRig.ts`. Inga externa beroenden, inga binära assets. Filen känner
inga koordinater och ingen scengraf.

Innehåll i fyra delar:

1. **Tempoklasserna** och `tempoForGameSpeed()`.
2. **Avstånd och hastigheter** som namngivna konstanter.
3. **De nio poserna som kod**, i samma form som riggens sju: rena
   funktioner `(t, options) → FigurePose`, plus `CHOREO_POSE_NOTES` i
   samma form som `POSE_JOINT_NOTES`. Ingen kräver nya led, nya mått
   eller nya buffertar.
4. **Partituret** — trettioåtta steg med aktör, klass, pose, `t0`,
   varaktighet, `after`/`offset`/`endsWith` och `waitsFor` i ord.
   Plus `PROVENANCE`: varje tal med sin härkomst.

Modellen läser samma tabell och renderar den. Den har ingen egen
koreografi — ändras ett tal i partituret ändras modellen.

---

## De nio poserna

`poseWelcome` · `posePoint` · `poseTakeOrder` · `poseSetDown` ·
`poseOffer` · `poseDine` · `poseSignal` · `poseNod` · `poseAttend`

Tre av dem ersätter en pose som används fel i dag: `poseWelcome` mot
`poseGreet` (en vinkning är en gest över avstånd, inte ett mottagande
på armlängd), `poseTakeOrder` och `poseSetDown` mot `poseWork` (som
lutar bålen 0,22 fram och läser som hackande).

Två är inte poser utan hjälpare: `poseSitTransition` är
`blendPose(poseIdle, poseSeated)` — att sätta sig behöver ingen ny pose
— och `poseFillWork` är `poseWork` på låg intensitet med blicken lyft
mot rummet var 2,4 s.

`poseGreet` ska **behållas**. Den är rätt för gäst som vinkar åt
personal tvärs över rummet.

---

## Noten om talen

`PROVENANCE` i filen. Fyra kategorier, varje tal med sin grund:

| | |
| --- | --- |
| **VAL** | Vårt beslut. Det finns inget att härleda det ur. `basis` säger vad vi vägde och vad som går sönder i andra riktningen. **Det är dessa ni ska ifrågasätta.** |
| **FÖLJER** | Räknas fram ur andra tal. Att sätta ett sådant för hand är ett fel. |
| **MÄTT** | Läst i modellen eller riggen. Kan efterprövas; annat värde är vårt fel. |
| **ÖVERTAGET** | Från `figureRig.ts`, briefen eller befintlig kod. Inte vårt att ändra. |

`choiceCount()` räknar VAL-talen ur tabellen i stället för att lita på
en siffra i en kommentar.

De tyngsta VAL-talen: hälsningens 0,75 m fria luft (som 1,25 m följer
av), eskortens 1,40 m, de tretton gest-tiderna mellan 1,2 och 5,0 s,
och taket 2,0 s för overksam väntan i sikte. Det är dem Vision Owner
faktiskt godkänner när hen säger att rytmen håller.

Två tal är medvetet utan grund och ska bytas ut: `cook` 14 s och
`dine` 22 s. De är uppehåll, de komprimeras fritt, och de ersätts av
matlagnings- och måltidsmodellen när den finns.

---

## Tre beslut som inte var geometri

**1. Tempot är tre klasser, inte ett tal.**
Gest (hälsning, beställning, framställning, betalning) behåller sin
realtid vid varje speltempo. Förflyttning och uppehåll skalas rakt med
spelklockan. Vid 1× är 34 % av linjen gest; vid 4× på spelklockan 67 %.
Skalas gest med faller den tillbaka till 34 % och varje handling blir
för kort att uppfatta — det är det provspelet visade, och det är
mätbart i modellen genom att jämföra de två 4×-knapparna.

**2. Ingen absolut tid i datat.**
Varje steg startar ur ett annat steg plus en förskjutning, eller ur en
händelse. `resolveScore()` räknar fram tider och ska anropas om varje
gång något tar längre tid än författat. Ett partitur med inbakade tider
går sönder första gången köket är sent.

**3. Ett elastiskt block.**
`serverFill` — fyllnadsarbetet mellan att ordern lämnas och tallriken
landar — får sin längd ur mellanrummet, inte ur en varaktighet. Det är
den enda elastiska mekanismen och den som gör att servitören är vid
passet när maten kommer utan att stå och vänta. Krymper blocket under
0,6 s ska det utgå helt.

---

## Vad vi ändrade i briefens §2

Fyra tillägg. Skälen står i respektive steg i `serviceScore.ts`.

| Tillägg | Varför |
| --- | --- |
| `requestCheck` | §2 går från *äter* till *betalning* utan att någon initierar. Kräver gästtillstånd. |
| `clearTable` + `dropAtPass` | Servicen slutar när bordet kan tas av nästa, inte när gästen är ute. Kräver bordstillstånd. |
| `seekEye` | Att bli mottagen är ett eget steg. Det tar 1,4 s och det är hela intrycket av huset. |
| `readMenu` / `order` | ”Beställning” är ett uppehåll plus en gest. Slås de samman kommer servitören i samma sekund som gästen satt sig. |

---

## Talen

Hela tabellen finns i modellen. De som rättar en gissning:

- **Hälsningen: 1,25 m,** inte 0,8. Med 0,8 m mellan rötterna står två
  kroppar 0,34 m ifrån varandra sedan axelbredden 0,46 dragits bort.
- **Tid till synlig rörelse: 1,3 s.** Inte tid till kontakt (4,2 s) —
  det är rörelsen mot gästen som är mottagandet.
- **Eskorten: en fördröjning på 1,65 s,** inte ett avstånd. Samma
  polylinje, samma hastighet, gästen startad senare — försprånget blir
  exakt 1,40 m även i kurvorna.
- **Satt → servitör vid bordet: 5,4 s.**
- **Svar på gästens signal: 0,7 s.**
- **Värden går 1,25 m/s mot gästen och 0,85 m/s i eskorten.** Samma
  figur, två hastigheter, elva sekunder emellan.

---

## Vad som INTE ingår

Navigering. Stegen bär från/till som ankarroller; vägen mellan dem är
kollisionslagrets sak, per briefens §5. Modellen låter figurerna gå
raka vägar.

Inredning, ljussättning, simuleringslogik, integration. Inga binära
assets.

---

## Utestående

Fem frågor i `FRAGOR till Claude Code.md` §16–20. Två av dem blockerar
var sitt tillägg (gästtillstånden), en är ett krav på spelets klocka
(gest-klassen), en är ett arkitekturval (vem publicerar
servicepunkterna), och en är en fråga vi inte kunde avgöra själva:
**är en gäst vid bordet normalfallet, eller ett par?** Partituret är
skrivet för en.

Och ett beslut ni ska fatta: de nio poserna ligger i `serviceScore.ts`,
inte i `figureRig.ts`. De importerar bara riggens primitiver och kan
flyttas in oförändrade — `progress` och `clasp` hör då i `PoseOptions`.
Egen order, eller samma ändring som partituret monteras?
