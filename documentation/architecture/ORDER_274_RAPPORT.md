# ORDER 274 — Tiden kvar av servicen (rapport)

**Ordern** (Vision Owner 2026-09-28, provspel): tiden kvar av servicen ska synas hela kvällen.

## 1. Vad som byggdes

- **`frontend/src/sim/serviceClock.ts`** räknar klockslaget nu och vid stängning, spelminuter kvar och andelen av servicen som har gått.
  - Den läser samma värden som reducern stänger servicen på: `periodStartAt` och `currentServiceLengthMinutes`.
  - Klockan är `clockMinutes`, samma som raketernas klockslag.
  - Servicen går 18–23 (`SITTING`, F31).
  - Utanför en service ger den `null`.
- **`frontend/src/strategic/ui/service/ServiceClock.tsx`** visar klockan överst i mitten under hela servicen, i alla klasser. Den visar klockslaget, tiden kvar ("3 h 53 min left") och när servicen stänger, och har en stapel som töms mot stängningen.
  - Formen följer designsystemet.
  - Den krockar inte med raketkortet (höger) eller mätarna (vänster).
  - Den har `role="timer"` och en `aria-label`.
- **Strängarna:** `strings.service.clock` i `strings.en.ts` och, för att formen ska hålla, i `strings.sv.ts`.

## 2. Verifiering

- **`frontend/src/sim/__tests__/order274ServiceClock.test.ts`:**
  - klockan är `null` utanför servicen;
  - servicen börjar 18:00 och stänger 23:00;
  - tiden kvar sjunker hela kvällen och når noll när reducern stänger servicen.
- **Spelarens flöde:** `frontend/scripts/order271-dod-from-start.mjs` med `REPORT_ORDER=order274 STOP_AFTER=clock` går från normal start till första kvällen. Bilderna `dod-25-tiden-kvar-1.png` och `-2.png` är tagna med en minut emellan, och `frontend/reports/order274/dod.json` `clock` visar `leftMinutes` 293 och 233 (2×).
- Typkontrollen, sviten och bygget är gröna.
