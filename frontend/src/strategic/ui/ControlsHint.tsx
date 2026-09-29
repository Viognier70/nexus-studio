import { useState } from 'react';
import { strings } from '../../content/strings';

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
  const c = strings.legacy.controls;
  return (
    <div className="gb-hint" role="note">
      <div>
        {/* ORDER 280 — texten i strängtabellen (svenska och engelska). */}
        <div>
          <b>1</b> {c.village} · <b>2</b> {c.district} · <b>3</b> {c.block} ·{' '}
          <b>4</b> {c.business}
        </div>
        <div style={{ opacity: 0.72, marginTop: 4 }}>
          {[0, 2, 4, 6, 8].map((i) => (
            <span key={i}>{i > 0 ? ' · ' : ''}<b>{c.mouse[i]}</b> {c.mouse[i + 1]}</span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="gb-hint-close"
        onClick={() => setOpen(false)}
        aria-label={c.hide}
      >
        ×
      </button>
    </div>
  );
}
