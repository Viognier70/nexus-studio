export function Mist() {
  return (
    <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[300, 300]} />
      <meshBasicMaterial
        color="#eaeaea"
        transparent
        opacity={0.12}
        depthWrite={false}
      />
    </mesh>
  );
}
