// ORDER 280 — kassan och krediterna i HUD:en ändras bara genom countTo, och
// när en lapp flyger dit först när den har landat (Designs INSTRUKTION §1,
// "Kassan i HUD:en ska aldrig hoppa").
//
// Simuleringen drar beloppet direkt (state.cash), men HUD:en visar
// `state.cash − pending` så länge lappen är i luften. När lappen landar
// minskas pending och HUD:en räknar i steg till det nya beloppet.
// Målen (HUD-rutorna) registrerar sig med id; lagret för lapparna är ett
// fast element över hela skärmen.

import { fly, reducedMotion } from './juice';

export type FxTarget = 'cash' | 'credits';

const targets: Partial<Record<FxTarget, HTMLElement>> = {};
const pending: Record<FxTarget, number> = { cash: 0, credits: 0 };
const listeners = new Set<() => void>();

export function registerTarget(id: FxTarget, el: HTMLElement | null): void {
  if (el) targets[id] = el;
  else delete targets[id];
}

export function pendingFor(id: FxTarget): number {
  return pending[id];
}

export function subscribeFx(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

let layer: HTMLElement | null = null;
function flyLayer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (layer && document.body.contains(layer)) return layer;
  layer = document.createElement('div');
  layer.className = 'nx-fly-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset.testid = 'fly-layer';
  document.body.appendChild(layer);
  return layer;
}

// En lapp från `from` till HUD-rutan. `delta` är beloppet som redan har
// dragits i simuleringen (negativt vid inköp); HUD:en visar det först när
// lappen landat. Utan mål eller med reduced motion räknas beloppet direkt.
// Högst en lapp per FLY_GAP_MS; tätare betalningar (4× en lördag) räknas
// direkt i rutan.
const FLY_GAP_MS = 250;
let lastFly = 0;

export function flyTo(id: FxTarget, from: Element | null, text: string, delta: number, o: { bg: string; fg?: string; mode?: 'to' | 'rise' | 'fall' } ): void {
  const target = targets[id];
  const l = flyLayer();
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  if (!from || !target || !l || reducedMotion() || now - lastFly < FLY_GAP_MS) { notify(); return; }
  lastFly = now;
  pending[id] += delta;
  notify();
  fly(l, text, from.getBoundingClientRect(), o.mode === 'fall' ? null : target.getBoundingClientRect(), {
    bg: o.bg, fg: o.fg, mode: o.mode,
    done: () => { pending[id] -= delta; notify(); }
  });
}

// En lapp som faller ur en HUD-ruta (förlorade krediter, Designs B1 "fall").
export function fallFrom(id: FxTarget, text: string, o: { bg: string; fg?: string }): void {
  const target = targets[id];
  const l = flyLayer();
  if (!target || !l || reducedMotion()) return;
  fly(l, text, target.getBoundingClientRect(), null, { bg: o.bg, fg: o.fg, mode: 'fall' });
}

export function targetElement(id: FxTarget): HTMLElement | null {
  return targets[id] ?? null;
}

// ORDER 280 — sopbilens avgift dras när servicen stänger, men HUD:en visar
// den först när lappen från S1 har landat (Designs §1 och §6). Tills dess
// hålls avgiften utanför kassarutan; nyckeln är dagens avräkning.
const released = new Set<string>();
export function isReleased(key: string): boolean {
  return released.has(key);
}
export function release(key: string): void {
  if (released.has(key)) return;
  released.add(key);
  notify();
}
