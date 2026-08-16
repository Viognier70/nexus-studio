# CLAUDE.md — Nexus Studio

Detta dokument styr hur Claude Code arbetar i det här repot. Läs det i början av varje session.

---

## Projektet

**Nexus Studio** är ett spelutvecklingsprojekt (AAA-ambition) i pre-produktion. Nuvarande fokus är **Vertical Slice 001** — den spelbara öppningen av *Nexus (Grythyttan — The Origin)*: bussankomst, första NPC-dialogen, promenad till registreringsbordet vid Sevillapaviljongen.

## Roller och arbetsflöde

- **Projektledning (ChatGPT + ägaren):** äger *vad* och *varför* — vision, prioritering, feature-beslut. Beslut skrivs som markdown i `documentation/`.
- **Claude Code (du):** äger *hur* — implementation, refaktorering, testning. Du läser specar ur `documentation/` och bygger utifrån dem.
- **Källan till sanning är repot.** Om en muntlig instruktion motsäger en spec-fil i `documentation/`, flagga konflikten istället för att gissa. Föreslå en uppdatering av spec-filen.
- Icke-triviala beslut du fattar under implementation dokumenteras i `documentation/architecture/` (ADR-stil: kontext → beslut → konsekvenser).

## Var saker ligger

| Katalog | Innehåll |
|---|---|
| `documentation/foundation/` | Vision, pelare, icke förhandlingsbara principer |
| `documentation/blueprints/` | Formella förslag och cross-discipline-specar |
| `documentation/world/` | Setting, ton, narrativ referens (t.ex. `01_THE_ORIGIN.md`) |
| `documentation/game-design/` | Designdokument och systemspecar |
| `documentation/architecture/` | Teknisk arkitektur, RFC:er, ADR:er, implementationsrapporter |
| `frontend/` | Spelklienten (se nedan) |
| `backend/`, `database/`, `ai/` | Scaffolding — ännu tomma; bygg inget här utan spec |
| `testing/` | Testsviter och QA-planer |
| `scripts/` | Build-, deploy- och utvecklarverktyg |

## Frontend — teknisk stack

- **Vite + React 18 + TypeScript**, rendering med **React Three Fiber + drei** (three.js)
- Node.js 18+, WebGL-krav med fallback i `src/webgl/WebGLFallback.tsx`
- Spelinnehåll/text ligger i `src/content/` (`dialogue.ts`, `strings.sv.ts`) — all spelartext på svenska går via strings-filen, hårdkoda aldrig UI-text i komponenter
- Globalt speltillstånd i `src/state/gameState.ts`
- Scenen är uppdelad i komponenter under `src/scene/`, spelfaser under `src/stages/` (Title → Bus → End)
- Tillgänglighet: respektera `usePrefersReducedMotion`, touch-stöd via `src/controls/MobileControls.tsx` + `useIsTouch`

## Enhetskontrakt (ORDER 053 Del B)

**1 world unit = 1 meter. Undantagslöst.** Alla Three-koordinater, geometrimått, kameraavstånd och avstånd i spelet är i meter. Skalfaktorer får inte kompensera för fel enhetsantagande — rätta geometrin i stället.

Referensmåtten nedan är kalibreringsvärden — vad geometri för byggnader och inredning ska sikta mot när den byggs i kod. **Externa humanoider skalas inte** för att träffa referensen; de används som författade så länge de ligger inom det angivna tolerensbandet (ORDER 057 §3). Modeller utanför bandet exkluderas från spel-casten i stället för att skalas.

Referensmått som verkligheten kalibreras mot (ORDER 053):

| Objekt | Storlek |
|---|---|
| Våningshöjd | 2,70 m |
| Dörr, standard | 0,90 × 2,05 m |
| Dörr, institutionell (skola / offentlig entré) | 1,05 × 2,65 m |
| Bordshöjd | 0,74 m |
| Stolssits | 0,45 m |
| Gäst (stående) | 1,70 m *(referens för ergonomikontroll, inte krav)* |
| Personal (stående) | 1,70 m — samma som gäst; silhuettskillnad görs med form/färg, inte höjd |
| Humanoider (tolerensband, ORDER 057 §3) | **1,55 – 1,90 m** — externa `.glb`-modeller används som de är; värden utanför bandet exkluderas från casten |
| Bardisk | 1,10 m |
| Tallriksdiameter | 0,27 m |

Inventering + avvikelser: `documentation/architecture/skala-inventering.md` — kör inventeringen om innan orderna påstår avvikelse 0.

## Assetpolicy (ORDER 053 Del A)

**Motivering:** miljö och arkitektur är parametriserbart och byggs i kod, humanoider är det inte.

**Tillåtet externt**, incheckat i repot under `frontend/public/assets/characters/`:
- humanoid geometri (`.glb`)
- skelettrigg
- animationsklipp
- Licens: CC0 eller Mixamo. Licensfil per tillgång i samma mapp.

**Fortsatt förbjudet externt:**
- byggnader, inredning, terräng, vegetation
- texturer och materialbibliotek
- HDRI-filer

**Absolut förbjudet, oavsett typ:**
- **Nätverkshämtning i runtime.** Ingen `fetch` av assets, ingen CDN, ingen extern URL i en asset-loader. Allt måste ligga i repot när `vite build` körs.
- OBS: `drei`:s `<Environment preset="...">` hämtar HDRI från CDN. Använd inte den. Himmel görs procedurellt med `<Sky>`.

**Uttryckligen TILLÅTET (för att inte flaggas som brott):**
- `useGLTF('/assets/characters/…')`, `useTexture('/assets/…')`, `useLoader(GLTFLoader, '/assets/…')` — dessa hämtar från `frontend/public/`, som Vite kopierar in i bygget. Ingen runtime-nätverkshämtning inblandad. `public/`-URL:er börjar med `/` och löses relativt bygget.
- **Regel för asset-audit:** en `fetch` / `useLoader` / `useGLTF` är endast policybrott om argumentet är en absolut extern URL (`http://…`, `https://…`) eller en drei-`preset`-nyckel som hämtas från en CDN. Argument som börjar med `/` eller `./` pekar på lokal `public/`-katalog och är OK.

## Kommandon

```bash
cd frontend
npm install        # första gången
npm run dev        # dev-server på http://localhost:5173
npm run typecheck  # tsc --noEmit — kör ALLTID före commit
npm run build      # typecheck + produktionsbygge till dist/
npm run preview    # förhandsgranska bygget
```

## Renderregler

- **Skuggor och opacity (ORDER 055 Del A).** Geometri med `transparent` opacity som kan nå 0 får aldrig ha statiskt `castShadow`. Skuggkartans depth-pass ignorerar alpha, så en fullt ut-fejdad mesh stämplar sin silhuett på marken. Toggla `mesh.castShadow` i samma `useFrame` som styr opacity, med samma tröskel som `depthWrite` (typiskt `opacity > 0.5`).

## Regler för Claude Code

1. **Typecheck före varje commit.** `npm run typecheck` måste vara grönt. Ett bygge (`npm run build`) ska gå igenom före push.
2. **Små, fokuserade commits** med konventionella prefix: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
3. **Committa aldrig** `frontend/dist/`, `node_modules/` eller andra byggartefakter (se `.gitignore`).
4. **Ändra inte** `documentation/foundation/` eller `documentation/world/` på eget initiativ — det är projektledningens domän. Föreslå ändringar istället.
5. **Fråga före** nya beroenden i `package.json`. Stacken hålls medvetet minimal.
6. **Bevara prestandabudgeten:** procedurell geometri, ingen tung post-processing utan beslut, testa mentalt mot mobil/touch.
7. **Engelska i spelet, engelska i koden.** Spelartext på engelska. Platsnamn behålls på svenska (Grythyttan, Torget, Kyrkbacken). Beslutet är loggat som `ORDER_REGISTRY.md` Observation 6 (2026-08-09) — det upphäver tidigare regel om svensk spelartext via `strings.sv.ts`. Filnamnet `strings.sv.ts` byts i egen omgång; värdena är engelska nu. Befintlig svensk text översätts i en dedikerad omgång, observatörens röst i strömmen skrivs om (inte översätts).
8. När en uppgift är klar: sammanfatta vad som gjordes, vilka filer som ändrades och vad som återstår — kort och konkret.
9. **Inget ORDER-nummer utfärdas utan en post i `documentation/architecture/ORDER_REGISTRY.md`.** Registret är källan till sanning för nummerbruk; renumrera innan filen skrivs om en kollision hittas.

## Commit-verifiering

Bindande. Reglerna finns för att fyra ordrars arbete legat ocommitterat i huvudworktreets arbetsträd utan att det märkts, ORDER 097 rapporterades som committad två gånger innan den var det, och en registerrad dikterades och antogs vara inskriven medan den aldrig skrevs. Problemet är osynlighet — verifieringen måste synas i rapporten, inte gömmas i verktyg.

- **En commit räknas inte som gjord förrän den är verifierad i historiken.** Efter varje commit: kör `git log --oneline -3` och visa utdata i svaret. Rapportera aldrig en commit som genomförd utan att ha visat att den finns.
- **Vid början av varje order:** kör `git log --oneline -1` för grenen och visa den. Det gör det synligt om arbetet står på fel commit.
- **Vid slutet av varje order:** kör `git status --short`. Är arbetsträdet inte rent ska rapporten säga vad som ligger kvar och varför.
- **Registerrad och commit hör ihop.** En rad i `ORDER_REGISTRY.md` får inte skrivas för arbete som inte är committat, och ska ligga i samma commit som det arbete den beskriver.

Ingen pre-commit-hook, inget skript som städar arbetsträdet, ingen automatik som committar åt agenten. Verifieringen är synlig i rapporten.

## DoD för synligt innehåll

En DoD-punkt som rör något spelaren ska se ska kräva en grep-verifierbar artefakt, inte en beskrivning av avsikten.

Inte: "figurer med lemmar och ansikten renderas"
Utan: "grep visar limb-funktioner i skepnadsfilen; strängen `SKEPNAD EJ BYGGD` förekommer inte i produktionsvägen"

Placeholder som uppfyller en DoD-punkt är inte uppfyllelse. Rapportera det som ofullständigt.

## Grenar är kortlivade

**En order = en gren från `main`, mergad tillbaka när DoD är uppfylld. Ingen gren lever över mer än en order.** Införd per ORDER 103 §5 efter en långlivad linjegren (`order-049`) som kostade två felsökningsomgångar, en registerdivergens och fyra ordrars arbete som låg osparat i huvudworktreets arbetsträd. Långlivade grenar är den strukturella grunden till samma sortens fel Commit-verifiering-avsnittet ovan adresserar.

- Grenens namn följer ordernumret (`order-102`, `order-103`, …).
- Grenen skapas från `main` när ordern startas.
- Grenen mergas tillbaka till `main` (utan squash — historiken per order är projektets spårbarhet) när DoD är uppfylld.
- Grenen och worktreet avvecklas direkt efter mergen (`git worktree remove` + `git branch -d` + `git push origin --delete`).
- Om två ordrar bygger på varandra: den andra skapas från `main` *efter* den första mergats, inte som fortsättning på den första.

## Definition of Done (Vertical Slice 001)

En ändring är klar när:
- [ ] Typecheck och build är gröna
- [ ] Fungerar med både mus/tangentbord och touch
- [ ] Respekterar reduced motion och WebGL-fallback
- [ ] Relevanta specar i `documentation/` är uppdaterade eller flaggade
- [ ] Committad med tydligt meddelande
