// personalSpace.ts — ingen går igenom någon. 2026-10-08.
//
// Gäller alla figurer i spelet: gäster och personal, vid vagnen och i rummen (vinbaren, bistron). Samma fel fanns i
// restaurangerna. Prövat i D9:s prototyp (Livet vid luckan): 4 000 bilder per skärm och väder, ingen figur närmare
// en annan än 0,38 m (förut ned till 0,00 m).
//
// Tre delar, i den här ordningen varje bild:
//   1. Väja: den som går saktar in när någon står eller går framför.
//   2. Hålla till höger: på gångvägar och gator går man till höger om mittlinjen, så att mötande inte krockar.
//   3. Knuffas isär: överlapp som ändå uppstår löses med en liten förskjutning som tonar bort när det är fritt.
// Förskjutningen flyttar figuren och dess händer, men inte det den har ställt ifrån sig (tallrik, burk).

export const PERSONAL_SPACE = {
  /** Två figurers mittpunkter hålls minst så här långt isär (figuren är 0,50 m bred över axlarna i prototypen). */
  radiusM: 0.5,
  /** Störst förskjutning från klippets väg. Mer än så och figuren skulle hamna i möbler. */
  maxOffsetM: 0.55,
  /** Förskjutningen tonar bort med 7 % per bild (30 bilder/s) när ingen trycker. */
  decayPerFrame: 0.07,
  iterationsPerFrame: 2,
  /** Vid laddning och kontrollbilder: lös helt innan första bilden. */
  settleIterations: 24,
  /** Den som rör sig ger efter. Högre massa flyttas mindre. */
  mass: { walking: 1, staffWalking: 1.2, waitingOrCollecting: 2, standingAct: 2.5, queued: 3, staffStanding: 3, eatingOrSeated: 4 },
  /** Figurer som tonas in eller ut (alpha under 0,3) räknas inte. */
  ignoreBelowAlpha: 0.3,
  /** Personalen bakom disken eller i luckan räknas inte mot gästerna utanför. */
  excluded: ['crew i vagnen', 'figurer bakom bardisken']
};

export const YIELD = {
  /** Någon inom 0,85 m och inom ±63° framför (cos ≥ 0,45). */
  lookAheadM: 0.85, coneCos: 0.45,
  /** Farten skalas med (avstånd − stopp) / 0,43, aldrig under golvet. */
  /** Bakom någon som går åt samma håll (cos ≥ 0,5 mellan riktningarna): stannar helt vid 0,55 m. */
  following: { stopM: 0.55, floor: 0 },
  /** Mötande eller korsande: saktar till 20 % vid 0,42 m men stannar aldrig (annars låser de varandra). */
  crossing: { stopM: 0.42, floor: 0.2 },
  appliesTo: ['alla gångklipp med travel: true']
};

export const KEEP_RIGHT = {
  offsetM: 0.3,
  /** Tonas in och ut över 1,2 m i början och slutet av en gångsträcka, utom där figuren tonas in eller ut. */
  easeM: 1.2,
  /** Vid vagnen: gångvägen söder om vagnen och gatorna. Inne i rummen: gångarna mellan borden om de är minst 1,2 m. */
  where: ['gångväg', 'gata', 'trottoar', 'gång ≥ 1,2 m'],
  side: 'höger i gångriktningen'
};

/** Om spelet redan har navigering (navmesh med undanmanöver) räcker del 3 som skydd mot det som slinker igenom. */
export const FLAGS = {
  navmesh: 'Om Code redan har ett navmesh med RVO/undanmanöver: behåll det, och lägg bara till PERSONAL_SPACE som sista steg.',
  rooms: 'I vinbaren är gångarna 0,88 m (wineBarHouse.ts). Där räcker inte hålla till höger. Väja och knuffas isär gäller.'
};
