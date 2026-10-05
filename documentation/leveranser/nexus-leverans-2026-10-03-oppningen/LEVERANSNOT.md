# LEVERANSNOT: öppningen (D2)

**Datum** 2026-10-03
**Till** Claude Code, via dig
**Från** Claude Design
**Gäller** D2: öppningen före bussen, 30–45 s. Den är 41 s och slutar i den svärta som ankomstens scen 1 (bussen, `nexus-leverans-2026-09-30-borjan-i-grythyttan`) börjar i.

Allt är byggt av det som redan finns: byn i kvällsljus (`byKvall.js`, `villageEvening.ts`, spelets karta), vinbaren i teatern (`teaterScen.js`, `wineBarRoom.ts`) och klippen i `figureClips.ts`, inklusive stämningsgesterna från D1. Inga nya modeller.

---

## 1. Innehåll

| Fil | Var | Vad |
|---|---|---|
| `oppningManus.js` | läses, monteras inte | Bilderna och övergångarna (`SHOTS`), svärtan (`BLACK`), texten (`TEXT`), kvällen (`EVENING`), byns kamera som nyckelbilder (`VILLAGE_CAM`), Ingrid (`MENTOR`), den tomma vinbaren (`emptyBar()`) och glimtarna av kvällen (`glimpses()`). |
| `openingStrings.ts` | slås in i `STRINGS` | 29 nycklar, `{ sv, en }`. `opening.line1` och `opening.line2` är spelets text. `open.*` är prototypens panel och kapitel. |
| `prototyp/Oppningen.html` | läses, monteras inte | Hela öppningen med tidslinje, SV/EN, texten på eller av, båda skärmstorlekarna och *Spela in WebM*. three.js och Babel hämtas från nätet. |
| `bilder/1440x900/`, `bilder/1280x720/` | — | 10 kontrollbilder i varje storlek, utan text (§5). |
| `skarmar/1440x900/`, `skarmar/1280x720/` | — | Texten över byn, som den ser ut i spelet. |

## 2. Bilderna

| Tid | Bild | Kameran | Det man ser, och varför |
|---|---|---|---|
| 0–12,5 s | **Flygturen** | från 980 m över sjön i sydost, lågt (24°), till spelets bynivå (660 m) vid 6,5 s och vidare till torget (150 m) | Byn i skymningen. Gatlyktorna tänds en i taget och sedan fönstren (kvällen `e` 0,05 → 0,18). Texten står från 2,6 s. Svärtan tonas upp under de första 1,4 s. |
| 12,5–17 s | **Ned till vinbaren** | genom byns egna nivåer: kvarteret, gatan (42 m) och krogen (25 m) | Samma övergång som i spelet. Taket lyfts mellan 40 och 26 m (`BLEND.roof`), och rummet syns inifrån. Byns figurer i rummet är dolda, så att rummet är tomt redan här. |
| 17–23,5 s | **Den tomma vinbaren** | tonas över på 0,6 s från byns krognivå till teaterns 24 m, sedan långsamt in till 12 m över baren | Före öppning. Ingen människa, bara glasen på disken och ljusen på borden. Ljuset är dämpat, och en ljuspöl ligger över baren och loungen. Det är det spelaren ska fylla. |
| 23,5–33,4 s | **Glimtar av kvällen** | tre bilder på 3,3 s med hårda klipp, 7–9 m, med en lätt drift i varje | Samma rum en kväll senare: (1) Per hälsar i dörren och en gäst hänger av sig, (2) Elin dekanterar vid lounge B medan gästerna tittar och Mira putsar glas, (3) skålen i lounge A, med glasen över bordets mitt och ett skratt (`guest.cheers`, `guest.laugh`). |
| 33,4–39,4 s | **Ingrid i dörren** | tonas över till byn, Måltidens hus på 40 → 36 m, från sidan | Mentorn står i dörren i olivgrönt (`MENTOR_GARMENT`), och studenterna från byn går förbi henne in. Ingen närbild. Hon tittar ut mot vägen en gång vid 35,2 s. Det är hon som tar emot vid liggaren i ankomstens scen 4. |
| 36,6–40,6 s | **Upp mot infarten** | lyfter till 320 m över byns ljus | Kameran drar sig upp och bort mot vägen där bussen kommer. Svärtan går ned på 1,2 s från 39,4 s. |
| 40,6–41 s | **Svart** | — | Ankomstens scen 1 börjar här: *Svart. Bussens motor och sorlet från studenterna.* |

## 3. Texten

- `opening.line1`: **En säsong. Åtta veckor.** / *One season. Eight weeks.* Young Serif i display-storlek (6,4 % av höjden).
- `opening.line2`: **Från midsommar till kräftskiva.** / *From midsummer to the crayfish party.* Young Serif, 3,6 % av höjden, i `creamMuted`.
- Rad 1 tonas in vid 2,6 s och rad 2 vid 6,4 s, med en lyftning på 1,2 % av höjden. Båda tonas ut vid 10,8–11,6 s, innan kameran går ned till torget.
- Texten står nere till vänster (7 % in, 15 % upp) med en mjuk skugga, över sjön och åkrarna där inget rör sig mot kameran. Den ligger över bilden och är aldrig inritad i den.
- Fortsättningen efter *Åtta veckor* i beställningen skrev jag själv, från speldesignen (*från midsommar till kräftskiva*). Byt gärna ut den mot er egen rad.

## 4. Till spelet

- **Ordningen:** öppningen → ankomstens scen 1 (bussen). Bussens scen tonar upp ur samma svärta, så det finns inget klipp mellan dem.
- **Hoppa över:** förslag: efter 3 s går öppningen att hoppa över med en tangent eller ett klick, och en den som har spelat förut ser den inte alls (som när ankomsten hoppar över bussen och vägen).
- **Kvällen och ljuset:** byns ljusnivå är 0,9 under öppningen (`VILLAGE_LIGHT_LEVEL`, lite under spelets 1) så att skymningen känns. Byn och vinbaren ritas av samma moduler som i spelet, så det som ändras där syns här också.
- **Ljudet** (förslag, inget ljud levererat): vind och sjö under flygturen, rummets sorl i en tunn variant när taket lyfts, tystnad i den tomma vinbaren, och glimtarnas ljud (dörren, hällningen och *skål*) i hårda klipp. I svärtan på slutet tar bussens motor över.
- **Gästerna i glimtarna** är bakgrund. Sim-lagret behövs inte: scenen är förinspelad som i händelserna.

## 5. Kontrollbilder

I 1440 × 900 och 1280 × 720, utan text:

- `oppning-1-980m-over-sjon`, `-2-660m-hela-byn`, `-3-150m-torget`, `-4-30m-taket-lyfts`
- `oppning-5-tomma-vinbaren`
- `oppning-6-per-i-dorren`, `-7-elin-dekanterar`, `-8-skalen`
- `oppning-9-ingrid-i-dorren`, `-10-over-byns-ljus`
- `skarmar/`: `oppning-texten` (rad 1 och 2 över byn)

## 6. Att se över

- **Texten:** se §3. Rad 2 är mitt förslag.
- **Infarten** finns inte som plats i byn (`PLACES` har torget, campus och parkeringen). Kameran lyfter därför mot torget i stället för mot en hållplats. När hållplatsen finns som landmärke kan sista nyckelbilden riktas dit (`VILLAGE_CAM`, `lead`).
- **Ingrid** är en vanlig figur i olivgrönt, utan liggare. Liggaren som rekvisita finns inte ännu, och på 36 m syns den inte ändå.
- **Studenterna vid Måltidens hus** kommer från byns sim-lager och är inte styrda. De råkar gå in förbi Ingrid, men i spelet kan de lika gärna saknas.
