// ORDER 299 — HUD:ens nederkant (klockan, kassan och Byn i kväll, .gb-topleft),
// mätt i pixlar. Raketkortet börjar under den (CSS-variabeln --nx-hud-bottom)
// och händelsens bildtext hålls nedanför den (scene/safeCaption.ts), så att
// ingen panel täcker kortet eller texten när bandet växer (mätaren, Lugn kväll).

import { useEffect } from 'react';

export const hudBottomPx = { current: 0 };

export function HudBottom() {
  useEffect(() => {
    const el = document.querySelector('.gb-topleft');
    if (!el) return;
    const update = () => {
      const b = Math.round(el.getBoundingClientRect().bottom);
      hudBottomPx.current = b;
      document.documentElement.style.setProperty('--nx-hud-bottom', `${b}px`);
    };
    update();
    // Utan ResizeObserver (äldre webbläsare, testernas DOM) räcker fönstrets storlek.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener('resize', update);
    return () => { ro?.disconnect(); window.removeEventListener('resize', update); };
  }, []);
  return null;
}
