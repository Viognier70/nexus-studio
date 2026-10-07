// ORDER 315b del 3 — krogens kamera (Z) vid spelarens vagn: 12 m, luckans sida mot kameran, något
// snett så att grillen och kön syns i perspektiv. Utbruten ur PlayerTruckCrew.tsx i ORDER 319a.1, så
// att testet av gästerna (order319aGaster.test.ts) ställer kameran med samma tal som spelet.

export const TRUCK_CAMERA = { distanceM: 12, pitch: 1.0, yawOffset: -0.4, focusOutM: 0.8 } as const;

export function truckCameraState(at: { x: number; z: number; rotationY: number }) {
  const hatchX = Math.sin(at.rotationY), hatchZ = Math.cos(at.rotationY);
  return {
    focus: { x: at.x + hatchX * TRUCK_CAMERA.focusOutM, z: at.z + hatchZ * TRUCK_CAMERA.focusOutM },
    distance: TRUCK_CAMERA.distanceM,
    yaw: Math.atan2(hatchX, hatchZ) + TRUCK_CAMERA.yawOffset,
    pitch: TRUCK_CAMERA.pitch
  };
}
