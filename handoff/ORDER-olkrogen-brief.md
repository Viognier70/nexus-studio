# Brief till Claude Design — Ölkrogen med bryggeri

**Projekt** nexus-studio · strategiska spåret
**Lyder under** SD-004 (3D-scen, kroppar utan ansikten)
**Mottagare** Claude Code, via order som skrivs när leveransen finns

---

## 1. Vad som ska levereras

En verksamhetsklass som rum: **ölkrog med eget bryggeri i lokalen.**
Tjugo platser, litet kök med få rätter och rejäl mat.

Bryggeriet är uppgiften. Det ska synas — kar, tankar, ett produktionsrum som är
en del av gästupplevelsen och inte gömt bakom en vägg. En gäst som sitter i
lokalen ska se att ölen görs där.

---

## 2. Leveransformat

**Kod, inte bild.** Ren three.js i en självständig `.ts`-fil.

Repot förbjuder binära assets. En `.glb` eller exporterad modell går inte att ta
emot. Geometri av primitiver — box, cylinder, sphere — är hela verktygslådan,
och den räcker: byn, byggnaderna, torget och restaurangens inredning är redan
byggda så.

- Ren three.js, inga externa beroenden, ingen skinning, inga loaders.
- Byggs imperativt, en gång. Inget skapas i renderloopen.
- Ingen egen klocka. Om något rör sig drivs det av en fas anroparen skickar in.
- **Och en HTML-modell som går att vrida på**, så planlösningen kan avvisas
  innan koden byggs in.

---

## 3. Vad som finns att förhålla sig till

Restaurangen finns byggd som `Restaurant.tsx` — bordsskivor som boxar,
stolssitsar som cylindrar, väggar och sockel som boxar, entrédörr som plan.
Ölkrogen ska bo i samma värld och samma formspråk.

**Måtten är i meter**, samma som scenens världskoordinater. Figurerna i rummet
är 1,70 m höga med 0,46 m axelbredd (gäst) och 0,40 m (personal). Bord, bardisk
och passager ska stämma mot det — en människa ska kunna gå mellan borden.

**Kameran står högt och lutande.** Det som syns är ovansidor och silhuetter,
inte fasader. Det avgör vad som är värt att modellera: bordens ovansidor,
bryggkarens toppar, golvets zonindelning. En detaljerad undersida syns aldrig.

---

## 4. Rummets frågor

Tjugo platser är litet. Fördelningen mellan bord, bardisk och ståplats är en
designfråga, inte en given.

Var ligger bryggeriet i förhållande till matsalen? Bakom glas, i ett hörn, som
mittpunkt? Valet avgör hur rummet läses.

Köket är litet och har få rätter. Hur många stationer, och syns de?

Och: hur rör sig personalen? Vinbaren och restaurangen har servitörer mellan
bord. En ölkrog kan ha beställning vid disk, vilket ger ett annat flöde.

Svara med planlösningen, inte med frågor tillbaka. Om något inte går att avgöra
utan spelmekanik som inte finns — flagga det i stället för att uppfinna det.

---

## 5. Vad som ska följa med

- Namngivna platser för gäster (tjugo stycken), så att sim-lagret kan tilldela
  dem som `interiorLayout` gör i dag.
- Hemstationer för personalen.
- Entrépunkt och en väg ut, eftersom gäster anländer och lämnar.
- En kort not om vad som är fast geometri och vad som är tänkt att kunna ändras.

---

## 6. Vad som INTE ingår

Gäster och personal — de finns redan som `figureRig.ts` och monteras separat.
Ljussättning, himmel, väder — byggt. Vinbaren, gästgiveriet, nattklubben,
food trucken. Rekvisita och huvudbonader.

Ingen simuleringslogik. Rummet är geometri; vad som händer i det är sim-lagrets
sak.

---

## 7. Hur leveransen prövas

Rummet monteras i scenen och mäts i playwright: golvytan ska ha figurpixlar där
platserna är, och en figur ska kunna gå från entrén till varje plats.

Det kravet finns av ett skäl. En tidigare leverans passerade som utförd med en
platshållare som aldrig syntes.
