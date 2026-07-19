import { strings } from '../content/strings.sv';

interface Props {
  isTouch: boolean;
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
}

export function PauseMenu({
  isTouch,
  muted,
  onResume,
  onRestart,
  onToggleMute
}: Props) {
  const controls = isTouch ? strings.controls.mobile : strings.controls.desktop;
  return (
    <div
      className="pause-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="pause-panel">
        <h2 id="pause-title">{strings.pause.title}</h2>
        <div className="pause-actions">
          <button type="button" className="btn primary" onClick={onResume}>
            {strings.pause.resume}
          </button>
          <button type="button" className="btn" onClick={onRestart}>
            {strings.pause.restart}
          </button>
          <button
            type="button"
            className="btn"
            onClick={onToggleMute}
            aria-pressed={muted}
          >
            {muted ? strings.pause.muteOff : strings.pause.muteOn}
          </button>
        </div>
        <section>
          <h3>{strings.pause.controlsHeading}</h3>
          <ul className="control-list">
            {controls.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>{strings.pause.aboutHeading}</h3>
          <p className="disclaimer">{strings.pause.disclaimer}</p>
        </section>
      </div>
    </div>
  );
}
