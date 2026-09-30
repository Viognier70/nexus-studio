# LEVERANSNOT: ringen under personalen

**Beställning** 2 av 3 efter provspelet 2026-09-30
**Datum** 2026-09-30
**Till** Claude Code
**Från** Claude Design
**Gäller** En markering på golvet som visar vem som gör vad, läsbar från 24 m, i rollens färg. Och en prövning av om tallrikar, glas och mat behöver förstoras för att synas från spelarens höjd.

---

## 1. Innehåll

| Fil | Vart | Vad |
|---|---|---|
| `staffRing.ts` | `src/scene/` | Rollernas färger, ringens mått och tillstånd, klipp → uppgift, och förstoringen av rekvisitan. |
| `staffRingStrings.ts` | slås in i `STRINGS` | 23 nycklar, `{ sv, en }`: roll och uppgift i etiketten. |
| `prototyp/Ringen - prototyp.html` | läses, monteras inte | Riggen, klippen och rekvisitan från leverans 2 med ringarna ovanpå. Växla ringen, etiketten, förstoringen, avståndet och skärmen. Fristående. three.js och Babel hämtas från unpkg. |
| `bilder/1440x900/1–5-*.png`, `bilder/1280x720/3, 5-*.png` | — | Kontrollbilder från kamerahöjd. |

Prövningen görs i restauranghörnet ur leverans 2, eftersom där finns alla sex rollerna i arbete samtidigt. Ringen och skalan är desamma i vinbaren.

## 2. Ringen

**Form:** en ring på golvet, 1,12 m i diameter och 0,14 m bred, under fötterna. Vid 24 m och 1440 × 900 blir den 52 px med 6 px streck. Under den ligger en mjuk pöl i samma färg (0,8 m, additiv).

**Färgen är rollen:**

| Roll | Färg |
|---|---|
| Hovmästare | `#f4e6cc` grädde |
| Servitör | `#4fc3c8` turkos |
| Sommelier | `#b98ae0` plommon |
| Bartender | `#f2994a` bärnsten |
| Kock | `#7fa8ff` blå |
| Diskare | `#a9b3bb` stål |
| DJ | `#ee6fb5` magenta |

Guld och ljuslåga används inte, eftersom de betyder handling och raketen. Grönt och rött används inte heller, eftersom de betyder rätt och fel (beställning 4). Färgerna är valda så att de skiljer sig i ton, inte bara i ljushet.

**Vad ringen säger:**

- **Ledig eller på väg:** hel ring, 90 %, svag pöl.
- **En uppgift pågår:** ringen dämpas till 45 %, och en båge fylls medurs från klockan 12 i takt med klippet. När bågen är full är uppgiften klar. Pölen blir starkare.
- **Hovring:** ringen växer 12 %, och etiketten visar *roll · uppgift* ovanför huvudet (`ring.chip`).

Vilken uppgift det är kommer ur klippets id (`TASK_OF_CLIP`). Nya klipp från leverans 3 läggs till där.

**Genom möblerna:** en svag kopia av ringen, 30 %, ritas utan djuptest. Därför syns kockens och bartenderns ringar genom disken och baren. Materialet har `toneMapped: false`, annars blir färgerna grå i rummets ljus.

**Under en raket** ligger ringarna kvar. Strålkastaren från leverans 3 dämpar de andra ringarna till 45 %.

**Etiketten** visas vid hovring. Prototypen har också *En i taget* och *Alla*. *Alla* passar som en tangent som hålls nere (förslag: Alt), inte som standard, eftersom etiketterna täcker varandra vid 24 m.

## 3. Tallrikar, glas och mat

Prövade i 1,0, 1,5 och 2,0 gånger verklig storlek, från 24 m.

- **1,0:** tallrikarna är prickar och glasen syns inte. Det går inte att se att ett bord har fått maten.
- **1,5:** tallriken, maten och glaset går att se på bordet. Ingenting ser leksaksaktigt ut.
- **2,0:** tallrikarna täcker bordskanten, och vinflaskan blir lika hög som en sittande gästs axel.

**Beslut 2026-09-30: 1,5 för det som står på borden**, och samma skala vid 12 m, så att inget byter storlek när kameran glider in. Brickan, tårtan, menyn, blocket och notan står kvar i 1,0, eftersom de redan syns eller bärs med två händer. Skalan är bara visuell och sätts kring föremålets nollpunkt. Handpunkterna och bordsplaceringen i leverans 2 står kvar i meter, och föremål som står på en bricka eller tallrik skalas inte två gånger.

## 4. Kontrollbilder

| Bild | Vad |
|---|---|
| `1-24m-utan-ring-1,0x` | Som i dag |
| `2-24m-ring-1,0x` | Ringarna, rekvisitan i verklig storlek |
| `3-24m-ring-1,5x` | Förslaget |
| `4-24m-ring-2,0x` | För stort |
| `5-12m-ring-1,5x` | Raketens avstånd, med alla etiketter |

## 5. Frågor till dig

- Ska ringen synas hela tiden, eller bara när spelaren håller musen över rummet eller trycker på en tangent?
- Hovmästaren får grädde. Den ligger nära papprets färg i gränssnittet, men den skiljer sig tydligt från de andra rollerna på golvet. Vill du hellre ha en annan färg?
