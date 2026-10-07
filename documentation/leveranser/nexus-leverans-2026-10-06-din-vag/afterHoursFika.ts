// afterHoursFika.ts — fikat efter stängning med dilemmakortet. D7, 2026-10-06.
//
// Efter sista gästen: laget sitter vid två tvåor som skjutits ihop, stolarna står uppe på de andra borden,
// en pendel är tänd över laget och resten av rummet ligger i mörker. Kameran går in till 8 m.
// Den som frågar lyfter handen och får ett mjukt ljus. Kortet öppnas till höger.
//
// Kortet: vem som frågar (namn, roll), frågan, 3–4 svar och förklaringen efteråt på papper (650 ms efter svaret,
// som raketkortet). Färgerna är nexusTheme.warm.rattfel.ts: grönt för rätt, rött för fel. Ett dilemma i
// phronesis har minst två försvarbara svar. Båda är gröna. Svarar spelaren fel får båda streckad grön kant och
// Det här hade hållit. Svaren är ungefär lika långa och felsvaren är verkliga misstag. Ärlighet är aldrig fel.
// Följden visas som en bricka (trivseln för den som frågar), samma form som recensionskortet.

export type Vec2 = [number, number];

export const FIKA_SCENE = {
  room: 'wineBarRoom',
  table: { joined: ['twoTop0', 'twoTop1'], centre: [4.2, -4.5] as Vec2, w: 1.5, d: 0.75 },
  seats: { player: [3.15, -4.5], per: [3.8, -3.85], elin: [4.6, -3.85], sara: [3.8, -5.15], cook: [4.6, -5.15] } as Record<string, Vec2>,
  props: { cups: 'coffeeCup per person', thermos: [4.25, -4.5] as Vec2, buns: [4.6, -4.5] as Vec2 },
  chairsUp: 'alla andra bord och barstolarna',
  light: { pendant: [4.2, -4.5] as Vec2, colour: '#ffba6e', radiusM: 2.0, darkness: 0.86, askerGlow: 0.3 },
  camera: { toM: 8, glideSec: 1.6 },
  clips: { asker: 'gesture.raiseHand', others: 'guest.sip (koppen i stället för glaset)', afterRight: 'asker lutar sig tillbaka', afterWrong: 'asker tittar ned' }
};

export interface Dilemma {
  id: string; askerId: string; askerRoleKey: string; questionKey: string;
  answers: { key: string; right: boolean; whyKey: string }[];
  fx: { key: string; right: string; wrong: string };
}

export const DILEMMAS: Dilemma[] = [
  {
    id: 'rotaWeekends', askerId: 'sara', askerRoleKey: 'fika.asker.role', questionKey: 'fika.q',
    answers: [
      { key: 'fika.a1', right: true, whyKey: 'fika.why.a1' },
      { key: 'fika.a2', right: true, whyKey: 'fika.why.a2' },
      { key: 'fika.a3', right: false, whyKey: 'fika.why.a3' },
      { key: 'fika.a4', right: false, whyKey: 'fika.why.a4' }
    ],
    fx: { key: 'fika.fx', right: 'FIKA.morale.right', wrong: 'FIKA.morale.wrong' }
  }
];

/** När fikat erbjuds: efter stängning, högst en gång per kväll, aldrig samma kväll som Åsas erbjudande. */
export const FIKA_RULES = { maxPerEvening: 1, notWith: ['ownerOffer'], source: 'veckans ork och trivsel (staffStatus.ts): den med lägst trivsel frågar' };

export const FLAGS = {
  bank: 'Ett dilemma är skrivet som exempel. Fler behövs, och de granskas av Vision Owner som raketerna.',
  clips: 'gesture.raiseHand finns inte i figureClips.ts. Det är armen över axelhöjd, som vinkningen, men stilla med öppen hand.'
};
