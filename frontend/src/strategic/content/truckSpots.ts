// ORDER 332 G — foodtruckens fem platser i vagnens ram från D7 (Designs D15 kvarterPlatser.js SPOTS; Prästgatan 0,2 m
// flyttad, se raden).
// Koordinaterna är kartdata och står här, inte i src/sim/ (balance.test.ts: inga tal i sim/ utom balance.ts).
// Typerna och läsningen står i sim/districts.ts.
import type { DistrictId, TruckSpotId } from '../../sim/districts';

export interface TruckSpotFrame {
  id: TruckSpotId;
  district: DistrictId;
  /** Vagnens mitt i byns meter (+x österut, +z söderut). */
  C: readonly [number, number];
  /** Längdaxelns vinkel (D7:s ram). three:s rotationY är −th. */
  th: number;
  /** Gatan på kartan (grythyttan-world.json). */
  street: string;
  /** ORDER 333 B — platsen ligger utanför kvarterens gränser (districtBorders.ts); gästerna är `district`:s. */
  outsideDistricts?: true;
}

// D15 kvarterPlatser.js SPOTS, oförändrade. Torget är D7:s plats (villagePlaces.ts PLAYER_TRUCK_PITCH, −6,29°).
// Campus är flyttad från TRUCK_SPOT_POINTS['maltidens-hus'] (beslut 2026-10-13, D15 §0).
export const TRUCK_SPOTS: Record<TruckSpotId, TruckSpotFrame> = {
  torget: { id: 'torget', district: 'torget', C: [17.0, -21.9], th: -0.10984, street: 'w122157681' },
  // ORDER 332 — 0,2 m längs vagnens +z från D15:s [290,67; 38,97], så att Grillstugans bakvägg och hörnstolpar
  // (z −1,21) inte står på trottoaren längs Prästgatan (scene/onRoadAudit.ts, toleransen 0,1 m). Avvikelse från D15.
  prastgatan: { id: 'prastgatan', district: 'student', C: [290.63, 39.17], th: 0.187, street: 'w122157689' },
  gastgivaregarden: { id: 'gastgivaregarden', district: 'gastgivaregarden', C: [62.34, 76.91], th: -1.9201, street: 'w862853214' },
  campus: { id: 'campus', district: 'campus', C: [550.3, -70.42], th: 1.7296, street: 'w122157690' },
  sjon: { id: 'sjon', district: 'sjon', C: [376.0, 236.0], th: 0.126, street: 'w862853236' },
  // ORDER 333 B — Magasinsgatan, vagnens sjätte plats (avsnitt 8 punkt 2). Hör inte till något kvarter; gästerna är
  // Torgets. Platsen är sökt längs gatan (reports/order333/magasinsgatan.json).
  magasinsgatan: { id: 'magasinsgatan', district: 'torget', C: [-234.76, 49.74], th: 2.0493, street: 'w1329020064', outsideDistricts: true }
};

