// ORDER 293 — händelserna som teater (Designs leverans 3) och vardagens
// koreografi: varje manus och variant går att spela i spelets vinbar, alla
// klipp finns, och ingen figur ligger ned där manuset inte säger det.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EVENTS } from '../events/handelserManus';
import { EventTheatre, theatreSeats } from '../eventTheatre';
import { createWineBarRoom } from '../wineBarRoom';
import { CLIPS } from '../figureClips';
import { inspectionVariant } from '../../../sim/incidents';
import { incidentBankFor } from '../../../sim/incidentBank';

describe('ORDER 293 — händelsernas manus i vinbaren', () => {
  const room = createWineBarRoom({ mood: 'helg' } as never);
  const seats = theatreSeats(room.seats);

  it('alla manus och varianter laddas, och varje klipp i manusen finns', () => {
    const parent = new THREE.Group();
    const th = new EventTheatre(parent, 0, seats);
    for (const ev of EVENTS) {
      for (const v of ev.variants) {
        const sc = ev.build(null, v);
        for (const a of Object.values(sc.actors)) for (const st of a.steps) expect(CLIPS[st.clip], `${ev.id}/${v}: ${st.clip}`).toBeTruthy();
        th.load(sc);
        expect(th.duration).toBeGreaterThan(5);
        for (let t = 0; t <= th.duration; t += 0.5) th.frame(t);
      }
    }
    th.dispose();
  });

  it('ORDER 294b — manusens personal är rummets roller (Per, Sara, Elin, Mira, kocken, diskaren)', () => {
    const th = new EventTheatre(new THREE.Group(), 0, seats);
    const known = new Set(['per', 'sara', 'elin', 'mira', 'cook', 'dish1']);
    for (const ev of EVENTS) for (const v of ev.variants) {
      th.load(ev.build(null, v));
      for (const id of th.staffIds()) expect(known.has(id), `${ev.id}/${v}: ${id}`).toBe(true);
    }
  });

  it('sittplatserna i manusen finns i spelets vinbar', () => {
    const ids = new Set(seats.map((s) => s.id));
    for (const ev of EVENTS) for (const v of ev.variants) {
      const sc = ev.build(null, v);
      for (const a of Object.values(sc.actors)) for (const st of a.steps) if (st.seat) expect(ids.has(st.seat), `${ev.id}/${v}: ${st.seat}`).toBe(true);
    }
  });

  it('kortets takter: frågorna och svaren i ordning, och slutet efter sista svaret', () => {
    const th = new EventTheatre(new THREE.Group(), 0, seats);
    for (const ev of EVENTS.filter((e) => e.id !== 'falls')) {
      th.load(ev.build(null, 'right'));
      const c = th.cardTimes();
      expect(c.ask.length).toBe(3);
      for (let i = 0; i < 3; i++) expect(c.ans[i]).toBeGreaterThan(c.ask[i]);
      expect(c.back).toBeGreaterThan(c.ans[2]);
    }
  });
});

describe('ORDER 293 — händelserna i raketbanken', () => {
  it('fem händelser, tillsynen i fyra varianter som en familj', () => {
    const bank = incidentBankFor('vinbar');
    for (const id of ['vb32-fodelsedagen', 'vb33-vasen', 'vb34-vinglar', 'vb36-passet']) expect(bank.some((i) => i.id === id)).toBe(true);
    const insp = bank.filter((i) => i.family === 'event-inspection');
    expect(insp.map((i) => i.when?.inspection).sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('tillsynens variant: A efter den nekade gästen, B med studenter i rummet, D när köket har slut, annars C', () => {
    const base = { incidents: { fired: [] }, guests: [], day: { soldOutGuests: 0 } } as never;
    expect(inspectionVariant(base)).toBe('C');
    expect(inspectionVariant({ ...(base as object), day: { soldOutGuests: 2 } } as never)).toBe('D');
    expect(inspectionVariant({ ...(base as object), guests: [{ state: 'dining', guestType: 'student' }] } as never)).toBe('B');
    expect(inspectionVariant({ ...(base as object), incidents: { fired: ['vb34-vinglar'] } } as never)).toBe('A');
  });
});
