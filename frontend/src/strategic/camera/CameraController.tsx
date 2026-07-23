import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { damp, dampAngle } from '../util/smoothing';
import { useCamera } from './CameraContext';

// Reads targetRef every frame and damps actualRef toward it. Applies the
// result to the R3F camera. Does not touch any React state per frame.
//
// Each axis uses its own damp rate: distance settles slowly for the flight
// feel, focus is medium so pans track the finger, yaw / pitch are quick so
// small rotations are responsive.
export function CameraController() {
  const { camera } = useThree();
  const { targetRef, actualRef } = useCamera();

  useEffect(() => {
    apply(camera, actualRef.current);
  }, [camera, actualRef]);

  useFrame((_, delta) => {
    const target = targetRef.current;
    const actual = actualRef.current;
    // Clamp delta so a big pause / dropped frame does not snap the camera
    // — one giant step would defeat the whole point of damping.
    const dt = Math.min(delta, 0.05);
    actual.distance = damp(
      actual.distance,
      target.distance,
      GRAY_BOX_CAMERA.dampDistance,
      dt
    );
    actual.focus.x = damp(
      actual.focus.x,
      target.focus.x,
      GRAY_BOX_CAMERA.dampFocus,
      dt
    );
    actual.focus.z = damp(
      actual.focus.z,
      target.focus.z,
      GRAY_BOX_CAMERA.dampFocus,
      dt
    );
    actual.yaw = dampAngle(
      actual.yaw,
      target.yaw,
      GRAY_BOX_CAMERA.dampRotation,
      dt
    );
    actual.pitch = damp(
      actual.pitch,
      target.pitch,
      GRAY_BOX_CAMERA.dampRotation,
      dt
    );
    apply(camera, actual);
  });

  return null;
}

function apply(
  camera: THREE.Camera,
  state: {
    focus: { x: number; z: number };
    distance: number;
    yaw: number;
    pitch: number;
  }
) {
  const cosP = Math.cos(state.pitch);
  const sinP = Math.sin(state.pitch);
  const px = state.focus.x + state.distance * Math.sin(state.yaw) * cosP;
  const pz = state.focus.z + state.distance * Math.cos(state.yaw) * cosP;
  const py = state.distance * sinP;
  camera.position.set(px, py, pz);
  camera.lookAt(state.focus.x, 0, state.focus.z);
  if ((camera as THREE.PerspectiveCamera).fov !== undefined) {
    (camera as THREE.PerspectiveCamera).fov = 45;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }
}
