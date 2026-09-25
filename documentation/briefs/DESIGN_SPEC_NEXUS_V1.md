# Designspecifikation — Nexus version 1

**Till** Claude Design
**Från** Vision Owner
**Datum** 2026-09-25
**Styrande** `NEXUS_SPELDESIGN_V1.md` (speldesignen)

> Den här specifikationen beskriver allt visuellt som version 1 behöver:
> sex lokaler, fem paviljonger, figurernas animationer och spelets skärmar.
> Leveranserna kommer i åtta paket, i samma ordning som Claude Code bygger.

---

## 1. Grundregler

**Stil.** Fortsätt i den stil som redan finns i spelet: figurerna, riggen och
rummen från tidigare leveranser. Ingen ny stil. Spelet ses från strategisk
kamerahöjd in i lokalen, som SD-004 beskriver. Allt ska läsas tydligt från den
höjden.

**Läsbarhet före detalj.** Spelaren ska från kamerahöjden kunna se vem som
väntar, vem som är nöjd och var det går fel. En detalj som inte syns från
spelarens vy är inte värd arbetet.

**Inga siffertavlor.** Spelet visar resultat som händelser, repliker och
tidningstext. Skärmarna får ha medaljer, ikoner och korta meningar, men inga
stat-paneler med kolumner av tal.

**Språk.** All text i gränssnittet på svenska.

**Leveransformat.** Samma form som tidigare paket: en mapp per leverans med
`LEVERANSNOT.md` som listar varje fil, vad den är och var den hör hemma.
Varje lokal levereras med en planritning uppifrån med zoner och mått, så att
Claude Code kan placera stationer och platser utan att gissa.

**Kontroll före leverans.** Varje lokal ska visas från spelarens kamerahöjd
i minst en bild. Om en vägg eller ett grannhus skymmer interiören är det ett
fel i leveransen, inte något Claude Code ska lösa.

---

## 2. Lokalerna

Sex verksamhetsklasser. Varje klass är ett eget spel, och det ska synas: de
ska inte se ut som samma rum i olika storlek.

### 2.1 Vinbaren (paket 1)

Dagens byggda lokal görs om. Skylten säger redan VINBAREN.

| Del | Innehåll |
| --- | --- |
| Platser | 20: blandning av barstolar, småbord och två loungegrupper |
| Kök | Litet, två stationer: kallskänk och en varm station för smårätter |
| Bar | Central, med synlig vinvägg. Vinväggen växer när spelaren når platina i Stensöta |
| Särskilt | DJ-plats i ett hörn, dämpad varm belysning, levande ljus på borden |
| Känsla | Intim och lugn tidigt, fylld och livlig fredag och lördag |

### 2.2 Food truck (paket 2)

| Del | Innehåll |
| --- | --- |
| Platser | Ingen matsal. En lucka mot gatan och en kö på trottoaren |
| Kök | Inne i vagnen, en till två personer, en grill och en arbetsbänk |
| Särskilt | Vädret syns: sol, regn, blåst. Kön ska se olika lång ut vid olika tider. Några ståbord eller en bänk intill |
| Känsla | Snabb, gatunära, sommarkväll |
| Placering | Ska kunna stå på minst tre olika platser i Grythyttan |

### 2.3 Restaurangen (paket 3)

| Del | Innehåll |
| --- | --- |
| Platser | 60 i en matsal, plus en bar |
| Kök | Stort, med flera stationer och ett passerbord. Mise en place ska synas på morgonen |
| Särskilt | Tydlig väg mellan kök och matsal, så att spelaren ser servisens flöde |
| Känsla | Klassisk svensk restaurang, vita dukar, ljusare än vinbaren |

### 2.4 Ölkrogen (paket 4)

| Del | Innehåll |
| --- | --- |
| Platser | 20, långbord och bänkar |
| Kök | Litet, rejäl mat, få rätter |
| Särskilt | Ett bryggeri i lokalen: kopparkärl eller ståltankar synliga från gästytan. Bryggeriet är ett eget rum med egen personal |
| Känsla | Varm, högljudd, trä och mässing |

### 2.5 Gästgiveriet (paket 5)

| Del | Innehåll |
| --- | --- |
| Platser | 100 i matsal, plus rum för övernattning |
| Kök | Stort, flera stationer, egen frukoststation |
| Särskilt | Dygnet syns: frukost på morgonen, middag på kvällen, gäster som går upp till sina rum. Soignée servering med mycket personal |
| Känsla | Anrikt gästgiveri, historiskt, högtidligt |

### 2.6 Nattklubben (paket 6)

| Del | Innehåll |
| --- | --- |
| Platser | 150, mest stående. Ingen servering vid bord |
| Bar | Två eller tre barer |
| Särskilt | Dansgolv, entré med kö och vakt, belysning som skiftar under kvällen |
| Känsla | Sen kväll, mörkt med färgat ljus, trångt vid barerna |

---

## 3. Paviljongerna (paket 7)

Fem platser i Måltidens hus. Varje paviljong är en enkel scen, inte en full
interiör: ett rum i sin karaktär, och frågeställaren i förgrunden som ställer
frågan som en replik.

| Paviljong | Rum | Frågeställare |
| --- | --- | --- |
| Måltidsbiblioteket | Bokhyllor, läsbord, vinkartor på väggen | Bibliotekarien |
| Metodköket | Undervisningskök med stationer | Köksmästaren |
| Stensöta | Vinrum med glas och flaskor | Sommelieren |
| Kalastorget | Källare med långbord, fest eller möte | En gäst eller kollega, olika för varje situation |
| Gastronomiska Teatern | Scen med publik | Två av de andra frågeställarna tillsammans |

Varje paviljong behöver också en ingång på kartan, så att spelaren ser var den
ligger i Måltidens hus. Teatern visas låst tills den öppnas.

Frågeställarna behöver tre lägen: ställer frågan, reagerar på rätt svar,
reagerar på fel svar. Reaktionen på fel svar ska vara vänlig. Förklaringen är
det viktigaste i kunskapssystemet och ska inte kännas som ett straff.

---

## 4. Figurerna och animationerna

Animationerna byggs på den befintliga riggen. De ska läsas från kamerahöjd,
så tydliga kroppsrörelser är viktigare än ansiktsuttryck.

### 4.1 Gäster (alla lokaler)

Ankomma, vänta, sätta sig, läsa menyn, beställa, äta, dricka, skåla, prata,
betala, gå nöjd, gå missnöjd.

Tre tydliga lägen för väntan: lugn, otålig (tittar mot köket, trummar med
fingrarna) och på väg att gå (reser sig, tar jackan). Spelaren ska kunna se
från kamerahöjd vilken gäst som behöver hjälp nu.

### 4.2 Personal

Kock vid station, servitör som bär ut, bartender som häller, diskare,
sommelier som visar en flaska, vakt vid entré (nattklubben), bryggare
(ölkrogen), receptionist (gästgiveriet).

Varje roll behöver ett lugnt läge och ett stressat läge. Stressen ska synas i
tempot, inte bara i ansiktet.

### 4.3 Spelarens figur

Spelaren är en egen figur i lokalen, igenkännbar bland personalen. Hon behöver
animationer för action-knappens insatser: ta en beställning, bära ut en rätt,
lugna en gäst. En kort markering, till exempel en ring på golvet, visar att
insatsen pågår.

### 4.4 Särskilda animationer

| Klass | Animation |
| --- | --- |
| Food truck | Kö som växer och krymper, gäster som äter stående |
| Ölkrog | Bryggare vid kärlen |
| Gästgiveri | Gäster med väska som checkar in, frukostservering |
| Nattklubb | Dans, trängsel vid bar, kö utanför |
| Alla | Rekvisita till arketyperna: glas, portfölj, kamera, termos och sex huvudbonader, enligt tidigare brief |

---

## 5. Skärmarna

Skärmarna levereras som bilder av varje läge, med mått och typografi, så att
Claude Code kan bygga dem. Alla skärmar följer regeln om inga siffertavlor.

| Skärm | Innehåll | Paket |
| --- | --- | --- |
| Morgonens schema | Två platser att fylla (fyra på söndag), val av satsning eller paviljong, meny och inköp. Lagerprognosen som en mening | 1 |
| Action-knappen | Knapp under servicen, antal kvar av tre, valet av uppgift ur kön | 1 |
| Kvällsberättelsen | Det som gick bra först, sedan det som gick fel, med orsak | 1 |
| Quizen efter servicen | Tre frågor, möjlighet att hoppa över | 1 |
| Söndagstidningen | Lokaltidning i Grythyttan: recension, marknaden, bankens ord, nästa högtid | 1 |
| Bankmötet | Samtal med banken, diagnos i ord, vilken klass som erbjuds | 1 |
| Mentorn | Mentorn från Campus som guidar första dagen | 1 |
| Öva och prov | Frågeställaren, frågan, fyra alternativ, förklaringen efter svaret, resultatet av provet | 1 |
| Medaljerna | Brons, silver, guld, platina per paviljong. En medalj som just tagits ska få ett ögonblick som känns | 1 |
| Uppgradering | Val av ny klass vid veckoavräkningen, vad som följer med och vad som ändras | 2 |
| Portfolion | Mognadssteget överst, evidensrader under, grupperade per axel | 8 |
| Säsongsavslutet | Säsongens bästa ögonblick, portfolion, val att börja en ny säsong | 8 |

---

## 6. Leveransordning

| Paket | Innehåll | Behövs till Claude Codes etapp |
| --- | --- | --- |
| 1 | Vinbaren, skärmarna för en hel vecka, mentorn, gäst- och personalanimationer | 5 |
| 2 | Food trucken, uppgraderingsskärmen | 6 |
| 3 | Restaurangen | 7 |
| 4 | Ölkrogen med bryggeriet | 8 |
| 5 | Gästgiveriet | 9 |
| 6 | Nattklubben | 10 |
| 7 | De fem paviljongerna och deras frågeställare | 11 |
| 8 | Portfolion och säsongsavslutet | 12 |

Paket 1 är det viktigaste. Utan det kan första veckan bara spelas med
platshållare.
