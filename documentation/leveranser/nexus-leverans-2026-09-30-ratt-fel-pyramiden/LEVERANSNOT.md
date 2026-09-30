# LEVERANSNOT: rätt, fel, pyramiden och ljuden

**Beställning** Ny regel från Vision Owner, 2026-09-30
**Datum** 2026-09-30
**Till** Claude Code
**Från** Claude Design
**Gäller** Rätt svar är grönt och fel svar är rött, med tydligt olika rörelser. Förklaringen efteråt är lika vänlig som förut. Kunskapspyramiden i raketkortet: hur en våning fylls, spricker och hur en hel pyramid firas. Åtta ljud beskrivna i ord.

---

## 1. Innehåll

| Fil | Vart | Vad |
|---|---|---|
| `nexusTheme.warm.rattfel.ts` | `src/ui/theme/`, slås ihop med `WARM` | Färgerna för rätt och fel, svarsraderna, våningarnas tillstånd, pyramidens mått och alla rörelser med tider. |
| `pyramidStrings.ts` | slås in i `STRINGS` | 12 nycklar, `{ sv, en }`: domen, förklaringarna till exemplet och pyramidens rader. |
| `LJUDEN.md` | läses | Åtta ljud: känsla, hur de låter, ett recept för Web Audio, längd, nivå och när de spelas. |
| `prototyp/Raketkortet - pyramiden.html` | läses, monteras inte | Raketkortet i båda storlekarna. Tryck på ett svar (2 är rätt). Storyboard för de tre rörelserna, och skisser av ljuden. Ikonerna hämtas från unpkg. |
| `skarmar/1440x900/1–4-*.png`, `skarmar/1280x720/1–4-*.png` | — | Frågan, rätt svar, fel svar på steg 2, hel pyramid. |
| `skarmar/pyramiden-storyboard.png` | — | Sex bilder per rörelse med tider. |

## 2. Rätt och fel

| | Rätt | Fel |
|---|---|---|
| Färg | grönt `#5cb86a`, mörk text | rött `#e0533f`, mörk text |
| Nyckeln | bock på mörkgrönt | kryss på mörkrött |
| Rörelse | raden lyfter 5 px och sjunker tillbaka, med ett grönt sken | raden skakar sidledes 7 px, tre gånger, avtagande |
| Övriga rader | tonas till 38 % | tonas till 38 %. Det rätta svaret får en streckad grön kant och *Det här hade hållit*. |
| Ljud | *rätt*: två toner uppåt | *fel*: två toner nedåt och en mjuk duns |

**Förklaringen är lika vänlig i båda fallen.** Den kommer på papper 650 ms efter svaret, med samma ton och längd. Domen är *Rätt* eller *Inte den här gången*, aldrig *Fel*. Vid fel svar säger den varför svaret låter rimligt, och sedan vad som hade hållit. Raden längst ned säger vem som tar över (*Per tar över vid bordet*).

**Streckat i grädde utgår** för fel svar i raketkortet. `answer.wrong` och `step.failed` i `nexusTheme.warm.ts` ersätts av `answer.wrong` och `floor.cracked` här.

## 3. Pyramiden

Lyktorna blir en pyramid i tre våningar: episteme (vad) i botten, techne (hur) i mitten och phronesis (när och varför) i toppen. Den står i kortet under rubriken, 22 × 18 vh, med våningarnas namn till höger.

- **Pågår:** kant i ljuslåga som pulserar långsamt.
- **Våningen fylls** (rätt svar, 1,3 s): grönt stiger nedifrån som vin i ett glas med en yta som gungar och lägger sig. När den är full blinkar våningen ljust en gång och lyfter 6 px. Ljudet *våning* kommer vid 900 ms.
- **Våningen spricker** (fel svar, 0,9 s): våningen skakar tre gånger, en röd spricka ritas uppifrån och ned, och två flisor faller från nederkanten. Kanten blir röd och streckad. Våningarna ovanför släcks till 38 %, eftersom raketen slutar vid första felet.
- **Hel pyramid** (alla tre rätt, 1,6 s efter den sista våningen): pyramiden blir guld nedifrån och upp, en våning i taget. Den växer 6 % och tillbaka, elva strålar går ut från toppen och fjorton gnistor faller. Sedan ligger den kvar i guld med ett lugnt sken. Ljudet *full pyramid*.

Guld betyder alltså fortfarande något som är klarat och fullbordat. Grönt och rött betyder rätt och fel i stunden.

**Lärdomen** (leverans 1, skärm 4) ska visa pyramiden i stället för lyktorna, en per raket, i samma tillstånd som när raketen slutade. Den är inte omritad här.

## 4. Ljuden

Se `LJUDEN.md`. Kort sammanfattat: *rätt* och *fel* är tydligt olika i riktning (uppåt och nedåt), klang och tyngd, och inget av dem är en summer. Våningarna bygger ett C-durackord. Rummet är en vinbar och inte ett kasino. Sorlet är referensen för alla nivåer och dämpas 6 dB när raketkortet är öppet.

## 5. Beslut 2026-09-30

- **Rött betyder bara fel svar.** `color.ember` utgår ur allt spelgränssnitt.
- **Klockans sista halvtimme** pulserar i ljuslåga (`color.candle`): den sista rutan och klockslaget pulserar mellan 55 % och 100 % på 1,6 s. Etiketten *Sista beställningen* står kvar.
- **Varmrätter som inte räcker** i inköpen: täckningsstapeln och raden *{n} gäster utan varmrätt* pulserar på samma sätt i ljuslåga.
- Tokens: `WARM_RIGHT_WRONG.pulse` och `REPLACES_EMBER` i `nexusTheme.warm.rattfel.ts`.
- **Ankomsten** (manuset från i dag) använder pyramiden och rätt och fel vid långbordet.
