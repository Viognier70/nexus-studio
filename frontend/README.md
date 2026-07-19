# Nexus — Vertical Slice 001 (frontend)

Playable prototype of the opening of Nexus (Grythyttan — The Origin). Bus arrival, first NPC dialogue, walk to the Sevillapaviljongen registration table.

Built with **Vite + React 18 + TypeScript**, rendered with **React Three Fiber + drei**. No external assets: geometry is procedural, audio is Web Audio, typography uses system fonts.

## Requirements

- Node.js 18 or newer
- A browser with WebGL support

## Install and run

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173/`.

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — type check and produce a production build in `dist/`
- `npm run typecheck` — run the TypeScript compiler in check-only mode
- `npm run preview` — preview the built site locally

## Controls

**Desktop**

- W A S D or arrow keys — walk
- Mouse — look (click canvas to enter pointer lock)
- Shift — walk faster
- E — interact
- Escape — release pointer lock and open pause

**Mobile / touch**

- Left virtual stick — walk
- Drag anywhere on the screen — look
- On-screen button — interact

## Interface language

All in-scene text is Swedish. Interface copy is centralised in `src/content/strings.sv.ts`.

## Scope

This is a vertical slice, not a game. It does not include backend, database, authentication, multiplayer, AI, or any external services. No permanent role assignment. The Sevillapaviljongen depiction is a stylised placeholder — see the in-app disclaimer under Pause → Om denna prototyp.

## Source of truth

- `documentation/world/01_THE_ORIGIN.md` — opening tone and principles
- `documentation/world/02_FIRST_ARRIVAL.md` — arrival sequence
- `documentation/world/05_SEVILLA_PAVILION.md` — pavilion role
- `documentation/architecture/VERTICAL_SLICE_001.md` — design of this prototype
- `documentation/architecture/VERTICAL_SLICE_001_IMPLEMENTATION_REPORT.md` — this build's report
