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
- **Inga externa assets:** geometri är procedurell, ljud via Web Audio (`AmbienceEngine`), typografi via systemfonter. Behåll den principen — introducera inte binära assets utan uttryckligt beslut.
- Node.js 18+, WebGL-krav med fallback i `src/webgl/WebGLFallback.tsx`
- Spelinnehåll/text ligger i `src/content/` (`dialogue.ts`, `strings.sv.ts`) — all spelartext på svenska går via strings-filen, hårdkoda aldrig UI-text i komponenter
- Globalt speltillstånd i `src/state/gameState.ts`
- Scenen är uppdelad i komponenter under `src/scene/`, spelfaser under `src/stages/` (Title → Bus → End)
- Tillgänglighet: respektera `usePrefersReducedMotion`, touch-stöd via `src/controls/MobileControls.tsx` + `useIsTouch`

## Kommandon

```bash
cd frontend
npm install        # första gången
npm run dev        # dev-server på http://localhost:5173
npm run typecheck  # tsc --noEmit — kör ALLTID före commit
npm run build      # typecheck + produktionsbygge till dist/
npm run preview    # förhandsgranska bygget
```

## Regler för Claude Code

1. **Typecheck före varje commit.** `npm run typecheck` måste vara grönt. Ett bygge (`npm run build`) ska gå igenom före push.
2. **Små, fokuserade commits** med konventionella prefix: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
3. **Committa aldrig** `frontend/dist/`, `node_modules/` eller andra byggartefakter (se `.gitignore`).
4. **Ändra inte** `documentation/foundation/` eller `documentation/world/` på eget initiativ — det är projektledningens domän. Föreslå ändringar istället.
5. **Fråga före** nya beroenden i `package.json`. Stacken hålls medvetet minimal.
6. **Bevara prestandabudgeten:** procedurell geometri, ingen tung post-processing utan beslut, testa mentalt mot mobil/touch.
7. **Svenska i spelet, engelska i koden.** Kodkommentarer, variabelnamn och commits på engelska; spelartext på svenska via `strings.sv.ts`.
8. När en uppgift är klar: sammanfatta vad som gjordes, vilka filer som ändrades och vad som återstår — kort och konkret.
9. **Inget ORDER-nummer utfärdas utan en post i `documentation/architecture/ORDER_REGISTRY.md`.** Registret är källan till sanning för nummerbruk; renumrera innan filen skrivs om en kollision hittas.

## Definition of Done (Vertical Slice 001)

En ändring är klar när:
- [ ] Typecheck och build är gröna
- [ ] Fungerar med både mus/tangentbord och touch
- [ ] Respekterar reduced motion och WebGL-fallback
- [ ] Relevanta specar i `documentation/` är uppdaterade eller flaggade
- [ ] Committad med tydligt meddelande
