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

import { useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { strings } from '../../content/strings.sv';
import { useBusiness } from './BusinessContext';
import { useCamera } from '../camera/CameraContext';
import './name-entry.css';
import { useSave } from '../save/SaveContext';
import { useSimState } from '../simulation/SimulationProvider';

const intro = strings.introduction;

interface Props {
  // ORDER 267 — "Nytt spel": till bussen (VS001) och introduktionen.
  onNewGame?: () => void;
}

// ORDER 267 (Nexus v1 etapp 5) — tre lägen innan verksamheten har ett namn:
//   - startrutan: inget spel har börjat (introduktionen har inte körts):
//     "Nytt spel" till bussen, eller fortsätt ett sparat spel;
//   - inget: introduktionen pågår, mentorn leder (ui/MentorPanel.tsx);
//   - namnet: banken har öppnat den första verksamheten.
export function NameEntryOverlay({ onNewGame }: Props) {
  const { hasName, setName } = useBusiness();
  // ORDER 263 — fortsätt ett sparat spel från startrutan.
  const save = useSave();
  const sim = useSimState();
  const { jumpToPreset } = useCamera();
  const [draft, setDraft] = useState('');
  if (hasName) return null;
  if (sim.introduction) return null;
  if (sim.introduction === undefined && onNewGame) {
    return (
      <div className="business-name-overlay" role="dialog" aria-modal="true">
        <div className="business-name-card" data-testid="start-screen">
          <h2>{intro.startHeading}</h2>
          <p>{intro.startSubtitle}</p>
          <div className="business-name-actions">
            <button type="button" data-testid="new-game" onClick={onNewGame}>
              {intro.newGame}
            </button>
            {save.hasAnySave && (
              <button type="button" data-testid="continue-saved" onClick={save.openMenu}>
                {strings.save.continueSaved}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  const cls = sim.economy.businessClass;
  const body = cls ? intro.nameBody(intro.classesIndefinite[cls]) : strings.business.firstRunBody;
  const placeholder = cls ? intro.namePlaceholder : strings.business.firstRunPlaceholder;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    setName(trimmed);
    // ORDER 157 §1 — provspelet 2026-08-31: spelaren döpte sin
    // verksamhet men kameran satt kvar på village. Playwright-scripten
    // sätter `preset=myBusiness` i URL vid mount och landar direkt
    // inne i lokalen; spelaren har ingen sådan väg utan tangent 4
    // (dev-genväg). Efter namn-inmatning zoomar vi in på lokalen —
    // den enda platsen som är meningsfull just då. CameraController
    // dämpar från village (900 m) till myBusiness (28 m) över några
    // sekunder, spelaren ser flygningen.
    jumpToPreset('myBusiness');
  };

  // ORDER 175 — text-inmatning är inte kamerainput. Även om
  // useDesktopControls-guarden numera ignorerar keydown i input, ska
  // overlay:n vara arkitektoniskt isolerad — framtida globala keydown-
  // listeners får inte återinföra buggen med att Enter/Escape i formen
  // också triggar kamera-flygning eller outward.
  const onKeyDown = (e: ReactKeyboardEvent<HTMLFormElement>) => {
    e.stopPropagation();
  };

  return (
    <div className="business-name-overlay" role="dialog" aria-modal="true">
      <form className="business-name-card" onSubmit={onSubmit} onKeyDown={onKeyDown}>
        <h2>{strings.business.firstRunHeading}</h2>
        <p>{body}</p>
        <input
          type="text"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          maxLength={48}
        />
        <div className="business-name-actions">
          <button
            type="submit"
            disabled={draft.trim().length === 0}
          >
            {strings.business.firstRunSubmit}
          </button>
          {save.hasAnySave && (
            <button type="button" data-testid="continue-saved" onClick={save.openMenu}>
              {strings.save.continueSaved}
            </button>
          )}
        </div>
        <p className="business-name-hint">{strings.business.firstRunHint}</p>
      </form>
    </div>
  );
}
