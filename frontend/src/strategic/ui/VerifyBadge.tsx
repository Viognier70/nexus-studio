// Persistent chrome informing the viewer of data provenance. Positions
// come from OpenStreetMap; footprints and roads are real; extrusion,
// materials and NPC motion are stylised. Campus Grythyttan — Måltidens hus —
// Sevillapaviljongen are represented as a single canonical location per
// design constitution.
import { strings } from '../../content/strings';

export function VerifyBadge() {
  return (
    <div className="gb-verify-badge" role="status">
      {strings.panels.verifyBadge}
    </div>
  );
}
