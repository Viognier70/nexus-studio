// ORDER 288 — gatans nivå (Vision Owner 2026-10-01: "vem som är på väg in på
// gatan"). Sällskapen som går mot spelarens dörr inom gatans avstånd får en
// etikett i HUD-lagret: hur många, vilken typ och hur långt kvar. Syns när
// kameran står på gatans höjd (inte i rummet, inte i kvarteret).

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState, useSyncExternalStore } from 'react';
import { useCamera } from '../../camera/CameraContext';
import { strings } from '../../../content/strings';
import { subscribeVillageLive, villageLive } from './villageLive';
import { StreetTag } from '../../ui/VillageLabels';

const SHOW_FROM_M = 32;
const SHOW_UNTIL_M = 140;
const MAX_LABELS = 5;

function typeLabel(type: string): string {
  if (type === 'tourist') return strings.rush.waves.bus;
  return (strings.guestTypes.label as Record<string, string>)[type] ?? type;
}

export function StreetArrivals() {
  const { actualRef } = useCamera();
  const live = useSyncExternalStore(subscribeVillageLive, villageLive, villageLive);
  const [shown, setShown] = useState(false);
  const shownRef = useRef(false);
  useFrame(() => {
    const d = actualRef.current.distance;
    const want = d >= SHOW_FROM_M && d <= SHOW_UNTIL_M;
    if (want !== shownRef.current) {
      shownRef.current = want;
      setShown(want);
    }
  });
  if (!shown) return null;
  const to = strings.village.venues.player;
  return (
    <>
      {live.onWay.slice(0, MAX_LABELS).map((g) => (
        <group key={g.key} position={[g.x, 3.2, g.z]}>
          <Html center zIndexRange={[14, 0]} style={{ pointerEvents: 'none' }}>
            <StreetTag n={g.n} who={typeLabel(g.type)} to={to} metres={g.metres} />
          </Html>
        </group>
      ))}
    </>
  );
}
