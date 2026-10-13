// ORDER 332 D — kvarterens namn på nivån Byn (avsnitt 7: "kvarterens namn syns på nivån Byn"; namnen ur Designs
// D15 d15Strings.js quarter.*). Ett namn per kvarter vid kvarterets labelAt (content/districtBorders.ts), i
// HUD-lagret som byns andra etiketter (drei Html). Namnet tonas in när kameran går ut mot byns nivå (660 m,
// villageEvening.ts LEVELS.village) och är borta på kvarterets nivå (210 m) och närmare. Lugnare än krogarnas
// skyltar: ingen ruta, bara namnet i versaler (service.css .nx-district-label). LabelDeclutter.tsx döljer ett
// namn som skulle ligga på en krogs skylt.

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { useCamera } from '../../camera/CameraContext';
import { DistrictName } from '../../ui/DistrictName';
import { useLanguage } from '../../../content/language';
import { DISTRICT_IDS } from '../../../sim/districts';
import { DISTRICT_AREAS } from '../../content/districts';
import { readabilityFade } from '../../util/readability';

/** Avstånden (m) där namnen tonas in: borta under nearIn (kvarteret 210 m), fullt från nearOut (byn 660 m). */
export const DISTRICT_LABEL_FADE = { nearIn: 400, nearOut: 560 } as const;

export function districtLabelOpacity(distanceM: number): number {
  return readabilityFade(distanceM, DISTRICT_LABEL_FADE);
}

export function DistrictLabels() {
  useLanguage();
  const { actualRef } = useCamera();
  const [opacity, setOpacity] = useState(() => districtLabelOpacity(actualRef.current.distance));
  const last = useRef(opacity);
  useFrame(() => {
    const o = districtLabelOpacity(actualRef.current.distance);
    if (Math.abs(o - last.current) > 0.02 || (o === 0) !== (last.current === 0) || (o === 1) !== (last.current === 1)) {
      last.current = o;
      setOpacity(o);
    }
  });
  if (opacity < 0.02) return null;
  return (
    <group>
      {DISTRICT_IDS.map((id) => {
        const at = DISTRICT_AREAS[id].labelAt;
        return (
          <group key={id} position={[at[0], 2, at[1]]}>
            <Html center zIndexRange={[11, 0]} style={{ pointerEvents: 'none' }}>
              <DistrictName id={id} opacity={opacity} />
            </Html>
          </group>
        );
      })}
    </group>
  );
}
