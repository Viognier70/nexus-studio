# LJUDEN: hur de ska låta och kännas

Åtta ljud för Code att skapa. Varje ljud har en känsla, en beskrivning, ett recept som går att bygga med Web Audio, och regler för när det spelas. Skisserna går att höra i `prototyp/Raketkortet - pyramiden.html` under *Ljuden*. Beskrivningen här gäller före skisserna.

## Det som gäller alla

- **Rummet är en vinbar i en småstad, inte ett kasino.** Inga mynt som regnar, inga jackpottslingor, inga summrar, inga röster som säger *correct*.
- **Material före syntar.** Trä, glas, mässing, papper och porslin. Syntesen i receptet är en skiss av materialet.
- **Tonart:** C-dur. Våningarnas toner bildar ett C-durackord (C5, E5, G5). *Rätt* ligger i E-dur ovanpå, *fel* går ned en halvton.
- **Nivåer** i förhållande till rummets sorl (0 dB): gränssnittet −6 till −10 dB, rummets ljud −14 till −20 dB.
- **När raketkortet är öppet** dämpas sorlet 6 dB på 400 ms, och rummets ljud dämpas 4 dB. Det kommer tillbaka på 1,2 s när kameran går tillbaka till 24 m.
- **Variation:** ljud som upprepas (gäst in, skål, notan) får ±3 % tonhöjd och ±2 dB slumpvis, så att det aldrig låter som samma fil.
- **Aldrig två av samma sort inom 250 ms.** Flera gäster som kommer in samtidigt ger ett ljud.
- **Ljuden ersätter inte färgen, och färgen ersätter inte ljuden.** Både rätt och fel syns tydligt med ljudet av.

## 1. Rätt

**Känsla:** en nick från någon man respekterar. *Ja, så.* Varm, kort, uppåt.
**Låter som:** två trästavstoner (marimba) som går uppåt en stor ters, med en liten glimt i toppen som när ett glas fångar ljuset.
**Recept:** E5 (659 Hz) och sedan G♯5 (831 Hz) 70 ms senare. Triangelvåg, attack 5 ms, avklingning 350–420 ms. En oktav över den andra tonen i sinus på 25 % nivå. En glimt i sinus på 2 637 Hz, 120 ms, på 15 % nivå, 100 ms in.
**Längd:** 0,45 s. **Nivå:** −8 dB.
**Spelas:** när ett rätt svar låses, samtidigt som raden blir grön.

## 2. Fel

**Känsla:** en sked som tappas men fångas i luften. *Hoppsan.* Tydligt annorlunda än rätt, men aldrig straffande. Spelaren ska vilja läsa förklaringen, inte stänga av ljudet.
**Låter som:** två dova toner som går nedåt en halvton, som filtade hammare på ett piano, och en mjuk duns i trä under.
**Recept:** A3 (220 Hz) och sedan G♯3 (208 Hz) 120 ms senare. Triangelvåg genom lågpass på 800–900 Hz, avklingning 260–340 ms. Dunsen: sinus från 120 Hz ned till 78 Hz på 140 ms, avklingning 180 ms.
**Längd:** 0,4 s. **Nivå:** −9 dB.
**Spelas:** när ett fel svar låses, samtidigt som raden blir röd och skakar. **Undvik:** dissonanta kluster, fyrkantsvåg, allt över 2 kHz.

## 3. Våning

**Känsla:** något som faller på plats. Som att hälla upp ett glas och sätta ned flaskan.
**Låter som:** ett kort häll-ljud som stiger, och sedan en liten klocka. Varje våning har sin ton, så att pyramiden bygger ett ackord.
**Recept:** brus genom bandpass (Q 3) som sveper från 400 till 1 800 Hz på 520 ms. Klockan 420 ms in: sinus med delton på 2,76 × och 5,4 × grundtonen, avklingning 1,3 s. Grundton: episteme C5 (523 Hz), techne E5 (659 Hz), phronesis G5 (784 Hz).
**Längd:** 0,6 s plus klangen. **Nivå:** −10 dB.
**Spelas:** 900 ms efter ett rätt svar, när våningen är full.

## 4. Full pyramid

**Känsla:** en liten sal som klappar för en. Varmt och stolt, inte högt. Det här ska man minnas som kvällens bästa stund.
**Låter som:** de tre våningstonerna och oktaven över som en brutet ackord i klockor, med en varm matta av stråkar eller orgel under, och ett tunt skimmer i toppen.
**Recept:** klockor på C5, E5, G5 och C6 med 90 ms mellan. Mattan: tre sågtandsvågor på C4, E4 och G4 genom lågpass på 1,2 kHz, attack 400 ms, avklingning 1,8 s, på 12 % nivå. Skimret: brus genom högpass på 5 kHz, 0,9 s, mycket svagt.
**Längd:** 1,6 s. **Nivå:** −7 dB.
**Spelas:** 300 ms in i firandet, när pyramiden börjar bli guld. Ersätter *våning* för den sista våningen.

## 5. Gäst in

**Känsla:** dörren öppnas någonstans i rummet. Man hör det, men man vänder sig inte om.
**Låter som:** den lilla mässingsklockan ovanför vinbarens dörr och ett klick i låset.
**Recept:** klicket: brus genom högpass på 2 kHz, 20 ms. Klockan 30 ms senare: A6 (1 760 Hz) med deltoner som ovan, avklingning 1 s.
**Längd:** 1 s. **Nivå:** −18 dB. **Panorering** efter entréns läge i bilden, högst 60 %.
**Spelas:** när en grupp kliver in genom dörren, ett ljud per grupp. Högst ett var fjärde sekund.

## 6. Kassan

Två varianter.

**Notan betalas.** *Känsla:* ett kvitto som rivs av. Nästan inte där. *Recept:* brus genom bandpass på 3 kHz, 40 ms, och en träknack i sinus på 620 Hz, 70 ms. **Nivå:** −22 dB. **Spelas:** vid varje `pay`, aldrig vid dricks.

**Insatsen passeras.** *Känsla:* en handklocka på disken när kvällen har gått runt. En gång per kväll, och den ska kännas. *Recept:* en handklocka på E6 (1 319 Hz) två gånger med 200 ms mellan, avklingning 1,4 s, och en kassalåda som stängs: sinus från 92 till 70 Hz på 220 ms. **Nivå:** −9 dB. **Spelas:** när kvällskassan passerar linjen (serviceläget, beställning 1).

## 7. Skål

**Känsla:** två glas som möts över ett bord. Ljust och kort.
**Låter som:** två tunna vinglas, med en klang som svävar lite och dör ut.
**Recept:** en transient i brus genom högpass på 4 kHz, 10 ms. Glas 1: sinus på 2 400, 2 412 och 3 180 Hz, avklingning 1,2 s. Glas 2, 30 ms senare: 2 470, 2 481 och 3 290 Hz, avklingning 1 s. De små skillnaderna mellan deltonerna ger svävningen.
**Längd:** 1,2 s. **Nivå:** −16 dB, −20 dB vid 24 m.
**Spelas:** vid `clink` i `guest.toast`. Vid långbordet i ankomsten får det ligga högre, −12 dB.

## 8. Rummets sorl

**Känsla:** en sal med folk som trivs. Man hör att det pratas, men inte vad. Det andas med kvällen och är aldrig tyst i en full sal.
**Låter som:** mumlet av många röster, några skratt, bestick mot porslin långt bort, och ingen musik (DJ:n är ett eget spår).
**Recept:** en bädd av rosa brus genom bandpass på 700 Hz (Q 0,7) och lågpass på 3 kHz, med nivån modulerad av en långsam svängning på 0,2–0,4 Hz. Ovanpå ligger röstkorn: brus genom smala bandpassfilter mellan 450 och 950 Hz, 150–400 ms långa, var 150–500 ms. I spelet ska kornen vara riktiga inspelningar av sorl utan ord, gärna på svenska, klippta i korta bitar.
**Täthet** följer antalet gäster: 0 gäster ger tystnad och rummets ton, 10 gäster ger glesa korn, 40 eller fler ger full bädd. Ett skratt var 8–20 s när rummet är mer än halvfullt.
**Avstånd:** vid 24 m är lågpasset på 3 kHz och nivån −6 dB. Vid 12 m höjs lågpasset till 6 kHz, och kornen närmast kameran hörs tydligare.
**Längd:** slinga. **Nivå:** 0 dB, referensen för allt annat.
