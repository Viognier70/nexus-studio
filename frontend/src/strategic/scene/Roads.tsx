import { useMemo } from 'react';
import * as THREE from 'three';
import { ROADS } from '../content/grythyttan';

// Extrude each road polyline as a flat strip on the ground plane.
export function Roads() {
  const geometries = useMemo(() => {
    return ROADS.map((road) => {
      const shape = new THREE.Shape();
      const half = road.width / 2;
      if (road.points.length < 2) return null;
      const left: THREE.Vector2[] = [];
      const right: THREE.Vector2[] = [];
      for (let i = 0; i < road.points.length; i++) {
        const p = road.points[i];
        const prev = road.points[Math.max(0, i - 1)];
        const next = road.points[Math.min(road.points.length - 1, i + 1)];
        const dx = next.x - prev.x;
        const dz = next.z - prev.z;
        const len = Math.hypot(dx, dz) || 1;
        // Perpendicular in XZ.
        const nx = -dz / len;
        const nz = dx / len;
        left.push(new THREE.Vector2(p.x + nx * half, p.z + nz * half));
        right.push(new THREE.Vector2(p.x - nx * half, p.z - nz * half));
      }
      shape.moveTo(left[0].x, left[0].y);
      for (const v of left.slice(1)) shape.lineTo(v.x, v.y);
      for (let i = right.length - 1; i >= 0; i--)
        shape.lineTo(right[i].x, right[i].y);
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      return { id: road.id, geo };
    });
  }, []);

  return (
    <group position={[0, 0.02, 0]}>
      {geometries.map((entry) =>
        entry ? (
          <mesh key={entry.id} geometry={entry.geo}>
            <meshStandardMaterial color="#8a8578" roughness={0.95} />
          </mesh>
        ) : null
      )}
    </group>
  );
}
