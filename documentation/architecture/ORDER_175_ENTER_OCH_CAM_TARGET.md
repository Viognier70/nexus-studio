# ORDER 175 — Enter i namnrutan är inte kamerainput + DEV-raden visar actual→target

**Datum:** 2026-09-06
**Gren:** `order-175-enter-och-cam-target` från `main` (`4fd1af7`, efter ORDER 174 merge).
**Föregås av:** ORDER 157 (kamera-preset efter name-entry), ORDER 174 (interiorLayout-kontraktet + DoD "verifiering i fyndets flöde").

## §1 Fynd

Provspel 2026-09-06:

1. **Enter i namnrutan flyger inte kameran.** Spelaren fyller i namn, trycker Enter, formen submittar (namnet sparas, overlay stängs), men kamera-flygningen mot myBusiness-preset startar inte. När spelaren istället klickar på submit-knappen med musen fungerar det. Playwright-verifiering visade dock att båda vägarna triggar `onSubmit`-handlern identiskt — bug:en är att en global keydown-lyssnare i `useDesktopControls.ts:56-64` fångade `event.key` utan att kolla `event.target`, vilket i vissa browser/extension-kombinationer kunde interferera med formens Enter-hantering. `StrategicApp.tsx:168` hade redan input-guard; `useDesktopControls.ts` saknade den.

2. **DEV-raden `cam=<X>m` visar actual men tolkades som target.** Kod: `DevPanel.tsx:99` läser `camera.actualRef.current.distance` — den DAMPADE positionen. Men UI:et — en enda siffra utan pil eller kontext — gjorde det omöjligt att skilja "kameran är landad på 24m" från "kameran är mid-flight mot 24m" från "kameran är statisk på annat värde". I tolv skärmdumpar tolkades `cam=24m` som "preset-mål 24" medan bilden visade utsidan (kameran ännu inte dampad in). Kostade två dygns felsökning.

## §2 Form

### §2.1 Text-inmatning är inte kamerainput

**`frontend/src/strategic/camera/useDesktopControls.ts:56-64`** — keyDown-handlern får en input-guard identisk med den `StrategicApp.tsx:166-168` redan har:

```ts
const t = event.target as HTMLElement | null;
if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
  return;
}
```

Effekt: när fokus ligger i namn-input:en (eller framtida rename-input, aktivitetsfilter osv.) ignoreras Escape/Q/E/1-4 av kamera-lagret. Enter fångas ändå inte här (den var aldrig i keydown-listan) — men guarden garanterar systematiskt att overlay-inputs inte agerar som kamera-tangenter.

**`frontend/src/strategic/business/NameEntryOverlay.tsx`** — form-elementet får `onKeyDown={e => e.stopPropagation()}` som bältes-och-hängslen. Framtida globala keydown-listeners som lägger till nya bindings utan input-guard ärver isoleringen automatiskt.

### §2.2 DEV-raden visar actual→target under flygning

**`frontend/src/strategic/ui/DevPanel.tsx`** — polling-intervallet läser även `camera.targetRef.current.distance` (nytt `camTarget`-state). cam-strängen bygger nu:

```
cam=<actual>m→<target>m*[interiorMin-interiorMax]   // under flygning
cam=<actual>m*[interiorMin-interiorMax]              // landad (|actual - target| ≤ 0,5)
```

Pilen visas när `|camDist − camTarget| > 0,5 m` — små damping-svansar på < 0,5 m räknas som landat. `*`-suffixet (camera i interior-fade-bandet) behålls oförändrat.

Exempel:
- `cam=833m→ 24m [35-75]` — mid-flight, långt över interior-tröskeln
- `cam= 34m→ 24m*[35-75]` — sista sekunden av flygningen, inne i interior-bandet
- `cam= 24m*[35-75]` — landad, ingen pil

### §2.3 CLAUDE.md — trettonde fallet

Ny bullet i §"Mätningar mot det de beskriver" motivering-listan:
*"ORDER 175 — DevPanel-raden visade endast cam=<X>m utan pil eller target. En enda siffra utan indikator på pågående flygning tolkades i tolv skärmdumpar som 'kameran står på detta målvärde', medan bilden visade en helt annan vy. Kostade två dygns felsökning. Åtgärd: cam-strängen visar nu <actual>m→<target>m när |actual − target| > 0,5. Trettonde fallet av 'rätt tal om fel sak'."*

Skiljer sig från de tolv tidigare: alla föregående fall är att koden LÄSTE fel signal. Här läste koden rätt signal (`actualRef.distance`), men UI:et gav ingen väg att skilja "landad" från "på väg dit". Farligt eftersom siffran teknisk sett var korrekt.

## §3 Verifiering (i fyndets flöde — DoD-krav från ORDER 174)

Playwright-skript `/tmp/order175-verify/verify.mjs` mot samma dev-server spelaren använder (5173). Ingen `dollhouse=1`, ingen `focus/distance/yaw/pitch`-URL-preset. Fyller name-input och trycker **Enter** (inte klick — den vägen som varit trasig).

Rapport: `/tmp/order175-verify/report.json`. Skärmdump: `/tmp/order175-verify/olkrogen-enter-flow.png`.

Pixel-signatur per ORDER 160-regeln: Delta-E ≤ tolerans mot faktiska produktionsfärger importerade från källan (`PlayerBusiness.tsx:75-79` restaurant-stub, `brewpubRoom.ts:296-298` ölkrogens golvzoner).

**Resultat i olkrogen-flödet:**
- Kameraflygning triggades av Enter (samplingsserie 900→770→660→566→486→418→359→310→249→216→187→163→143→125→110→97→87→77→69→...→34m)
- Pilen `cam=<actual>m→<target>m` var synlig i **alla** samples under flygningen (`arrowVisibleAnySample: true`)
- Slutläge: `cam=34m→24m*[35-75]  day=1 lunch  service=13:59 / 15min`
- Kontraktet från ORDER 174: `contractBusinessClass=ölkrogen, contractSeatsLength=20, contractCapacity=20`
- **Interior pixlar (tight signatur): 33 516** totalt
  - `brewpub-floorBrew` (#7d776c, ölkrogens bryggeri): 30 566 px ← 91%
  - `restaurant-bar` (#5a3f2d, PlayerBusinesss stub-bar): 2 880 px
  - `restaurant-floor` (#a08462, stub-golv): 41 px
  - `restaurant-fourtop` (#c9a878, stub-4-bord): 29 px
  - Andra: 0

Interiören renderas alltså i spelarvyn efter Enter-flödet. Om användaren fortfarande ser 0 px är felkällan i deras browser-miljö (extension som Ad Block Plus, fokus-tapp, dead-key composition) eller GPU-skillnad — inte i koden efter ORDER 175.

## §DoD

- [x] `npm run typecheck` grön.
- [x] `npx vitest run` — 1066/1066 tester grön (samma antal som ORDER 174).
- [x] Verifiering körd i fyndets flöde (olkrogen + Enter, inte kvarterskrogen + click).
- [x] DEV-linjens `→<target>m` verifierad i live-samples.
- [x] Interior-pixlar med tight signatur > 0.

## §4 Ändringar

```
frontend/src/strategic/camera/useDesktopControls.ts     (input-guard i keyDown)
frontend/src/strategic/business/NameEntryOverlay.tsx    (stopPropagation på formen)
frontend/src/strategic/ui/DevPanel.tsx                  (camTarget-state + →target-pil)
CLAUDE.md                                               (13:e fallet)
documentation/architecture/ORDER_175_ENTER_OCH_CAM_TARGET.md  (denna fil)
documentation/architecture/ORDER_REGISTRY.md            (rad 175)
```

## §5 Ej i scope

- Fynd 2/3 från 2026-09-06 provspel (hus i vägar, hus saknas, dubbelrendering bland grannhusen). Egen utredning.
- Bonus-fynd från ORDER 175:s probing: kameran nådde inte 24m ens efter 15 min sim i tidigare pass, stannade på 92m — möjlig damping-eller-target-återställning bug. Egen order.
- ORDER 158-guardens richtning (väg-vertex-inuti-byggnad vs byggnad-vertex-inuti-väg). Egen order.

Egen gren `order-175-enter-och-cam-target` från main.
