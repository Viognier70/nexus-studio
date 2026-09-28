# Leveransnot — Nexus v1, paket 5: gästgiveriet

**Projekt** nexus-studio · strategiska spåret
**Underlag** DESIGN_SPEC_NEXUS_V1 §2.5, §4.2 (receptionist), §4.4 (väska, frukost)
**Lyder under** SD-004
**Formmall** `truckPitch.ts`: ett lager ovanpå ett rum som redan håller

**Var den hör hemma:** `frontend/src/strategic/scene/innDay.ts`, bredvid
`innRoom.ts`.

```ts
const inn = createInnRoom();
const day = createInnDay(inn, { mode: 'frukost' });   // läggs i inn.group
setInnMode(day, inn, 'middag');                         // när klockan byter läge
updateInnCutaway(inn, camera);                          // när kameran vridits
updateInnDay(day, t); updateInnRoom(inn, phase);        // varje bildruta
```

---

## Varför huset inte är omgjort

`innRoom.ts` (2026-08-30) har redan det specen kräver av rummet: 100
platser i salen, 80 rum i två längor runt en gård, ett stort kök i linje
och en egen frukostficka. Uppbyggnaden med längor runt en gård är vald
just för att rörelsen mellan rum och sal ska korsa en yta som kameran ser.
Det som saknades var **dygnet** och **receptionen**, och de ligger i
`innDay.ts`. innRoom ändras inte.

## Fyra beslut

**1. Dygnet syns i gården.** Samma grusstråk används i tre riktningar. På
morgonen går gästerna från trapporna till salen, på eftermiddagen kommer de
med väska från grinden till receptionen och vidare upp, och på kvällen går
de tillbaka upp till rummen. Bild 02, 04 och 07.

**2. Receptionen står innanför dörren, väster om den.** Huset saknade
reception. Nu finns en disk på 1,80 m, ett nyckelskåp och en bagagehylla
där gästen med väska kommer in, ur vägen för middagsgästerna som går rakt
in. Nyckelskåpet är 1,60 m, eftersom ett högre skymde receptionistens
kalott norrifrån. Receptionisten bär husets `rooms`-uniform, samma som
städet, eftersom rollen hör till husets rumssida.

**3. Väskan är en mörk rektangel bredvid figuren.** Uppifrån syns inte en
hand som bär något. En läderväska på 0,45 × 0,6 m med armen rak gör
figuren bredare på ena sidan och får kroppen att luta åt andra. Så ser
incheckningen ut på 23 m. `createSuitcase(colour)` monteras i
`handAnchorR`.

**4. Det högtidliga är personal som står still.** Specen säger mycket
personal. Det syns inte i antalet springande figurer, utan i fyra
servitörer som står vid väggarna med händerna på ryggen och vakar över
salen (`poseAttend`), medan tre andra bär. De är de enda i spelet som inte
rör sig. Vid middag får borden också vitt linne och kandelabrar i mässing,
det enda vita i salen. Bild 05.

## Dygnets fyra lägen

| Läge | Salen | Gården | Personal |
| --- | --- | --- | --- |
| Frukost 07.45 | 42 gäster, fyra vid buffén med tallrik | Sex går från rummen till salen | Frukoststationen fyller på |
| Incheckning 15.30 | Tom, servitörerna dukar | En med väska från grinden och en upp för trappan | Receptionisten, en gäst vid disken |
| Middag 19.30 | Alla 100, linne, kandelabrar | Lyktorna tänds | Fyra vakar, tre bär, spelaren lugnar en gäst |
| Sen kväll 22.45 | 30 kvar | Åtta går upp till rummen | Fyra vakar |

## Specens kontroll, som kod

`checkInnCameraView()` mäter salen från åtta vridningar: alla 100 platser,
de 15 stationerna innanför väggarna (husets 10, receptionen och de 4
vakande) och gästens plats vid disken. Gården mäts från de fyra vinklar där
kameran står på gårdssidan: båda trapporna, loftgången i båda längorna,
stråkets mitt, utebaren och städet vid trappan.

**Salen: 100 av 100, 15 av 15 och receptionen syns från alla åtta.
Gården: 7 av 7 från alla fyra. Inget skymmer.**

Första körningen hittade fyra fel. Alla rättades i `innDay.ts`:

1. **Väggarna.** innRoom har huvudbyggnadens väggar som en grupp i full
   höjd (5,0 m). `updateInnCutaway()` skalar varje väggmesh på
   kamerasidan till 0,9 m, på meshen och inte på gruppen, så att
   `measureInnRoom()` fortfarande läser takhöjden rätt.
2. **Dörrplanen** stod kvar i full höjd när väggen kapades och blev en
   svart skiva i bilden. De döljs nu tillsammans med sin vägg.
3. **Utebarens pergola på 2,4 m** skymde bartendern. Den tunnas till 30 %,
   som food truckens markis.
4. **Trapporna står under loftgångens däck.** En gäst som går upp syntes
   inte från någon vinkel. Däck, räcke och stolpar tunnas till 30 %, och
   gäster på loftgången syns fortfarande. Det riktiga felet sitter i
   innRoom, se FRAGOR §42.

Bakom huvudbyggnaden skymmer salens norra vägg gården. Det är husets
baksida och inte interiören, så gården mäts bara från gårdssidan.

## Mätt i vyn

| | |
| --- | --- |
| Hela anläggningen | 52 × 52 m |
| Platser | 100 (48 vid långbord, 36 vid runda bord, 16 i lilla salen) |
| Gästrum, `checkRoomCount()` | 80 av 80, dörrar ok |
| Gården | 898 m² |
| Stationer | 17: 15 i salen och köket, 2 i gården |
| Kontrast figur ↔ golvzon | 2,02 – 2,52 (band 1,8–3,6), inga par utanför |
| Minsta roll-ΔE | 22,62 (krav 12) |

## Nya rörelser i `figureActs.ts`

| Funktion | Läses som |
| --- | --- |
| `poseCarrySuitcase` | Går med väska. Figuren är bredare på ena sidan och lutar bort från väskan. |
| `poseCheckIn` | Lutar sig mot disken och skriver, tar emot nyckeln och vänder sig mot dörren. Cykeln är 10 s. |
| `poseBuffet` | Tallriken i vänster hand, höger hand sträcker sig mot fatet. |
| `poseAttend` | Står still vid väggen med händerna på ryggen, blicken sveper över salen och en bugning var nionde sekund. |

Receptionisten använder `poseReception` från paket 1. Servitörerna
använder `poseServe`, och på eftermiddagen `poseLayTable`.

## Flaggor

`innDay.FLAGS` har sex poster. **`reception` blockerar incheckningen**
(FRAGOR §40). `dayCycle` och `movement` hör till §41. innRooms egna
flaggor gäller oförändrade.
