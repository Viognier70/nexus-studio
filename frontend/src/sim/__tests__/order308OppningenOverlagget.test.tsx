// @vitest-environment jsdom
// ORDER 308 — öppningens överlägg i jsdom (OpeningSequence.tsx), med falsk
// klocka: en tangent före 3 s hoppar inte över, knappen Hoppa över syns från
// 3 s, en tangent efter 3 s går till svärtan och morgonen tonar upp
// (onDone efter FADE_UP_S). HUD:en är dold medan öppningen pågår
// (body[data-opening]). Med prefers-reduced-motion står data-reduced = 1.
// Vinbarens dukar kan inte få WebGL i jsdom; överlägget klarar sig utan dem.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { CameraProvider } from '../../strategic/camera/CameraContext';
import { OpeningSequence } from '../../strategic/opening/OpeningSequence';
import { markOpeningSceneReady } from '../../strategic/opening/openingStage';
import { FADE_UP_S, OPENING_END } from '../../strategic/opening/openingTimeline';
import { setLanguage } from '../../content/language';

function mount(onDone: () => void) {
  return render(createElement(CameraProvider, null, createElement(OpeningSequence, { onDone })));
}
function setReduced(on: boolean) {
  (window as unknown as { matchMedia: unknown }).matchMedia = (q: string) => ({ matches: on && q.includes('reduce'), media: q, addEventListener: () => {}, removeEventListener: () => {} });
}
const tOf = (el: HTMLElement) => Number(el.getAttribute('data-t'));
const advance = (ms: number) => act(() => { for (let i = 0; i < ms; i += 16) vi.advanceTimersByTime(16); });

describe('ORDER 308 — öppningens överlägg', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout'] });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // jsdom under Node 26 har ingen localStorage och ingen matchMedia: små ersättare.
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, String(v)); }, removeItem: (k: string) => { store.delete(k); } });
    setReduced(false);
    setLanguage('sv');
    markOpeningSceneReady();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('tangent före 3 s hoppar inte över; efter 3 s går den till morgonen', () => {
    const onDone = vi.fn();
    const r = mount(onDone);
    const ov = r.getByTestId('opening');
    advance(1000);
    expect(document.body.dataset.opening).toBe('1');
    expect(r.queryByTestId('opening-skip')).toBeNull();
    fireEvent.keyDown(window, { key: 'a' });
    advance(100);
    expect(tOf(ov)).toBeLessThan(2);
    advance(2400);
    expect(tOf(ov)).toBeGreaterThanOrEqual(3);
    expect(r.getByTestId('opening-skip').textContent).toBe('Hoppa över');
    // Platsen och rad 1 står på svenska.
    expect(r.getByTestId('opening-title').textContent).toContain('En säsong. Åtta veckor.');
    fireEvent.keyDown(window, { key: 'a' });
    advance(50);
    expect(tOf(ov)).toBeGreaterThanOrEqual(OPENING_END);
    expect(document.body.dataset.opening).toBeUndefined();
    expect(onDone).not.toHaveBeenCalled();
    advance(FADE_UP_S * 1000 + 200);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('nexus.openingSeen')).toBe('1');
  });

  it('knappen Hoppa över, och den som sett öppningen kan hoppa över direkt', () => {
    localStorage.setItem('nexus.openingSeen', '1');
    const onDone = vi.fn();
    const r = mount(onDone);
    advance(200);
    fireEvent.click(r.getByTestId('opening-skip'));
    advance(FADE_UP_S * 1000 + 300);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('minskad rörelse syns i överlägget', () => {
    setReduced(true);
    const r = mount(() => {});
    advance(100);
    expect(r.getByTestId('opening').getAttribute('data-reduced')).toBe('1');
  });
});
