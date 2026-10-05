// ORDER 309 — fokusläget ur Designs D5 (hudLayout.ts FOCUS_MODE), ersätter
// ORDER 303 G:s enkla form. Slås på när kameran går under 14 m eller med H,
// och av först över 15,5 m (ui/focusState.ts). body.dataset.focus styr
// CSS:en (service.css, ORDER 309): klockan, kassan och mätaren krymper till en
// rad, ställningen blir en tunn rad lyktor, raketkortet en list i vänsterkanten
// med "Raketen" och flikarna en mindre rad. Kortet för gäst och personal
// stängs. Ett klick på raketens list fäller ut kortet igen
// (body.dataset.focusUnfold). Panelerna fälls på FOCUS_MODE.foldMs.
//
// Avvikelse från D5 (rapporten): raketkortet fälls inte medan det frågar
// (data-mode ask och right). Raketens kamera glider in till 12 m
// (balance.ts THEATRE.camera), alltså under 14 m, och kortet är då det
// spelaren ska svara i.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { strings } from '../../content/strings';
import { FOCUS_MODE } from './hudLayout';
import { focusModeOn, focusState, focusStep, setFocusState, subscribeFocusMode, toggleFocusMode } from './focusState';
import { setOpenCard } from './statusCardStore';

export const FOCUS_BELOW_M = FOCUS_MODE.enterBelowM;
const POLL_MS = 250;
const ASKING = new Set(['ask', 'right']);

export function FocusMode() {
  const on = useSyncExternalStore(subscribeFocusMode, focusModeOn, focusModeOn);
  const [strip, setStrip] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'h' || e.key === 'H') toggleFocusMode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const apply = () => {
      // Kamerans avstånd: CameraController.tsx skriver det avrundat (camDistance);
      // rummets figurer skriver det med två decimaler (camDist) medan rummet syns.
      const rounded = Number(document.body.dataset.camDistance);
      const fine = Number(document.body.dataset.camDist);
      const d = Number.isFinite(fine) && Math.abs(fine - rounded) <= 0.5 ? fine : rounded;
      setFocusState(focusStep(focusState(), d));
      // Raketens list: kortet finns, frågar inte och är inte utfällt.
      const card = document.querySelector('.nx-rocket');
      const mode = card?.getAttribute('data-mode') ?? '';
      const folded = !!card && !ASKING.has(mode) && document.body.dataset.focusUnfold !== 'rocket';
      setStrip(focusModeOn() && folded);
      if (!card && document.body.dataset.focusUnfold) document.body.dataset.focusUnfold = '';
    };
    apply();
    const id = window.setInterval(apply, POLL_MS);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    document.body.dataset.focus = on ? '1' : '';
    if (on) setOpenCard(null);
    else document.body.dataset.focusUnfold = '';
    // HUD:ens nederkant (HudBottom.tsx) mäts om när panelerna har fällts.
    const id = window.setTimeout(() => window.dispatchEvent(new Event('resize')), FOCUS_MODE.foldMs + 20);
    return () => window.clearTimeout(id);
  }, [on]);
  useEffect(() => () => { document.body.dataset.focus = ''; document.body.dataset.focusUnfold = ''; }, []);
  if (!strip) return null;
  return (
    <button
      type="button"
      className="nx-focus-strip nx-focus-strip-rocket"
      data-testid="focus-strip-rocket"
      onClick={() => { document.body.dataset.focusUnfold = 'rocket'; setStrip(false); }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path d="M12 3 L21 19 H3 Z" fill="#5fbf77" stroke="#2f7d45" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M7.4 11.2 H16.6 M5.2 15.1 H18.8" stroke="#f5ead5" strokeWidth="1" />
      </svg>
      <span>{strings.foljder.rocketStrip}</span>
    </button>
  );
}
