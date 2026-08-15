// Sevillapaviljongen — a monumental single-storey pavilion (Vision Owner
// 2026-08-11, ORDER 054 Del A). The 4.5 m wall does not represent a
// residential våningshöjd (2.70 m per ORDER 053 unit contract); it is
// the ceremonial-portico height derived from the reference photo — the
// real pavilion carries a taller volume than a house floor by design.
// Do not compress toward 2.70 m — it would flatten the character of
// the place.

export function Pavilion() {
  const slats = 22;
  const width = 16;
  const depth = 8;
  const height = 4.5;
  const slatWidth = width / slats;

  // ORDER 054 Del E — roughness/metalness per reference table:
  //   stone plinth       0.90 (plaster-adjacent)
  //   dark inside face   0.90 (untreated wood/plaster)
  //   vertical slats     0.75 (painted / stained wood)
  //   side walls         0.90 (untreated timber)
  //   canted roof plate  0.55 (metal / sheet-roof adjacent)
  //   plaque             0.75 (painted wood)
  //   bollards           0.90 (untreated wood)
  return (
    <group position={[0, 0, -25]}>
      {/* Stone base */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.4, 0.3, depth + 0.4]} />
        <meshStandardMaterial color="#5f5347" roughness={0.9} metalness={0} />
      </mesh>
      {/* Back wall — dark timber interior. Not pure black (#1e1a15 is
          already off-black; ORDER 054 Del D compliant). */}
      <mesh position={[0, height / 2 + 0.3, -depth / 2 + 0.05]} castShadow receiveShadow>
        <boxGeometry args={[width, height, 0.15]} />
        <meshStandardMaterial color="#26221c" roughness={0.9} metalness={0} />
      </mesh>
      {/* Front vertical slats — painted wood */}
      {Array.from({ length: slats }, (_, i) => {
        const x = -width / 2 + (i + 0.5) * slatWidth;
        return (
          <mesh
            key={`slat-${i}`}
            position={[x, height / 2 + 0.3, depth / 2 - 0.05]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[slatWidth - 0.12, height, 0.18]} />
            <meshStandardMaterial color="#7c5b3b" roughness={0.75} metalness={0} />
          </mesh>
        );
      })}
      {/* Side walls — untreated timber */}
      <mesh position={[-width / 2 - 0.1, height / 2 + 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, height, depth]} />
        <meshStandardMaterial color="#6b4e34" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[width / 2 + 0.1, height / 2 + 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, height, depth]} />
        <meshStandardMaterial color="#6b4e34" roughness={0.9} metalness={0} />
      </mesh>
      {/* Canted roof plate — sheet metal */}
      <mesh position={[0, height + 0.55, 0]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[width + 1, 0.15, depth + 1]} />
        <meshStandardMaterial color="#2f2a24" roughness={0.55} metalness={0.6} />
      </mesh>
      {/* Wooden plaque (Sevillapaviljongen — placeholder abstraction) */}
      <mesh
        position={[0, height + 0.15, depth / 2 + 0.36]}
        rotation={[-0.2, 0, 0]}
        castShadow
      >
        <boxGeometry args={[3.4, 0.6, 0.1]} />
        <meshStandardMaterial color="#a58255" roughness={0.75} metalness={0} />
      </mesh>
      {/* Two low bollards flanking the entrance — untreated wood */}
      <mesh position={[-1.6, 0.35, depth / 2 + 0.5]} castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.7, 10]} />
        <meshStandardMaterial color="#5b4a3a" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[1.6, 0.35, depth / 2 + 0.5]} castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.7, 10]} />
        <meshStandardMaterial color="#5b4a3a" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}
