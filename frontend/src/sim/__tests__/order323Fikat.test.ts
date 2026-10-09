// ORDER 323 §5 (Anders 2026-10-09): "Fikat följer platsen: i foodtrucken är
// det Nils, och dilemmat ska passa vagnen (inte fullbokat sällskap). Vinbarens
// dilemman och personal bara i vinbaren och bistron. Lägg till ett test."

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../strategic/simulation/model';
import { DILEMMAS, fikaPlaceOf } from '../../content/fika/dilemmas';
import { STRINGS, TABLE, pickLang } from '../../content/nexusStrings';
import { FIKA } from '../balance';
import { eligibleDilemmas, planFika } from '../fika';
import { firstDayOfWeek } from '../calendar';
import type { SimulationState } from '../../strategic/types';

const TRUCK_INCIDENTS = ['ft01-rusningen', 'ft04-leveransen', 'ft10-kortet', 'ft11-slut', 'ft13-priset'];
const WINE_INCIDENTS = ['vb06-kylen', 'vb03-notallergi', 'vb10-berusad', 'vb33-vasen'];

// En kväll där varje utlösare har hänt: en full kö, gäster som gick, dricks,
// leverans, eftersläp, en helg, ett trött lag och situationerna.
function everything(businessClass: string, seed: number, week = 2): SimulationState {
  const s = makeNewGameState(seed);
  const friday = firstDayOfWeek(week) + 4;
  return {
    ...s,
    seed,
    economy: { ...s.economy, businessClass: businessClass as never },
    incidents: { ...s.incidents!, enabled: true, fired: [...TRUCK_INCIDENTS, ...WINE_INCIDENTS] },
    day: { ...s.day, dayNumber: friday, period: 'evening', turnedAwayFull: 3, walkedCount: 2, tipsSek: FIKA.tipsAtLeastSek + 100, stockBoughtToday: true, prepBacklogMin: 5 },
    staff: s.staff.map((m) => ({ ...m, stamina: 0.05, wellbeing: 0.1 })),
    teamChangedDay: friday,
    fika: { tonight: null, log: [], loyalty: {} }
  } as SimulationState;
}

describe('ORDER 323 §5 — fikat följer platsen', () => {
  it('platsen ur klassen: foodtrucken är vagnen, vinbaren (och bistron, samma klass) vinbaren', () => {
    expect(fikaPlaceOf('foodtruck')).toBe('truck');
    expect(fikaPlaceOf('vinbar')).toBe('wine');
    expect(fikaPlaceOf(null)).toBeNull();
  });

  it('i foodtrucken: bara vagnens dilemman, och Nils frågar', () => {
    const pool = eligibleDilemmas(everything('foodtruck', 3));
    expect(pool.length).toBeGreaterThanOrEqual(5);
    for (const d of pool) {
      expect(d.places, d.id).toEqual(['truck']);
      expect(d.asker, d.id).toBe('assistant');
    }
    expect(pool.map((d) => d.id)).not.toContain('fika-bordet');
  });

  it('i vinbaren och bistron: bara vinbarens dilemman och personal, aldrig Nils', () => {
    const pool = eligibleDilemmas(everything('vinbar', 3));
    expect(pool.length).toBeGreaterThan(5);
    for (const d of pool) {
      expect(d.places, d.id).toContain('wine');
      expect(d.asker, d.id).not.toBe('assistant');
    }
  });

  it('kvällens dilemma över 60 kvällar: rätt plats varje kväll', () => {
    for (const [cls, place] of [['foodtruck', 'truck'], ['vinbar', 'wine']] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const s = everything(cls, seed, 1 + (seed % 6));
        planFika(s);
        const d = DILEMMAS.find((x) => x.id === s.fika!.tonight!.dilemmaId)!;
        expect(d.places, `${cls} ${seed} ${d.id}`).toContain(place);
      }
    }
  });

  it('Nils heter Nils i båda språken, och rubriken säger det', () => {
    for (const lang of ['sv', 'en'] as const) {
      const f = pickLang(TABLE, lang).fika;
      expect(f.people.assistant).toBe(STRINGS['truck.assistant.name'][lang]);
      expect(f.asks(f.people.assistant, f.roles.assistant)).toContain('Nils');
    }
  });

  it('vagnens dilemman: text på svenska och engelska, och inget om bokningar, bord eller ett fullt rum', () => {
    const truck = DILEMMAS.filter((d) => d.places.includes('truck'));
    expect(truck.length).toBe(5);
    for (const lang of ['sv', 'en'] as const) {
      const f = pickLang(TABLE, lang).fika;
      for (const d of truck) {
        const t = f.dilemmas[d.id];
        expect(t, `${d.id} ${lang}`).toBeTruthy();
        const all = [t.question, t.explanation, ...d.options.map((o) => t.options[o.id] ?? '')];
        for (const x of all) expect(x.length, `${d.id} ${lang}`).toBeGreaterThan(10);
        const text = all.join(' ').toLowerCase();
        expect(text, d.id).not.toMatch(/bokning|booking|fullbokat|fully booked|sällskap|\bparty\b|hovmästar|head waiter|sommelier|bartender|\bbord\b|\btable\b/);
      }
    }
  });
});
