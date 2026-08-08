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
// business building (w869907975, centroid ≈ (31.6, −16.7)) at a
// distance where the roof crossfade is actively fading. Camera bible
// §4.1 puts the roof-fade midpoint at GRAY_BOX_CAMERA.restaurant
// RoofFadeMid = 40 m with a ±12 m band, so distance = 40 lands the
// roof at exactly 50 % opacity — a good starting point for the
// Vision Owner to zoom in and out through the transition.
//
// Building corrected 2026-07-30 from `w869907963` (Candidate C, which
// coincided with Guldkringlan's node-landmark rendered volume) to
// `w869907975` (Candidate A, Torget south edge — spatially clean:
// nearest landmark is Torget plaza at 13.9 m, no volumetric building
// within 5 m). See the corresponding note in PLAYER_BUSINESS_
// BUILDING_IDS in world.ts and the 2026-07-30 mechanism-note in
// APPROXIMATION_REGISTER.md.
const PLAYER_BUSINESS_CENTROID: [number, number] = [31.6, -16.7];

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
    // the player business (`w869907975`, centroid ≈ (31.6, −16.7)) and
    // lands the camera INSIDE the interior-view threshold immediately
    // — below the roof-fade band, so on first paint the roof is
    // already invisible and the interior stub is fully visible. Vision
    // Owner request 2026-08-08: this must use the same threshold
    // constant as the PlayerBusiness fade logic so the two cannot
    // drift apart.
    //
    // At dist = restaurantRoofFadeMid - restaurantRoofFadeHalf (28 m),
    // roof opacity is exactly 0; the margin (4 m) makes sure a small
    // manual zoom-out during play still keeps the roof invisible. Pitch
    // 50° keeps the camera above the roof line but tilted enough to
    // see the interior in perspective (not top-down plan view).
    label: 'vinbaren',
    target: {
      focus: { x: PLAYER_BUSINESS_CENTROID[0], z: PLAYER_BUSINESS_CENTROID[1] },
      distance:
        GRAY_BOX_CAMERA.restaurantRoofFadeMid -
        GRAY_BOX_CAMERA.restaurantRoofFadeHalf -
        4,
      yaw: 0.4,
      pitch: (50 * Math.PI) / 180
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
