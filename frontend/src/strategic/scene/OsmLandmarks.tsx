import { useCallback } from 'react';
import { WORLD } from '../content/world';
import type { Landmark } from '../content/world';

interface Props {
  onSelect: (landmark: Landmark) => void;
  selectedId: string | null;
}

// Landmark selection targets.
//
// Prior sprints painted a light ring around every landmark for readability;
// VS-03 removed those rings entirely — status now lives on the buildings
// themselves, and the village must read through shape. We keep an invisible
// click disc so a landmark's selection card is still one click away, but
// nothing about the disc is drawn.
export function OsmLandmarks({ onSelect, selectedId }: Props) {
  const clickFor = useCallback(
    (lm: Landmark) => (event: unknown) => {
      const e = event as { stopPropagation?: () => void };
      e.stopPropagation?.();
      onSelect(lm);
    },
    [onSelect]
  );

  return (
    <group>
      {WORLD.landmarks.map((lm) => (
        <group
          key={lm.id}
          position={[lm.position[0], 0.4, lm.position[1]]}
          onClick={clickFor(lm)}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[9, 20]} />
            <meshBasicMaterial
              transparent
              opacity={selectedId === lm.id ? 0.06 : 0.001}
              color="#f0e2b8"
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
