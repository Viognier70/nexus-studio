import { useMemo } from 'react';
import * as THREE from 'three';
import { WATER_POLYGON } from '../content/grythyttan';

export function Water() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    if (WATER_POLYGON.length > 0) {
      shape.moveTo(WATER_POLYGON[0].x, WATER_POLYGON[0].z);
      for (let i = 1; i < WATER_POLYGON.length; i++) {
        shape.lineTo(WATER_POLYGON[i].x, WATER_POLYGON[i].z);
      }
      shape.closePath();
    }
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} position={[0, -0.05, 0]} receiveShadow>
      <meshStandardMaterial color="#54666c" roughness={0.45} metalness={0.35} />
    </mesh>
  );
}
