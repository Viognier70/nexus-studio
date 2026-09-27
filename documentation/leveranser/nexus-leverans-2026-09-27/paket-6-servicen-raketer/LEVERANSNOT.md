# Leveransnot — paket 6: servicen som raketer

**Projekt** nexus-studio · strategiska spåret
**Underlag** Provspelet 2026-09-27. Varje händelse under servicen är en raket i tre steg i samma sammanhang. Action-knappen och quizen utgår. Koreografin mellan raketerna prioriteras.
**Lyder under** SD-004, NEXUS_SPELDESIGN_V1 (servicen 18–23)

---

## 1. Koreografin mellan raketerna

`serviceFlow.ts` bredvid `serviceScore.ts`. Filen ändrar inget i rummet eller figurerna.

```ts
const flow = createServiceFlow(room, { busy: 1 });     // en gång per kväll
const s = sampleActor(flow.actors[i], simT, cursor);   // varje bildruta, per figur
```

- **Sällskapen** går igenom ett kvällsförlopp: in, sätta sig, läsa menyn, vänta, beställa, få vinet, skåla, äta, prata, be om notan, betala och gå. Efter 10 s väntan blir de otåliga. Om de väntat över 18 s går de missnöjda.
- **Personalen** består av två servitörer, en bartender och en sommelier. Uppgifterna tas i tidsordning av den som kan vara framme först. Personalen går vidare direkt från där den står och går hem bara när det finns tid. Tre överlämningar bär rummet:
  - bartendern häller och servitören hämtar vid barens västra öppning,
  - köket lägger upp och servitören bär från passet,
  - disken bärs tillbaka till passet.
- **Vägarna** följer `staffRoute()`. Korridoren längs x −4,1 binder ihop passet, baren och gästernas gångar. Ingen går genom en möbel.
- **Borden:** ett nytt sällskap får bordet först när det förra har gått och bordet är avdukat. Den sista ankomsten sker i tid för att alla ska hinna gå före 23.00.

| Mätt i modellen | |
| --- | --- |
| Sällskap, lördag · tisdag | 25 · 8 |
| Väntan på beställning · på notan, snitt | 9,2 s · 9,4 s |
| Sällskap som väntade över 18 s | 6 av 25 |
| Sista gästen ute · personalen klar | 455 s · 468 s av 480 |

Posmappningen `Sample.pose` → `figureActs`/`serviceScore` är oförändrad från förra versionen, se modellen.

---

## 2. Raketen — `R1`

| Steg | Frågar | Tid |
| --- | --- | --- |
| Episteme | vad (det man måste veta) | 15 s |
| Techne | hur (hur man gör det) | 20 s |
| Phronesis | när och varför (omdömet just nu) | 30 s |

- **Kortet** är 632 px brett och ligger i högerkanten. Överst står vem det gäller och var. Berättelsen står kvar genom alla tre steg, och bara frågan och svaren byts.
- **Stegrutorna** visar hur långt man kommit. Klarat steg är ifyllt med bläck, pågående med accent, kommande har bara kontur, fel är streckat och ett steg som inte nås är grått.
- **Nedräkningen** visar stegets egen tid som en siffra på 96 px och en stapel på 12 px. Den är i bläck till 6 s och i accent de sista fem, med ett tick per sekund. Inget blinkar.
- **Svaren** väljs med tangenterna 1–4 eller musen.
- **Rummet går i full fart** (`EVENT_TEMPO` 1). Ringen på golvet visar vem raketen gäller och fylls med stegets tid.
- **Antal:** 2–4 raketer per kväll (`rocketsForEvening`), två en tisdag och fyra en lördag.

## 3. Rätt och fel i stunden — `R2`, `R3`

| | Rätt | Fel (eller tiden ute) |
| --- | --- | --- |
| Svaret | Det valda fylls med bläck ✓, övriga tonas till 40 % | Det valda streckas och det rätta fylls med bläck |
| Bandet | Bläck: "Rätt · vidare till …" | Streckat: "Fel · Bartendern tar över" |
| Rummet | Följden syns: sällskapet skålar eller lugnar sig | Följden syns: gästerna blir otåliga eller en gäst reser sig. **Personalen tar över** och går till bordet i stressat tempo, stannar i 6 s och går tillbaka |
| Sedan | Efter 2,4 s öppnas nästa steg på full tid | Efter 2,4 s stängs kortet. Raketen slutar och resten nås inte |

Varje steg har ett eget utfall för rätt och för fel (`Outcome`), med mening, mätardeltor, rummets effekt (`calm`, `toast`, `impatient`, `standUp`, `takeover`) och vem som tar över.

## 4. Mätarna

Kassa, gästerna och personalen, med tio steg var och inga tal. Direkt efter ett svar växer panelen från 18 till 28 px. Vunna steg fylls med accent och förlorade blir streckade, med en mening om vad det kostade. Efter 3,2 s blir de vanliga igen. Mätarna visar riktning, inte belopp.

## 5. Kvällens lärdom — `L1`

- Ett rutnät med raketerna gånger stegen: ✓ klarat, ✗ fel (personalen tog över), — nåddes inte.
- Lärdomen hämtas ur det **tidigaste** fallet (`pickLesson`), eftersom ett missat episteme väger tyngre än ett missat phronesis.
- Skärmen visar vad som hände, stegets fråga, ditt svar, det rätta svaret och följden. Principen (`why`) står stort med accentkant.
- Övriga fel står under med sitt varför.
- Allt leder till en paviljong. Skärmen ställer ingen fråga.

## 6. Utan verksamhet och pengar — `X1`

En ruta på 760 px mitt på skärmen över rummet, som visas svartvitt och dämpat. Den visas vid veckoavräkningen när `isStranded({ businessClass, cash, minimumStake })` är sant, aldrig mitt i en kväll. Rutan har **en enda knapp**, "Gå till Måltidens hus", ingen stängningsruta, och Esc gör ingenting. Medaljerna sägs först ("tas aldrig ifrån dig"). Det finns inget rött fält och inget "game over".

## Flaggor

`serviceFlow.FLAGS`: `eventBank`, `meters`, `tempo`, `flow` och `quizReplaced`. Se FRAGOR §47–50.
