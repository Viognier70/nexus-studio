import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { LANDMARK_BY_ID } from '../content/world';
import type { CameraTarget, ViewLabel } from '../types';

export interface Preset {
  label: ViewLabel;
  target: CameraTarget;
}

// Anchor every preset around the real village centre (Torget). The village
// preset frames both Torget and Campus Grythyttan; the district preset drops
// onto the plaza itself; the business preset holds tight over Torget where
// the (placeholder) wine bar sits.
const TORGET = LANDMARK_BY_ID['gry-torget']?.position ?? [0, 0];
const CAMPUS = LANDMARK_BY_ID['gry-campus']?.position ?? TORGET;
// Village view focuses roughly midway between Torget and Campus so the two
// canonical anchors both fall in frame. Grythyttan is a linear village along
// the road between the old core and the hospitality-education campus, and
// showing both in the establishing shot is what makes it recognisable.
const VILLAGE_FOCUS: [number, number] = [
  (TORGET[0] + CAMPUS[0]) / 2,
  (TORGET[1] + CAMPUS[1]) / 2 + 20
];

// ORDER 042 §3.1 developer preset — jumps the camera to the player-
// business building (w869907963, centroid ≈ (44.9, 44.4)) at a
// distance where the roof crossfade is actively fading. Camera bible
// §4.1 puts the roof-fade midpoint at GRAY_BOX_CAMERA.restaurant
// RoofFadeMid = 40 m with a ±12 m band, so distance = 40 lands the
// roof at exactly 50 % opacity — a good starting point for the
// Vision Owner to zoom in and out through the transition.
const PLAYER_BUSINESS_CENTROID: [number, number] = [44.9, 44.4];

export const PRESETS: Record<'village' | 'district' | 'business' | 'myBusiness', Preset> = {
  village: {
    label: 'grythyttan',
    // Composition, not overview. The camera sits lower and tilts further
    // toward the horizon so the village reads as a *place* — with sky,
    // depth and forest edges — rather than a plan-view map. Distance is
    // reduced but the low pitch preserves a long horizontal reach across
    // the landscape.
    //
    //   distance × sin(pitch) = altitude
    //   900     × sin(32°)    ≈ 477 m altitude
    //   900     × cos(32°)    ≈ 763 m horizontal reach
    target: {
      focus: { x: VILLAGE_FOCUS[0], z: VILLAGE_FOCUS[1] },
      distance: 900,
      yaw: -0.35,
      pitch: (32 * Math.PI) / 180
    }
  },
  district: {
    label: 'kvarteret',
    // Bias slightly north-west of Torget so the church tower and
    // Gästgivaregården both fall inside the frame at this scale.
    // Lower pitch than before so the district reads with depth: the
    // horizon of forest sits at the top of the frame, foreground roofs
    // and streets in the lower two thirds.
    //
    //   210 × sin(40°) ≈ 135 m altitude
    //   210 × cos(40°) ≈ 161 m horizontal reach
    target: {
      focus: { x: TORGET[0] - 12, z: TORGET[1] + 4 },
      distance: 210,
      yaw: -0.30,
      pitch: (40 * Math.PI) / 180
    }
  },
  business: {
    // Developer shortcut only per Vision Owner ORDER 002A. Kept in place
    // as a diagnostic camera; the gameplay does not centre on this scale.
    label: 'vinbaren',
    target: {
      focus: { x: TORGET[0], z: TORGET[1] },
      distance: 55,
      yaw: 0.15,
      pitch: (34 * Math.PI) / 180
    }
  },
  myBusiness: {
    // Developer shortcut per ORDER 042 §3.1 review request. Centres on
    // w869907963 at distance 40 m — the roof-fade midpoint. Pitch 38°
    // gives ~25 m altitude so the roof is above camera height and the
    // fade is visible; yaw 0.4 rad (~23° off north) angles the
    // building's long north-south axis so the interior stub is legible
    // rather than seen end-on.
    label: 'vinbaren',
    target: {
      focus: { x: PLAYER_BUSINESS_CENTROID[0], z: PLAYER_BUSINESS_CENTROID[1] },
      distance: 40,
      yaw: 0.4,
      pitch: (38 * Math.PI) / 180
    }
  }
};

// Continuous-zoom label. Chosen from the current camera distance so the
// label crossfades naturally through the world.
export function labelForDistance(distance: number): ViewLabel {
  if (distance <= GRAY_BOX_CAMERA.labelBusinessUnder) return 'vinbaren';
  if (distance <= GRAY_BOX_CAMERA.labelVillageOver) return 'kvarteret';
  return 'grythyttan';
}

export function clampTarget(target: CameraTarget): CameraTarget {
  return {
    ...target,
    distance: Math.max(
      GRAY_BOX_CAMERA.minDistance,
      Math.min(GRAY_BOX_CAMERA.maxDistance, target.distance)
    ),
    pitch: Math.max(
      GRAY_BOX_CAMERA.pitchMin,
      Math.min(GRAY_BOX_CAMERA.pitchMax, target.pitch)
    )
  };
}
