# ORDER 159 — Plinthen (PlayerBusiness möter marken)

**Repo** `Viognier70/nexus-studio` · **Gren** `order-159` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-31
**Följer** Vision Owner-fynd 2026-08-31 (provspel andra omgången), utredd under ORDER 158-samtalet

---

## 1. Läget

Spelarens verksamhet (`PlayerBusiness.tsx`) renderas som en svävande låda
utan fasad mot marken. Väggarna sitter geometriskt vid y=0 och terrängen
är y=0 i bykärnan (`OsmTerrain.tsx:8`), så det är inte en Y-offset-bugg —
det som saknas är **sockeln**.

Alla grannar (kind ∈ `PLINTH_KINDS`) får en `BuildingPlinth` renderad
via `OsmBuildings.tsx:1055`. Kommentaren `OsmBuildings.tsx:670` säger
det rakt ut:

> band 0.3–0.5 m tall — omitting it makes procedural houses read as
> timber floating on grass.

`PLINTH_KINDS` inkluderar `commercial` — verksamheten skulle ha fått
en 0,42 m stenbas om `OsmBuildings` renderade den. Men `PlayerBusiness`
tar över byggnaden (via `LANDMARK_BUILDING_IDS`-filtret i `OsmBuildings.tsx:1269`)
och drar bara vägg + tak + interiör. Ingen plinth = svävande låda.

---

## 2. Vad som byggs

**Porta `BuildingPlinth`-mönstret till `PlayerBusiness.tsx`** som en
egen mesh mellan väggarna och marken. Wealth-tier `standard` (commercial-
default per `OsmBuildings.tsx:1071`) = **0,42 m höjd**.

Två val står öppna på hur portering görs:

- **A. Direkt import av `BuildingPlinth`** från `OsmBuildings.tsx`. Kräver
  att komponenten exporteras (idag intern). Enklaste men skapar en
  cross-module-koppling som inte fanns förr.
- **B. Lokal kopia i `PlayerBusiness.tsx`** — samma geometri (UNIT_PLINTH_GEO
  + OBB-orienterad box, inset 0,35 m, höjd 0,42 m, färg `#8a8478`).
  Duplikering men koppling förblir noll. Följer ORDER 155:s princip att
  gränsen mellan `OsmBuildings` och `PlayerBusiness` är hård.

Rekommendation utan att låsa: **B**. Om `BuildingPlinth`-implementationen
ändras i framtiden, plinth-höjden och färgen är fasta konstanter och
förändring är okontroversiell. Alternativ A låser en ny import över en
gräns som annars är städad.

---

## 3. Vad som INTE får göras

**Ändra inte** `OsmBuildings.BuildingPlinth`-implementationen — den
renderar 337 andra byggnader och en oavsiktlig regression där skulle
smyga in i hela byn.

**Ändra inte** wall-höjden (`WALL_HEIGHT_M = 6,50 m` per ORDER 054 Del A)
— plinthen är UTAN på existerande höjd, väggarna börjar fortfarande
vid y=0 och når 6,50 m. Plinthen är en separat mesh i intervallet
[0, 0,42] m som ligger inuti wall-mesh-footprintet med 0,35 m inset.

**Ändra inte** interior-golv (INTERIOR_FLOOR_COLOUR `#a08462` vid y=0,06)
— den bär silhuett-kontrastkontraktet (ORDER 123+127 kalibrerad palett).

**Interiör-mesh castShadow-toggle (ORDER 055 Del A)** — plinthens
`castShadow` följer samma opacity-baserade toggle som väggarna, så den
inte stämplar en silhuett på marken när wallOpacity < 0,5.

---

## 4. Definition of Done

1. `PlayerBusiness.tsx` renderar en plinth-mesh med:
   - Höjd 0,42 m
   - OBB-orienterad (samma vinkel som väggarna, `-layout.worldAngle`)
   - Inset 0,35 m innanför wall-footprintet (samma som `BuildingPlinth`)
   - Färg `#8a8478` (samma som standard-tier)
   - `receiveShadow = true`; `castShadow` toggle:as i `useFrame`
     tillsammans med wallOpacity-tröskeln (`> 0.5`)
2. Vid distans där `wallOpacity < 0.5` (dvs. dollhouse-läge) ska
   plinthen också fejda ut — den ska inte stå kvar som stenring runt
   den försvunna byggnaden.
3. Skärmdumpar före/efter från kamera-preset `myBusiness` (24 m) OCH
   från en mellandistans där hela byggnaden ska vara solid (t.ex. 80 m,
   ovanför restaurantInteriorFadeMid+half=75 m).
4. Typecheck grön; hela sviten grön. Ingen ny test krävs (visuell fråga).
5. Registerpost i samma commit.

---

## 5. Om något inte går

Om plinth-mesh:et hamnar utanför wall-footprintet på det roterade
OBB-hörnet — inset kan behöva höjas från 0,35 m till 0,5 m för att
täcka den 7°-rotationen som `w869907975` (Candidate A) bär. Redovisa
och rapportera värdet.

Om plinth-fejdet i dollhouse-läge stör silhuett-läsningen — behåll
plinthen synlig i alla lägen (den läser som "detta rum har en
byggnad runt sig" även utan väggar). Redovisa valet.
