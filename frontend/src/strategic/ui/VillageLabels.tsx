// ORDER 288 — byns etiketter i HUD-lagret (Designs leveransnot §4: namnen i
// HUD:en, inte i bilden). Ritas genom drei:s Html i scenen
// (scene/village/VillageVenues.tsx, StreetArrivals.tsx); DOM:en står här så
// att scenfilerna bara har R3F-element.

import { strings } from '../../content/strings';
import type { VenueTonight } from '../../sim/village';

export function Stars({ n }: { n: number }) {
  return (
    <span className="nx-venue-stars" aria-label={strings.village.starsAria(n)}>
      {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < n ? 'on' : ''}>★</span>)}
    </span>
  );
}

// ORDER 300 §7 (Anders 2026-10-04): spelarens skylt visar krogens namn
// ("Tannin, din krog") och stil och pris, som konkurrenternas skyltar.
// drei:s Html ritar i en egen rot utan spelets kontexter, så namnet och
// stilen kommer som props (VillageVenues.tsx).
export function VenueLabel({ v, guests, compact, near = false, innerRef, playerName, playerStyle }: { v: VenueTonight; guests: number; compact: boolean; near?: boolean; innerRef: (el: HTMLDivElement | null) => void; playerName?: string | null; playerStyle?: string | null }) {
  const ours = v.kind === 'player';
  const name = ours && playerName ? strings.village.playerNamed(playerName) : strings.village.venues[v.id] ?? v.id;
  const food = ours ? playerStyle ?? null : strings.village.food[v.id] ?? null;
  const where = v.spot ? strings.village.spots[v.spot] : null;
  return (
    <div ref={innerRef} className={`nx-venue-label${v.kind === 'player' ? ' is-player' : ''}${v.open || near ? '' : ' is-closed'}${compact ? ' is-compact' : ''}${near ? ' is-near' : ''}`} data-testid={near ? 'player-sign' : 'village-venue'} data-venue={v.id}>
      <div className="nx-venue-name">{name}{v.control === 'human' ? <span className="nx-venue-human"> · {strings.village.controlHuman}</span> : null}</div>
      {food && !compact && <div className="nx-venue-food">{food}{where ? ` ${where}` : ''}</div>}
      <div className="nx-venue-meta">
        <Stars n={v.stars} />
        {!compact && v.billSek > 0 && <span className="nx-venue-price">{strings.village.priceTag(String(Math.round(v.billSek / 10) * 10))}</span>}
      </div>
      <div className="nx-venue-state">{v.open ? strings.village.tonight(guests) : strings.village.closed}</div>
    </div>
  );
}


export function StreetTag({ n, who, to, metres }: { n: number; who: string; to: string; metres: number }) {
  return (
    <div className="nx-street-tag" data-testid="street-arrival">
      {strings.village.group(n, who, to)}
      <span className="nx-street-dist"> · {Math.round(metres)} m</span>
    </div>
  );
}
