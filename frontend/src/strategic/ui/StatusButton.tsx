// ORDER 309 — knapparna Status (S) och Fokus (H) ur Designs D5 (staffStatus.ts
// STATUS_MODE, hudLayout.ts modeKeys): två knappar som visar sina tangenter,
// guld när läget är på. Ersätter ORDER 303 F:s knapp Status (S) i nivåraden.
// Statusläget dämpar inte rummet och pausar inte tiden (STATUS_MODE.dimRoom 0).

import { useEffect, useSyncExternalStore } from 'react';
import { strings } from '../../content/strings';
import { setStatusMode, statusModeOn, subscribeStatusMode, toggleStatusMode } from './statusMode';
import { focusModeOn, subscribeFocusMode, toggleFocusMode } from './focusState';
import { setOpenCard } from './statusCardStore';
import { STATUS_MODE } from '../scene/staffStatus';
import { FOCUS_MODE } from './hudLayout';

export function ModeKeys() {
  const status = useSyncExternalStore(subscribeStatusMode, statusModeOn, statusModeOn);
  const focus = useSyncExternalStore(subscribeFocusMode, focusModeOn, focusModeOn);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key.toUpperCase() === STATUS_MODE.key) toggleStatusMode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // Kortet hör till statusläget: det stängs när läget slås av.
  useEffect(() => { if (!status) setOpenCard(null); }, [status]);
  const s = strings.foljder;
  return (
    <div className="nx-mode-keys" data-testid="mode-keys">
      <button type="button" className={`nx-mode-key${status ? ' is-on' : ''}`} aria-pressed={status} data-testid="status-mode" title={s.statusHint} onClick={() => setStatusMode(!status)}>
        <kbd className="nx-mode-cap">{STATUS_MODE.key}</kbd>
        <span>{s.statusButton}</span>
      </button>
      <button type="button" className={`nx-mode-key${focus ? ' is-on' : ''}`} aria-pressed={focus} data-testid="focus-mode" title={s.focusHint} onClick={toggleFocusMode}>
        <kbd className="nx-mode-cap">{FOCUS_MODE.key}</kbd>
        <span>{s.focusButton}</span>
      </button>
    </div>
  );
}
