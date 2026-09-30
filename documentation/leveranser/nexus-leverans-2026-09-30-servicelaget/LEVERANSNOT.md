# LEVERANSNOT: serviceläget

**Beställning** 1 av 3 efter provspelet 2026-09-30
**Datum** 2026-09-30
**Till** Claude Code
**Från** Claude Design
**Gäller** Ett läge under servicen där bara klockan och kvällskassan syns, hur de hopfällda panelerna öppnas, och skärmen efter servicen med täckningsbidrag, täckningsgrad och överföringen till företagskontot.

Leverans 3 (händelserna) är inte nästan klar: manusen är godkända, men inget är ritat. Därför kommer den här beställningen före ritandet.

---

## 1. Innehåll

| Fil | Vart | Vad |
|---|---|---|
| `serviceModeStrings.ts` | slås in i `STRINGS` i `nexusStrings.ts` | 67 nycklar, `{ sv, en }`. Återanvänder `hud.*`, `money.*`, `meter.*` och `buy.item.*` ur leverans 1. |
| `prototyp/Servicelaget - prototyp.html` | läses, monteras inte | Fem skärmar i båda storlekarna, SV/EN. Flikarna, kvällskassan och överföringen går att trycka på. Tangenterna 1–3 och Esc styr skärm 1. Tweaken *evening* växlar mellan vinst och förlust på skärm 5. Fristående, men ikonerna hämtas från unpkg (lucide 0.460.0) som i leverans 1. |
| `skarmar/1440x900/1–6-*.png`, `skarmar/1280x720/1–6-*.png` | — | Kontrollbilder i helskärm. 6 är skärm 5 efter överföringen. |

Rummet bakom är renderingen från spelarens kamerahöjd, 24 m, med servicens gradering (`WARM.roomGrade.service`).

## 2. Serviceläget

**Bara två saker syns:** klockan och kvällskassan, i en rad överst i mitten. Allt annat är hopfällt.

**Kvällskassan** är en stapel som fylls när en nota betalas (`pay` i `serviceTick`). Den fylls inte av beställningar och aldrig av dricks.

- **Linjen** är kvällens insats: råvaror + personal + DJ + kompetens. Den står på 1 / 1,3 av stapelns längd, så att det syns hur långt över man kommer. Går kassan över 1,3 × insatsen står stapeln full.
- **Under linjen** är fyllningen ljuslåga (`color.candle`). Texten till höger säger `serviceMode.toGo`.
- **Över linjen** blir hela fyllningen guld med `shadow.glowCleared`, och texten byter till `serviceMode.over`. Det sker en gång per kväll, med ljudet *kassan* (se beställning 4). Klockslaget sparas för skärmen efter servicen (`serviceMode.passedAt`).
- **Ett tryck på kassan** fäller ut insatsen på papper under den: fyra rader och summan, som är linjen.

**Varifrån insatsen kommer (sim-lagret):**

| Rad | Källa |
|---|---|
| Råvaror | morgonens inköp, `Σ qty × cost` ur `MenuItem` |
| Personal | kvällens pass i `balance.ts`, antal i tjänst som `{n}` |
| DJ | bara de kvällar DJ:n spelar. Annars utgår raden. |
| Kompetens | kvällens andel av kurserna i Måltidens hus. Utgår om den är 0. |

Sopbilens avgift ingår inte i insatsen. Den dras som förut på sopbilens skärm.

## 3. Panelerna

**Hopfällda** ligger de som tre runda flikar nere till vänster, med 82 % opacitet: Lagret (`package`), Kvällen (`scroll-text`) och Rummet (`users`). Rummet har gästernas och personalens mätare. Kassans mätare utgår, eftersom kvällskassan ersätter den.

**En prick** i ljuslåga på fliken betyder att något nytt har hänt där: en vara börjar ta slut eller en ny rad i strömmen. Pricken släcks när panelen öppnas.

**Öppna:** tryck på fliken eller på tangenterna 1–3. Fliken växer till en guldpill med sin etikett (200 ms), och panelen reser sig ur den (220 ms, `cubic-bezier(.2,.8,.2,1)`, från 96 % skala och 2 vh ned). Hovring visar etiketten utan att öppna.

**Stänga:** krysset, Esc, samma flik igen, ett klick i rummet, eller av sig själv när en raket börjar. Bara en panel är öppen åt gången.

**Under en raket** fälls allt ihop, och raketkortet tar högra sidan som förut. Klockan och kvällskassan ligger kvar.

## 4. Efter servicen

**Pappret till vänster räknar uppifrån:**

1. Försäljning, med antal notor. Dricksen går till personalen och syns inte här.
2. − Råvaror: allt som köptes i morse, också det som blev över.
3. **Täckningsbidrag** = försäljning − råvaror.
4. **Täckningsgrad** = täckningsbidrag / försäljning, med en decimal. Raden under säger hur många kronor av varje hundralapp som blev kvar.
5. − Personal, DJ och kompetens.
6. **Kvällens resultat** = försäljning − insatsen.

**Panelen till höger är överföringen.** Stapeln visar kvällen en sista gång, med när linjen passerades. Knappen flyttar hela kvällskassan till företagskontot. Personal, DJ och kompetens dras därifrån i samma steg. Råvarorna betalades från kontot i morse. Kontot står då på morgonens belopp plus resultatet, och `settle.vsMorning` visar skillnaden. Efter överföringen byter knappen till *Till kvällens resultat*.

**Förlust:** överföringen går till på samma sätt, men kontot hamnar lägre än i morse. Inget blir rött. Förlusten visas som en minusrad och `settle.loss.note`.

**Siffrorna i prototypen är platshållare, men de går ihop:** insatsen 11 458 + 14 400 + 3 500 + 1 200 = 30 558. Försäljning 38 460 − 11 458 = 27 002 i täckningsbidrag, 70,2 %. Resultatet 27 002 − 19 100 = 7 902. Kontot 108 542 + 38 460 − 19 100 = 127 902, alltså 120 000 i morse + 7 902.

## 5. Behövs från sim-lagret

- `stake`: insatsens fyra delar när servicen börjar.
- Summan av `pay` hittills och klockslaget när den passerar `stake`.
- Antal notor, och företagskontot före och efter.
- En ny-flagga per panel (lagret, strömmen, rummet) så att pricken kan tändas.
