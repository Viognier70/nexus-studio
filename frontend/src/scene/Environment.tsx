// ORDER 054 Del E — roughness/metalness set explicitly per the reference
// table: gravel/mark 0.95, water is a special case (low roughness + some
// metalness reads as reflective surface), stone plinths 0.9 (plaster-
// like weathered stone), meadow near 1 (matte vegetation).
export function Environment() {
  return (
    <group>
      {/* Meadow — matte vegetation */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400, 1, 1]} />
        <meshStandardMaterial color="#3f5a3e" roughness={0.95} metalness={0} />
      </mesh>
      {/* Damp gravel path from bus stop toward the pavilion */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -2.5]} receiveShadow>
        <planeGeometry args={[3.4, 46]} />
        <meshStandardMaterial color="#a49781" roughness={0.95} metalness={0} />
      </mesh>
      {/* Water glimpse off to the west — reflective, so lower roughness
          and a hint of metalness so the Fresnel response reads. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-38, -0.4, -6]}>
        <planeGeometry args={[42, 68]} />
        <meshStandardMaterial color="#4d6f78" roughness={0.15} metalness={0.4} />
      </mesh>
      {/* Campus entrance plinths — cut stone, plaster-family roughness */}
      <group position={[16, 0, -20]}>
        <mesh position={[-2.5, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1, 2.4, 1]} />
          <meshStandardMaterial color="#8b8477" roughness={0.9} metalness={0} />
        </mesh>
        <mesh position={[2.5, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1, 2.4, 1]} />
          <meshStandardMaterial color="#8b8477" roughness={0.9} metalness={0} />
        </mesh>
        <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[6.5, 0.2, 0.8]} />
          <meshStandardMaterial color="#6d6a5f" roughness={0.9} metalness={0} />
        </mesh>
      </group>
      {/* Low stone marker at the path fork */}
      <mesh position={[6, 0.4, -6]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.8, 0.6]} />
        <meshStandardMaterial color="#7a736a" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}
