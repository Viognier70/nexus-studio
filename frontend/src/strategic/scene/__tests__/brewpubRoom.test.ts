// ORDER 125 §6 DoD 5, 6, 7 — tester för brewpubRoom.ts.
//
// DoD 5: walkPathToSeat + exitPathFromSeat ger väg till alla 20 platser
//        och tillbaka. Ingen plats onåbar.
// DoD 6: measureBrewpubRoom mot MIN_WIDTH_M / MIN_DEPTH_M — om måtten
//        underskrids ska mätaren returnera underskott, inte omtolka.
// DoD 7: checkSightLines — barstolar (kind='bar') ska se alla jästankar.

import { describe, expect, it } from 'vitest';
import {
  createBrewpubRoom,
  disposeBrewpubGeometry,
  walkPathToSeat,
  exitPathFromSeat,
  measureBrewpubRoom,
  checkSightLines,
  resolveWorldPositions,
  TOTAL_SEATS,
  STANDING_SPOTS,
  MIN_WIDTH_M,
  MIN_DEPTH_M
} from '../brewpubRoom';

describe('ORDER 125 DoD 2 — konstanter matchar handoff-kontraktet', () => {
  it('TOTAL_SEATS = 20', () => {
    expect(TOTAL_SEATS).toBe(20);
  });

  it('STANDING_SPOTS = 8', () => {
    expect(STANDING_SPOTS).toBe(8);
  });

  it('rummet skapar exakt 20 platser + 8 ståplatser', () => {
    const room = createBrewpubRoom();
    try {
      expect(room.seats.length).toBe(TOTAL_SEATS);
      expect(room.standing.length).toBe(STANDING_SPOTS);
    } finally {
      room.group.removeFromParent();
    }
  });
});

describe('ORDER 125 DoD 5 — gångvägstest, alla 20 platser nåbara', () => {
  it('walkPathToSeat ger icke-tom väg för varje seatId', () => {
    const room = createBrewpubRoom();
    try {
      for (const seat of room.seats) {
        const path = walkPathToSeat(room, seat.id);
        expect(path.length, `seat ${seat.id}`).toBeGreaterThanOrEqual(2);
        // Sista punkten är platsen själv.
        expect(path[path.length - 1]).toEqual([seat.local[0], seat.local[1]]);
      }
    } finally {
      room.group.removeFromParent();
    }
  });

  it('exitPathFromSeat backar samma korridor och slutar vid waitingSpot', () => {
    const room = createBrewpubRoom();
    try {
      for (const seat of room.seats) {
        const back = exitPathFromSeat(room, seat.id);
        expect(back.length, `seat ${seat.id}`).toBeGreaterThanOrEqual(3);
        expect(back[back.length - 1]).toEqual([room.waitingSpot[0], room.waitingSpot[1]]);
      }
    } finally {
      room.group.removeFromParent();
    }
  });

  it('okänt seatId ger tom väg (inte kraschar)', () => {
    const room = createBrewpubRoom();
    try {
      expect(walkPathToSeat(room, 'obefintlig')).toEqual([]);
    } finally {
      room.group.removeFromParent();
    }
  });
});

describe('ORDER 125 DoD 6 — måtten mot MIN_WIDTH / MIN_DEPTH', () => {
  it('rummet mätas och footprint stämmer med minimimåtten', () => {
    const room = createBrewpubRoom();
    try {
      const m = measureBrewpubRoom(room);
      // Footprint ska minst uppfylla min-måtten (kan vara större om
      // Design gav marginal). Ordertexten §3 säger att MIN-värdena är
      // "inte en omtolkad plan" — brewpub ska rymmas inom byggnadens OBB
      // men fötterna får inte överdimensioneras.
      expect(m.footprint[0]).toBeGreaterThanOrEqual(MIN_WIDTH_M - 0.1);
      expect(m.footprint[1]).toBeGreaterThanOrEqual(MIN_DEPTH_M - 0.1);
    } finally {
      room.group.removeFromParent();
    }
  });

  it('rummet har fyra jäskärl + mäskkar/brewkettle-typ (vesselCount ≥ 4)', () => {
    const room = createBrewpubRoom();
    try {
      const m = measureBrewpubRoom(room);
      expect(m.vesselCount).toBeGreaterThanOrEqual(4);
    } finally {
      room.group.removeFromParent();
    }
  });

  it('interior har mätbar utbredning (inte kollapsad — SKEPNAD EJ BYGGD-guardan)', () => {
    const room = createBrewpubRoom();
    try {
      const m = measureBrewpubRoom(room);
      // Interior-mesh-gruppens bbox har verklig höjd — Design-header
      // nämner "taket i 3,40 m" som FAST konstant men measureFigure
      // mäter bara bb.max.y - bb.min.y för `parts.interior` (som är
      // disk + tank + bord, inte tak). Kravet: > 2 m så vi vet att
      // rummet inte kollapsat.
      expect(m.interiorHeight).toBeGreaterThan(2);
      expect(m.tallestVessel).toBeGreaterThan(1);
    } finally {
      room.group.removeFromParent();
    }
  });
});

describe('ORDER 125 DoD 7 — siktlinjeprovet, barstolar ser tankarna', () => {
  it('checkSightLines returnerar per-seat-visibilitet + ingen tom blindlista misslyckas', () => {
    const room = createBrewpubRoom();
    try {
      const result = checkSightLines(room);
      // perSeat har entry per plats
      expect(result.perSeat.length).toBe(TOTAL_SEATS);
      // Åtminstone några platser ska se någon tank — annars är rummet
      // fysiskt omöjligt att komma åt bryggeriets läsning från.
      expect(result.seatsSeeingBrewery).toBeGreaterThan(0);
    } finally {
      room.group.removeFromParent();
    }
  });

  it('barstolarna ser alla jästankar (§7 kärnkrav — ölhallens läsning)', () => {
    const room = createBrewpubRoom();
    try {
      const result = checkSightLines(room);
      // Åtta barstolar; alla ska se alla jästankar per SIGHT_LINE_NOTE:
      // "Ingen bakhylla mellan disk och tank. Tapptorn 0,55 m i diskens
      // norra ände." Barsittande ögonhöjd är EYE_SEATED_M = 1.29 m.
      const barSeats = room.seats.filter((s) => s.kind === 'bar');
      expect(barSeats.length).toBeGreaterThan(0);
      expect(result.barSeatsSeeingAll, 'antal barstolar som ser ALLA tankar').toBe(barSeats.length);
    } finally {
      room.group.removeFromParent();
    }
  });

  it('blindSeats-listan är rimlig (inte 100% blinda)', () => {
    const room = createBrewpubRoom();
    try {
      const result = checkSightLines(room);
      // Om alla platser är blinda är rummets läsning brutet — ölhallens
      // vokabulär bygger på att någon del av rummet ser tankarna.
      expect(result.blindSeats.length).toBeLessThan(TOTAL_SEATS);
    } finally {
      room.group.removeFromParent();
    }
  });
});

describe('ORDER 125 §3 — resolveWorldPositions efter placering', () => {
  it('utan placering: alla platser i lokal koordinat (nära origo)', () => {
    const room = createBrewpubRoom();
    try {
      const w = resolveWorldPositions(room);
      expect(w.seats.length).toBe(TOTAL_SEATS);
      expect(w.standing.length).toBe(STANDING_SPOTS);
      // Utan placering: room.group vid (0,0,0), så world = local.
      for (const s of w.seats) {
        expect(Math.abs(s[0])).toBeLessThan(MIN_WIDTH_M);
        expect(Math.abs(s[1])).toBeLessThan(MIN_DEPTH_M);
      }
    } finally {
      room.group.removeFromParent();
    }
  });

  it('efter placering på (100, 0, 200): platserna translateras', () => {
    const room = createBrewpubRoom();
    try {
      room.group.position.set(100, 0, 200);
      const w = resolveWorldPositions(room);
      // Åtminstone en plats ska ha world-x nära 100 (translation
      // applicerad).
      const nearFirstPlacement = w.seats.some(
        (s) => Math.abs(s[0] - 100) < MIN_WIDTH_M
      );
      expect(nearFirstPlacement).toBe(true);
    } finally {
      room.group.removeFromParent();
    }
  });
});

// Städa cachen efter alla tester i denna svit så andra sviter inte
// får läckta buffertar.
afterAll(() => {
  disposeBrewpubGeometry();
});

// Vitest-import (afterAll saknas i default-importen ovan).
import { afterAll } from 'vitest';
