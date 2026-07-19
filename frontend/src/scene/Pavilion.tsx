export function Pavilion() {
  const slats = 22;
  const width = 16;
  const depth = 8;
  const height = 4.5;
  const slatWidth = width / slats;

  return (
    <group position={[0, 0, -25]}>
      {/* Stone base */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[width + 0.4, 0.3, depth + 0.4]} />
        <meshStandardMaterial color="#5f5347" roughness={0.9} />
      </mesh>
      {/* Back wall — dark interior */}
      <mesh position={[0, height / 2 + 0.3, -depth / 2 + 0.05]}>
        <boxGeometry args={[width, height, 0.15]} />
        <meshStandardMaterial color="#1e1a15" roughness={1} />
      </mesh>
      {/* Front vertical slats */}
      {Array.from({ length: slats }, (_, i) => {
        const x = -width / 2 + (i + 0.5) * slatWidth;
        return (
          <mesh
            key={`slat-${i}`}
            position={[x, height / 2 + 0.3, depth / 2 - 0.05]}
          >
            <boxGeometry args={[slatWidth - 0.12, height, 0.18]} />
            <meshStandardMaterial color="#7c5b3b" roughness={0.85} />
          </mesh>
        );
      })}
      {/* Side walls */}
      <mesh position={[-width / 2 - 0.1, height / 2 + 0.3, 0]}>
        <boxGeometry args={[0.2, height, depth]} />
        <meshStandardMaterial color="#6b4e34" roughness={0.9} />
      </mesh>
      <mesh position={[width / 2 + 0.1, height / 2 + 0.3, 0]}>
        <boxGeometry args={[0.2, height, depth]} />
        <meshStandardMaterial color="#6b4e34" roughness={0.9} />
      </mesh>
      {/* Canted roof plate */}
      <mesh position={[0, height + 0.55, 0]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[width + 1, 0.15, depth + 1]} />
        <meshStandardMaterial color="#2f2a24" roughness={0.9} />
      </mesh>
      {/* Wooden plaque (Sevillapaviljongen — placeholder abstraction) */}
      <mesh
        position={[0, height + 0.15, depth / 2 + 0.36]}
        rotation={[-0.2, 0, 0]}
      >
        <boxGeometry args={[3.4, 0.6, 0.1]} />
        <meshStandardMaterial color="#a58255" roughness={0.75} />
      </mesh>
      {/* Two low bollards flanking the entrance */}
      <mesh position={[-1.6, 0.35, depth / 2 + 0.5]}>
        <cylinderGeometry args={[0.14, 0.16, 0.7, 10]} />
        <meshStandardMaterial color="#5b4a3a" roughness={0.9} />
      </mesh>
      <mesh position={[1.6, 0.35, depth / 2 + 0.5]}>
        <cylinderGeometry args={[0.14, 0.16, 0.7, 10]} />
        <meshStandardMaterial color="#5b4a3a" roughness={0.9} />
      </mesh>
    </group>
  );
}
