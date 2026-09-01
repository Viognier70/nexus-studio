# ORDER 162 — Ytterväggen mot marken (PlayerBusiness saknar den grannarna har)

**Repo** `Viognier70/nexus-studio` · **Gren** `order-162` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-31
**Följer** ORDER 161-fyndet 2026-08-31 — sockeln syns verifierat inte
från myBusiness-preset, alltså är ORDER 159:s "svävande låda"-fix
inte det som var fel.

---

## 1. Läget

Provspelet 2026-08-31 visade PlayerBusiness som en svävande låda utan
fasad mot marken. ORDER 159 portade `BuildingPlinth` till PlayerBusiness
i tron att den saknade sockeln var orsaken.

ORDER 161 verifierade sedan att plinthen inte syns från spelarens
landningsvinkel (myBusiness-preset). Talet står i
`frontend/reports/order161/plinthInPlayerView.json` — kopplingen
mellan plinth-opacity och wallOpacity i ORDER 159 §DoD 2 gör att
plinthen fejdar med väggen i dollhouse-läget (dist 24 m, under
roof-fade-bandet). Sockeln finns i scenen men syns inte i den vy
där felet observerades.

Slutsatsen: **den mörka lådan i provspelet har annan orsak än
saknad sockel.** Grannarna via `OsmBuildings` möter marken med
en yttervägg som PlayerBusiness inte har (eller inte renderar
på samma sätt). Fixen är att förstå den skillnaden och kopiera
över den, inte att lägga fler lager på plinth-strategin.

---

## 2. Vad som ska utredas innan något byggs

Denna order är en **utredningsorder** (inte implementationsorder).
Innan fixen skrivs ska följande frågor besvaras — svaren skrivs
till `reports/order162/wallSurfaceAudit.json` per ORDER 160/161-
reglerna.

**§2.1 Vad ritar grannarna vid ground-Y som PlayerBusiness inte
ritar?** `OsmBuildings.tsx:445` använder `ExtrudeGeometry(shape,
{depth: h, bevelEnabled: false, steps: 1})` som producerar en
solid extrusion MED bottom-cap OCH sido-quads. `PlayerBusiness.tsx`
använder `sideWallGeometry(poly, WALL_HEIGHT_M)` som EXPLICIT
utelämnar top+bottom-cap (`PlayerBusiness.tsx:101-108`
kommentar-motivering: ExtrudeGeometry-cap ger 50%-alpha-tint när
väggen fejdar). Utredningen ska bekräfta:

1. Har grannarna en bottom-cap på ground-Y? Läs geometrin via
   dev-hook som räknar `mesh.geometry.attributes.position` per
   Y-koordinat på ett OsmBuilding och rapporterar antal vertices
   vid y=0 kontra y=h.
2. Har PlayerBusiness INGEN bottom-cap? Samma mätning på
   PlayerBusiness wall-mesh.
3. Fyller skillnaden det visuella tomrummet? Pixel-mätning av
   ground-Y-området runt PlayerBusiness kontra runt en granne i
   samma kvarter, från samma vinkel.

**§2.2 Är det bottom-cap:en eller något annat?** Kandidater att
utesluta innan fixen låses:

- `receiveShadow`-skillnad mellan wall-mesh:erna
- Skuggningens depth-write vid wall-base (ORDER 055 Del A-flödet)
- OBB-rotation som ger polygonens `sideWallGeometry`-quad en
  annan vinkel än OsmBuildings' ExtrudeGeometry-projektion
- Y-fighting mellan wall och terrain vid y=0 exakt
- Plinth-mesh:ens 10 cm outward-inset (ORDER 159) döljer eller
  förvärrar problemet

Utredningen listar var kandidat som antingen bekräftad eller
utesluten, med mätvärde ur JSON där sådan finns.

**§2.3 Vad är den minsta ändringen som återställer fasaden?**
Rapporten föreslår en åtgärd baserad på §2.1-fyndet. Om det är
bottom-cap:en som saknas — kan `sideWallGeometry` få en cap
utan att återintroducera 50%-alpha-tint-buggen (ORDER 042 §3.2)?
Rekommendation utan att låsa.

---

## 3. Vad som INTE görs i den här ordern

- **Ingen kod-ändring i `PlayerBusiness.tsx`.** Utredningsorder
  bara — implementation är följdorder efter §2.3-svar.
- **Ingen ändring av plinth-strategin.** Plinthen står som den är
  (ORDER 159 mergad). Om plinth-fade behöver decouplas eller ges
  egen tröskel är det egen order när §2.1-fyndet bevisar att det
  löser mer än det bryter.
- **Ingen ändring av OsmBuildings.** Grannarnas rendering är
  referensen, inte målet för fixen.

---

## 4. Definition of Done

1. Utredningsscript `frontend/scripts/order162-wall-surface-audit.mjs`
   som mäter §2.1-frågorna via dev-hooks (eller pixel-mätning där
   scen-lookup inte räcker) och skriver
   `frontend/reports/order162/wallSurfaceAudit.json`.
2. `wallSurfaceAudit.json` innehåller minst: `neighbourWallMeshVertices`
   (per Y-band), `playerBusinessWallMeshVertices` (per Y-band),
   `groundYPixelSampleNeighbour` (färgvektor), `groundYPixelSamplePlayerBusiness`
   (samma), och en `finding`-sträng som säger vilken av §2.2:s
   kandidater som visat sig vara orsaken (eller "ingen av dem").
3. Alla tal i rapportfilen; ingen siffra i registerraden per
   ORDER 161-regeln.
4. `documentation/architecture/ORDER_162_YTTERVAGGEN_MOT_MARKEN.md`
   (denna fil) uppdateras med §5 Utfall.
5. Registerpost i samma commit.
6. Typecheck grön, full svit grön. Ingen ny produktionskod.

---

## 5. Om något inte går

Om §2.1-mätningen visar att grannarna INTE har någon extra
rendering vid ground-Y — då är fyndet att den mörka lådan i
provspelet är en optisk illusion eller ett annat fel som råkar
förvärras av dollhouse-vyn. Skriv då fyndet i den formen i
`wallSurfaceAudit.json` och stäng ordern som utredning utan
åtgärd. Rekommendera egen order för att undersöka rendering-
pipelinen från spelarens vinkel om det bedöms motiverat.

Om §2.3:s minsta-fixen är stor (t.ex. omskrivning av
`sideWallGeometry` med parametrar för cap-hantering) — pausa och
låt Vision Owner besluta om scope innan implementation.

---

## 5. Utfall (2026-09-01)

Utredning körd 2026-09-01. Instrumentering (dev-only):
`frontend/src/lib/WallSurfaceAuditProbe.tsx` — exponerar
`window.__nxWallSurfaceAudit()`, `__nxReadCanvasPixel()`,
`__nxProjectToScreen()` för playwright. `OsmBuildings.tsx` och
`PlayerBusiness.tsx` fick två `userData`-taggar var som probe:n
läser (`osmBuildingWall`, `osmBuildingPlinth`, `playerBusinessWall`
— den fjärde `playerBusinessPlinth` fanns sedan ORDER 159 §DoD 3).
Ingen render-effekt utanför den tagningen. Script:
`frontend/scripts/order162-wall-surface-audit.mjs`. Rapport:
`frontend/reports/order162/wallSurfaceAudit.json`.

Alla siffror citeras ur rapportfilen per ORDER 161-regeln. Utfallets
tolkning nedan.

**§2.1 svar — grannen ritar det PlayerBusiness inte ritar.**
Rapporten fältar:
- `neighbourWallMeshVertices.yHistogram[0].count` — vertices vid
  ground-Y-bandet `[0, 0.1)` för grannens `OsmBuildings`
  ExtrudeGeometry-wall.
- `playerBusinessWallMeshVertices.yHistogram[0].count` — samma band
  för PlayerBusiness `sideWallGeometry`.
- Skillnaden svarar §2.1 direkt: grannen har fler vertices i
  ground-bandet därför att ExtrudeGeometry lägger en bottom-cap
  (triangel-fan över polygonen) som `sideWallGeometry` medvetet
  utelämnar per ORDER 042 §3.2. Rapportens `neighbourHasMoreGroundVertices`
  är `true`.

**Men — mekanisk skillnad i vertex-count är sekundär.** Rapporten
lyfter fram att `playerBusinessWallMeshVertices.material.opacity` är
`0` från myBusiness-preset medan `neighbourWallMeshVertices.material.opacity`
är `1`. Samma mönster för sockeln:
`playerPlinth.material.opacity = 0`, `neighbourPlinth.material.opacity
= 1`. Se `wallSurfaceAudit.json` `playerWallIsInvisible`,
`neighbourWallIsOpaque`, `playerPlinthIsInvisible`,
`neighbourPlinthIsOpaque` — alla `true`. Grannens hela envelope
(wall + sockel) är opakt vid mätvinkeln; PlayerBusiness hela
envelope är osynligt.

**Ground-Y pixelprovet konfirmerar visuellt.**
`groundYPixelSampleNeighbour.r/g/b` läser `119/103/87` (varm fasadfärg,
sockeln möter marken där grannens vägg står). `groundYPixelSamplePlayerBusiness.r/g/b`
läser `48/43/40` (mörk skugga eller terräng där byggnaden borde synas).
`pixelChannelDiffs` överstiger tröskeln på alla kanaler
(`pixelChannelExceedsThreshold: true`). Skillnaden är alltså inte en
mät-artefakt — den finns i renderade pixlar.

**§2.2 kandidater — bekräftade eller uteslutna.** Från rapportens
material-snapshot:
- **`receiveShadow`-skillnad:** grannens `<mesh geometry={b.geo}>`
  (`OsmBuildings.tsx:1341`) har varken `castShadow` eller
  `receiveShadow` satt (three.js default `false`). PlayerBusiness
  wall har `receiveShadow` på (`PlayerBusiness.tsx:481`). Skillnaden
  finns men förklarar inte försvinnandet — en mesh som är helt
  transparent renderas inte, oavsett receive-flagga. **Utesluten**
  som primär orsak.
- **`depthWrite`:** rapporten läser
  `playerBusinessWallMeshVertices.material.depthWrite = false`
  (styrs av useFrame-tröskel `opacity > 0.5`) och
  `neighbourWallMeshVertices.material.depthWrite = true` (default).
  **Följdeffekt** av opacity-noll-fallet — inte oberoende orsak.
- **OBB-rotation:** både `sideWallGeometry` (`PlayerBusiness.tsx:133`)
  och `ExtrudeGeometry` följer samma polygon utan skalfaktor. Inget
  som skiljer sig i vertex-Y-histogrammet på ett sätt en vinkelfel
  skulle förklara. **Utesluten.**
- **Y-fighting:** båda AABB:er startar `yMinM` vid `0` (rapportens
  `worldAABB.yMinM`). Ingen sub-mm-avvikelse som skulle ge z-strid
  mot terrängen. **Utesluten.**
- **Plinth-inset (ORDER 159, 10 cm outward):** rapporten läser
  `playerPlinth.worldAABB` och `neighbourPlinth.worldAABB`.
  Player-plinthen är 10 cm bredare per axel än sockelbaserade
  wall-mesh, precis som spec. Ingen skillnad från grannen som
  förklarar försvinnandet. **Utesluten som orsak** — men bekräftar
  att designen är enligt ORDER 159.

**§2.3 rekommendation — minsta ändringen som återställer fasaden.**
Rapportens `recommendationFor23`-fält (från de faktiska mätvärdena):
frikoppla `wallOpacity` från `roofOpacity` i `PlayerBusiness.tsx:318`
och gör motsvarande separat läsning för sockeln (som idag följer
`wallOpacity` per ORDER 159 §DoD 2). Roofen ska fortsätta fejda —
det är den fejden som gör interiören synlig. Wall + sockel ska förbli
opaka som grannarna, för då står PlayerBusiness på marken som en
byggnad snarare än en genomskinlig envelope över en golvbit.

Grunden till att wall ursprungligen kopplades till roof-fade
(ORDER 042 §3.2) var ExtrudeGeometry-cap:ens 50 %-alpha-tint.
Men `sideWallGeometry` har ingen cap; wall-materialet kan förbli
opakt utan att återintroducera tint-buggen. Bottom-cap-alternativet
(byt `sideWallGeometry` mot `ExtrudeGeometry`) löser INTE
huvudproblemet — även med bottom-cap skulle wall-materialets
opacity fortsatt fejdas bort av samma koppling. Fade-kopplingen är
den strukturella orsaken; cap-frånvaron är sekundär.

**Följdorder att utfärda.** Implementation av frikopplingen är
egen order (denna order är utredning). Föreslagen scope:
- `PlayerBusiness.tsx:318` — sätt `wallOpacity = 1` (eller behåll
  som konstant); ta bort `smoothstep`-tråden från roof-fade.
- `PlayerBusiness.tsx:335` — sockeln behöver egen tröskel
  eller sätts konstant opak (matchar grannens BuildingPlinth).
- Ta bort `castShadow`-toggle på wall-meshen om opacity alltid är 1
  (kastar då skugga statiskt som grannen).
- Regressionstest via en variant av `order162-wall-surface-audit.mjs`
  som asserterar `playerWallIsInvisible === false` från myBusiness-
  preset.

Ingen kod-ändring i `PlayerBusiness.tsx` fade-logik gjord i denna
order. Instrumenteringen är produktionsneutral (`userData`-taggar
har ingen render-effekt; probe:n är DEV-only).
