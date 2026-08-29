# ORDER 123 — Silhuetten läses

**Repo** `Viognier70/nexus-studio` · **Gren** `order-123` (placering) / följdgren `order-123-exec` (utförande, från `main`)
**Klass** AUTONOM
**Datum** 2026-08-29
**Lyder under** SD-004 §3.3 med preciseringen 2026-08-29 (ORDER 122)
**Beroende** ORDER 122 committad (SD-004 §3.3-precisering, i main via merge-commit `ff012f8`)

> Nummer 123 verifierat mot `ORDER_REGISTRY.md` 2026-08-29: 100–122 populerade,
> 123 nästa lediga. Utförandet patchar crown-geometrin och paletten **lokalt i
> `frontend/src/strategic/scene/figureRig.ts`** — ingen ny Design-leverans
> (Vision Owner 2026-08-29). `handoff/figureRig.ts` bevaras oförändrad; scen-
> kopian avviker medvetet från handoff efter denna order.

---

## 1. Läget

ORDER 121 gav figurerna kroppar. I spelet läses de inte.

Kalotten som bär garment-färgen täcker `phi ∈ [0, 1.15]` rad — cirka 66° av
övre hemisfären. Resten av huvudet är hudton `#d8b48a`. Så snart kameran lutar
från lodrätt dominerar huden, och hjässan bär inte längre färgen.

Samtidigt ligger personalens uniformsfärger på `#2a2f3a` till `#4a4744` mot
golvets `#a89577`. Kroppen blir en svart silhuett med ett ljust huvud.

Verifierat i dev-servern 2026-08-29, dag 1 middag och dag 2 eftermiddag.

**Detta är inte ett fel i Designs leverans.** Briefen sa "hjässan bär färgen"
utan att ange hur stor del av huvudet som är hjässa. Implementationen följde
ordalydelsen.

---

## 2. Vad som byggs

**2.1 Kalottens täckning.** `phi_length` utökas så att hela övre hemisfären bär
garment- respektive uniformsfärgen. Skarven mot hudtonen ska ligga i eller under
huvudets horisontallinje, inte ovanför den.

**2.2 Paletten.** Personalens uniformsfärger ljusas så att de läses mot golvets
`#a89577`. Skillnaden mellan roller ska bevaras — värd, servitör, kock och
lärling ska fortfarande gå att skilja åt — men ingen får kollapsa i silhuett.

Gästernas garment-färger (`#c9c0a4` ned till `#6a6455` över tillstånden) ses
över med samma mått. Den ljusaste fungerar redan; `sleeping` och `declined`
ligger nära golvets ton och kan behöva justeras.

**2.3 Ingenting annat.** Riggens geometri, mått, poser och ledvinklar rörs inte.

---

## 3. Måtten är oförändrade

1,70 m total höjd, gäst 0,46 m axelbredd, personal 0,40 m. Kontrastproblemet
löses av färg, **inte av storlek**. En figur som gjorts större för att synas
bryter §5 i ORDER 121 och löser ändå inte problemet på håll.

---

## 4. Definition of Done

1. Grep visar att kalottens `phi_length` täcker minst hela övre hemisfären.
2. Uppmätt kontrast mellan varje uniformsfärg och golvets `#a89577`, redovisad
   som tal i rapporten. Ingen färg får ligga under det band ordern sätter i §5.
3. Samma mätning för gästernas fyra tillståndsfärger.
4. Rollerna går fortfarande att skilja åt — mätt avstånd mellan de fyra
   uniformsfärgerna redovisat.
5. **Visuell verifikation** som ORDER 120 DoD 7 och ORDER 121 DoD 8: playwright
   samplar figurpixlar mot golvpixlar i strategisk kamerahöjd, i både dagsljus
   och kvällsljus. Skärmdumpar checkade in.
6. Måtten i §3 oförändrade — `git diff` visar inga ändringar i `FIGURE`.
7. Poserna orörda — `git diff` visar inga ändringar i `pose*`-funktionerna.
8. Typecheck grön, hela sviten grön, båda CI-jobben gröna på PR:en.
9. Registerpost i samma commit.

---

## 5. Kontrastbandet

Ordern ska sätta ett mätbart band och skriva in det i koden som konstant, inte
som en siffra i en rapport. Nästa gång någon lägger till en färg ska bandet
kunna hävdas i test.

Vilket mått som används — luminansdifferens, ΔE, eller annat — avgörs av den som
bygger. Kravet är att det är mätbart och att det testas.

---

## 6. Avgränsningar

Rekvisita och huvudbonader rörs inte — de finns bara i SVG-sidovyn och porteras
i egen order.

Rummets ljussättning rörs inte. Problemet ska lösas i figurernas palett, inte
genom att lysa upp scenen.

`ui/foodtruck/` orörd. Sim-lagret orört.

---

## 7. Om något inte går

Om uniformsfärgerna inte kan ljusas tillräckligt utan att rollerna blir svåra
att skilja åt, är det ett fynd. Rapportera och stanna — lös det inte genom att
göra figurerna större eller genom att lägga till en kontur.
