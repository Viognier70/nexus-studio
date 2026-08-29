# ORDER 130 — Kartan mäts

**Repo** `Viognier70/nexus-studio` · **Gren** `order-130` (från `main`)
**Klass** AUTONOM · **Utredning, ingen rättelse**
**Datum** 2026-08-29

---

## 1. Läget

Observerat i dev-servern 2026-08-29 av Vision Owner: **hus ligger mitt i vägar,
och fönster hänger fritt i luften utanför fasader.**

Ingetdera finns i registret eller bland öppna fynd. Byn är byggd ur OSM-data i
`OsmBuildings`, `OsmRoads` och närliggande filer, med fasadgenerering ovanpå.

Felet kan ligga i tre skilda lager, och de kräver olika åtgärd:

- **Källdata.** OSM-footprints och vägar överlappar redan i indata.
- **Transformen.** Projektion eller koordinatkonvertering flyttar det ena
  relativt det andra.
- **Genereringen.** Fönster placeras utan att kontrollera mot väggens verkliga
  utsträckning.

---

## 2. Ordern mäter, den rättar inte

Detta är en utredning. **Ingen geometri ändras.**

Skälet: rättelsen ser olika ut i de tre fallen. Att flytta ett hus när felet
ligger i transformen förskjuter bara problemet, och att klippa fönster mot
väggen döljer en projektionsbugg.

En rättelse kräver dessutom ögon på resultatet, och den görs bevakad.

---

## 3. Vad som ska mätas

**3.1 Hus mot vägar.** Räkna byggnadsfootprints som skär vägars mittlinje med
vägbredden inräknad. Redovisa antal, och vilka — med id eller koordinat.

Är det en handfull eller hundratals? Ligger de samlade i ett kvarter eller
spridda över hela byn? Det avgör om det är dataproblem eller systematiskt.

**3.2 Fönster utanför fasad.** För varje genererat fönster, pröva om det ligger
inom väggens plan och utsträckning. Redovisa antal utanför, och hur långt
utanför — millimeter eller meter.

Ett fönster som ligger 2 cm utanför är ett avrundningsfel. Ett som ligger 3 m
utanför är något annat.

**3.3 Mönstret.** Är felen kopplade till något gemensamt — byggnadstyp, storlek,
rotation, avstånd från origo? Fel som växer med avståndet från origo pekar mot
transformen; fel som följer byggnadstyp pekar mot genereringen.

---

## 4. Skärmdumpar

Playwright, tre vyer: en översikt över byn, och två närbilder på de värsta
fallen ur §3.1 och §3.2.

Bilderna är för att jag ska kunna se det du mätt. Checkas in i
`frontend/reports/`.

---

## 5. Vad ordern INTE gör

Ingen geometri flyttas. Inga fönster tas bort. Ingen OSM-data redigeras. Ingen
transform ändras.

Sim-lagret, figurriggen, rummen och paletten är orörda i sin helhet.

Inga tester ändras — men mätskriptet checkas in så att samma mätning går att
köra om efter en framtida rättelse.

---

## 6. Definition of Done

1. §3.1 mätt: antal och identitet för hus som skär vägar.
2. §3.2 mätt: antal fönster utanför fasad, med avstånd.
3. §3.3 prövad: finns ett mönster, och vilket lager pekar det mot.
4. Tre skärmdumpar enligt §4.
5. Mätskriptet incheckat och körbart.
6. Rapport i `documentation/blueprints/` med de tre mätningarna och en slutsats
   om vilket av de tre lagren som är mest sannolik orsak — som hypotes, inte som
   fastställd diagnos.
7. `git diff main..HEAD` visar ingen ändrad geometri eller transform.
8. Typecheck grön, hela sviten grön.
9. Registerpost i samma commit.

---

## 7. Om något inte går

Om felen visar sig ligga i OSM-källdatan är rättelsen inte vår — då handlar det
om hur vi hanterar felaktig indata, vilket är ett designbeslut och inte en bugg.
Säg det rakt i så fall.

Och om mätningen visar att problemet är mycket större än de enstaka fall Vision
Owner såg — att halva byn har överlappande geometri — rapportera det först av
allt.
