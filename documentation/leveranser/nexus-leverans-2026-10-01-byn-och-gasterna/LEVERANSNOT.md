# LEVERANSNOT: byn och gästerna (underlag till 288)

**Datum** 2026-10-01
**Till** Claude Code, via dig
**Från** Claude Design
**Gäller** Två prototyper från provspel 3 (2026-09-29) som aldrig levererades: byn ovanifrån i 2D och samma by i 3D. De packas nu som de är, som underlag till rivalerna och byn (288).

Prototyperna är **underlag att läsa, inte kod att montera**. De är gjorda före reglerna från 2026-09-29 och följer inte alla, se §4.

---

## 1. Innehåll

| Fil | Vad |
|---|---|
| `prototyp/Byn och gasterna.html` | Byn ovanifrån på en 2D-duk, 1920 × 1080. Fristående fil. |
| `byTruckar.js` | Food truckarna: de tre platserna, vagnarna, veckans schema, körningen mellan platserna och gästerna som äter vid luckan. Delas av 2D och 3D. |
| `prototyp/Byn och gasterna 3D.html` | Samma by och samma logik i three.js med `figureRig`. Dra för att vrida. Klicka på en gästtyp så följer kameran den. three.js och typsnitten hämtas från nätet. |

## 2. Vad de visar

- **Grythyttan som gatunät.** Tjugo noder och tjugoen gator: Storgatan, Kyrkogatan, Sjövägen och vägen mot Örebro och Karlstad. Måltidens hus, kyrkan, sjön, bostadshusen och gatlyktorna.
- **Fem krogar längs samma gator:** vår krog, Torgkrogen, Pizzeria Grytan, Sjöboden och Hotellets matsal. Var och en har en dörr i gatunätet, ett stjärnbetyg (1–5) och en räknare för kvällens gäster.
- **Fem gästtyper** med eget utseende, egen gångfart och egna preferenser per krog: studenten (från Måltidens hus, mest pizza), medelinkomsttagaren (par och familjer från husen), höginkomsttagaren (hotellet eller bil utifrån, stjärnorna väger tungt), gästen med socialt kapital (Lova) och miljardären i guld. Varje typ har *syns på*, *söker* och *betalar*.
- **Gäster i grupper.** En gående figur kan vara ett sällskap om flera (`n`). Gruppen går som en enhet längs kortaste vägen (BFS) till krogens dörr och räknas in där med en ring.
- **Bilarna utifrån.** Bilar kör in från vägen i sydost, parkerar på en av fem platser, släpper av ett sällskap som går vidare till fots och kör efter en stund. Högst fem bilar samtidigt.
- **Följet.** När Lova går förbi byter sällskap i närheten mål och följer henne till hennes krog. Miljardären får gatan att stanna. Båda har en ring som syns på avstånd.
- **Gästflödet.** Gatorna lyser starkare där många går, så att det syns vilken gata som bär kvällen.

## 3. Det 288 behöver, och vad som finns

| Behov i 288 | I prototyperna |
|---|---|
| Gäster i byn | Finns: fem typer, egna vägar och mål. |
| Grupper på väg in | Delvis: ett sällskap är en figur med `n`. Medlemmarna går inte var för sig och samlas inte vid dörren. Vardagens koreografi har regeln för sällskap som kommer och går tillsammans. |
| Konkurrenternas krogar | Finns: fem krogar med stjärnor och preferenser per gästtyp. |
| Bilar utifrån | Finns: ankomst, parkering, avsläpp och avfärd. Bara en parkering, i sydost. |
| Food trucks som parkerar på olika platser | Finns sedan 2026-10-01, se §6. |

## 4. Det som inte följer reglerna

- **Text i bilden.** Gatunamn, ortnamn, krognamn, *{n} i kväll*, *Från {ort}* över bilarna, pratbubblan *Vi följer med!* och namnet *Lova* ritas på duken (2D) och som etiketter i scenen (3D). Därför finns inga kontrollbilder i leveransen. I spelet ska namnen ligga i HUD-lagret.
- **Inga nycklar.** All text är svensk och skriven direkt i filerna, inte `{ sv, en }`.
- **Speltal i koden.** Stjärnorna, preferensvikterna (`PREF`), gångfarterna, antalet bilar och parkeringstiden står i prototypen. De hör hemma i `balance.ts`.
- **Slumpen.** Gäster och bilar väljs med `Math.random()`. Två körningar blir olika. Spelet behöver ett frö om byn ska kunna spelas om.
- **Storleken.** Vyn är 1920 × 1080 med förklarande text runt om. Den är inte gjord för helskärm i 1440 × 900 och 1280 × 720.

## 5. Förslag till 288

1. Gatunätet, krogarna med dörrar och gästtypernas preferenser tas som de är, med talen flyttade till `balance.ts`.
2. Food truckarna tas från §6. Spelarens egen vagn (paket 2) kan använda samma platser, och veckans val (U3 i paket 2) avgör var den står.
3. Sällskapen får medlemmar som går var för sig, med samma regel som i vardagens koreografi: samma fart som den långsammaste, samlas vid dörren.
4. Namnen och räknarna flyttas till HUD:en som nycklar, och kontrollbilderna tas utan text.

## 6. Food truckarna (tillägg 2026-10-01)

Två vagnar är rivaler precis som krogarna. De står i listan *Vart gästerna går*, har stjärnor och lockar gäster efter typ.

- **Platserna** kommer från paket 2: **torget** vid Storgatan (nod `S`), **vid Måltidens hus** (nod `CAM`, där studenterna kommer ut) och **vid sjön** längs Sjövägen (nod `L1`). Varje plats har ett läge, en riktning och en lucka mot gatan.
- **Vagnarna:** *Grillvagnen* (burgare, 2 stjärnor) och *Tacovagnen* (tacos och lemonad, 1 stjärna). Studenterna väljer dem helst. Medelinkomsttagaren går ibland, och höginkomsttagaren nästan aldrig.
- **De byter plats mellan kvällarna** efter ett veckoschema (`EVENINGS`). Med *Nästa kväll* kör vagnarna längs gatorna till kvällens plats. Under tiden är de stängda och väljs inte, och räknarna börjar om.
- **Vid luckan:** gästerna ställer sig i kö längs vagnen och äter stående en stund, som i paket 2. Sedan går de.
- **I 3D** är vagnarna egna modeller med markis, upplyst lucka och ett ljus mot gatan. Markisen fälls in när de kör.

Samma avvikelser som i §4 gäller: namnen ritas i bilden, och stjärnor, preferenser och tider är prototypens tal. Schemat och var vagnarna står hör hemma i sim-lagret.
