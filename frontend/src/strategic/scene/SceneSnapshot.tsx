// ORDER 285 — tidningens foto (Designs leverans 2026-09-29, Vision Owner:
// "Tidningens foto ska ha den varma graderingen (WARM.roomGrade), inte den
// grå renderingen"). Fotot är spelets egen rendering: en bild av scenen
// från spelarens kamera, tagen när tidningen öppnas. Bilden ritas och läses
// i samma stund (gl.render och toDataURL), så att buffern inte hunnit
// tömmas. Graderingen sätts i CSS på bilden (screens.css .nxs-paper-photo).

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

type Grab = () => string | null;
let grab: Grab | null = null;

export function snapshotScene(): string | null {
  try { return grab ? grab() : null; } catch { return null; }
}

export function SceneSnapshot() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    grab = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/jpeg', 0.82);
    };
    return () => { grab = null; };
  }, [gl, scene, camera]);
  return null;
}
