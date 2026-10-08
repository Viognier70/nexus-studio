// truckWeather.ts — vädret vid vagnen. D9, 2026-10-07.
//
// Fyra väder. Vädret väljs per kväll (Code avgör hur, och om det ska följa byns väder). Talen som påverkar spelet
// (gästflöde, andelen nyfikna) är platshållare från balance.ts. Det som bara syns står här.

export type TruckWeather = 'sun' | 'rain' | 'wind' | 'cool';

export const TRUCK_WEATHER = {
  sun: {
    eDefault: 0.18,
    shadows: 'skarpa: truckEvening.ts SHADOW, fullt',
    seating: ['standTable', 'bench'],
    footfall: 'WEATHER.sun.footfall', curiousFactor: 'WEATHER.sun.curious',
    smoke: { driftX: 0.45, growth: 0.28, life: 3.2, alpha: 0.3 }
  },
  rain: {
    eDefault: 0.58,
    /** Markisen fälls ut helt: hela vagnens längd och 0,6 m längre ut. */
    awning: { x0: -2.3, x1: 2.3, z0: 1.15, z1: 2.45 },
    /** Kön flyttar in under markisen. De fyra första står torrt. */
    queue: { order: [-0.5, 1.95], collect: [0.9, 1.95], line: [[-1.4, 2.0], [-2.1, 2.0], [-2.95, 2.25], [-3.85, 2.3], [-4.75, 2.3], [-5.65, 2.3]] },
    queueMax: 'WEATHER.rain.queueMax',
    /** Borden är blöta och används inte. De som äter står vid hyllan på vagnens sida. Utan plats tar man maten med sig. */
    seating: ['shelf'], tablesWet: true,
    wet: { deck: '#6c5a44', table: '#62513e', sheen: 'rgba(220,232,245,.22) och droppar', ground: 'rgba(40,52,66,.22) över torget', puddles: 6 },
    umbrellas: { share: 0.72, diameter: 1.04, panels: 8, colours: ['#2f4b6e', '#3f3b36', '#6b4a2e', '#4a5a50', '#5c4d58', '#7a6a50'], closedUnderAwning: true },
    rainJackets: { share: 0.5, colours: ['#3d4f60', '#4b4a3c', '#3f4a52', '#5a5048'] },
    underAwningClip: 'guest.shelter',
    drips: 'ringar längs markisens kant, 0,25 m mellan',
    streaks: 'i skärmen, 240 streck, 16 px vid 1440 × 900, ljust blågrå 30 %',
    ambient: 'truckEvening.ts ambient × [0,80, 0,83, 0,88]',
    footfall: 'WEATHER.rain.footfall', curiousFactor: 'WEATHER.rain.curious',
    smoke: { driftX: 0.25, growth: 0.2, life: 2.4, alpha: 0.18 }
  },
  wind: {
    eDefault: 0.62,
    direction: '+x i kartan (från väster)',
    /** Servetterna flyger från borden där någon äter, var 0,9–1,8 s. Den som stod där griper efter den. */
    napkins: { everyS: [0.9, 1.8], speed: [2.1, 3.0], sideways: 0.35, spinPerS: [5, 10], lifeS: 6, flutter: 'skalas 0,55–1 på tvären', grabClip: 'guest.grabNapkin' },
    awning: { flutter: 'bågkanten ±0,05 m, 9 och 17 Hz, veck i duken' },
    stringLights: { swayM: 0.12, hz: 0.64 },
    torches: { leanM: 0.09, flameWidth: 1.6 },
    napkinHolders: 'tyngd över servetterna',
    seating: ['standTable', 'bench'],
    footfall: 'WEATHER.wind.footfall', curiousFactor: 'WEATHER.wind.curious',
    smoke: { driftX: 2.6, growth: 0.5, life: 1.8, alpha: 0.22, note: 'ligger platt längs marken' }
  },
  cool: {
    eDefault: 0.86,
    heater: { on: true, light: 'truckProps.ts heater.light', ringGlow: '#ff9646' },
    /** De som äter går först till platserna runt värmaren, sedan till borden. C-W används inte (värmaren). */
    seating: ['heater', 'standTable'], heaterFirst: true,
    coats: { share: 1, colours: ['#4a4f5c', '#5a4a3e', '#3f4d48', '#5c4652', '#4d5242', '#55503f'], scarfShare: 0.67, scarves: ['#b98a3c', '#7d5a6b', '#5b7a8a', '#a5672f', '#8a7f6a'] },
    breath: { everyS: 2.6, lifeS: 1.0, colour: 'rgba(236,240,246,.5)', size: [0.035, 0.095] },
    queueIdle: 'händerna närmare kroppen',
    footfall: 'WEATHER.cool.footfall', curiousFactor: 'WEATHER.cool.curious',
    smoke: { driftX: 0.45, growth: 0.28, life: 3.2, alpha: 0.42, note: 'tätare i den kalla luften' }
  }
};
