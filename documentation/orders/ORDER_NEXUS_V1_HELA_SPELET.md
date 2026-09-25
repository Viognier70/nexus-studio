# ORDER — Nexus version 1: hela spelet

**Repo** `Viognier70/nexus-studio` · **Gren** en per etapp, från `main`
**Klass** AUTONOM, i fjorton etapper med två spelstopp
**Datum** 2026-09-25
**Lyder under** `documentation/foundation/vision/NEXUS_SPELDESIGN_V1.md` och ORDER 100
**Numrering** Ett ordernummer per etapp, i tur och ordning ur `ORDER_REGISTRY.md`

> Den här ordern bygger hela version 1 av spelet. Den körs etapp för etapp utan
> att vänta på nya ordrar. Den stannar bara vid de två spelstoppen, vid ett
> oåterkalleligt beslut som speldesignen inte täcker, eller när en etapp inte
> når sin Definition of Done.

---

## 0. Källor, i rangordning

1. `NEXUS_SPELDESIGN_V1.md` — speldesignen. Alla tal, regler och klasser står där.
   Vid konflikt med äldre dokument gäller speldesignen.
2. ORDER 100 (Game Design Constitution) — principerna.
3. `SPELSLINGAN_SCHEMAT.md` — slingan från Miro-tavlan.
4. Befintlig kod och registret — det som redan är byggt.

Om något i koden säger emot speldesignen är det koden som ska ändras, inte
speldesignen. Skriv upp varje sådan konflikt i etappens rapport.

---

## 1. Regler för alla etapper

Dessa regler finns för att projektet har haft minst tjugo fall där en rapport sa
klart och spelet visade något annat. De är inte förhandlingsbara.

### 1.1 Verifiering i spelarens vy

- All visuell verifiering görs från en normal spelstart, i den vy spelaren
  faktiskt når. Inga dev-flaggor (`dollhouse=1`, DEV-räknare, dolda paneler).
- Varje etapp som ändrar något synligt levererar skärmdumpar tagna med
  Playwright från normal start, sparade under `frontend/reports/order<NNN>/`.
- En funktion räknas som klar först när den har setts fungera i spelarens vy.
  Gröna tester räcker inte.

### 1.2 Mätning i en hel vecka

- Harnessen spelar en hel vecka headless med fast fröslump. Från etapp 3 och
  framåt körs den efter varje etapp och rapporterar kassa, golv, gäster, rykte,
  medaljer och krediter per dag.
- Från etapp 5 körs även slumpmålet: 1 000 simulerade veckor, där en bättre
  förberedd spelare ska vinna ungefär tre veckor av fyra (speldesign, Slumpen).

### 1.3 Git

- En gren per etapp från `main`. Merge med `--no-ff` först när DoD är uppfylld.
- Aldrig WIP på `main`. Aldrig ändringar i `package-lock.json` utan avsiktligt
  byte av beroende.
- Registerraden i samma commit som arbetet.
- `git status --short` före varje commit, `git log --oneline -3` efter.
- `typecheck`, `build` och hela testsviten gröna före merge.

### 1.4 Alla tal på ett ställe

Alla tal från speldesignen (golvvärden, 0,6/0,4, marknadstak, ränta, tre dagar,
tjugo sekunder, tre insatser, gästfaktorer per veckodag och högtid) samlas i
en enda fil, `frontend/src/sim/balance.ts`, med kommentar som pekar på avsnittet
i speldesignen. Inga tal får ligga inbäddade i logiken.

### 1.5 Beslut som saknas

Om en etapp når ett beslut som speldesignen inte täcker:

- **Går det att ändra senare:** välj den tolkning som ligger närmast speldesignen
  och principerna i dess sista avsnitt, skriv upp valet i
  `documentation/architecture/NEXUS_V1_OPPNA_FRAGOR.md` och fortsätt.
- **Går det inte att ändra senare** (datamodell som sparfiler beror på, radering,
  något som påverkar spelares sparade spel): stanna och rapportera.

### 1.6 Design som saknas

Visuellt material levereras av Claude Design enligt designspecifikationen. Om
en etapp behöver material som inte har levererats: bygg logiken färdigt med
enkel platshållargeometri, märk den `PLACEHOLDER_DESIGN` i koden, och fortsätt.
Etappen är då klar i logik men inte i utseende, och det står i rapporten.

### 1.7 Rapport per etapp

Varje etapp avslutas med en rapport i
`documentation/architecture/ORDER_<NNN>_RAPPORT.md` med fem rubriker:

1. Vad som byggdes
2. Hur det verifierades i spelarens vy (med skärmdumpar)
3. Veckoharnessens tal
4. Avvikelser från speldesignen och varför
5. Öppna frågor

Ordet klart används bara om punkt 2 är uppfylld.

---

## 2. Etapperna

### Etapp 0 — Grunden

- Lägg `NEXUS_SPELDESIGN_V1.md` i `documentation/foundation/vision/`.
- Skriv in i ORDER 100 vad som ligger utanför version 1 (speldesign, Ramar).
- Skapa `balance.ts` (1.4) med alla tal, även de som används först senare.
- Gör frågebanken till data: ett schema med paviljong, nivå, frågeställare,
  frågetext, fyra alternativ, rätt svar, förklaring, axel och språk. Spelartext
  och metadata hålls isär.
- Läs in bronsbanken (`PAVILJONGFRAGOR_BRONS.md`, 40 frågor). Skriv en svensk
  översättning av spelartexten som utkast i en separat fil för Vision Owners
  granskning. Tills den är granskad används den engelska texten.
- Märk alla frågor på nivåerna silver till platina som platshållare, och låt
  bronsfrågorna stå i som platshållare där.
- Registret: sätt ORDER 044 till godkänd.

**DoD:** schemat validerar alla 40 frågor, `balance.ts` innehåller alla tal från
speldesignen med avsnittshänvisning, och ett test hävdar att inga tal från
speldesignen förekommer utanför `balance.ts`.

### Etapp 1 — Tiden

- Dag med tre faser: morgon, service, kväll.
- Morgonens schema med två platser, söndag med fyra.
- Vecka med sex servicedagar och en stängd söndag. Veckodagsfaktorer för gäster.
- Säsong om åtta veckor med högtiderna i vecka 1, 3, 5 och 8.
- Sparande: autospar vid varje dagsavslut, en kopia per veckoavräkning, tre
  sparplatser.
- Avgör ORDER 171: finns felet med `prepEndsAt` och `doorsOpenAt` kvar på `main`?
  Om ja, rätta det här, eftersom dagens faser bygger på det. Om nej, arkivera
  grenen med en tagg.

**DoD:** en spelare kan gå från måndag morgon till söndag och vidare till nästa
vecka i spelarens vy. Sparande och laddning återställer exakt samma läge, testat
genom att spara, ladda och jämföra hela tillståndet.

### Etapp 2 — Kunskapen

- Paviljongsbesök som kostar en schemaplats, med valen Öva och Prov.
- Öva: fem frågor med förklaring efter varje svar, ger krediter.
- Prov: åtta av tio frågor i slumpvis ordning, sex rätt ger medaljen, omprov drar
  på nytt, nivån under krävs.
- Medaljer som aldrig kan förloras. Krediter per axel.
- Teatern låst tills silver i två paviljonger.
- Quizen efter servicen: tre frågor från kvällens svagaste axel, rätt ger en
  kredit, fel kostar en, kan hoppas över.
- Platinabelöningen per paviljong som en flagga verksamheten kan läsa.

**DoD:** i spelarens vy kan en spelare öva, ta ett prov, få en medalj och se den
finnas kvar efter att ha laddat om spelet. Test hävdar att ingen väg i koden kan
sänka en medalj.

### Etapp 3 — Ekonomin och bankmötet

- Golvet enligt formeln i speldesignen, med taket 90.
- Veckoavräkning med påfyllnad upp till golvet, och golvet som kreditram för
  satsningar.
- Startlån per klass, amortering under åtta veckor, fem procents ränta.
- Marknaden: daglig gästpool efter veckodag, säsong och högtid, delad efter
  attraktivitet, med spelarens tak 20 % plus 3 procentenheter per medaljsteg.
- Nedgradering efter tre dagsavslut i rad under noll, med två dagars varning.
- Uppgradering och frivillig nedgradering vid veckoavräkningen.
- Bankmötet med den nya klasstabellen och en diagnos i ord, aldrig siffror.

**DoD:** veckoharnessen visar en vecka där golvet fylls på, en där det inte
behövs, och en nedgradering som följs av en väg tillbaka. Grep: ingen
konvertering mellan kassa och krediter.

### Etapp 4 — Servicen

- Action-knappen: välj en uppgift ur kön, figuren utför den, snabbare med fler
  techne-krediter, resten av rummet skymt i tjugo spelsekunder, högst tre per
  kväll, en techne-kredit per lyckad insats.
- Ryktet: golv 10 av 100, långsam återhämtning, snabbare genom händelser, varje
  återhämtning nämnd i händelseströmmen.
- Lagret: prognos i ord före öppning, ingen blockering.
- Händelser ur simuleringen: inspektion, recensent, samtal från banken, var och
  en med en orsak.
- Kvällsberättelsen börjar med det som gick bra.
- Ta bort `proud` och andra känslor utan avläsare.
- Om ORDER 261 (en gäst, en position) behövs för att action-knappen ska träffa
  rätt gäst: ta in grenen `order-261` här och klara dess mätkrav. Annars låt den
  ligga.

**DoD:** i spelarens vy kan en spelare rycka in och se en gäst stanna som annars
hade gått, och se det nämnas i strömmen. Veckoharnessen visar att ryktet aldrig
går under 10.

### Etapp 5 — Vinbaren och introduktionen

- Dagens byggda lokal blir vinbaren: 20 platser, lounger, DJ-plats, smårätter,
  mindre kök. Utseendet från Designs leverans, annars platshållare (1.6).
- Interiören ska synas i spelarens vy utan att väggar och grannhus skymmer.
  Bygg om det som behövs från grenen `order-173` mot dagens `main` (filtret i
  `OsmBuildings.tsx` och intoningen), och lös ORDER 174:s Fynd 2 samtidigt.
- Introduktionen: bussen (VS001), mentorn, ett övningsbesök, ett prov, bankmötet
  och den första vinbaren. En ny spelare ska stå i sin verksamhet inom 20 minuter.
- Veckoavräkningen som söndagstidningen.
- Slumpmålet mäts för första gången (1.2).

**DoD:** en hel vecka kan spelas från bussen till söndagstidningen i spelarens vy,
utan dev-flaggor. Slumpmålets mätning redovisas.

> ### SPELSTOPP 1
>
> Stanna här. Vision Owner spelar en hel vecka. Rapporten ska innehålla en kort
> instruktion om hur man startar spelet och vad som är platshållare. Fortsätt
> först när Vision Owner har svarat, och ta in svaren i
> `NEXUS_V1_OPPNA_FRAGOR.md` och i speldesignen innan etapp 6.

### Etapp 6 till 10 — De övriga klasserna

En etapp per klass, i denna ordning: food truck, restaurang, ölkrog,
gästgiveri, nattklubb. Varje klass är ett eget spel. För varje:

- Gästlogiken: hur gäster kommer, väntar, beställer, stannar och går.
- Köket: stationer och rätter.
- Vad som kan gå fel och vilka händelser det ger.
- Huvudpaviljong, krav och startlån enligt klasstabellen.
- Utseendet från Designs leverans, annars platshållare.

Särskilt:

- **Food truck:** ingen matsal, en lucka mot gatan, kö, väder, gatuläge. Ersätter
  dagens SVG-vy.
- **Restaurang:** 60 platser, matsal och bar, mise en place.
- **Ölkrog:** bryggeri som ett produktionsrum i lokalen.
- **Gästgiveri:** dygnsstruktur med övernattning och frukost. Kräver en egen
  gästtillståndsmaskin.
- **Nattklubb:** sena kvällar, flera barer, volym och flöde, ingen servering vid
  bord. Kräver en egen gästtillståndsmaskin.
- ORDER 168 (ytterväggen) tas in i den etapp där den behövs, om den fortfarande
  är relevant. Annars arkiveras grenen med en tagg.

**DoD per klass:** en hel vecka i klassen i spelarens vy, veckoharnessen grön,
och en uppgradering till klassen och en nedgradering från den fungerar.

### Etapp 11 — Paviljongerna som platser

- Varje paviljong är en plats i Måltidens hus på kartan som spelaren går till.
- Inne är det en enkel scen där frågeställaren står och ställer frågan som en
  replik. Ingen full 3D-interiör.

**DoD:** alla fem paviljongerna nås från kartan i spelarens vy och visar sin
frågeställare.

### Etapp 12 — Säsongen och portfolion

- Mognadsstegen Novis till Expert med kraven i speldesignen.
- Portfolion fylls automatiskt med evidensrader från det spelaren gör.
- Säsongsavslutet efter vecka 8: portfolion visas, och en ny säsong kan börjas
  med kunskapen kvar och ny kassa.

**DoD:** en hel säsong kan spelas i harnessen, och säsongsavslutet visar en
portfolio med minst fem olika sorters evidensrader.

### Etapp 13 — Genomspelningsgrinden

- Harnessen spelar hela säsongen med 20 olika frön.
- Hävdar: inga krascher, varje klass nås i minst ett frö, en nedgradering följd av
  en väg tillbaka förekommer, slumpmålet håller, och alla tal kommer från
  `balance.ts`.
- En komplett lista över allt som fortfarande är `PLACEHOLDER_DESIGN` eller
  platshållarfrågor.

> ### SPELSTOPP 2
>
> Stanna här. Version 1 är färdig i logik. Vision Owner spelar en hel säsong.
> Det som återstår efter detta är frågorna från Vision Owner, material från
> Design och justering av talen i `balance.ts`.

---

## 3. Det som inte ingår

NPC:er med egna liv, byggnader som byter funktion, andra årstider än sommar,
flera spelare och export av forskningsdata. Se speldesignen, Ramar för version 1.

---

## 4. Första steget

Börja med etapp 0. Innan du skriver kod: läs speldesignen i sin helhet och lista
i etapp 0:s rapport varje ställe där befintlig kod säger emot den.
