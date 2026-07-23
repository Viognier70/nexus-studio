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
        <h2 id="gb-about-title">Om denna prototyp</h2>
        <p className="gb-lead">
          <strong>Nexus — Vertikal skiva 002A: Gray Box Grythyttan.</strong>
        </p>
        <p>
          Detta är en <em>gray box</em>-representation av Grythyttan. Den finns för
          att pröva den strategiska kamerans känsla och för att göra byns
          rumsliga struktur igenkännbar. Ingen grafik, arkitektur eller position
          är avsedd som verklighetstrogen.
        </p>
        <h3>Geografisk status</h3>
        <p>
          Alla positioner, byggnadsformer och vägdragningar är approximerade.
          Ingen koordinat är hämtad från en verifierad källa. Verifiering
          återstår för alla landmärken.
        </p>
        <h3>Kontroller</h3>
        <ul className="gb-controls">
          <li><b>Mushjul</b> — zooma kontinuerligt</li>
          <li><b>Vänsterdrag</b> — panorera</li>
          <li><b>Höger- eller mellandrag</b> — rotera</li>
          <li><b>Q / E</b> — rotera vy</li>
          <li><b>Klick på byggnad</b> — välj</li>
          <li><b>Esc</b> — zooma ut ett steg</li>
          <li><b>1 / 2 / 3</b> — utvecklarhopp mellan skalor</li>
          <li>På mobil: <b>nyp</b> zoomar, <b>ett finger</b> panorerar,
              <b>två fingrar</b> roterar</li>
        </ul>
        <div className="gb-modal-actions">
          <button type="button" className="gb-btn primary" onClick={onClose}>
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}
