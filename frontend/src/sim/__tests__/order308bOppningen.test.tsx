// @vitest-environment jsdom
// ORDER 308b — Anders beslut 2026-10-05 om öppningen:
//   1. Nålen över krogen: Vinbaren som kan bli din / The wine bar that could be yours.
//      Raderna Målet är stjärnan och Från midsommar till kräftskiva står kvar.
//   2. Den som har sett öppningen ser den igen (flödet går alltid via öppningen)
//      och kan hoppa över den direkt, med knappen eller en tangent.
//   3. Öppningens eget ljus gäller bara medan öppningen spelas; spelets
//      kvällsljus utan det är oförändrat.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stringsFor } from '../../content/strings';
import { setLanguage } from '../../content/language';
import { CameraProvider } from '../../strategic/camera/CameraContext';
import { OpeningSequence } from '../../strategic/opening/OpeningSequence';
import { markOpeningSceneReady, setOpeningStage } from '../../strategic/opening/openingStage';
import { FADE_UP_S, OPENING_END } from '../../strategic/opening/openingTimeline';
import { NEW_GAME_FLOW_START, flowScreen, newGameFlow } from '../../strategic/opening/newGameFlow';
import { BAR_EXPOSURE_GAIN, OPENING_LIGHT_GAIN, openingLight, openingLightGain } from '../../strategic/opening/openingLight';
import { eveningLightAt, levelLight, paletteScale, skyAt } from '../../strategic/village/EveningLighting';
import { VILLAGE_LIGHT } from '../../strategic/village/villageEvening';
import { VILLAGE_LIGHT_LEVEL } from '../../strategic/opening/oppningManus';

const SRC = resolve(__dirname, '../../strategic');

describe('ORDER 308b — 1. texten', () => {
  it('nålen över krogen på svenska och engelska', () => {
    expect(stringsFor('sv').prologue.yours).toBe('Vinbaren som kan bli din');
    expect(stringsFor('en').prologue.yours).toBe('The wine bar that could be yours');
  });
  it('raderna om stjärnan och säsongen står kvar', () => {
    expect(stringsFor('sv').prologue.goal).toBe('Målet är stjärnan.');
    expect(stringsFor('en').prologue.goal).toBe('The goal is the star.');
    expect(stringsFor('sv').prologue.line2).toBe('Från midsommar till kräftskiva.');
    expect(stringsFor('en').prologue.line2).toBe('From midsummer to the crayfish party.');
  });
});

const tOf = (el: HTMLElement) => Number(el.getAttribute('data-t'));
const advance = (ms: number) => act(() => { for (let i = 0; i < ms; i += 16) vi.advanceTimersByTime(16); });

describe('ORDER 308b — 2. den som har sett öppningen', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout'] });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = new Map<string, string>([['nexus.openingSeen', '1']]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, String(v)); }, removeItem: (k: string) => { store.delete(k); } });
    (window as unknown as { matchMedia: unknown }).matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} });
    setLanguage('sv');
    markOpeningSceneReady();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('flödet går via öppningen också när den är sedd', () => {
    const s = newGameFlow(NEW_GAME_FLOW_START, { type: 'newGame', player: { name: 'Anders' } as never });
    expect(flowScreen(s)).toBe('opening');
  });

  it('öppningen spelas, och Hoppa över syns före 3 s', () => {
    const r = render(createElement(CameraProvider, null, createElement(OpeningSequence, { onDone: () => {} })));
    advance(300);
    const ov = r.getByTestId('opening');
    expect(tOf(ov)).toBeLessThan(1);
    expect(r.getByTestId('opening-skip').textContent).toBe('Hoppa över');
  });

  it('en tangent före 3 s hoppar över och tar spelaren till morgonen', () => {
    const onDone = vi.fn();
    const r = render(createElement(CameraProvider, null, createElement(OpeningSequence, { onDone })));
    advance(200);
    fireEvent.keyDown(window, { key: ' ' });
    advance(50);
    expect(tOf(r.getByTestId('opening'))).toBeGreaterThanOrEqual(OPENING_END);
    advance(FADE_UP_S * 1000 + 200);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('ORDER 308b — 3. öppningens ljus bara under öppningen', () => {
  afterEach(() => setOpeningStage({ active: false, t: 0, e: 0 }));

  it('openingLight är null när öppningen inte spelas och har förstärkning när den spelas', () => {
    setOpeningStage({ active: false, t: 0, e: 0 });
    expect(openingLight()).toBeNull();
    setOpeningStage({ active: true, t: 9, e: 0.12 });
    const o = openingLight();
    expect(o).not.toBeNull();
    expect(o!.level).toBe(VILLAGE_LIGHT_LEVEL);
    expect(o!.e).toBeCloseTo(0.12, 2);
    for (const d of [660, 381, 107, 49, 37, 24]) {
      const g = o!.gain(d);
      expect(g.light, `${d}`).toBeGreaterThan(1);
      expect(g.exposure, `${d}`).toBeGreaterThanOrEqual(1);
    }
    setOpeningStage({ active: false, t: 42, e: 0.34 });
    expect(openingLight()).toBeNull();
  });

  it('kvällsljuset utan öppningens förstärkning är spelets formel, oförändrad', () => {
    for (const e of [0, 0.2, 0.5, 0.9]) {
      const sky = skyAt(e);
      for (const d of [660, 210, 95, 42, 24]) {
        for (const level of [0.5, 1, 1.4]) {
          const LL = level * levelLight(d) * paletteScale(d);
          const v = eveningLightAt(sky, d, level);
          expect(v.hemi).toBeCloseTo(sky.hemi * LL, 10);
          expect(v.moon).toBeCloseTo(sky.moonI * (0.5 + 0.5 * LL), 10);
          expect(v.exposure).toBeCloseTo(sky.exposure * (1 + VILLAGE_LIGHT.exposurePerLevel * (level - 1)), 10);
        }
      }
    }
  });

  it('med förstärkningen blir byn ljusare', () => {
    const sky = skyAt(0.15);
    for (const d of [660, 107, 49, 37]) {
      const plain = eveningLightAt(sky, d, VILLAGE_LIGHT_LEVEL);
      const lit = eveningLightAt(sky, d, VILLAGE_LIGHT_LEVEL, openingLightGain);
      expect(lit.hemi).toBeGreaterThan(plain.hemi);
      expect(lit.exposure).toBeGreaterThanOrEqual(plain.exposure);
    }
    expect(openingLightGain(5000)).toEqual({ light: OPENING_LIGHT_GAIN[0].light, exposure: OPENING_LIGHT_GAIN[0].exposure });
    expect(BAR_EXPOSURE_GAIN).toBeGreaterThan(1);
  });

  it('bara öppningens gren i DayLighting får förstärkningen', () => {
    const src = readFileSync(resolve(SRC, 'scene/DayLighting.tsx'), 'utf8');
    const uses = src.match(/<EveningLighting[^>]*\/>/g) ?? [];
    expect(uses.length).toBe(2);
    expect(uses.filter((u) => /gain=/.test(u))).toEqual(['<EveningLighting e={opening.e} level={opening.level} gain={opening.gain} />']);
    expect(src).toMatch(/const opening = useOpeningLight\(\);\s*if \(opening !== null\)/);
  });
});
