// ORDER 303 G (Anders 2026-10-04): "Fokusläge: när kameran zoomas in under
// 14 m, eller när spelaren trycker H, fälls panelerna ihop till smala lister i
// kanterna. Kassan, klockan och mätaren syns kvar." body.dataset.focus styr
// CSS:en (service.css, ORDER 303 G); kamerans avstånd läses som HUD:en läser
// det (body.dataset.camDistance, CameraController.tsx).

import { useEffect, useState } from 'react';

export const FOCUS_BELOW_M = 14;
const POLL_MS = 250;

export function FocusMode() {
  const [manual, setManual] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'h' || e.key === 'H') setManual((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const apply = () => {
      const d = Number(document.body.dataset.camDistance);
      const near = Number.isFinite(d) && d > 0 && d < FOCUS_BELOW_M;
      const on = manual || near;
      if ((document.body.dataset.focus === '1') !== on) document.body.dataset.focus = on ? '1' : '';
    };
    apply();
    const id = window.setInterval(apply, POLL_MS);
    return () => { window.clearInterval(id); document.body.dataset.focus = ''; };
  }, [manual]);
  return null;
}
