// Persistent chrome informing the viewer of data provenance. Positions
// come from OpenStreetMap; footprints and roads are real; extrusion,
// materials and NPC motion are stylised. Campus Grythyttan — Måltidens hus —
// Sevillapaviljongen are represented as a single canonical location per
// design constitution.
export function VerifyBadge() {
  return (
    <div className="gb-verify-badge" role="status">
      GRAY BOX — © OpenStreetMap contributors (ODbL) · byggnadshöjder och
      material stiliserade
    </div>
  );
}
