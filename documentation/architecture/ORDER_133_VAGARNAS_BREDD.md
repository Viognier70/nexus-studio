# ORDER 133 — Vägarnas bredd

**Repo** `Viognier70/nexus-studio` · **Gren** `order-133` (från `main`)
**Klass** AUTONOM · **Utredning, ingen rättelse**
**Datum** 2026-08-30
**Följer** ORDER 130 §6, följdorderförslag (2)

---

## 1. Läget

ORDER 130 fann att **37 av 338 byggnader (10,9 %) skär minst en vägbana.**
Fördelningen är spridd över byn, inte samlad i ett kvarter — vilket pekar mot
data snarare än mot transformen.

Vägtyp: service 24, residential 12, living_street 7.

Och en sidoupptäckt som är den egentliga anledningen till ordern: **de fyra
värsta överlappen rör alla `living_street` med 12 meters bredd.** Normen för
living_street är 4–5 meter. Det värsta fallet, `vw-torget-east-barn`, ligger
3,48 m in i vägbanan.

Ett hus som ligger 3,5 meter in i en väg som är dubbelt så bred som den borde
vara kanske inte ligger i vägen alls.

---

## 2. Vad som ska fastställas

**2.1 Var kommer bredden ifrån?** Är 12 m en tagg i OSM-datan, ett värde i vår
preprocessing, eller ett standardvärde som slår in när taggen saknas? Visa
sökvägen och talet.

**2.2 Gäller det bara living_street?** Redovisa bredden per vägtyp — service,
residential, living_street, och övriga som finns. Jämför mot vad respektive typ
normalt har.

**2.3 Hur många av de 37 överlappen försvinner** om bredderna sätts till normen?
Räkna om med rimliga värden **i mätningen**, inte i koden. Det talet avgör om det
här är ett breddproblem eller ett placeringsproblem.

**2.4 Och de som blir kvar** — vad är de? Verkliga överlapp i OSM-datan,
eller något annat?

---

## 3. Ordern rättar inget

Ingen vägbredd ändras. Ingen byggnad flyttas. Ingen OSM-data redigeras.

Skälet: om bredden är fel är rättelsen en parameter, och om husen faktiskt ligger
fel är den något helt annat. Att gissa fel kostar mer än att mäta.

Och att ändra vägbredder påverkar vad kameran ser i hela byn — det är ett
designbeslut, inte en buggfix.

---

## 4. Definition of Done

1. §2.1 besvarad med sökväg och tal.
2. §2.2 — bredd per vägtyp, jämförd mot norm.
3. §2.3 — antal kvarvarande överlapp vid normerade bredder, räknat i mätningen.
4. §2.4 — de kvarvarande fallen listade individuellt.
5. Rapport i `documentation/blueprints/`.
6. Slutsats om vilken sorts fel det är — parameter, data eller placering — som
   hypotes, inte som fastställd diagnos.
7. `git diff main..HEAD -- frontend/src/` visar inget utöver mätskript.
8. Typecheck grön, hela sviten grön.
9. Registerpost i samma commit.

---

## 5. Om något inte går

Om bredderna visar sig komma från OSM-taggar som faktiskt säger 12 m, då är det
källdata som är fel och inte vi. Säg det rakt — och notera att det gäller frågan
om hur vi hanterar felaktig indata, vilket är ett större beslut än den här
ordern.
