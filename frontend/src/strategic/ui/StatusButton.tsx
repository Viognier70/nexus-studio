// ORDER 303 F — knappen och tangenten S för statusläget (ui/statusMode.ts).

import { useEffect, useSyncExternalStore } from 'react';
import { strings } from '../../content/strings';
import { statusModeOn, subscribeStatusMode, toggleStatusMode } from './statusMode';

export function StatusButton() {
  const on = useSyncExternalStore(subscribeStatusMode, statusModeOn, statusModeOn);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 's' || e.key === 'S') toggleStatusMode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <button type="button" className={`nx-level nx-status-button${on ? ' is-on' : ''}`} aria-pressed={on} data-testid="status-mode" title={strings.status.hint} onClick={toggleStatusMode}>
      {strings.village.levels.withKey(strings.status.button, 'S')}
    </button>
  );
}
