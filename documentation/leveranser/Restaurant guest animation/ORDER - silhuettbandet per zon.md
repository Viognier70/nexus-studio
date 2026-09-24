# ORDER — Silhuettbandet per golvzon: `silhouetteContrast.zones.ts`

**Projekt** nexus-studio · strategiska spåret
**Lyder under** SUPERSEDING_DIRECTIVE_004, uppföljning på ORDER 123 §5
**Mottagare** Claude Code
**Beroenden** `silhouetteContrast.ts` i `main`

Den här ordern levererar **ingen ny funktion i spelet.** Den tar bort en
duplikation som redan är farlig och lägger till ett test som fångar en
felklass ingen i dag kan upptäcka. Läs §1 innan ni bedömer prioriteten.

---

## 1. Varför nu

Fem filer bär i dag en identisk kopia av WCAG-formlerna och sin egen
`checkPaletteAgainstFloors()`:

```
frontend/src/strategic/scene/restaurantRoom.ts
frontend/src/strategic/scene/brewpubRoom.ts     (zoner, ingen formelkod)
frontend/src/strategic/scene/wineBarRoom.ts
frontend/src/strategic/scene/innRoom.ts
frontend/src/strategic/scene/figureProps.ts
```

Det var rätt när den första skrevs: bandet i `silhouetteContrast.ts` var
inte zonmedvetet, och ett rum kunde inte hävda sin palett på annat sätt.
Nu är det fem kopior av en sanning som bara får finnas på ett ställe.

**Konkret risk:** ändras `MIN_FLOOR_CONTRAST_RATIO` eller
`MAX_FLOOR_CONTRAST_RATIO` i `silhouetteContrast.ts` följer kopiorna inte
med. Fem rum fortsätter då rapportera "0 par utanför bandet" mot ett band
som inte längre gäller, och `paletteContrast.test.ts` blir grönt på fel
grund. Det är inte en teoretisk risk — bandet har redan justerats en gång.

---

## 2. Leveransen

```
frontend/src/strategic/scene/silhouetteContrast.zones.ts
```

Ren TypeScript, inga nya beroenden. Importerar tröskelvärden och
`contrastRatio` / `deltaE76` ur `silhouetteContrast.ts` — den filen förblir
den enda källan för själva bandet.

### Exporter

| Export | Vad |
| --- | --- |
| `FLOOR_ZONES_BY_BUSINESS` | Golvzoner per verksamhetsklass. Fyra nycklar. |
| `paletteZoneCheck(business, colours)` | Ersätter de fem lokala funktionerna. |
| `paletteZoneRange(business, colours)` | Kontrastintervall. |
| `figureLuminanceWindow(business)` | **Poängen med filen.** Se §4. |
| `relativeLuminance(hex)` | Om `silhouetteContrast` redan exporterar en sådan: använd den och ta bort denna. |
| `minRoleDelta(uniforms)` / `rolesAreDistinct(uniforms)` | Rollkravet. |

`paletteZoneCheck` **kastar** på okänd verksamhetsnyckel i stället för att
returnera tom lista. En tom lista betyder "godkänt", och en klass som inte
finns i registret ska inte kunna se ut som godkänd.

---

## 3. Regeln som inte syns i talen

Det är inte **antalet** golvzoner som kostar. Det är **spridningen** i
luminans.

Figurfönstret är snittet av bandet mot varje zon: undre gränsen sätts av
den *ljusaste* zonen, övre av den *mörkaste*. En klass med åtta zoner inom
0,01 har därför bredare fönster än en med två zoner som spänner 0,08.

Uppmätt per klass, mot bandet [1,8 · 3,6]:

| Klass | Zoner | Spann | Figurfönster |
| --- | --- | --- | --- |
| Vinbar | 5 | 0,065 | L 0,051 – 0,115 |
| Ölkrog | 3 | 0,000 | L 0,033 – 0,116 |
| Gästgiveri | 5 | 0,008 | L 0,033 – 0,112 |
| Restaurang | 3 | 0,026 | L 0,056 – 0,148 |

Gästgiveriet har lika många zoner som vinbaren och nästan dubbelt så brett
fönster. Den regeln finns i dag bara som en kommentar i tre rumsfiler; här
blir den en funktion.

---

## 4. `figureLuminanceWindow()` — skälet att bygga filen

Utan den upptäcks en för mörk ny golvzon **först när någon lägger till en
figurfärg som faller** — alltså långt efter att zonen committades, och av
någon som inte vet att zonen är orsaken.

Med den kan en ny zon prövas direkt: krymper fönstret, är zonen fel.
Funktionen returnerar dessutom `widthLost` — hur mycket zonspridningen
kostade jämfört med den ljusaste zonen ensam. Noll betyder att zonerna är
gratis.

Det här är den felklass ingen i dag kan upptäcka, och den enda anledningen
att den här ordern inte kan skjutas på obestämd tid: varje ny
verksamhetsklass lägger till zoner.

---

## 5. Att lägga i `paletteContrast.test.ts`

```ts
for (const business of Object.keys(FLOOR_ZONES_BY_BUSINESS)) {
  test(business + ': paletten ligger i bandet mot varje zon', () => {
    expect(paletteZoneCheck(business, figuresFor(business))).toEqual([]);
  });
  test(business + ': figurfönstret är inte stängt', () => {
    const w = figureLuminanceWindow(business);
    expect(w.max).toBeGreaterThan(w.min);
  });
}
test('rollerna är åtskiljbara', () => {
  expect(rolesAreDistinct(STAFF_UNIFORMS)).toBe(true);
});
```

Det andra testet är det som fångar en ny mörk golvzon **dagen den läggs
till**, i stället för månader senare.

---

## 6. Efter merge — städningen är en del av leveransen

Följande ska **tas bort** ur rumsfilerna och importeras härifrån i
stället. Så länge kopiorna finns kvar är de identiska med originalet — men
de är kopior, och det är felet:

| Fil | Ta bort |
| --- | --- |
| `wineBarRoom.ts` | `ZONE_FLOORS`, `checkPaletteAgainstFloors`, `paletteContrastRange`, `luminance`, `contrast` |
| `innRoom.ts` | Samma, plus `deltaE`/`minRoleDeltaE` och de lokala srgb-hjälparna |
| `restaurantRoom.ts` | Samma som vinbaren |
| `figureProps.ts` | `luminance`, `contrast`, `checkPropPalette`, `propContrastRange` |
| `brewpubRoom.ts` | Inget — den bär bara zonfärger, ingen formelkod |

`GUEST_GARMENTS` och `STAFF_UNIFORMS` **stannar** i rumsfilerna. De är
klassens innehåll, inte bandets.

**Ordern är inte klar förrän kopiorna är borta.** En delvis genomförd
migration är strikt sämre än ingen: då finns både registret och kopiorna,
och nästa läsare vet inte vilken som gäller.

---

## 7. Definition of Done

| # | Krav |
| --- | --- |
| 1 | `FLOOR_ZONES_BY_BUSINESS` har alla fyra klasserna med samma zonfärger som rumsfilerna har i dag |
| 2 | `paletteZoneCheck()` returnerar tom lista för alla fyra klassernas paletter |
| 3 | `paletteZoneCheck()` kastar på okänd verksamhetsnyckel — verifierat i test |
| 4 | `figureLuminanceWindow()` ger `max > min` för alla fyra |
| 5 | `figureLuminanceWindow().widthLost` är noll för ölkrogen (spann 0,000) |
| 6 | `rolesAreDistinct()` sant för alla fyra uniformsuppsättningar |
| 7 | `paletteContrast.test.ts` itererar över registret, inte över hårdkodade klasser |
| 8 | **Alla kopior i §6 borttagna.** Ingen rumsfil definierar egen WCAG-formel |
| 9 | Tröskelvärdena läses ur `silhouetteContrast.ts` — inga literalvärden 1.8 / 3.6 / 12 i den nya filen |

Krav 9 är hela poängen. Finns talen kvar på två ställen har ingenting
lösts.

---

## 8. Vad som inte ingår

Ändring av bandets värden. Ändring av någon rumsfärg eller figurfärg —
alla fyra klassernas paletter går igenom det befintliga bandet som de är,
och den här ordern ska inte flytta en enda ton. Nya golvzoner. Food
truckens zoner, som inte finns eftersom klassen inte har någon matsal.
