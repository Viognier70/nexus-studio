# ORDER 053 — Skala, Kamera och Assetpolicy

**Version:** 1.0
**Status:** Executed 2026-08-11; open questions closed by ORDER 054 Del A on 2026-08-11
**Class:** Foundation order (precedence 5) — asset policy + unit contract
**Parent:** `CLAUDE.md` (assetpolicy + enhetskontrakt); origin: verbal order issued 2026-08-11
**Registry:** `documentation/architecture/ORDER_REGISTRY.md` row 053
**Recipient:** Claude Code

## 0. Provenance

Original text delivered as a verbal order in the 2026-08-11 chat session. Registered as *verbal order, no dedicated file* at execution time. Lifted to this document under ORDER 054 Del A so the instrument matches the pattern the registry expects. No content changes from the verbal original — only formatting.

## 1. Syfte

Lägga metrisk grund för det visuella lyftet och lösa upp assetkonflikten i CLAUDE.md. Ingen visuell polering i denna order.

## 2. Del A — CLAUDE.md, assetpolicy

Ersätt det generella förbudet mot externa tillgångar med en typregel.

**Tillåtet externt, incheckat i repot under `frontend/public/assets/characters/`:**
- humanoid geometri (`.glb`)
- skelettrigg
- animationsklipp
- Licens: CC0 eller Mixamo. Licensfil per tillgång i samma mapp.

**Fortsatt förbjudet externt:**
- byggnader, inredning, terräng, vegetation
- texturer och materialbibliotek
- HDRI-filer

**Absolut förbjudet, oavsett typ:**
- all nedladdning i runtime. Ingen CDN, ingen `fetch` av assets. Allt ligger i repot vid build.
- OBS: `drei`:s `<Environment preset="...">` hämtar HDRI från CDN. Använd inte den. Himmel görs procedurellt med `<Sky>`.

Motivering (en mening i CLAUDE.md): *miljö och arkitektur är parametriserbart och byggs i kod, humanoider är det inte.*

## 3. Del B — Enhetskontrakt

Fastslå i CLAUDE.md: **1 world unit = 1 meter. Undantagslöst.**

Referensmått:

| Objekt | Storlek |
|---|---|
| Våningshöjd | 2,70 m |
| Dörr | 0,90 × 2,05 m |
| Bordshöjd | 0,74 m |
| Stolssits | 0,45 m |
| Gäst, stående | 1,70 m |
| Bardisk | 1,10 m |
| Tallriksdiameter | 0,27 m |

Inventera all befintlig geometri. Producera `documentation/architecture/skala-inventering.md` med en rad per mesh: namn | nuvarande mått (x,y,z) | avsedd verklig storlek | avvikelse. Rätta allt som avviker.

## 4. Del C — Kamera

Förstapersonskamera:

- ögonhöjd: 1,65 m
- fov: 65
- near: 0,1
- far: 2000

Ta bort alla hårdkodade kamerajusteringar som kompenserar för felaktig skala. De blir fel när Del B är klar.

## 5. Del D — Skalreferens i debugläge

Bygg en toggle (tangent **G**) som visar:

- rutnät med 1 m ruta, markerad var 10:e meter
- en enkel referensfigur, 1,80 m, placerbar med musklick

Endast i dev. Får inte följa med i produktionsbygget.

## 6. Ska inte röras

Kunskapsmotorn, ledger, kassa, kvalitetsmätare, dagsslingan. Öppna ordrar 049–052 ligger orörda. Ingen materialändring, ingen ljussättning, inga nya modeller. Detta är enbart skala, kamera och policy.

## 7. Godkännande

1. Dagsslingan går igenom morgon, service och kväll utan fel.
2. `skala-inventering.md` finns och varje rad har avvikelse 0.
3. Referensfiguren räcker upp till strax under dörrkarmen.
4. Sökning efter runtime-hämtade assets ger noll träffar.
5. `CLAUDE.md` innehåller enhetskontraktet och den nya typregeln.

## 8. Rapport

Redovisa vilka mått som var fel och hur mycket. Gissa inte fram avsedd storlek på något — om ett objekts avsedda mått är oklart, lista det som öppen fråga i stället för att sätta ett värde.

---

## 9. Utförande — 2026-08-11

Åtta mesh-fixar (totalavdrift 0 mot referensmått där sådana finns), sju öppna frågor listade, fyra delar landade i följande commits:

- **Del A** — assetpolicyn skriven om i `CLAUDE.md`. Karaktärskatalog under `frontend/public/assets/characters/` reserverad men inte skapad (skapas i samma commit som första humanoid landar).
- **Del B** — enhetskontrakt i `CLAUDE.md`; `documentation/architecture/skala-inventering.md` författad med 41 first-person + ~100 strategiska rader. Fixar: Applicant 2,20 → 1,70 m; RegistrationTable-yta 0,94 → 0,74 m; BusStop-bänk 0,55 → 0,45 m; InteriorGuests 1,60 → 1,70 m; PlayerBusiness bardisk 1,05 → 1,10 m; PlayerBusiness barstol 0,90 → 0,75 m; AnimationPrototype kronhöjd 1,688 → 1,700 m (**återställd 2026-08-11 under ORDER 054 Del A — anatomi ger höjden, inte tvärtom**); PlayerController EYE_HEIGHT 1,70 → 1,65.
- **Del C** — `frontend/src/scene/Scene.tsx` fov 70 → 65, far 400 → 2000. `frontend/src/controls/PlayerController.tsx` EYE_HEIGHT 1,70 → 1,65. Ingen scalefaktor-kompensator hittades.
- **Del D** — `frontend/src/scene/ScaleReference.tsx` (ny), `G`-toggle i både `App.tsx` och `strategic/StrategicApp.tsx`, dev-only via `import.meta.env.DEV`.

Öppna frågor stängdes av ORDER 054 Del A 2026-08-11:

1. Sevillapaviljongen: monumental, 4,5 m behållet.
2. PlayerBusiness: 6,5 m behållet men dekomponerat till sockel 0,35 + 2 × våningshöjd 2,70 + takfot 0,75.
3. Kärnhuset: institutionell dörr 1,05 × 2,65 införd som egen typ i enhetskontraktet; standard 0,90 × 2,05 kvarstår.
4. InteriorStaff: 1,70 m (från 1,75). Silhuettskillnad görs med radie (0,24 vs 0,32) och färg, inte höjd.
5. RegistrationTable-objektet: namnet "registrering-liggare" (registration ledger), motiveringen komenterad i källan.
6. BusStop frontpanel: kickboard, kommenterad.
7. Grindstolpar (Environment): ceremoniell kategori, lämnad.
