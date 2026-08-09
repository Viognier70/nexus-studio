import { useState } from 'react';

// ORDER 048 §7 — the player must know what to press. Camera preset
// keys were only wired to jumpToPreset (village / district /
// business / myBusiness) via the desktop-controls hook — no label
// anywhere told the player they existed. This hint now names them
// in plain Swedish alongside the mouse/keyboard basics.
//
// Compact two-line layout so the hint sits over the room without
// dominating; kept dismissable via the × button. Same anchor at
// bottom-centre as before.

export function ControlsHint() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="gb-hint" role="note">
      <div>
        <div>
          <b>1</b> byn · <b>2</b> kvarteret · <b>3</b> ditt kvarter ·{' '}
          <b>4</b> din verksamhet
        </div>
        <div style={{ opacity: 0.72, marginTop: 4 }}>
          <b>Mushjul</b> zoomar · <b>vänsterdrag</b> panorerar ·{' '}
          <b>höger-/mellandrag</b> roterar · <b>klick</b> väljer · <b>Esc</b> ut
        </div>
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
