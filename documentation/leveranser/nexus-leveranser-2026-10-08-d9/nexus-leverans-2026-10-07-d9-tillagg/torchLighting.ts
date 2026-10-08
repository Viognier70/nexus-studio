// torchLighting.ts — medhjälparen tänder marschallerna. Tillägg till D9, 2026-10-07.
//
// Ersätter att marschallerna tänds av sig själva (truckEvening.ts TORCHES.stepE). Medhjälparen vid luckan går ut
// med tändaren och tänder dem en i taget. Så länge står luckan tom: ingen serverar och kön står still.
// Därför väntar medhjälparen när kön är lång (beslut 2026-10-07). Speltalen är platshållare från balance.ts.

export type Vec2 = [number, number];

export const TORCH_ROUND = {
  who: 'medhjälparen vid luckan (TRUCK_CREW.hatch)',
  /** Rundan börjar när kvällen passerar fromE och kön är kortare än queueMax, men senast vid latestE. */
  fromE: 0.55,
  queueMax: 'TORCH.queueMax',     // prototypen 4
  latestE: 'TORCH.latestE',       // prototypen 0,80
  hatchWhileOut: 'tom: truck.hatchServe pausas, gästen som beställer väntar, grillaren grillar vidare',
  speed: 1.3,                     // m/s, staff.walkLighter
  clip: 'staff.lightTorch',       // 2,40 s per marschall
  litFadeS: 0.8,
  /** Tidigare än fromE (reglaget bakåt): alla släcks och medhjälparen står vid luckan. */
  resetBelowE: 0.52,
  /** Kvällar som redan är långt gångna när scenen börjar (e ≥ latestE + 0,05) börjar med alla tända. */
  preLitFromE: 0.85,
  durationS: 'cirka 40 s med normalt tempo'
};

/** Vägen i vagnens ram. Ut genom dörren i bakgaveln, kön först, sedan däcket medsols och tillbaka norr om däcket. */
export const TORCH_ROUTE = {
  door: [2.55, 0.6] as Vec2,
  legs: [
    { walk: [[0, 0.45], [2.05, 0.45], [2.55, 0.6], [2.55, 2.0], [1.6, 3.5], [-1.45, 3.45]], light: 0, standAt: [-1.45, 3.45] },
    { walk: [[-1.45, 3.45], [-1.6, 3.95], [-2.8, 3.95], [-4.25, 3.45]], light: 1, standAt: [-4.25, 3.45] },
    { walk: [[-4.25, 3.45], [-2.8, 4.05], [2.0, 4.4], [2.45, 4.45]], light: 2, standAt: [2.45, 4.45] },
    { walk: [[2.45, 4.45], [4.6, 4.55]], light: 3, standAt: [4.6, 4.55] },
    { walk: [[4.6, 4.55], [6.75, 4.5]], light: 4, standAt: [6.75, 4.5] },
    { walk: [[6.75, 4.5], [7.15, 4.0], [7.1, 1.0]], light: 5, standAt: [7.1, 1.0] },
    { walk: [[7.1, 1.0], [6.7, -0.2], [3.3, -0.45], [2.6, -0.1], [2.55, 0.6], [2.05, 0.45], [0, 0.45]], light: null }
  ] as Array<{ walk: Vec2[]; light: number | null; standAt?: Vec2 }>,
  /** Marschallerna i truckProps.ts torch.at, index 0–5. Ansiktet mot marschallen vid standAt. */
  faces: 'atan2(torch − standAt)',
  checks: 'Vägen går runt skylten, söder om kön och utanför planteringslådorna (minst 0,33 m från stolpen i nordväst).'
};

/** HUD:en i prototypen: bildtexten i Ljuset en kväll visar rundan. I spelet räcker det man ser. */
export const TORCH_STATUS = { lighting: 'torch.lighting', waiting: 'torch.wait' };
