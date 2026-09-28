interface Props {
  open: boolean;
  onClose: () => void;
}

export function AboutPanel({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="gb-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gb-about-title"
    >
      <div className="gb-modal-panel">
        <h2 id="gb-about-title">About this prototype</h2>
        <p className="gb-lead">
          <strong>Nexus — Vertical slice 002A: Gray Box Grythyttan.</strong>
        </p>
        <p>
          This is a <em>gray box</em> representation of Grythyttan. It exists to
          test the feel of the strategic camera and to make the village's
          spatial structure recognisable. No graphics, architecture or position
          is meant to be true to life.
        </p>
        <h3>Geographic status</h3>
        <p>
          All positions, building shapes and road layouts are approximate.
          No coordinate is taken from a verified source. Verification
          remains for all landmarks.
        </p>
        <h3>Controls</h3>
        <ul className="gb-controls">
          <li><b>Mouse wheel</b> — zoom smoothly</li>
          <li><b>Left drag</b> — pan</li>
          <li><b>Right or middle drag</b> — rotate</li>
          <li><b>Q / E</b> — rotate view</li>
          <li><b>Click a building</b> — select</li>
          <li><b>Esc</b> — zoom out one step</li>
          <li><b>1 / 2 / 3</b> — developer jump between scales</li>
          <li>On mobile: <b>pinch</b> zooms, <b>one finger</b> pans,
              <b>two fingers</b> rotate</li>
        </ul>
        <div className="gb-modal-actions">
          <button type="button" className="gb-btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
