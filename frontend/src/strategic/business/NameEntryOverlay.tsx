// First-run overlay asking the player to name the restaurant.
//
// ORDER 042 §3.1: "a name the player sets on first run". Shown once —
// as long as `business.name` is null the overlay is up; the moment a
// name is committed, the overlay unmounts and does not reappear this
// session.
//
// Not a modal-dialog in the DOM `<dialog>` sense — a plain overlay,
// styled to sit over the canvas without blocking the WebGL context.
// Text per strings.sv.ts (CLAUDE.md rule 7). No numbers, no HUD.

import { useState, type FormEvent } from 'react';
import { strings } from '../../content/strings.sv';
import { useBusiness } from './BusinessContext';
import './name-entry.css';

export function NameEntryOverlay() {
  const { hasName, setName } = useBusiness();
  const [draft, setDraft] = useState('');
  if (hasName) return null;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    setName(trimmed);
  };

  return (
    <div className="business-name-overlay" role="dialog" aria-modal="true">
      <form className="business-name-card" onSubmit={onSubmit}>
        <h2>{strings.business.firstRunHeading}</h2>
        <p>{strings.business.firstRunBody}</p>
        <input
          type="text"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={strings.business.firstRunPlaceholder}
          aria-label={strings.business.firstRunPlaceholder}
          maxLength={48}
        />
        <div className="business-name-actions">
          <button
            type="submit"
            disabled={draft.trim().length === 0}
          >
            {strings.business.firstRunSubmit}
          </button>
        </div>
        <p className="business-name-hint">{strings.business.firstRunHint}</p>
      </form>
    </div>
  );
}
