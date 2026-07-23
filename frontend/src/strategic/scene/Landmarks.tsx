import { useMemo } from 'react';
import * as THREE from 'three';
import { LANDMARKS, RESTAURANT_ID, type Landmark } from '../content/grythyttan';

interface Props {
  onSelect: (landmark: Landmark) => void;
  selectedId: string | null;
}

// Render every landmark as a stylised grey block. The church gets an extra
// spire; the Sevillapaviljongen gets a peaked roof. Everything else is a
// simple cuboid. Nothing here claims architectural accuracy.
export function Landmarks({ onSelect, selectedId }: Props) {
  return (
    <group>
      {LANDMARKS.map((lm) => {
        if (lm.id === RESTAURANT_ID) return null; // Restaurant is rendered separately.
        return (
          <LandmarkBlock
            key={lm.id}
            landmark={lm}
            selected={selectedId === lm.id}
            onSelect={() => onSelect(lm)}
          />
        );
      })}
    </group>
  );
}

function LandmarkBlock({
  landmark,
  selected,
  onSelect
}: {
  landmark: Landmark;
  selected: boolean;
  onSelect: () => void;
}) {
  const { position, footprint, height, colour } = landmark;
  const isChurch = landmark.id === 'gry-kyrkan-01';
  const isPavilion = landmark.id === 'gry-sevillapaviljongen-01';
  const isTorget = landmark.id === 'gry-torg-01';

  const outlineColor = useMemo(() => {
    const c = new THREE.Color(colour);
    return `#${c.offsetHSL(0, 0, -0.18).getHexString()}`;
  }, [colour]);

  const handleClick = (event: unknown) => {
    const e = event as { stopPropagation?: () => void };
    e.stopPropagation?.();
    onSelect();
  };

  if (isTorget) {
    // Torget is a paved plaza rather than a building.
    return (
      <group position={[position.x, 0, position.z]} onClick={handleClick}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <planeGeometry args={[footprint.width, footprint.depth]} />
          <meshStandardMaterial color={selected ? '#c3bfb5' : colour} roughness={0.9} />
        </mesh>
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <ringGeometry
              args={[
                Math.max(footprint.width, footprint.depth) / 2 + 0.6,
                Math.max(footprint.width, footprint.depth) / 2 + 1.2,
                48
              ]}
            />
            <meshBasicMaterial color="#f0e2b8" transparent opacity={0.65} />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <group position={[position.x, 0, position.z]} onClick={handleClick}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[footprint.width, height, footprint.depth]} />
        <meshStandardMaterial
          color={selected ? '#dccdae' : colour}
          roughness={0.9}
        />
      </mesh>
      {/* Roof edge lip. */}
      <mesh position={[0, height + 0.05, 0]}>
        <boxGeometry args={[footprint.width + 0.4, 0.1, footprint.depth + 0.4]} />
        <meshStandardMaterial color={outlineColor} roughness={0.9} />
      </mesh>
      {isChurch && (
        <group position={[footprint.width / 2 - 2, height, footprint.depth / 2 - 2]}>
          <mesh position={[0, 6, 0]}>
            <boxGeometry args={[3, 12, 3]} />
            <meshStandardMaterial color={colour} roughness={0.9} />
          </mesh>
          <mesh position={[0, 13.4, 0]}>
            <coneGeometry args={[2.6, 4, 4]} />
            <meshStandardMaterial color="#a89f8d" roughness={0.9} />
          </mesh>
        </group>
      )}
      {isPavilion && (
        <mesh position={[0, height + 2.2, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[footprint.width * 0.7, 4.4, 4]} />
          <meshStandardMaterial color="#c9b28e" roughness={0.85} />
        </mesh>
      )}
      {selected && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[
              Math.max(footprint.width, footprint.depth) / 2 + 0.8,
              Math.max(footprint.width, footprint.depth) / 2 + 1.6,
              48
            ]}
          />
          <meshBasicMaterial color="#f0e2b8" transparent opacity={0.75} />
        </mesh>
      )}
    </group>
  );
}
