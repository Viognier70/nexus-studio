// ORDER 054 Del E — roughness/metalness set:
//   posts (steel/dark)   0.55 + metalness 0.6 (painted steel)
//   roof (wood)          0.75 (painted wood)
//   bench + kickboard    0.85 (painted timber)
//   timetable board      0.85 (paper behind glass approximation)
export function BusStop() {
  return (
    <group position={[3.5, 0, 21]}>
      <mesh position={[-1.5, 1.1, 0]} castShadow>
        <boxGeometry args={[0.12, 2.2, 0.12]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.55} metalness={0.6} />
      </mesh>
      <mesh position={[1.5, 1.1, 0]} castShadow>
        <boxGeometry args={[0.12, 2.2, 0.12]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.55} metalness={0.6} />
      </mesh>
      <mesh position={[0, 2.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.12, 1.4]} />
        <meshStandardMaterial color="#6a5343" roughness={0.75} metalness={0} />
      </mesh>
      {/* ORDER 053 Del B — bench seat, top at 0.45 m (chair seat spec). */}
      <mesh position={[0, 0.40, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.1, 0.4]} />
        <meshStandardMaterial color="#8b715a" roughness={0.85} metalness={0} />
      </mesh>
      {/* Kickboard — the front panel below the bench seat that keeps
          a shoe from sliding under the bench. ORDER 054 Del A closed
          this as "kickboard, leave as is." Height 0.35 m, thickness
          0.05 m, offset 0.16 m in front of the seat's z-centre. */}
      <mesh position={[0, 0.18, 0.16]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.35, 0.05]} />
        <meshStandardMaterial color="#7a6250" roughness={0.85} metalness={0} />
      </mesh>
      {/* Timetable board */}
      <mesh position={[-1.5, 1.65, 0.08]} castShadow>
        <boxGeometry args={[0.6, 0.85, 0.03]} />
        <meshStandardMaterial color="#efe7d3" roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}
