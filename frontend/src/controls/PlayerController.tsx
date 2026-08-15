import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { LookDelta, MoveVector } from '../scene/Scene';

interface Props {
  isTouch: boolean;
  paused: boolean;
  moveRef: MutableRefObject<MoveVector>;
  lookRef: MutableRefObject<LookDelta>;
}

const WALK_SPEED = 3.2;
const RUN_SPEED = 5.4;
// ORDER 053 Del C — first-person eye height, exact.
const EYE_HEIGHT = 1.65;
const BOUNDS = { minX: -50, maxX: 50, minZ: -34, maxZ: 32 };

export function PlayerController({ isTouch, paused, moveRef, lookRef }: Props) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(0);
  const pitch = useRef(0);
  const touchEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const move = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));

  useEffect(() => {
    camera.position.set(3, EYE_HEIGHT, 18);
    camera.lookAt(0, EYE_HEIGHT, -2);
    touchEuler.current.setFromQuaternion(camera.quaternion);
    yaw.current = touchEuler.current.y;
    pitch.current = touchEuler.current.x;
  }, [camera]);

  useEffect(() => {
    if (isTouch) return;
    const down = (event: KeyboardEvent) => {
      keys.current[event.code] = true;
    };
    const up = (event: KeyboardEvent) => {
      keys.current[event.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      keys.current = {};
    };
  }, [isTouch]);

  useFrame((_, delta) => {
    if (paused) return;

    if (isTouch) {
      const look = lookRef.current;
      yaw.current -= look.dx * 0.0035;
      pitch.current -= look.dy * 0.0035;
      pitch.current = Math.max(
        -Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05, pitch.current)
      );
      touchEuler.current.set(pitch.current, yaw.current, 0);
      camera.quaternion.setFromEuler(touchEuler.current);
      look.dx = 0;
      look.dy = 0;
    }

    let mx = 0;
    let mz = 0;
    let running = false;
    if (isTouch) {
      const vec = moveRef.current;
      mx = vec.x;
      mz = -vec.y;
    } else {
      const k = keys.current;
      if (k['KeyW'] || k['ArrowUp']) mz -= 1;
      if (k['KeyS'] || k['ArrowDown']) mz += 1;
      if (k['KeyA'] || k['ArrowLeft']) mx -= 1;
      if (k['KeyD'] || k['ArrowRight']) mx += 1;
      running = !!(k['ShiftLeft'] || k['ShiftRight']);
    }

    const mag = Math.hypot(mx, mz);
    if (mag > 1) {
      mx /= mag;
      mz /= mag;
    }

    const speed = (running ? RUN_SPEED : WALK_SPEED) * delta;
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, up.current).normalize();

    move.current.set(0, 0, 0);
    move.current.addScaledVector(forward.current, -mz * speed);
    move.current.addScaledVector(right.current, mx * speed);
    camera.position.add(move.current);

    camera.position.y = EYE_HEIGHT;
    camera.position.x = Math.max(
      BOUNDS.minX,
      Math.min(BOUNDS.maxX, camera.position.x)
    );
    camera.position.z = Math.max(
      BOUNDS.minZ,
      Math.min(BOUNDS.maxZ, camera.position.z)
    );
  });

  if (isTouch) return null;
  return <PointerLockControls />;
}
