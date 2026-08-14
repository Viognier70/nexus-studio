# Milstolpar mot schemat — omskrivning

**Nexus Studio · Vinbaren, Grythyttan · 2026-08-14**
Underlag för revidering av `documentation/blueprints/STRATEGIC_TRACK_MILESTONES_PROPOSAL.md`
Källa: Miro-tavlan `schema`, board `uXjVIGbwLcE`, samt Vision Owners precisering 2026-08-14.

---

## 1. Varför listan behöver skrivas om

Schemat beskriver ett kunskapsspel där restaurangen är provbänken. Slingan är:

> ankomst → paviljongerna (kunskapsprov i fem miljöer) → bankmötet (lån ur
> kunskapsresultatet) → verksamhetsval → satsningar → service (viktad av
> satsningarna, med action-knapp) → utfall i tre hållbarheter → quizer mot
> uppvisade svagheter → nytt varv med ackumulerat kapital

M0–M8 täcker två rutor av den slingan: satsningar och service. Nio milstolpar,
601 tester och all infrastruktur ligger nedströms om ett gångjärn som aldrig
byggts. Listan beskriver därför i dag ett annat spel än schemat.

**Det förklarar också två saker vi redan mätt.** ORDER 089 fann att medgången
saknas — men belöningen i schemat är krediter och kunskapskapital, och den
maskinen finns inte. Och M7a:s kockfrågor läser som forskningsprosa därför att
de saknar sin plats: i schemat är frågorna efter servicen, riktade mot det som
gick fel, med krediter som insats.

---

## 2. Verksamhetsklasser — nytt grundbegrepp

Kunskapskapitalet vid bankmötet avgör vad spelaren får driva. Detta är inte en
svårighetsgrad utan tre olika spel:

| Utfall | Verksamhet | Karaktär |
| --- | --- | --- |
| Ingen kunskap | **inget lån** | tillbaka till paviljongerna och öva |
| Lite kunskap | **food truck** | en lucka, en till två i besättning, kö på gatan, vädret spelar roll, konkurrerar med befintliga restauranger |
| Substantiell kunskap | **restaurang** | matsal, kök, bar; sexton kuvert; upp till tjugo roller |

Food trucken är inte en mindre restaurang. Ingen matsal, inga bord, ingen
sittande gäst — därmed inga sittmönster, ingen rytmring över rummet, ingen
mise en place i dagens form. Händelsekaraktären är annorlunda: kö, väder,
gatuläge, snabb omsättning.

**Konsekvens för koden:** `Restaurant.tsx`, `layout.seats`, `findFreeSeat`,
`TOTAL_SEATS = 16` och rumsgeometrin förutsätter restaurangen. En
verksamhetsklass måste införas ovanför dem.

**Konsekvens för bygget:** food trucken bör byggas först. Den är den enda
verksamhet en spelare med lite kunskap får se, den är den mindre av de två, och
den prövar dockskåpsformen på ett litet fall innan sexton kuvert ska rymmas.

---

## 3. Vad M0–M8 faktiskt täcker

Ingenting nedan rivs. Allt behåller sin plats — men i en slinga som är större
än listan hittills beskrivit.

| Milstolpe | Ruta i schemat | Status |
| --- | --- | --- |
| M0 visuell regression | infrastruktur | landad |
| M1 spelbar loop | satsningar + service | landad |
| M2 aktiviteter | **satsningarna som viktar servicen** | landad |
| M3 kvällsbokföring | **utfall i tre hållbarheter** | landad |
| M4 meny/kök/lager | satsningar | landad |
| M4a attraktivitet, substitut, walkout | service | landad |
| M4b vinlista, lageråldring | satsningar | öppen |
| M5 mise en place, rytm | service (restaurang) | landad |
| M6 orsaksmedveten mekanik | service | landad |
| M6b meningsbanker | service, kvällsberättelse | öppen |
| M7a kockfrågor | **fel plats** — hör till quizrutan | landad |
| M7b bankmöte | **gångjärnet** | blockerad |
| M7c flerrollsfrågor | quizrutan | blockerad |
| M8 genomspelningsgrind | hela slingan | öppen |

M2 och M3 är starkare mot schemat än listan påstår: aktiviteternas
ECON/SOC/ECO-deltan *är* satsningarna som viktar servicen, och kvällsbokföringen
*är* utfallsrutan. Den delen av slingan är i allt väsentligt byggd.

---

## 4. Ryggraden — nya milstolpar

Numrerade i den ordning de blockerar varandra.

### R1 — Kunskapskapital och krediter
Valutan. Krediter tjänas och förloras på prov, bärs mellan omgångar, och är
skild från `cash`. Fördelas på kunskapsområden så att svaghet kan pekas ut.
Kunskapsdomänerna följer schemat: episteme, techne, phronesis.

*Blockerar allt annat i ryggraden. Ingen kod nedströms kan skrivas utan den.*

### R2 — Paviljongerna
Fem miljöer i Sevillapaviljongen med kunskapsprov: forskningsdatabasen
(episteme), Kalastorget (phronesis i gestaltande måltidssituationer),
den gastronomiska scenen, Metodköket (techne inom kock- och
måltidskreatörkunskap), och den femte. Prov ger krediter per domän.

**Måste vara återbesökbar.** "Ingen kunskap = inget lån, gå och öva" gör
paviljongerna till en övningsslinga, inte en intro man passerar en gång.

*Beroende: R1. VS001 är ankomsten till paviljongen och mergas här.*

### R3 — Bankmötet och answer-to-loan-mappningen
M7b:s blockering är inte teknisk — det är speldesignen. Hur översätts
kreditbalansen per domän till lånebelopp, och var går trösklarna mellan inget
lån, food truck och restaurang? Rapportgrind först, bygge sedan.

*Beroende: R1, R2. Blockerar R4.*

### R4 — Verksamhetsklass
Klassen som begrepp, och food trucken som första implementation. En lucka,
kö, väder, gatuläge. Egen händelsekaraktär, egen ekonomi, konkurrens mot
befintliga restauranger.

*Beroende: R3. Rör `Restaurant.tsx`, `layout.seats`, `TOTAL_SEATS`.*

### R5 — Action-knappen
Schemat beskriver en knapp **spelaren själv trycker på** för att försöka rädda
en situation under pågående service — missnöjda gäster efter lång väntetid, och
liknande. Dagens scenarier avbryter i stället spelaren med ett val.

Skillnaden är vem som tar initiativet, och initiativet är det som är kul. Det
befintliga scenariesystemet är materialet; utlösaren är ny.

*Beroende: R1 för krediter som insats.*

### R6 — Quizer mot uppvisade svaghet
Efter servicen, riktade mot de domäner som gick dåligt. Rätt svar behåller
krediten, fel svar förlorar den. M7a:s kockfrågor flyttar hit och får sin
kontext; M7c:s flerrollsfrågor likaså.

*Beroende: R1, och att utfallet i M3 kan peka ut domän.*

### R7 — Omgångsslingan
Kapital och saldo förs in i nästa omgång. Repot är i dag dagbaserat och
kontinuerligt; schemat är omgångsbaserat. Två olika tidsstrukturer som måste
förenas.

*Beroende: R1–R6. Sista pusselbiten och den som gör spelet till ett spel.*

---

## 5. Vad detta gör med öppna beslut

**ORDER 089 (medgången) omtolkas.** Rapporten mätte att servicen saknar positiv
återkoppling och lade fram val för att bygga in den. Men medgången i schemat är
krediten man räddar med action-knappen och kapitalet man bär vidare. Bygg inte
en parallell belöningsmekanik inuti servicen — bygg R1 och R5. Rapportens
mätdata står kvar och är värdefull; dess §§2–5 bör vänta.

**SD-003 (dockskåpet) pausas och revideras.** Presentationsbeslutet är riktigt
och förfaller inte. Men direktivet beskriver ett dockskåp; det behöver beskriva
minst två skepnader som delar renderare men inte planlösning — restaurangen i
genomskärning med rumsval, food trucken som en lucka i gatuplan. Kartan
fungerar för båda och visar kö och gata i stället för bord.

**M8 vidgas.** Genomspelningsgrinden gäller nu hela slingan, inte bara en
service. Frågan blir inte bara "förstår du vad som händer i rummet" utan
"håller varvet från paviljong till nästa satsning".

**Oförändrat:** M8-punchlistan rad 23, 24 och 25 står kvar. ORDER 090 §4:s
öppna frågor om `proud` utan avläsare och load-modellens kalibrering står kvar.

---

## 6. Föreslagen ordning

1. R1 kunskapskapital — allt annat väntar på den
2. R3 rapportgrind för answer-to-loan-mappningen — designfrågan, inte koden
3. R2 paviljongerna, med VS001 mergad
4. R3 bankmötet byggt
5. R4 verksamhetsklass och food truck
6. SD-003 reviderad, dockskåpet byggt för food trucken först
7. R5 action-knappen
8. R6 quizerna, M7a och M7c flyttade hit
9. R7 omgångsslingan
10. M8 mot hela slingan
