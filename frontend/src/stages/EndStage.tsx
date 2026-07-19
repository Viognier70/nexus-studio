import { useEffect, useRef } from 'react';
import { strings } from '../content/strings.sv';

interface Props {
  onContinue: () => void;
  onRestart: () => void;
}

export function EndStage({ onContinue, onRestart }: Props) {
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  return (
    <div
      className="stage end-stage"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-heading"
    >
      <div className="end-inner">
        <h2 id="end-heading" className="end-heading">
          {strings.end.heading}
        </h2>
        <div className="end-buttons">
          <button
            ref={continueRef}
            type="button"
            className="btn primary"
            onClick={onContinue}
          >
            {strings.end.continueButton}
          </button>
          <button type="button" className="btn" onClick={onRestart}>
            {strings.end.restartButton}
          </button>
        </div>
      </div>
    </div>
  );
}
