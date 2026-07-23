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

export const PRESETS: Record<'village' | 'district' | 'business', Preset> = {
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
