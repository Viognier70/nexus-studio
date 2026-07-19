export function Environment() {
  return (
    <group>
      {/* Meadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[400, 400, 1, 1]} />
        <meshStandardMaterial color="#3f5a3e" roughness={1} />
      </mesh>
      {/* Damp gravel path from bus stop toward the pavilion */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -2.5]}>
        <planeGeometry args={[3.4, 46]} />
        <meshStandardMaterial
          color="#a49781"
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      {/* Water glimpse off to the west */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-38, -0.4, -6]}>
        <planeGeometry args={[42, 68]} />
        <meshStandardMaterial
          color="#4d6f78"
          roughness={0.35}
          metalness={0.55}
        />
      </mesh>
      {/* Campus entrance plinths, to the east of the pavilion */}
      <group position={[16, 0, -20]}>
        <mesh position={[-2.5, 1.2, 0]}>
          <boxGeometry args={[1, 2.4, 1]} />
          <meshStandardMaterial color="#8b8477" roughness={0.9} />
        </mesh>
        <mesh position={[2.5, 1.2, 0]}>
          <boxGeometry args={[1, 2.4, 1]} />
          <meshStandardMaterial color="#8b8477" roughness={0.9} />
        </mesh>
        <mesh position={[0, 2.6, 0]}>
          <boxGeometry args={[6.5, 0.2, 0.8]} />
          <meshStandardMaterial color="#6d6a5f" roughness={0.9} />
        </mesh>
      </group>
      {/* Low stone marker at the path fork */}
      <mesh position={[6, 0.4, -6]}>
        <boxGeometry args={[0.6, 0.8, 0.6]} />
        <meshStandardMaterial color="#7a736a" roughness={0.95} />
      </mesh>
    </group>
  );
}
