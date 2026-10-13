# D13: grillvagn B, Grillstugan, färdig

**Leverans** 2026-10-12 · **Till** Claude Code och Anders · **Från** Claude Design · **Beställning** Anders beslut om D12, 2026-10-12 · **Bygger på** D12 (`grillvagnar.js`, `TRUCKS.B`), D10 (vagnens ram och kön i regn) och D9 (vädret).

Anders valde B. Markisen över kön blir ett tillval som spelaren köper, och vagnen ska se färdig ut utan den. Taket och markisen tonas ut på krogens nivå som husens tak. Ansiktet på 10 m är godkänt som det är.

Kontrollbilderna finns i 1440 × 900 och 1280 × 720, tagna från spelets kamera och utan text i bilderna. All text är nycklar `{ sv, en }`. Talen för kön i regn är platshållare för balance.ts.

| Fil | Vad |
|---|---|
| `grillstugan.js` | **Ny.** Vagn B färdigbyggd i three.js. `STUGAN` (måtten som data), `buildGrillstugan(THREE, { awning })`, `updateGrillstugan()`, `stuganShelters(awningOn)` och `flapEdge()`. Ersätter B i `grillvagnar.js`. A och C används inte längre. |
| `truckRain.js` | **Ny.** Regnet vid vagnen: `RAIN`, `WET`, `PUDDLES`, `RAIN_QUEUE`, `RAIN_QUEUE_BALANCE`, `shelterTop()`, paraplyet (`UMBRELLA`, `UMBRELLA_HOLD`, `buildUmbrella()`, `holdUmbrella()`) och `createRain()`. |
| `d13Manus.js` | Tidslinjerna: `stuganScene(C, { rain, awning })`, en scen per väder och markis. Livet är D12:s. |
| `d13Strings.js` | Texterna. |
| `grillvagnar.js` | Oförändrad från D12. Följer med eftersom `grillstugan.js` läser ramen, `ROOF_BLEND` och färgerna därifrån. |
| `prototyp/D13 - Grillstugan.html` | Prototypen: väder (kväll, regn), markisen (köpt, inte köpt) och sju eller åtta kameror. |
| `kontrollbilder/1440x900/`, `kontrollbilder/1280x720/` | 18 bilder per storlek. |

## 1. Vagnen färdig utan markis

Lådan, luckan, stationerna, dörren och medhjälparens väg är D12:s (4,6 × 2,3 m, golvet 0,38 m, luckan 2,6 × 1,2 m). Det nya:

- **Chassit:** tandemaxel (x ±0,38, r 0,27) bakom en mörk kjol med en öppning för hjulen, fyra stödben i hörnen, dragstång med kopplingshuvud och stödhjul, och ett gasolskåp i trä på dragstången.
- **Taket:** plåt med falsar från nock till takfot, och en nockplåt. Takrännor på båda långsidorna och tre stuprör (två fram, ett bak).
- **Östra gaveln:** skylten med korven (ingen text), ett fönster med spröjs och varmt ljus inifrån, dörren med fönster och handtag, ett trappsteg i två steg och en lykta.
- **Luckan:** hyllan ute under luckan har betalhyllan från D10 med kortläsaren på [−0,47, 1,33], ketchup, mild senap, dressing och servetter. Sopkorgen är klädd i trä och har lock.
- **Inne:** brödhylla och en bänk mot bakväggen.
- **Kylen** stod fritt under markisen i D12. Nu står den i ett eget skåp mot västra gaveln med front mot kön och ett pulpettak (`STUGAN.fridge.cabinet`). Medhjälparen når den från kön.
- **Menyn** står kvar på sitt ställ vänd mot kön, och har nu ett eget litet tak.
- **Strömmen:** en kabel från bakväggen till en elstolpe på [−1,6, −2,45].

## 2. Markisen som tillval

- `STUGAN.awning.item = 'equipment.queueAwning'`, för butikens flik Utrustning. Priset och kravet sätts i balance.ts.
- Allt som hör till markisen ligger i `awningGroup`: duken, festongerna, de tre stolparna, glödlamporna och lampan. `setAwning(on)` visar eller döljer den. Inget annat i vagnen ändras.
- Fotavtrycket är x −4,6…−1,35 och z 1,19…2,95. Duken är 2,45 m hög vid väggen och 2,2 m vid kanten.

## 3. Taket och markisen på krogens nivå

Samma regel som husens tak (`ROOF_BLEND`: helt synligt från 40 m, borta vid 26 m), nu också för markisens duk. D12:s `CANOPY_MIN` (0,3) används inte längre.

| Tonar ut | Står kvar |
|---|---|
| sadeltaket och nockplåten | vindskivorna, takrännorna och stuprören |
| kylskåpets pulpettak | luckans skiva och dess festonger |
| markisens duk och bakre list | markisens stolpar, festonger och glödlampor |

Markisens festonger står kvar för att det ska synas från 24 m att markisen är köpt (bild 01 mot 04 och 07 mot 10).

## 4. Regnet

- **Skydden** (`stuganShelters`): taket med takfoten, luckans skiva (ytterkant z 2,21, höjd 2,65), kylskåpet, menyns tak och markisen om den är köpt. Regnet slutar på dem (`shelterTop`), marken under är torr och det droppar från skivans och markisens kant.
- **Ljuset** (`WET`): himlen kallare (`hemiSky`), solen nästan borta (`keyK`), marken mörkare och blankare så att lyktorna speglas, åtta pölar och stänk på marken. Trä, plåt och duk mörknar och glänser (`setWet`).
- **Regnet följer kameran** och växer med avståndet, så att kanten aldrig syns på 42 m.

**Kön i regn (`RAIN_QUEUE`):**

| | Med markis | Utan markis |
|---|---|---|
| Den som beställer | under luckans skiva | under luckans skiva |
| Kön | sex under markisen, 0,55 m mellan (som D10) | en under skivan, sedan tre med paraply, 0,9 m mellan |
| Torra i kön | 7 | 2 |
| Medhjälparen | under markisen (z 2,72), skriver beställningen | med paraply utanför kön (z 3,4), lyssnar i stället för att skriva |

Hur länge kön står kvar i regn utan skydd och när den sista går sätter Code i `RAIN_QUEUE_BALANCE`. Prototypen visar bara var de står.

**Paraplyet:** åtta fack, radie 0,5 m. Färgerna är mörka och dämpade, aldrig röda eller gröna. Armen läggs på efter klippet och livet (`UMBRELLA_HOLD.armR`): överarmen framåt och underarmen uppåt. Skaftet lutar från handen mot en punkt 0,5 m över huvudet, högst 0,22 rad, så att duken sitter över den som håller det.

## Kontrollbilder (båda storlekarna)

| Bild | Vad den visar |
|---|---|
| 01–03 | Kväll, markisen köpt: Z, 10 m, 42 m |
| 04–06 | Kväll, utan markis: Z, 10 m, 42 m |
| 07–09 | Regn, markisen köpt: Z, 10 m, 42 m |
| 10–12 | Regn, utan markis: Z, 10 m, 42 m |
| 13 | Regn, under markisen, 8 m |
| 14 | Regn, paraplyerna, 8 m |
| 15 | Luckan, 6 m |
| 16 | Östra gaveln, 8 m |
| 17 | Västra gaveln med kylskåpet och dragstången, 8 m |
| 18 | Regn utan markis, medhjälparen med paraply, 10 m |

## Öppet

1. **Talen:** markisens pris och krav, `RAIN_QUEUE_BALANCE.patienceRain` och `leaveAt`.
2. **Andra platser:** kvarteren (Anders 11 och 12 oktober) låter foodtrucken stå på flera platser. Vagnen är byggd i sin egen ram, så den kan ställas var som helst. Kön och markisen följer med. Varje plats behöver köns riktning och var det finns plats för markisen.
