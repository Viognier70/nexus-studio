import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD } from '../content/world';

// ORDER 030 recognisability lift, Tier 1c — Torget plaza surface.
//
// OSM stores Torget as a 4-vertex linestring (highway=residential,
// name=Torget, ~54 m long × 4 m wide). It is not a proper plaza
// polygon. Reality is a widening in the road-and-building layout where
// the surrounding facades frame an open paved area.
//
// This component derives a plaza polygon by buffering the linestring
// perpendicular by 9 m on each side, giving a ~54 × 20 m paved surface
// distinct from grass and from the general road palette. Rendered
// slightly below road level so vehicles / driveways / labels remain
// visible on top.

const TORGET_ROAD_ID = 'w122157681';
const PLAZA_HALF_WIDTH = 9;   // metres perpendicular to the linestring
const PLAZA_Y = 0.06;
const PLAZA_COLOUR = '#b8ab90';  // warm gravel-sand plaza tone

export function TorgetPlaza() {
  const geometry = useMemo(() => {
    const torget = WORLD.roads.find((r) => r.id === TORGET_ROAD_ID);
    if (!torget || torget.poly.length < 2) return null;

    // Build a buffered ribbon: for each linestring vertex, offset it
    // perpendicular to the local tangent. First and last vertices use
    // the single adjacent segment; interior vertices average the two
    // adjacent tangents to keep the buffer smooth at bends.
    const shape = new THREE.Shape();
    const n = torget.poly.length;
    const leftSide: [number, number][] = [];
    const rightSide: [number, number][] = [];

    for (let i = 0; i < n; i++) {
      let tx = 0;
      let tz = 0;
      if (i > 0) {
        tx += torget.poly[i][0] - torget.poly[i - 1][0];
        tz += torget.poly[i][1] - torget.poly[i - 1][1];
      }
      if (i < n - 1) {
        tx += torget.poly[i + 1][0] - torget.poly[i][0];
        tz += torget.poly[i + 1][1] - torget.poly[i][1];
      }
      const len = Math.hypot(tx, tz) || 1;
      // Perpendicular (rotated 90°): (-tz, tx) / len
      const nx = -tz / len;
      const nz = tx / len;
      leftSide.push([
        torget.poly[i][0] + nx * PLAZA_HALF_WIDTH,
        torget.poly[i][1] + nz * PLAZA_HALF_WIDTH
      ]);
      rightSide.push([
        torget.poly[i][0] - nx * PLAZA_HALF_WIDTH,
        torget.poly[i][1] - nz * PLAZA_HALF_WIDTH
      ]);
    }

    // Assemble the ring: left side forward, right side reversed.
    // Negate Y in shape.moveTo/lineTo to match the ORDER 020 shared
    // coordinate frame used by every polygon-driven renderer.
    shape.moveTo(leftSide[0][0], -leftSide[0][1]);
    for (let i = 1; i < leftSide.length; i++) {
      shape.lineTo(leftSide[i][0], -leftSide[i][1]);
    }
    for (let i = rightSide.length - 1; i >= 0; i--) {
      shape.lineTo(rightSide[i][0], -rightSide[i][1]);
    }
    shape.closePath();

    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} position={[0, PLAZA_Y, 0]} receiveShadow={false}>
      <meshStandardMaterial color={PLAZA_COLOUR} roughness={0.98} />
    </mesh>
  );
}
