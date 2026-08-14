# M9 — Medgången: rapportgrind (ORDER 089)

**Status.** Rapportgrind. Ingen kod. Vision Owner läser, väljer, och en
efterföljande order bygger.

**Datum.** 2026-08-13

**Beroenden.** ORDER 088 §3–§4 landade före rapporten skrevs, så
avsnitt 4 (gästens klocka) har en rumskanal att peka på.

---

## 1. Iakttagelsen som öppnade grinden

Återkopplingen är ensidigt negativ. Load, tense, strained, hurried,
rödrytm, statuspip, kollaps av stress — allt välbyggt, allt åt ett håll.
Ett pass som lyckas läser i dag som **frånvaro av rött**, inte som en
känsla av att lyckas. `smiling` och `proud` finns i vokabulären, men det
har inte visat sig om maskinen bakom dem producerar dem med samma
envishet som stressmaskinen. Detta är den frågan avsnitt 1 mäter innan
resten avgörs.

---

## 2. Avsnitt 1 — Medgångsinventering (uppmätt, inte påstådd)

**Metod.** INFRA-2 fixed-seed harness (seed = 3, samma seed som ORDER
087 §0.3), 30-minuters dinner-service, samplar face per aktörstyp per
tick + rytmräknare + eventström-kategorier. Kör-instruktion:
`ORDER_089_MEDGANG_LOG=1 npx vitest run
src/strategic/simulation/__tests__/order087.faceDistribution.test.ts`.

### 2.1 Face-fördelning per aktörstyp

**Personal (25 047 tick-sampel):**

| Face      | Ticks   | Andel  |
| --------- | ------- | ------ |
| attentive | 7 683   | 30,7 % |
| strained  | 6 273   | 25,0 % |
| hurried   | 5 190   | 20,7 % |
| tense     | 2 787   | 11,1 % |
| neutral   | 1 890   |  7,5 % |
| irritated |   840   |  3,4 % |
| focused   |   384   |  1,5 % |
| smiling   |     0   |  0,0 % |
| proud     |     0   |  0,0 % |
| exhausted |     0   |  0,0 % |

**Gäst (76 852 tick-sampel):**

| Face      | Ticks   | Andel  |
| --------- | ------- | ------ |
| smiling   | 34 589  | 45,0 % |
| focused   | 19 760  | 25,7 % |
| neutral   | 15 672  | 20,4 % |
| attentive |  3 319  |  4,3 % |
| strained  |  2 982  |  3,9 % |
| irritated |    497  |  0,6 % |
| tense     |     33  |  0,04 % |
| proud     |    N/A  | staff-exklusivt |
| exhausted |    N/A  | staff-exklusivt |

### 2.2 Eventström-fördelning

Ring-buffered snapshot (max 40 senaste). Fördelningen redovisas i
absoluta tal snarare än percentiler eftersom bufferten inte samplar
hela passet:

- ambient: 14
- positive: 4
- outcome: 0

Positiv/ambient-ratio ≈ 22 %. Outcome-fältet var 0 för denna körning
eftersom scenariestrategin var "alltid A" — utan en riktig valstrategi
levererar inte "efter-val"-kommentaren stress-signaler in i strömmen.

### 2.3 Rytmens fördelning under service

Antal service-ticks per rytmfärg (samma körning):

| Färg  | Ticks  | Andel  |
| ----- | ------ | ------ |
| red   | 6 299  | 75,4 % |
| amber | 1 126  | 13,5 % |
| green |   924  | 11,1 % |
| none  |     0  |  0,0 % |

### 2.4 Vad siffrorna säger

**Personal-avläsningen är verkligen negativt viktad.**
Sammanslaget är 60 % av personal-ticks trycksignaler (strained + hurried +
tense + irritated); 40 % är neutrala eller aktiva (neutral + focused +
attentive). `smiling` (SF3, greet/welcomeDrink-tasks) och `proud`
(SF2, recent-answer-hit) firas **aldrig** under en full service på detta
seed. Ordens öppnande iakttagelse stämmer på personalsidan.

**Gäst-avläsningen är däremot inte negativt viktad.** `smiling` är
dominant face för gäster (45 %). Detta är den enda medgångsmaskin som
faktiskt kör — men den kör bara på gästen, och gäst-face renderas på
gästkortet, inte i personalraden. Ingen ansiktsrad läser gäst-smilings.

**Rytmen är rött 75 % av tiden.** Detta är ORDER 088 §2.1:s
observation utsträckt: när banden var pre-satta gick strained ur, när
banden justerades gick hurried in, men rytmen som helhet står i rött
tre fjärdedelar av service-tiden. Gröna sekvenser är korta undantag.

**Slutsats för resten av rapporten.**

1. Personal-sidan behöver medgångsmaskiner. Både `smiling` och `proud`
   är onåbara som steady-state.
2. Gäst-sidan är OK. Om `smiling` läses i personal-raden räknas inte —
   den finns inte där.
3. `positive` som eventstream-kategori finns med är underrepresenterad;
   den skulle behöva egna triggers med samma envishet som ambient/negative.

Val att peka på: **är personal-medgången en missing maskin (bygg fler
triggers för SF2 och SF3), eller en missing avläsning (visa
gäst-smiling i personal-raden också)?** Rapportens rekommendation är
den första — den andra skulle bryta upp aktörgränsen som redan är
etablerad (personal-face vs gäst-face som skilda avläsningar).

---

## 3. Avsnitt 2 — `rep` och återhämtningen

**Punchlist-rad 24:** *`rep` bottnar på 0.00 utan synlig
återhämtning.* En kväll som redan är avgjord fortsätter spelas som
administration. Detta är listans tyngsta rad ur medgångs-perspektiv:
även om medgångs-maskineriet fanns, skulle ett golvat `rep` göra
efterföljande service-tid meningslös.

Tre vägar, kostnad + effekt redovisade så Vision Owner kan välja
mellan dem:

### A — golv över noll + långsam passiv återhämtning

Sätt ett rep-golv (t.ex. 0,05) så värdet aldrig helt bottnar. Låt
passivt driva mot en jämviktspunkt (t.ex. 0,4) med lång halveringstid
(15 sim-min).

**Kostnad.** En konstant och en drift-formel i `reputation.ts`. Cirka
20 rader kod + test. Ingen ny statmodell.

**Effekt.** Ingen svängning bort från golvet under samma service. Nästa
service startar på ~0,1–0,2 om senaste passet var kollapsat. Golvet
visar sig aldrig i UI (det syns bara som "inte 0.00"). Ingen berättelse
i strömmen — värdet drivar tyst.

**Risk.** En passiv återhämtning är en svag signal. Spelaren märker
inte att `rep` går upp, bara att den inte längre är 0.

### B — händelsedriven återhämtning

Ingen passiv drift. Rep stiger vid specifika händelser:
- ett bord som stannade kvar hela service → +0,02
- en lyckad answer på professional question → +0,03 (redan finns via
  `episteme`-write)
- ett pass utan retur, kollaps, eller under-golv → +0,05 vid stängning
- en gäst som lämnade `smiling` under service → +0,005

**Kostnad.** Fyra nya rep-writes fördelade över reducer:n +
event-stream-koppling så händelserna namnges. Cirka 60 rader kod + fem
tester.

**Effekt.** Rep har en direkt berättelse: det stiger för att bordet vid
fönstret stannade kvar. Spelaren ser händelsen i strömmen och
kopplingen till mätaren. Om inga positiva händelser inträffar, rör sig
inte rep — golvet ligger kvar. Kräver rep-triggers att existera i första
hand, vilket §2.4 ovan säger att de gör (gäster lämnar med `smiling`
45 % av tiden).

**Risk.** Om händelserna är för sällsynta står rep still på golvet ändå.
Balansering krävs mot fördelningen i §2.

### C — A och B kombinerat, med händelserna som accelerator

Golv + passiv drift + händelsedriven lyft. Långsam drift säkerställer
att rep alltid rör sig; händelser accelererar. En kväll utan händelser
återhämtar tyst; en kväll med händelser återhämtar synligt.

**Kostnad.** A + B kombinerat. ~70 rader + sex tester.

**Effekt.** Ingen kväll är helt bortkastad (drift alltid pågår), men
insatsen belönas via händelser. Berättelsen finns när den finns; tystnaden
finns när ingenting hände.

**Risk.** Två återhämtningsmekanismer kan bli dubbelt bokförda om
händelsen och driften interagerar illa. Behöver invariant-test: rep
stiger monotont vid händelse OM drift inte redan är i golv-band.

### Ska återhämtningen namnges i strömmen?

Ordern flaggar frågan. **En siffra som stiger är en mätare; en siffra som
stiger för att bordet vid fönstret stannade kvar är en berättelse.**
Rapporten rekommenderar **ja, namnge — via B eller C.** Kvällsberättelsen
(EveningAccountPanel) finns redan och läser bra. Strömmens
positive-events har vokabulär för detta i `eventStream.sv.ts` men driver
inte rep idag.

Val att peka på: **A / B / C, och om händelserna ska namnges i
strömmen.** Rapportens rekommendation: **C med händelser namngivna.**

---

## 4. Avsnitt 3 — Öppning med tomt lager

**Punchlist-rad 23.** OPEN_SERVICE tillåts med tomt lager utan varning.
Ordern flaggar att det kanske inte är en saknad varning utan ett saknat
beslut.

Tre former, kostnad + effekt:

### A — varning som måste kvitteras

Modal vid OPEN_SERVICE om `sum(state.stock) === 0` (eller under någon
tröskel per menyplats). "Du öppnar ett pass utan råvaror. [Öppna ändå]
[Avbryt]".

**Kostnad.** En check i reducer:n, en dialog-komponent i morgon-UI.
Låg kostnad.

**Effekt.** Spelaren måste ta ett aktivt beslut. Kvitteringen kan bli
motion (klick utan tanke) om den återkommer varje service.

**Risk.** Bryter mot regeln "inga stat-paneler" om den blir en
uppmärksamhetsfälla. En dialog är en gränsfall — den är inte en panel
med löpande information, men den avbryter arbetsläget.

### B — prognos i stället för varning

Ingen dialog. Panelen visar en textrad före OPEN_SERVICE-knappen:
*"Råvaror till ungefär elva kuvert."* Öppna ändå. Lev med det.

**Kostnad.** En prognosberäkning (redan mycket av logiken finns i
`stockOutEvents`); en observer-voice-rad synthesiseras och renderas.
~40 rader.

**Effekt.** Beslutet är fortfarande spelarens. Prognosen ger information
utan att avbryta. Om spelaren öppnar med tomt lager är det ett medvetet
val. När råvarorna tar slut mitt i service:n dyker `stock_out`-event upp
i strömmen — spelaren såg det komma.

**Risk.** Prognosen får inte bli en siffertavla. "elva kuvert" fungerar
som text; "kött 30 %, sås 12 %, vin 45 %" gör inte det. Måste hållas
till observer-voice-form.

### C — blockering

Reducer refuserar OPEN_SERVICE med `stock` under tröskel. Röd knapp,
tooltip förklarar.

**Kostnad.** En check i reducer + UI-tillstånd.

**Effekt.** Spelaren tvingas köpa in innan öppning.

**Risk.** Roligast bortfaller. **Ett medvetet dåligt beslut är roligt.
Att hindras är det inte.** Också dåligt för utforskning: en ny spelare
som glömde lagerinköp får ingen upplevelse av "hoppsan, det tog slut mitt
i" — bara "jag får inte spela".

### Rekommendation

**B — prognos, ingen dialog, ingen blockering.** Motiveras mot
skalan "medvetet dåligt beslut ≠ hindras ≠ förvirrande":

- A är hindrande light
- B är informerande — behåller frihet, ger material för valet
- C är hindrande hard

Prognosen får inte bli siffertavla. Text-form som observer-voice är
regeln.

Val att peka på: **A / B / C.** Rekommendation: **B.**

---

## 5. Avsnitt 4 — Gästens klocka

Gästen är spelets minsta berättelse. Reelen hade en båge: anländer →
sätter sig → läser → vinkar → väntar → äter → går. Tålamodet sjönk
medan man tittade. **Korten visar var gästen ÄR. Ingenting visar vart
det LUTAR.**

Spänningen ligger i skillnaden mellan *gäst väntar* och *tio sekunder
kvar att rädda det bordet*. Rapporten specificerar var brådskan bor.

### 5.1 Var brådskan syns

Tre kanaler finns eller kan finnas:

- **Kortpanelen** (existerande). Kortet läser mönster + patience +
  waiting-text. Att lägga en klocka på kortet skulle bryta regeln om
  inga siffror ("Waiting — 40 s" finns idag; en klocka är samma sort
  men mer intensiv).
- **Rummet** (existerande efter ORDER 088). Mönster 18 (IMPATIENT)
  lutar puckens topp −5° bakåt. Pipen tänds över puckens huvud på
  patterns 17 och 18. Detta är två kanaler som **redan syns i ögonvrån
  medan spelaren tittar någon annanstans** — precis ordningens brief.
- **Ljud** (potentiellt, inte byggt). Vision Owner: bordskänsla via
  ljud är ett eget beslut och ligger utanför denna rapports scope.

**Rekommendation.** Brådskan bor i **rummet, inte på kortet.** Kortet
läser tillståndet; rummet läser trycket. Detta respekterar aktörens
gränser: kortet är översikt, rummet är omedelbar upplevelse.

### 5.2 Hur brådskan uttrycks utan siffra

Två existerande mekanismer räcker för att koda "tio sekunder kvar":

- **Pipens puls.** I dag är pipen en statisk kub med emissiv färg. En
  puls (opacity-sinus, 1,5 Hz) på pip-mesh:en gör "tid rinner ut"
  läsbart utan text. Kostnad: en `useFrame`-uppdatering.
- **Mönster 18 IMPATIENT:s microYaw.** Redan implementerad. ±8° vid
  0,7 Hz. Kan skalas upp lineärt mot patience-värdet — mer patience-
  brinnande = större yaw-svängning. Redan förberedd i patternTransform.

### 5.3 Vad händer när klockan går ut

Två alternativ:

- **A — hård cut.** Gästen övergår till `declined` eller `leaving`.
  Rep-hit; ström-event "gästen lämnade obetjänad". Klart och ärligt.
- **B — räddningsbar in i sista sekunden.** Fortsätt räkna ner tills
  personal faktiskt anländer. En greet-handling som landar 12 s efter
  hail-tröskeln räddar situationen med en mindre rep-hit än en full
  walk-away.

**Rekommendation:** **B.** Räddningsbar in i sista sekunden ger
spelaren agency — brådskan är inte "det är för sent" utan "jag måste
prioritera nu". Detta är själva det spelmomentet ORDER 089 hela handlar
om.

**Beroende:** ORDER 088 måste ha landat före byggnad — den har.

Val att peka på: **var brådskan syns (kort / rum / båda), hur den
uttrycks (puls / yaw-skalning / båda), och vad som händer när klockan
går ut (A / B).** Rapportens rekommendation: **rum + båda uttrycken +
alternativ B (räddningsbar).**

---

## 6. Avsnitt 5 — Kockfrågans kostnad

**Punchlist-rad 25.** Kockfrågornas ton läser som forskningsprosa mitt i
ett pass. Ordern flaggar att tonen är symptomet — den underliggande
frågan är **vad kostar det att svara?**

### 6.1 Vad en fråga utan kostnad är

En textruta. Spelaren läser, klickar rätt eller fel, får konsekvenser i
tal och siffror men inget spelmoment händer. Frågan är avkopplad från
service:n.

### 6.2 Vad en fråga med kostnad är

Ett spelmoment. Spelaren måste välja: svara nu (och låta ett bord vänta
en stund extra) eller vänta med att svara (och riskera att fönstret
stängs).

**Kostnadsformer:**

- **Tid.** En klocka på frågan (30–60 s), efter det stängs den och
  räknas som obesvarad.
- **Uppmärksamhet.** Medan frågan är öppen står en av personalstyrkan
  still (den som "sände" frågan enligt `senderRole`). Personens tasks
  pausas; deras workload läggs på andras.
- **Ett bord.** Om spelaren har ett bord i HAIL/IMPATIENT-status,
  fördröjs greet med 15 s extra medan frågan står öppen.

### 6.3 Tonregeln

Rapportens formulering: **en fråga från passet, inte en text om
passet.**

- Fel ton: *"According to Kelvin's second law of thermodynamics, the
  ideal cooking temperature for medium-rare beef is..."* — forsknings-
  prosa.
- Rätt ton: *"The beef at seat 3 was ordered rare — but the pan's not
  hot enough yet. Rush it or hold?"* — en fråga från passet, sender är
  kocken, kostnaden är tid och rep vid fel svar.

### 6.4 Rekommendation

**Kostnadsform:** tid + uppmärksamhet (senderRole:s task pausas).
Bordsfördröjning är för fint mesh:at för första implementationen.

**Tonregeln** skrivs in i `documentation/game-design/` som en policy för
question-bank-generering. Existerande 272 chef-frågor får en
tonrevision — inte översatta, skrivna om till "fråga från passet"-form.

Val att peka på: **kostnadsform (tid / uppmärksamhet / bord / kombination),
och om ton-revisionen av 272 frågor sker i samma order eller sitt
eget arbete.** Rapportens rekommendation: **tid + uppmärksamhet, ton-
revision i egen order** (tona 272 rader ryms inte i samma bygge som
kostnads-implementeringen).

---

## 7. Avsnitt 6 — Vad detta gör med M8

M8 perception-punch-list räknar 21 rader idag. Om avsnitten 2–5 byggs:

| Rad | Beskrivning | Status efter M9-bygge |
| --- | ----------- | --------------------- |
| 23  | Öppning med tomt lager | **Autonom** — prognos i morgon-UI + `stock_out` event kedjar in i strömmen |
| 24  | Rep golvas 0.00 | **Autonom** — golv + drift + händelser mätbart via harness |
| 25  | Kockfrågans ton | **Delvis autonom** — kostnadsform + klocka autonom; ton-revision perception till dess de 272 rader är skrivna om |

Tre rader flyttas från perceptionskontroll till autonom DoD. Rad 22
hör till ORDER 088 och rörs inte här (den blev autonom i och med §3–§4).

Övriga 17 rader står kvar oförändrade — M9 är fokuserad på medgången
och `rep`, inte på hela punch-listan.

---

## 8. Ett förslag om pass 2

Playtest-briefen (ORDER 081) föreskriver: spela först utan checklista —
*"förstår du vad som händer i rummet nu?"*. Frågan kan besvaras "ja" av
ett spel ingen vill spela om.

**Förslag:** lägg en fråga till efter den — **"ville jag spela en kväll
till?"**

- Kräver ingen mätning.
- Tar inga minuter extra.
- Är den enda frågan som mäter det denna order handlar om.

Motiverad mot planen: en spelare som förstår rummet men inte vill spela
en kväll till berättar att medgången saknas — även om alla 21 perceptions-
rader i M8-punch-listan är klara. Nej-svaret är inte en punchlist-rad;
det är en signal om att spelupplevelsen är administrativ snarare än
engagerande.

---

## 9. Beslutsfångst

Vision Owner:s val, avsnitt för avsnitt:

- **§2 — rep-återhämtning:** A / B / C? Namnge i strömmen?
- **§3 — öppning med tomt lager:** A / B / C?
- **§4 — gästens klocka:**
  - var? (kort / rum / båda)
  - hur? (puls / yaw-skalning / båda)
  - klockan-ut? (A hård cut / B räddningsbar)
- **§5 — kockfrågans kostnad:** kostnadsform (tid / uppmärksamhet /
  bord / kombination); ton-revision i samma order eller egen?
- **§8 — extra playtest-fråga:** ta med eller inte?

### 9a. `proud` har noll avläsare — droppa eller ge en trigger?

*(ORDER 090 §4a — utred, bygg inte.)*

**Bakgrund.** ORDER 087 gjorde `proud` personalexklusiv. ORDER 089 §2.1
mätte fördelningen och `proud` firas 0 ticks på personalsidan under en
full service på seed = 3. Uttrycket finns i vokabulären (rekommenderat
av `ALL_FACE_KEYS`, ritat som SVG i `icons.tsx`) men når inte staten
i praktiken. Enavläsarregeln (Underlag 001 §04) fångar detta inte —
den ser till att ingen tupel producerar två uttryck, inte att varje
uttryck har minst en avläsare.

Nuvarande enda trigger: SF2 — `recentAnswerHit` (färskt korrekt svar
på professional question). Kräver att spelaren precis svarat rätt på
en kockfråga inom fönstret RECENT_ANSWER_WINDOW_SEC (5 s).
Professional questions triggas dessutom sällan — en per scenariovinst,
kanske noll per service.

**Två vägar:**

- **A — droppa `proud` som `förvirrad` droppades.** Ta bort från
  `FaceKey` union, `ALL_FACE_KEYS`, `STAFF_EXCLUSIVE_FACES`, `icons.tsx`
  SVG-rendering. Motiveras med att ett uttryck utan avläsare är en
  förlust av tydlighet — spelaren tror det finns när det inte gör det.
  Kostnad: liten (rader borttagna). Effekt: face-vokabulären blir nio
  uttryck.
- **B — ge `proud` fler avläsare i M9-bygget.** Tillägg utöver SF2:
  - SF2b — en gäst lämnade `smiling` under senaste 10 s (personalen "landade" gästen).
  - SF2c — ett bord som stannade hela service:n (nu tydliggör kortpanelen redan detta).
  - SF2d — en agency-nekad service som ändå gick i grönt (personalen "höll trycket").
  Kostnad: 3 nya SF-rader + tests + `recentSmilingDeparture` derivering.
  Effekt: `proud` blir en mätbar del av medgångsmaskineriet §2.4
  identifierar som saknat.

**Rekommendation.** **B**, motiverad mot rapportens tes: personalens
medgångsmaskin fattas. Att droppa `proud` löser problemet genom att
gömma det; att ge det avläsare löser problemet genom att bygga det.
`förvirrad` droppades för att det saknade en RIMLIG avläsare i
tillstånds­modellen. `proud` har en rimlig avläsare — den fyras bara
för sällan. Fixa maskineriet.

Val att peka på: **A (drop) / B (fler triggers)**. Rekommendation: **B**.

### 9b. Load-modellens kalibrering — är trycket rätt satt?

*(ORDER 090 §4b — utred, bygg inte.)*

**Bakgrund.** ORDER 088 §2.1 mätte workload-fördelningen och flyttade
`hurried`-tröskeln 0.85 → 0.95. Men det är ansiktsbandet som flyttades,
inte trycket som modellen producerar. Rådata (samma seed = 3,
25 047 sampel):

- p50 = 0.916 (median workload)
- p75 = 1.000 (första kvartilen ligger vid mättnad)
- Rytm röd 75 % av service-ticken

**Detta betyder att belastning är mättad som normaltillstånd, inte
att den har en stressvans.** Ett verkligt tryck-system har en
distribution som spänner över hela intervallet — kalm arbete under
mest av service:n, med spikar vid rush. Nuvarande sim spikar aldrig
ner — den ligger vid taket.

Bidragande faktorer (spekulation, kräver mätning):

- Team-storleken (3 medlemmar, capacity 12) är för liten för den
  arrivals-formel som körs.
- COVERS_PER_MEMBER (4) räknar per medlem oavsett roll — en kock, en
  värd och en servitör räknas alla lika för capacity, men i praktiken
  bär servitörerna arbetet direkt.
- Ingen "burst"-mekanik: arrivals slumpar per tick, ingen kluster­
  effekt (våg av par, våg av singlar) som skulle skapa mätbara
  lugna sekvenser mellan spikar.
- Workload är monotont ökande — ingen "återhämtning" mellan bord.
  När en gäst betalar frigörs staff, men workload-formeln lyfts inte
  omedelbart.

**Frågan att ställa:** **är load-modellen själv rätt kalibrerad, med
denna fördelning som underlag?**

Om svaret är NEJ, är fem möjliga fixar (var och en är ett eget
bygge, ingen ändras här):

1. Höj COVERS_PER_MEMBER — större team-kapacitet per medlem.
2. Roll-viktad kapacitet — servitör räknas som 1.5 covers, kock som
   0.5, värd som 1.0 (osv).
3. Burst-arrivals — arrivals kommer i grupper med paus emellan.
4. Workload-återhämtning — snabbare drop efter task-completion.
5. Team-storlek + capacity-policy koppling — spelaren måste kunna
   välja större team utan att det bryter ekonomin.

Vision Owner:s val avgör vilken (om någon) som blir egen order.

**Ingen tröskel ändras i den här ordern.** Beslutet handlar om
huruvida ORDER 090 §4b flaggar en kalibreringsfråga för framtiden
eller om Vision Owner anser att modellen är rätt som den är (i vilket
fall observationen dokumenteras men inget nytt bygge planeras).

Val att peka på: **kalibrera load-modellen (välj mellan fix 1–5),
eller acceptera nuvarande fördelning?** Rekommendation: **flagga
för mätning i M9-bygget — utan att bestämma vilken fix — så att
mätdata från framtida spelningar kan avgöra.**

---

Efter beslut: bygg-order utfärdas mot dessa val. **Ingen kod
skrivs i denna ordern**, inga trösklar vidgas, inga befintliga beslut
rubbas.

---

## 10. Avgränsningar

Denna rapport ändrar inga trösklar, inga beslut, ingen kod. Den öppnar
inga nya system utöver de tre punchlist-raderna 23/24/25. M4b, M6b, M7b
och M7c är alla bredd och ligger utanför denna rapports scope.

Hela poängen: **en service som känns bra hela vägen igenom ska komma
före mer bredd.**
