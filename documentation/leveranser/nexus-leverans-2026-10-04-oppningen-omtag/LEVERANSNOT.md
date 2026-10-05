# LEVERANSNOT: öppningen, omtag (D2)

**Datum** 2026-10-04
**Till** Claude Code, via dig
**Från** Claude Design
**Gäller** D2 efter provspelet 2026-10-04: *"Fungerar, men inte helt tydligt."* Ersätter `oppningManus.js` och `openingStrings.ts` från `nexus-leverans-2026-10-03-oppningen`. Bilderna, tiderna, kameran och de 10 kontrollbilderna utan text gäller som förut.

---

## 1. Vad som var otydligt, och vad jag ändrat

Min läsning av provspelet: bilderna fungerar, men spelaren får inte veta **var** hon är, **vems** krogen är, **vad** hon ska göra eller **vem** kvinnan i dörren är. Förut sades bara säsongen, och bara under de första 11 s. Nu får varje bild en rad eller en nål som svarar på en fråga i tur och ordning:

| Tid | Bild | Fråga | Text (`sv` / `en`) | Form |
|---|---|---|---|---|
| 1,8–11,6 s | Flygturen | Var? | **Grythyttan** | liten rubrik i versaler ovanför rad 1, mässing |
| 2,6–11,6 s | Flygturen | När? | *En säsong. Åtta veckor.* / *Från midsommar till kräftskiva.* | som förut |
| 12,9–16,0 s | Ned till vinbaren | Vems? | **Din vinbar** / *Your wine bar* | nål på taket |
| 18,4–23,0 s | Den tomma vinbaren | Vad? | **Än så länge är den tom.** / *For now, it is empty.* | rad |
| 24,0–33,0 s | Glimtarna | Hur? | **Det du vet fyller den.** / *What you know fills it.* | rad, står kvar genom de hårda klippen |
| 34,0–37,2 s | Ingrid i dörren | Vem? | **Ingrid, din mentor** / *Ingrid, your mentor* | nål över henne |
| 37,0–40,0 s | Upp över byn | Varför? | **Målet är stjärnan.** / *The goal is the star.* | rad, tonas ut innan svärtan är hel |

- *Det du vet fyller den* binder öppningen till spelets kärna och till följderna i D5: kunskapen avgör kvällen.
- Bara en rad åt gången, alltid nere till vänster (7 % in, 15 % upp), där rad 1 stod. Raderna är Young Serif i 4,2 % av höjden.
- **Nålarna** har samma form som hovmästarens nålar, men utan handgrepp: en ring i ljuslåga på platsen, en stjälk uppåt (9 % av höjden på taket, 7 % över Ingrid) och namnet överst. De följer kameran (`S.project`) och ritas över bilden. Taknålen tonas ut vid 16 s, innan taket lyfts.
- Inga speltal, ingen text i bilden. Alla rader är nycklar.

## 2. Innehåll

| Fil | Vad |
|---|---|
| `oppningManus.js` | Nytt: `TEXT[2]` (platsen), `CAPTIONS` (tre rader), `PINS` (två nålar med ankarhöjd i meter) och `PIN_STYLE`. Resten som förut. |
| `openingStrings.ts` | 35 nycklar. Nya: `opening.place`, `.yours`, `.empty`, `.fill`, `.mentor`, `.goal`. |
| `prototyp/Oppningen.html` | Hela öppningen med tidslinjen. *Texten: dold* döljer också nålarna. |
| `skarmar/1440x900/`, `skarmar/1280x720/` | 6 skärmar med text i varje storlek: `oppning-texten`, `-nalen-din-vinbar`, `-raden-tom`, `-raden-det-du-vet`, `-nalen-ingrid`, `-raden-stjarnan`. |

## 3. Till spelet

- Nålen över vår krog ankras i `sim.PV.obb.centre` på 7 m, och Ingrids nål i dörrens punkt på 2,8 m. Om nålen hamnar utanför bilden (z > 1) ritas den inte.
- *Hoppa över* som förut, efter 3 s.

## 4. Att se över

- **Raderna** är mina förslag. Byt gärna *Målet är stjärnan* om stjärnan ska förbli en överraskning till första morgonen.
- **Rad 2** (*Från midsommar till kräftskiva*) är fortfarande mitt förslag från förra leveransen.
- Om provspelets *"inte helt tydligt"* gällde något annat, till exempel de hårda klippen i glimtarna eller tempot, säg till. Tiderna är oförändrade.
