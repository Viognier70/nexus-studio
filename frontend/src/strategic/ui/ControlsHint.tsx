import { useState } from 'react';

export function ControlsHint() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="gb-hint" role="note">
      <div>
        <b>Mushjul</b> zoomar · <b>vänsterdrag</b> panorerar ·{' '}
        <b>höger-/mellandrag</b> roterar · <b>klick</b> väljer · <b>Esc</b> ut
      </div>
      <button
        type="button"
        className="gb-hint-close"
        onClick={() => setOpen(false)}
        aria-label="Dölj kontroller"
      >
        ×
      </button>
    </div>
  );
}
