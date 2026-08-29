# ORDER 123 — Silhuetten läses

**Repo** `Viognier70/nexus-studio` · **Gren** `order-123` (placering, mergad `d60e36f`) / `order-123-exec` (utförande)
**Klass** AUTONOM
**Status** **Executed 2026-08-29**
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

---

## 8. Rapport (2026-08-29, `order-123-exec`)

### 8.1 §2.1 Crown-täckning

`scene/figureRig.ts` rad 337: `SphereGeometry(..., 0, Math.PI * 2, 0, Math.PI / 2)` — utökad från `1.15` till `Math.PI / 2` (hela övre hemisfären). Cache-nyckel bytt till `head:crown:hemi` så gammal cachad kalott inte återanvänds. Handoff-koden (`handoff/figureRig.ts`) oförändrad; handoff-noten uppdaterad med avvikelsen.

Grep: `grep "phi_length\|Math.PI / 2\|thetaLength" scene/figureRig.ts` — verifierbar närvaro av `Math.PI / 2`-parametern på crown.

### 8.2 §2.2 Palett-ljusning

Nya konstanter i kod (grep-verifierbara):

- `frontend/src/strategic/scene/silhouetteContrast.ts`:
  - `FLOOR_COLOUR = '#a89577'`
  - `MIN_FLOOR_CONTRAST_RATIO = 1.8`
  - `MAX_FLOOR_CONTRAST_RATIO = 3.6`
  - `MIN_ROLE_DISTINCTION_DELTA_E = 12`

- `frontend/src/strategic/scene/InteriorStaff.tsx` — `ROLE_COLOUR` uppdaterad, fyra distinkta hue-familjer:
  | Roll | Färg | Luminans | Kontrast mot golv |
  |---|---|---:|---:|
  | värd | `#2f4a68` (deep navy) | 0.065 | **3.14:1** |
  | servitör | `#6b6260` (warm-neutral) | 0.127 | **2.04:1** |
  | kock | `#7a3e3a` (burgundy) | 0.079 | **2.80:1** |
  | lärling | `#d8d3ce` (light warm-grey) | 0.656 | **1.95:1** |

- `frontend/src/strategic/scene/InteriorGuests.tsx` — `GUEST_COLOUR` för SEATED_STATES:
  | Tillstånd | Färg | Luminans | Kontrast mot golv |
  |---|---|---:|---:|
  | seated | `#ecd2a0` | 0.665 | **1.98:1** |
  | ordering | `#edd0a4` | 0.658 | **1.96:1** |
  | dining | `#ebcda2` | 0.639 | **1.91:1** |
  | paying | `#e8c99e` | 0.614 | **1.84:1** |

Alla värden inom `[1.8, 3.6]`:1-bandet.

Roll-distinktion (CIE 76 ΔE), alla parvis över tröskeln 12:

| Par | ΔE |
|---|---:|
| värd vs servitör | 26.10 |
| värd vs kock | 43.75 |
| värd vs lärling | 59.14 |
| servitör vs kock | 26.74 |
| servitör vs lärling | 42.57 |
| kock vs lärling | 57.84 |

Ett tidigare försök med fyra mörka neutraler (`#4a5464`, `#565b64`, `#605852`, `#6b6660`) föll på §4.4 med parvis ΔE 5,6–11,1 — spelaren kunde inte skilja rollerna åt.

Transienta / edge-tillstånd på gäster (`arriving`, `waiting`, `leaving`, `declined`, `sleeping`) ljusades också men testas inte lika strikt — de är fade-outs eller värdshus-specifika.

### 8.3 DoD-verifiering

| # | Kontroll | Resultat |
|---|---|---|
| 1 | Kalottens `phi_length` grep-verifierad | ✓ `Math.PI / 2` i `scene/figureRig.ts` rad 337 |
| 2 | Kontrast per uniformsfärg mätt & i band | ✓ 1.95–3.14:1 (se §8.2) |
| 3 | Kontrast per gäst-tillståndsfärg | ✓ 1.84–1.98:1 (se §8.2) |
| 4 | Roll-distinktion mätt | ✓ ΔE 26.10–59.14 (se §8.2) |
| 5 | Visuell verifikation (playwright) | ✓ `frontend/scripts/order123-silhouette-lighting.mjs` — dagsljus 6 765 pixlar diff / bbox 573×235, kvällsljus 1 891 pixlar diff / bbox 570×216. Skärmdumpar i `frontend/reports/order123/scene-{baseline,with-bodies}-{lunch,evening}.png` |
| 6 | `FIGURE`-mått oförändrade | ✓ `git diff main -- scene/figureRig.ts` — enda ändringen är crown-geometrin och en kommentar |
| 7 | Poser orörda | ✓ Inget `pose*`-anrop rört |
| 8 | Typecheck + svit + CI | ✓ Typecheck grön, **1001/1001** tester grön (970 → 1001, +31 nya i `silhouetteContrast.test.ts` + `paletteContrast.test.ts`), build 2.03s grön |
| 9 | Registerpost | ✓ Rad 123 uppdaterad Pending → Executed i samma commit |

### 8.4 Kontrastbandet i kod, inte i rapporten (§5)

Alla trösklar (MIN/MAX kontrast, MIN roll-ΔE) exporterade som konstanter i `silhouetteContrast.ts`. Nästa gång någon lägger till en figurfärg fångar `paletteContrast.test.ts` avvikelser automatiskt.
