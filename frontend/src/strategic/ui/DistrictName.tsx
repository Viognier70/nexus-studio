// ORDER 332 D — kvarterets namn på nivån Byn i HUD-lagret. DOM:en står här (som VillageLabels.tsx) så att
// scenfilen (scene/village/DistrictLabels.tsx) bara har R3F-element.

import { strings } from '../../content/strings';
import type { DistrictId } from '../../sim/districts';

export function DistrictName({ id, opacity }: { id: DistrictId; opacity: number }) {
  return (
    <div className="nx-district-label" data-testid="district-label" data-district={id} style={{ opacity }}>
      {strings.village.districts[id]}
    </div>
  );
}
