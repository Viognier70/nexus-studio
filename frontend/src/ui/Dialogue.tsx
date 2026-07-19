import { useEffect, useRef, useState } from 'react';
import { openingDialogue } from '../content/dialogue';
import { strings } from '../content/strings.sv';
import type { ChoiceId } from '../types';

interface Props {
  onClose: (choice: ChoiceId) => void;
}

const KEY_TO_CHOICE: Record<string, ChoiceId> = {
  '1': 'A',
  '2': 'B',
  '3': 'C',
  a: 'A',
  b: 'B',
  c: 'C'
};

export function Dialogue({ onClose }: Props) {
  const [chosen, setChosen] = useState<ChoiceId | null>(null);
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (chosen) continueRef.current?.focus();
    else firstBtnRef.current?.focus();
  }, [chosen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (chosen) return;
      const mapped = KEY_TO_CHOICE[event.key.toLowerCase()];
      if (mapped) {
        event.preventDefault();
        setChosen(mapped);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [chosen]);

  const response = chosen
    ? openingDialogue.choices.find((choice) => choice.id === chosen) ?? null
    : null;

  return (
    <div
      className="dialogue-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="npc-line"
    >
      <div className="dialogue-panel">
        {!chosen && (
          <>
            <p id="npc-line" className="npc-line">
              — {openingDialogue.prompt}
            </p>
            <ul className="choices" aria-label="Val">
              {openingDialogue.choices.map((choice, index) => (
                <li key={choice.id}>
                  <button
                    ref={index === 0 ? firstBtnRef : undefined}
                    type="button"
                    className="choice"
                    onClick={() => setChosen(choice.id)}
                  >
                    <span className="choice-index">{index + 1}</span>
                    <span>{choice.playerLine}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {chosen && response && (
          <>
            <p className="player-line">— {response.playerLine}</p>
            <p id="npc-line" className="npc-line">
              — {response.npcResponse}
            </p>
            <div className="dialogue-actions">
              <button
                ref={continueRef}
                type="button"
                className="btn primary"
                onClick={() => onClose(chosen)}
              >
                {strings.hud.beginPlay}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
