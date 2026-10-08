// truckEvening.ts — ljuset vid vagnen en kväll, från dagsljus till skymning. D9, 2026-10-07.
//
// Samma kväll som villageEvening.ts: e går från 0 (dagsljus) till 1 (skymning). Det som lyser i byn följer byns
// regler. Det här är vagnens egna ljus och skuggorna vid vagnen.

/** Ljuset över scenen: färgen multipliceras över allt innan lamporna läggs på. */
export const TRUCK_AMBIENT: Array<[number, string]> = [
  [0.0, '#fffaf0'], [0.3, '#f6e4c6'], [0.5, '#e8ba8c'], [0.66, '#c48c78'], [0.8, '#806e8c'], [0.92, '#565274'], [1.0, '#424062']
];
/** Sol och e under 0,4: ett varmt mjukljus över, 35 % vid e 0 till 0 vid e 0,4. */
export const SUN_GLOW = { colour: 'rgba(255,236,196,A)', blend: 'soft-light', maxAlpha: 0.35, untilE: 0.4 };

/** Lamporna tonar in med k = smoothstep((e − 0,42) / 0,38). */
export const LIGHTS_K = { from: 0.42, span: 0.38 };

export const TRUCK_LIGHTS = {
  hatch: { glow: [{ at: [0, 1.7], radius: 2.6, colour: '#ffc478', alpha: '0,3 · (0,3 + 0,7k)' }, { at: [0, 0.8], radius: 1.4, colour: '#ffd696', alpha: '0,25 · (0,4 + 0,6k)' }], note: 'luckan lyser hela dagen, mer på kvällen' },
  stringLights: { bulbsEveryM: 0.45, bulb: '#ffe3a8', unlit: '#d9d2c2', glow: { radius: 0.42, alpha: '0,2 · k' } },
  rival: { glow: { radius: 3.2, alpha: '0,06 + 0,2k' } }
};

/** Marschallerna tänds en i taget. I spelet: när e passerar TORCHES.fromE tänds de i ordning med TORCHES.stepS mellan. */
export const TORCHES = {
  fromE: 0.55, stepE: 0.035, stepS: 0.6, igniteS: 0.8,
  order: [0, 1, 2, 3, 4, 5], // truckProps.ts torch.at: kön först, sedan däcket medsols
  rainLit: true, windLit: true
};

/** Solens skuggor. Riktningen i kartans ram; omräknad till vagnens ram med −angle. */
export const SHADOW = {
  angleRad: 'lerp(−0,85, −0,08, smoothstep(e / 0,7))', // mot nordost mitt på dagen, mot öster på kvällen
  lengthPerFigure: '0,10 + 0,62 · smoothstep(e / 0,66)', // meter för en figur på 1,7 m; föremål skalas med sin höjd
  fade: '1 − smoothstep((e − 0,62) / 0,2)', // solen går ned
  lengthAfterSunset: 'lerp(0,05, längden, fade)',
  alpha: '0,14 + 0,22 · fade',
  rain: { length: 0.05, alpha: 'som fade 0,4' },
  byHeight: { figure: 0.6, standTable: 0.65, bench: 0.27, heater: 1.3, bin: 0.5, menuBoard: 0.56, torchHolder: 0.9 }
};

/** Bildtextens fyra lägen i prototypen. */
export const EVENING_PHASES = [
  { untilE: 0.3, key: 'evening.day' }, { untilE: 0.55, key: 'evening.golden' }, { untilE: 0.78, key: 'evening.lighting' }, { untilE: 1, key: 'evening.dusk' }
];

export const FLAGS = {
  lighting:
    'Ingen tänder marschallerna i prototypen. De tänds av sig själva i ordning. Om den vid luckan ska gå ut och tända dem ' +
    'behövs ett klipp (förslag: staff.lightTorch) och en plats i vagnens schema.'
};
