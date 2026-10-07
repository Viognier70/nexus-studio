// venueTier.ts — nivåerna Enkel, Mellan och Exklusiv. D7, 2026-10-06.
//
// Ersätter klassnamnen i ORDER 304 (Enkel, Bistro, Soigné). Bistro är nu ett steg i Din väg (careerPath.ts),
// så nivån får neutrala namn. Nivån räknas som förut fram ur varukorgen och väljs inte direkt.
//   enkel → simple, bistro → mid, soigné → fine
//
// Nivån visas på två ställen:
//   Skylten   1–3 knappar under namnet och steget. Skylten byter material med nivån.
//   Morgonen  raden överst (dag · krogens namn · steg · nivå) och recensionskortets bricka
//             (review.fx.class, nu "Ryktet på nivån {tier} {delta}"). En ny nivå får brickan Från i dag: {tier} den morgonen.
// Stjärnor används inte för nivån. Stjärnan är målet och rivalernas betyg.

export type TierId = 'simple' | 'mid' | 'fine';

export const TIER_FROM_D5: Record<string, TierId> = { enkel: 'simple', bistro: 'mid', soigne: 'fine' };

export const TIERS: Record<TierId, {
  key: string; pips: 1 | 2 | 3; guestsKey: string; priceKey: string;
  sign: { material: string; board: string; edge: string; ink: string; font: 'Figtree' | 'Young Serif'; lamp: boolean; pip: string };
}> = {
  simple: { key: 'tier.simple', pips: 1, guestsKey: 'tier.guests.simple', priceKey: 'tier.price.simple',
    sign: { material: 'Griffeltavla i träram, krita', board: '#2b2a28', edge: '#8a6a4a', ink: '#f2ede2', font: 'Figtree', lamp: false, pip: '#e9dcc4' } },
  mid: { key: 'tier.mid', pips: 2, guestsKey: 'tier.guests.mid', priceKey: 'tier.price.mid',
    sign: { material: 'Emalj i grädde med mässingskant', board: '#f3e6c8', edge: '#b98a3c', ink: '#2a1c13', font: 'Young Serif', lamp: false, pip: '#b98a3c' } },
  fine: { key: 'tier.fine', pips: 3, guestsKey: 'tier.guests.fine', priceKey: 'tier.price.fine',
    sign: { material: 'Svart lack med förgylld dubbelkant och en lampa ovanför', board: '#100b08', edge: '#d9b476', ink: '#f0cd82', font: 'Young Serif', lamp: true, pip: '#f0cd82' } }
};

/** Morgonens rad. {tier} är nivåns namn. */
export function morningLine(S: (k: string, v?: any) => string, venueName: string, stepKey: string, tier: TierId): string {
  return venueName + ' · ' + S(stepKey) + ' · ' + S(TIERS[tier].key);
}

/** Nyckeländring: review.fx.class får ordet nivå. */
export const KEY_CHANGES = {
  'review.fx.class': { sv: 'Ryktet på nivån {tier} {delta}', en: 'Reputation at the {tier} level {delta}', was: 'Ryktet som {cls} {delta}' }
};

/** På vagnens skylt sitter knapparna i skyltens högra ände (playerTruck.ts roofSign). Vagnen börjar på Enkel. */
export const TRUCK_SIGN_PIPS = { at: 'roofSign, högra änden', pitchM: 0.14, radiusM: 0.045 };
