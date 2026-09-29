// juice — hur siffror och pengar rör sig. Balatro-känslan i fem verb:
// bump (knuff per tick), slam (sista ticket), shake, popIn och fly.
// Web Animations API, inget bibliotek. Samma värden som i prototypen.
//
// Regel: text i räknare skrivs imperativt (textContent) i en span som React
// inte äger, så att 60 fps-tick inte renderar om hela HUD:en.

export type Juice = 'balatro' | 'calm';
let J = 1;
export const setJuice = (j: Juice) => { J = j === 'calm' ? 0.35 : 1; };
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Vid reduced motion: setJuice('calm') och hoppa över shake.

/** Knuff per tick. s = 1,05 → 1,17 under räkningen. 160 ms. */
export function bump(el: Element | null, s: number) {
  if (!el) return;
  const rot = (Math.random() * 2 - 1) * 4 * J;
  el.animate([{ transform: 'none' }, { transform: `scale(${1 + (s - 1) * J}) rotate(${rot}deg)` }, { transform: 'none' }], { duration: 160, easing: 'ease-out' });
}

/** Sista ticket. 1,35× (1,7× för stora belopp), −4°, studs. 420 ms. */
export function slam(el: Element | null, big = false) {
  if (!el) return;
  const k = big ? 1.7 : 1.35;
  el.animate([{ transform: `scale(${1 + (k - 1) * J}) rotate(${-4 * J}deg)` }, { transform: `scale(${1 - 0.06 * J})`, offset: 0.55 }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,1.4,.4,1)' });
}

/** Sidledes skak. 10 px panel, 14 px vinst, 18 px krasch. 380 ms. */
export function shake(el: Element | null, amp = 10) {
  if (!el || reducedMotion()) return;
  const a = amp * J;
  el.animate([0, -1, 1, -0.8, 0.6, -0.3, 0].map(v => ({ transform: `translateX(${v * a}px)` })), { duration: 380 });
}

/** In från 0,3×, −10°, över till 1,25×. 340 ms, fill forwards. Nollställ med getAnimations().forEach(a => a.cancel()). */
export function popIn(el: Element | null, delay = 0) {
  if (!el) return;
  el.animate([{ opacity: 0, transform: `scale(.3) rotate(${-10 * J}deg)` }, { opacity: 1, transform: `scale(${1 + 0.25 * J}) rotate(${3 * J}deg)`, offset: 0.6 }, { opacity: 1, transform: 'none' }], { duration: 340, delay, fill: 'forwards', easing: 'cubic-bezier(.2,1.3,.4,1)' });
}

/** Grunden lyser upp och tonar tillbaka. accent-100 (in), accent-200 (ut). 650 ms. */
export function flash(el: HTMLElement | null, color: string) {
  if (!el) return;
  el.animate([{ backgroundColor: color }, { backgroundColor: getComputedStyle(el).backgroundColor }], { duration: 650, easing: 'ease-out' });
}

export interface Counter { value: number; shown: number; timer?: number; paint: (v: number) => void }

/**
 * Stegvis räkning — inte mjuk. Varje steg skriver en ny siffra och knuffar.
 * Stegen går allt fortare (1,4× → 0,6× av medeltiden). Sista steget smäller.
 * ticks: 9 kassa vid inköp · 8 kassa vid betalning · 6 dricks · 12 svinn
 *        14 miljöavgift · 18 raketvinst (egen kurva, 95 → 25 ms)
 */
export function countTo(c: Counter, to: number, o: { ticks?: number; dur?: number; pop?: Element | null; box?: HTMLElement | null; flashColor?: string; big?: boolean } = {}) {
  clearTimeout(c.timer);
  const from = c.shown, steps = Math.max(1, o.ticks ?? 8), dur = o.dur ?? 480; let i = 0;
  c.value = to;
  const step = () => {
    i++; const k = i / steps;
    c.shown = k >= 1 ? to : from + (to - from) * (1 - (1 - k) ** 2);
    c.paint(Math.round(c.shown));
    if (k < 1) { bump(o.pop ?? null, 1.05 + 0.12 * k); c.timer = window.setTimeout(step, (dur / steps) * (1.4 - 0.8 * k)); }
    else { slam(o.pop ?? null, o.big); if (o.box && o.flashColor) flash(o.box, o.flashColor); }
  };
  step();
}

/**
 * Beloppet lyfter, gungar och flyger till målet. Räknaren startar FÖRST när
 * lappen landar (onfinish). Koordinater i skärmens 1920×1080-rum.
 * mode 'to' 900 ms · 'rise' 1100 ms (2×, 3× från raketen) · 'fall' 1000 ms (förlust).
 */
export function fly(layer: HTMLElement, text: string, from: DOMRect, to: DOMRect | null, o: { bg: string; fg?: string; size?: number; mode?: 'to' | 'rise' | 'fall'; done?: () => void }) {
  const d = document.createElement('div');
  d.textContent = text;
  d.className = 'nx-fly';   // position:absolute; font: 700 var(--size) var(--font-heading); padding 8px 12px; shadow-md; tabular-nums; nowrap
  const L = layer.getBoundingClientRect(), k = L.width / 1920;
  const ax = (from.left + from.width / 2 - L.left) / k, ay = (from.top + from.height / 2 - L.top) / k;
  Object.assign(d.style, { left: ax + 'px', top: ay + 'px', background: o.bg, color: o.fg ?? '#fff', fontSize: (o.size ?? 30) + 'px' });
  layer.appendChild(d);
  const b = 'translate(-50%,-50%)'; let kf: Keyframe[], dur = 900, easing = 'cubic-bezier(.45,0,.25,1)';
  const mode = o.mode ?? (to ? 'to' : 'rise');
  if (mode === 'fall') { kf = [{ transform: `${b} scale(${1 + 0.2 * J})`, opacity: 1 }, { transform: `${b} translate(${20 * J}px,170px) rotate(${16 * J}deg) scale(.85)`, opacity: 0 }]; dur = 1000; easing = 'cubic-bezier(.55,0,1,.45)'; }
  else if (mode === 'rise' || !to) { kf = [{ transform: `${b} scale(.3)`, opacity: 0 }, { transform: `${b} translateY(-30px) scale(${1 + 0.25 * J}) rotate(${-4 * J}deg)`, opacity: 1, offset: 0.25 }, { transform: `${b} translateY(-100px) scale(1)`, opacity: 0 }]; dur = 1100; }
  else {
    const dx = (to.left + to.width / 2 - L.left) / k - ax, dy = (to.top + to.height / 2 - L.top) / k - ay;
    kf = [{ transform: `${b} scale(.3) rotate(${-10 * J}deg)`, opacity: 0 }, { transform: `${b} translateY(-26px) scale(${1 + 0.2 * J}) rotate(${4 * J}deg)`, opacity: 1, offset: 0.22 }, { transform: `${b} translateY(-34px) scale(1)`, opacity: 1, offset: 0.42 }, { transform: `${b} translate(${dx}px,${dy}px) scale(.55)`, opacity: 0.85 }];
  }
  d.animate(kf, { duration: dur, easing }).onfinish = () => { d.remove(); o.done?.(); };
}
