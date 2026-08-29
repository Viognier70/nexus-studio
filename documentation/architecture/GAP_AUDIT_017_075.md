# GAP AUDIT — ORDER 017 och 054–075

**Utfärdad under** ORDER 129 (2026-08-29)
**Följer** ORDER 118 audit, fynd A2 (21 nummerhål)
**Metod** Repo-grep i `frontend/` + `documentation/` + `CLAUDE.md`, `git log --all --grep`, `find` per nummer

---

## 1. Sammanfattning

| Läge | Antal | Nummer |
|---|---|---|
| **Utredd** (rad skriven med attestering, egen fil finns) | 0 | — |
| **Reference only** (arbete committat, inget orderdokument) | 16 | 054, 055, 056, 057, 058, 059, 063, 064, 066, 067, 068, 069, 070, 072, 074, 075 |
| **Vakant** (inget arbete gjordes) | 3 | 017, 062, 073 |
| **Fortsatt okänd** (spår finns men klassificeringen kan inte fastställas) | 2 | 065, 071 |

**Totalt: 21.** Inget nummer överhoppat, ingen rad gissad.

---

## 2. Mönstret

**Alla 16 Reference only-nummer är verbala ordrar som committades utan orderdokument.** Detta är samma mönster ORDER 118 kartlade för intervallet efter 102 — men här visas att det gäller *bakåt* också, från 054 och framåt.

Systemförklaringen: orderboken (`documentation/architecture/ORDER_XXX_*.md`) användes i praktiken bara för arkitektur- och designbeslut (043–052). Implementations-ordrar från 053 och framåt utfärdades muntligt av Vision Owner till agenten och committades direkt. Registerrader lades till efterhand när ORDER 118 och nu ORDER 129 granskade.

Detta är inte 16 enskilda hål utan en systematisk arbetsmönster som ORDER 118 identifierade och som denna audit bekräftar sträcker sig hela vägen tillbaka.

---

## 3. Utredning per nummer

### 017 — Vakant

Inget arbete gjordes. Registret noterar sedan tidigare "endast citerad indirekt via `017a`-varianten".

**Sökt:** `grep -rn "ORDER 017 " {frontend,documentation}` = 0 direkta träffar; endast `017a`-referenser i `APPROXIMATION_REGISTER.md` (väghierarki). `git log --all --grep="ORDER 017"` = 0 commits.

**Slutsats:** Sannolikt numrerades ordern 017a från början, och 017 är ett fantomhål i sekvensen. Alternativt hoppades numret över och 017a var det avsedda numret. Kan inte fastställas ur repot.

### 054 — Reference only

Skala/kamera/assetpolicy Del A. Verbalt utfärdad 2026-08-11 under ORDER 053-arbetet. Stängde sju öppna frågor från ORDER 053 (paviljonghöjd 4,5 m, `PlayerBusiness` 6,5 m-dekomposition, dörr-typologi, personalstängd till 1,70 m, registreringsbord-namngivning m.fl.). Refererad 43 gånger i repot.

**Attestering:**
- `documentation/architecture/ORDER_REGISTRY.md` — ORDER 053-radens body: `closed by ORDER 054 Del A on 2026-08-11`
- `documentation/architecture/skala-inventering.md:128` — `Stängda frågor (ORDER 054 Del A, 2026-08-11)`
- `CLAUDE.md` §Enhetskontrakt — personal 1,70 m-policy
- **Inget dedicerat commit-meddelande.** `git log --all --grep="ORDER 054"` = 0. Arbetet ligger under ORDER 053-commits.

### 055 — Reference only

Renderregler för `transparent`-opacity och `castShadow` — geometri med `transparent` opacity som kan nå 0 får aldrig ha statisk `castShadow`; skuggkartans depth-pass ignorerar alpha, så en fullt utfejdad mesh stämplar sin silhuett på marken. Toggla `mesh.castShadow` i samma `useFrame` som styr opacity, med samma tröskel som `depthWrite` (typiskt `opacity > 0.5`). Refererad 21 gånger.

**Attestering:**
- `CLAUDE.md` §Renderregler — hela stycket citerar `ORDER 055 Del A`
- `frontend/src/scene/PlayerBusiness.tsx`, `StrategicScene.tsx`, `FpsProbe.tsx`, `lighting/SunLightRig.tsx` — referenser i kod
- **Inget dedicerat commit-meddelande.** `git log --all --grep="ORDER 055"` = 0.

### 056 — Reference only

Parametrisk fasadgenerator, Del A–F: dev-only toggles (H-tangent för årstid), fasadschemat för svenska trähus, fasadbyggare, deterministiska parametrar från OSM-ID, instanserad rendering. Refererad 23 gånger.

**Attestering:**
- 18 filer i `frontend/src/` refererar `ORDER 056 Del X`
- `buildFacade.test.ts:1` — `ORDER 056 approval criteria`
- `documentation/architecture/skala-inventering.md` — referenser
- **Inget dedicerat commit-meddelande.** `git log --all --grep="ORDER 056"` = 0.

### 057 — Reference only

Del B: night lights (skyState, moon-hemi, lit-glass swap på ~60% flaggade hus). Del C: roof colours bump (tegel, plåt, tjärpapp), eave 0,60→0,40 m. Del D: rutigt tak-fix via per-face-normaler. Humanoid tolerensband **1,55–1,90 m** (§3 specificerad). Refererad 28 gånger.

**Attestering:**
- Commit `c32930d` — `ORDER 057 delvis + ORDER 058` (2026-08-12)
- `CLAUDE.md` §Enhetskontrakt — `ORDER 057 §3` (humanoid-tolerensbandet)
- `frontend/src/scene/ProceduralFacades.tsx:1`, `PlayerBusiness.tsx:151` — night lighting per `ORDER 057 Del B`

### 058 — Reference only

Fasadgeometri-invarianter — två buggar i samma commit som 057: (1) fönster-rotationsbugg (`atan2`-argument 90° fel), (2) nockspets-bisektorklamp (`MAX_BISECTOR_SCALE=2` för akuta hörn). Refererad 13 gånger.

**Attestering:**
- Commit `c32930d` — `ORDER 057 delvis + ORDER 058` (samma commit som 057)
- `buildFacade.test.ts:341` — `every window centre lies within 0.1 m — ORDER 058 §1`
- `buildFacade.test.ts:268` — `roof vertex escapes polygon by — ORDER 058 §2`

### 059 — Reference only

Wall-culling workaround (nödrättning) — DoubleSide-bandage för att gömma felaktig väggbindarvridning i 31/138 OSM-polygoner. `ensureCCW` normaliserar vridning vid entry; DoubleSide används temporärt tills ORDER 060 reparerar. Refererad 13 gånger.

**Attestering:**
- Commit `fdfb8e6` — `ORDER 059: walls invisible on 31 of 138 houses — polygon winding fix` (2026-08-12)
- `buildFacade.test.ts:391` — `CW-wound OSM polygon produces equivalent wall geometry — ORDER 059 §3`
- ORDER 060-radens body i registret: `removes ORDER 059 DoubleSide workaround`

### 062 — Vakant

Inget arbete gjordes.

**Sökt:** `grep -rn "ORDER 062" {frontend,documentation}` = 1 träff (`STRATEGIC_TRACK_MILESTONES_PROPOSAL.md:19` — `The ORDER 062-thread audit surfaced a gap`, refererar till en review-session, inte en exekverbar order). `git log --all --grep="ORDER 062"` = 0 commits.

**Slutsats:** Numret nämns endast i en planeringsnotat som inte materialiserades i kod eller egen order.

### 063 — Reference only

INFRA-1 + INFRA-2 scaffold — URL-hashparametrar (period, focus, distance, yaw, pitch, roi, poseId), sju canonical test-poser, headless simulation harness (5 Hz script + reactive scenario), Playwright runner-arkitektur. Refererad 9 gånger.

**Attestering:**
- Commit `b96d4a3` — `feat: ORDER 063 INFRA-2 + INFRA-1 scaffold` (2026-08-12)
- `frontend/src/testHarness/`, `frontend/src/simulation/__tests__/` — committerad kod

### 064 — Reference only

INFRA-1 Playwright runner — headless Chromium, 1280×720 viewport, per-pose stabilitetsväntan (`window.__nxHarness.ticks ≥ 2`), RGB-läsning. Dev-script `npm run test:visual`. Refererad 2 gånger.

**Attestering:**
- Commit `844319e` — `feat: ORDER 064 — INFRA-1 playwright runner + test:visual script` (2026-08-12)
- `frontend/scripts/visual-regression.mjs`, `frontend/src/testHarness/pixelSampler.ts`

### 065 — Fortsatt okänd

**Sökt:** `grep -rn "ORDER 065" {frontend,documentation}` = 1 träff endast (`ACES_MODEL_FINDINGS.md:95` — `(ORDER 061 opening, ORDER 065, ORDER 067)`, referenslista utan innehåll). `git log --all --grep="ORDER 065"` = 0 commits.

**Slutsats:** Numret citeras men innehållet är inte återvinnbart ur repot. Kan vara reserverat och aldrig utfärdat, eller utfärdat verbalt och committat under annat nummer (066 ligger tidsmässigt nära). **Klassificeras inte som Vakant** — spår finns i en beslutsdokumentation som listar det som en händelse.

### 066 — Reference only

Calibration quad — `MeshBasicMaterial` grå plan (R=G=B=128) i view-space, validering av ACES filmic tone mapper + sRGB-encode-pipeline, analytisk reproduktion av tre.js pipeline-steg. Refererad 7 gånger.

**Attestering:**
- Commit `300fba9` — `feat: ORDER 066 — calibration quad + analytic-vs-measured verified` (2026-08-12)
- `frontend/src/testHarness/CalibrationQuad.tsx`, `calibration.ts`

### 067 — Reference only

Calibration-quad threshold godkännande — intervall `{r,g,b: [158, 162]}`; toleransprincip (subpixel jitter + LSB-avrundning); runner-fix (fresh Playwright-sida per pose). Refererad 5 gånger.

**Attestering:**
- Commit `db95e0f` — `feat: ORDER 067 — calibration-quad threshold approved + fresh-page runner` (2026-08-12)
- `frontend/src/testHarness/visualPoses.ts` — ranges committade

### 068 — Reference only

Harness-kameraposering validering — `pitch` clamp enforcement (`pitch ≥ PITCH_MIN = 0,314`), silent-clamping → loud-errors, sex poser pitch flip från negativt till positivt, PNG per pose med ROI-rektangel ritad. Refererad 1 gång.

**Attestering:**
- Commit `384f8b2` — `fix: ORDER 068 — harness clamp + positive pitches + PNG per pose` (2026-08-12)
- `frontend/src/camera/CameraContext.tsx` + `visualPoses` mirror

### 069 — Reference only

ROI-korrigeringar + ACES-modell fynd — roof-tegel ROI minskad från 40×40 till 12×24, `village-strategic-lunch` borttagen, `lit-window` förflyttad. **ACES-fynd:** tone mapper exposure normalisering × (1/0,6) pre-RRTAndODTFit (ej dokumenterad), `MeshStandardMaterial` diffuse ÷ π Lambertian-BRDF. Refererad 3 gånger.

**Attestering:**
- Commit `d51d07a` — `fix+docs: ORDER 069 — ROI corrections + ACES model findings` (2026-08-12)
- `documentation/blueprints/ACES_MODEL_FINDINGS_ORDER_069.md` — ny doc

### 070 — Reference only

Sex visual-regression thresholds godkända + CI — calibration-quad [158,162], roof-tegel-lunch, roof-tegel-morning, village-strategic-dinner/evening, lit-window-dinner (samtliga ±3). **M0 DoD enforceable på CI.** `.github/workflows/ci.yml` tillagd (build + visual-regression jobs). Refererad 5 gånger.

**Attestering:**
- Commit `26f15cb` — `feat: ORDER 070 — six visual-regression thresholds landed + CI` (2026-08-12)
- `frontend/src/testHarness/visualPoses.ts`, `.github/workflows/ci.yml`

### 071 — Fortsatt okänd

Inline PixelSampleProbe-throttle-justering, från "every 8th frame" till "every 2nd". Ingen dedicerad commit, ingen egen körning identifierad.

**Sökt:** `grep -rn "ORDER 071" {frontend,documentation}` = 2 träffar (`PixelSampleProbe.tsx:32` som kod-not och `ACES_MODEL_FINDINGS.md` som referens). `git log --all --grep="ORDER 071"` = 0 commits.

**Slutsats:** Sannolikt en inline-justering som fick ordernummer i ett kommentarsfält men aldrig fick egen order-genomgång. Kan ha varit del av ORDER 072-arbetet. **Klassificeras inte som Vakant** eftersom kodändringen existerar; klassificeras inte heller som Reference only eftersom ingen commit-signatur pekar på egen körning.

### 072 — Reference only

Lit-window uniform ROI + variansmetrik — ROI förflyttad från (296, 362, 8×8) till (506, 409, 25×25) (100% enhetlig 625 pixlar båda plattformar), `expectUniform` boolean per pose, per-kanal varians publicerad, stabilitetsväntan 2→6 ticks. **Cross-platform fragility detection.** Refererad 8 gånger.

**Attestering:**
- Commit `5153a60` — `feat: ORDER 072 — lit-window uniform ROI + variance metric + doc` (2026-08-12)
- `frontend/src/testHarness/pixelSampler.ts`, `PixelSampleProbe.tsx`, `visualPoses` mirror

### 073 — Vakant

Inget arbete gjordes för detta nummer som separat order. Refererad i M3-dokumentation som datakläss-egenskap (idle-period ingredient/staff cost accrued).

**Sökt:** `grep -rn "ORDER 073" {frontend,documentation}` = träffar i typkommentarer i `reducer.ts`/`cashReading.ts` (dokumentation, inte order-exekverande). `git log --all --grep="ORDER 073"` = 0 commits.

**Slutsats:** Numret nämns i kommentarer men ingen exekverad ändring är signerad med det.

### 074 — Reference only

Service-close ledger-posting för collapse-vägen — bugfix: `collapse.fireCollapse` skippade `postServiceSummaryLines` → dag 2+ service-avslutning droppade revenue+ingredient ledger-rader. Fix: flytt av `postServiceSummaryLines` till `cashReading.ts` (circ-dep undvikelse), anrop före day-reset. M3-test tightened: reconciliation ≥55% → 0,98–1,02 + drift < 1500 SEK. Refererad 10 gånger.

**Attestering:**
- Commit `48a9d29` — `fix: ORDER 074 — collapse close now posts service summary ledger lines` (2026-08-12)
- `frontend/src/simulation/collapse.ts`, `cashReading.ts`

### 075 — Reference only

M3 drift baseline + M2 report gate — drift baseline tracking (3-day 1135 SEK), 7-day probe (non-linear sign-flip dag 5), M2 Activity Model Report öppnad med 6-activity-katalog (train-service, runner-shift, local-sourcing, wine-tasting, guest-chef, compost-audit). Refererad 22 gånger.

**Attestering:**
- Commit `1f16fc7` — `docs+test: ORDER 075 — drift baseline tracked + M2 report gate opened` (2026-08-13)
- `documentation/blueprints/ACES_MODEL_FINDINGS.md` (uppdatering), `M2_ACTIVITY_MODEL_REPORT_ORDER_075.md`

---

## 4. Vad denna audit INTE gör

Per ORDER 129 §4:

- **Ingen registerrad gissas.** 065 och 071 lämnas i "Fortsatt okänd" — inget innehåll skrivs som inte kan attesteras.
- **Ingen produktionskod rörd.** Att 054 aldrig fick en fil är ett fynd att redovisa, inte ett hål att fylla med en ny fil skriven i efterhand.
- **Ingen sortering ändras.** Registret är osorterat efter rad 045 (ORDER 118 fynd B1); det är en egen order.

---

## 5. Konsekvens

De 16 Reference only-numren har substans i repot och deras registerrader uppdateras i denna commit från "Gap — ej utredd" till "Reference only" med attestering. De 3 Vakant och 2 Fortsatt okänd står kvar som gap-rader med not om vad som söktes.

Efter denna audit finns inga oidentifierade nummerhål i intervallet 017 respektive 054–075. Framtida audit-arbete kan gälla intervall som ORDER 118 inte kartlade, men det ligger utanför denna orders scope.
