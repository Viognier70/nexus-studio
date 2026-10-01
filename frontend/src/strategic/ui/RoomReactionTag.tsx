// ORDER 292 — svarets händelse över bordet i rummet (Vision Owner 2026-10-01:
// "rätt svar ger en synlig händelse (gästen beställer mer …), och fel svar ger
// en tom stol, ett belopp som försvinner och en gäst som går"). Texten och
// beloppet ur simuleringens day.roomReactions (sim/incidents.ts).

import type { RoomReaction } from '../types';
import { formatSek } from './CashCounter';

export function RoomReactionTag({ reaction }: { reaction: RoomReaction }) {
  const amount = reaction.amountSek ?? 0;
  return (
    <div className="nx nx-room-reaction" data-kind={reaction.kind} data-testid="room-reaction" data-value={amount} key={`${reaction.at}:${reaction.kind}`}>
      {amount !== 0 && <strong className="nx-num">{amount > 0 ? '+' : '−'}{formatSek(Math.abs(amount))}</strong>}
      <span>{reaction.text}</span>
    </div>
  );
}
