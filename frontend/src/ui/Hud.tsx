import { strings } from '../content/strings.sv';

interface Props {
  objective: string | null;
  contextPromptLabel: string | null;
  muted: boolean;
  onToggleMute: () => void;
  onOpenPause: () => void;
  isTouch: boolean;
}

export function Hud({
  objective,
  contextPromptLabel,
  muted,
  onToggleMute,
  onOpenPause,
  isTouch
}: Props) {
  return (
    <div className="hud">
      {objective && (
        <div className="hud-objective" role="status" aria-live="polite">
          {objective}
        </div>
      )}
      <div className="hud-topright">
        <button
          type="button"
          className="hud-btn"
          onClick={onToggleMute}
          aria-label={muted ? strings.hud.unmuteAria : strings.hud.muteAria}
          aria-pressed={muted}
        >
          {strings.hud.soundLabel}{' '}
          {muted ? strings.pause.muteOff : strings.pause.muteOn}
        </button>
        <button
          type="button"
          className="hud-btn"
          onClick={onOpenPause}
          aria-label={strings.hud.pauseLabel}
        >
          {strings.hud.pauseLabel}
        </button>
      </div>
      {contextPromptLabel && !isTouch && (
        <div className="hud-context" role="status" aria-live="polite">
          <kbd>E</kbd>
          <span>{contextPromptLabel}</span>
        </div>
      )}
    </div>
  );
}
