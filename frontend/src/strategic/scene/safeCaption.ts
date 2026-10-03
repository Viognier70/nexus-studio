// ORDER 299 (Vision Owner 2026-10-03): "Händelsens bildtext placeras där ingen
// panel täcker den och klipps aldrig." drei-Html:s calculatePosition: samma
// projektion som drei, och punkten hålls inom rummets fria del av skärmen
// (Designs D1 §6: rummet ramas mellan 36 och 96 % av bredden när raketkortet
// står till vänster), under klockan och kassan och ovanför de nedre knapparna.
// Texten bryts på högst CAPTION_MAX_PX (system.css .nx-theatre-caption), så
// halva den bredden hålls från kanterna.

import * as THREE from 'three';
import { CONSEQUENCE } from './guestMood';
import { hudBottomPx } from '../ui/service/HudBottom';

const CAPTION_MAX_PX = 320;
const TOP_SHARE = 0.34;
const BOTTOM_PX = 120;
const HUD_GAP_PX = 24;
const v = new THREE.Vector3();

export function safeCaptionPosition(el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }): number[] {
  v.setFromMatrixPosition(el.matrixWorld).project(camera);
  const x = (v.x * size.width) / 2 + size.width / 2;
  const y = -(v.y * size.height) / 2 + size.height / 2;
  const cardUp = typeof document !== 'undefined' && !!document.querySelector('.nx-rocket');
  const half = Math.min(CAPTION_MAX_PX, size.width * 0.3) / 2;
  const left = (cardUp ? CONSEQUENCE.frameX.safeLeft : 0.04) * size.width + half;
  const right = CONSEQUENCE.frameX.safeRight * size.width - half;
  const top = Math.max(size.height * TOP_SHARE, hudBottomPx.current + HUD_GAP_PX);
  const bottom = size.height - BOTTOM_PX;
  return [Math.max(left, Math.min(right, x)), Math.max(top, Math.min(bottom, y))];
}
