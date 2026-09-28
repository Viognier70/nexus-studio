import { useState } from 'react';

// ORDER 048 §7 — the player must know what to press. Camera preset
// keys were only wired to jumpToPreset (village / district /
// business / myBusiness) via the desktop-controls hook — no label
// anywhere told the player they existed. This hint now names them
// in plain English alongside the mouse/keyboard basics.
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
          <b>1</b> the village · <b>2</b> the district · <b>3</b> your block ·{' '}
          <b>4</b> your business
        </div>
        <div style={{ opacity: 0.72, marginTop: 4 }}>
          <b>Mouse wheel</b> zooms · <b>left drag</b> pans ·{' '}
          <b>right/middle drag</b> rotates · <b>click</b> selects · <b>Esc</b> out
        </div>
      </div>
      <button
        type="button"
        className="gb-hint-close"
        onClick={() => setOpen(false)}
        aria-label="Hide controls"
      >
        ×
      </button>
    </div>
  );
}
