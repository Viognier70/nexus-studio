// ownerOffer.ts — Åsas erbjudande: nästa steg erbjuds i en scen vid dörren. D7, 2026-10-06.
//
// Åsa äger huset vid torget (w869907975). Hon kommer förbi efter stängning den kväll då alla krav för nästa steg
// är uppfyllda (careerPath.offerReady), tidigast på kvällens slut och aldrig mitt i servicen.
//
// Scenen: kameran glider från 24 m till 10 m mot dörren på 1,6 s. Åsa står på trottoaren (VENUE_OUTSIDE,
// 1,25 m ut från fasaden) med nycklarna i handen, spelaren i dörren (0,5 m ut). Kortet öppnas till höger.
// Ta över: handslag och nycklarna byter hand (0,7 s), svaret på papper, knappen Till ombyggnaden.
// Inte än: Åsa sänker handen och tar ett halvt steg bakåt. Erbjudandet står kvar och syns i Din väg.
// Inget av svaren kostar något. Ett nej är aldrig fel.

export type Vec2 = [number, number];

export const OWNER = {
  id: 'asa', nameKey: 'asa.name', roleKey: 'asa.role',
  look: { body: '#6a5578', scarf: '#b9a07a', hair: '#c9b08a', prop: 'keys' }
};

export const OFFER_SCENE = {
  door: [30.71, -23.94] as Vec2,           // venueEntrance.ts doorOnFacade
  ownerOut: 1.25, playerOut: 0.5,          // meter ut från fasaden, längs fasadens normal
  camera: { fromM: 24, toM: 10, glideSec: 1.6, backSec: 1.2 },
  handshakeSec: 0.7
};

export const OFFER_CARD = {
  kickerKey: 'asa.kicker', lineKey: 'asa.line', whatKey: 'asa.what',
  rows: [
    { key: 'asa.row.closed', vars: { days: 'CAREER.bistro.refitDays' } },
    { key: 'asa.row.deposit', vars: { deposit: 'CAREER.bistro.deposit' } },
    { key: 'asa.row.rep' },
    { key: 'asa.row.keep' }
  ],
  actions: [
    { id: 'take', key: 'asa.take', primary: true, replyKey: 'asa.reply.take', then: 'refit' },
    { id: 'notyet', key: 'asa.notyet', primary: false, replyKey: 'asa.reply.notyet', then: 'stay' }
  ]
};

/** Efter Inte än står erbjudandet kvar. Spelaren kan ta det från Din väg vid nästa veckoavräkning. */
export const OFFER_PERSISTS = true;
