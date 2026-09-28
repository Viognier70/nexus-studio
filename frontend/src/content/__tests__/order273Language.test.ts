// ORDER 273 — språket som inställning: standard engelska, byte med
// setLanguage, och `strings` följer med också där en nod hålls på modulnivå.

import { afterEach, describe, expect, it } from 'vitest';
import { getLanguage, setLanguage, DEFAULT_LANG } from '../language';
import { strings, stringsFor } from '../strings';
import { STRINGS } from '../nexusStrings';

// Som komponenterna gör: en nod hålls på modulnivå (t.ex. PlayerPanel `T`).
const heldNode = strings.rocket.meters;

afterEach(() => setLanguage('en'));

describe('ORDER 273 — språket', () => {
  it('spelet går på engelska som standard', () => {
    expect(DEFAULT_LANG).toBe('en');
    expect(getLanguage()).toBe('en');
    expect(strings.rocket.meters.cash).toBe(STRINGS['hud.meter.cash'].en);
  });

  it('setLanguage byter strings, också i en nod som hålls på modulnivå', () => {
    setLanguage('sv');
    expect(getLanguage()).toBe('sv');
    expect(strings.rocket.meters.cash).toBe(STRINGS['hud.meter.cash'].sv);
    expect(heldNode.staff).toBe(STRINGS['hud.meter.staff'].sv);
    expect(strings.service.clock.left(1, 42)).toBe('1 h 42 min kvar');
    setLanguage('en');
    expect(heldNode.staff).toBe(STRINGS['hud.meter.staff'].en);
    expect(strings.service.clock.left(1, 42)).toBe('1 h 42 min left');
  });

  it('strings har samma nycklar som tabellen för språket (Object.keys, spridning)', () => {
    expect(Object.keys(strings.businessClass)).toEqual(Object.keys(stringsFor('en').businessClass));
    expect({ ...strings.calendar.weekdays }).toEqual(stringsFor('en').calendar.weekdays);
  });
});
