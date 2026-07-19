export function BusStop() {
  return (
    <group position={[3.5, 0, 21]}>
      <mesh position={[-1.5, 1.1, 0]}>
        <boxGeometry args={[0.12, 2.2, 0.12]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>
      <mesh position={[1.5, 1.1, 0]}>
        <boxGeometry args={[0.12, 2.2, 0.12]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.28, 0]}>
        <boxGeometry args={[3.4, 0.12, 1.4]} />
        <meshStandardMaterial color="#6a5343" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2.6, 0.1, 0.4]} />
        <meshStandardMaterial color="#8b715a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.28, 0.16]}>
        <boxGeometry args={[2.6, 0.35, 0.05]} />
        <meshStandardMaterial color="#7a6250" roughness={0.85} />
      </mesh>
      {/* Timetable board */}
      <mesh position={[-1.5, 1.65, 0.08]}>
        <boxGeometry args={[0.6, 0.85, 0.03]} />
        <meshStandardMaterial color="#efe7d3" roughness={0.8} />
      </mesh>
    </group>
  );
}
