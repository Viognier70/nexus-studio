// ORDER 299 (Vision Owner 2026-10-03): "En rad binder ihop svaret med gästens
// reaktion, till exempel 'Du valde Grüner Veltliner → gästen beställer en
// flaska till.'" Raden läser vad som hände vid bordet (day.roomReactions,
// sim/incidents.ts answerConsequence) och vilka som såg det.

import { t as tt, type StringKey } from '../../../content/nexusStrings';
import type { Lang } from '../../../content/language';
import type { RoomReaction } from '../../types';

export function reactionPhrase(lang: Lang, r: RoomReaction): string {
  const t = r.table ?? 0;
  const parts: string[] = [];
  switch (r.detail) {
    case 'glass': parts.push(tt(lang, 'consequence.glass', { t })); break;
    case 'more': parts.push(r.table !== null ? tt(lang, 'consequence.more', { t }) : tt(lang, 'consequence.moreRoom')); break;
    case 'leaves': parts.push(tt(lang, 'consequence.leaves', { t })); break;
    case 'less': parts.push(tt(lang, 'consequence.less', { t })); break;
    case 'queue': parts.push((r.left ?? 0) > 0 ? tt(lang, 'consequence.queue', { n: r.left ?? 0 }) : tt(lang, 'consequence.queueStays')); break;
    default: parts.push(r.text);
  }
  const inN = r.guestsIn ?? 0;
  if (inN > 0) parts.push(tt(lang, (inN === 1 ? 'consequence.in' : 'consequence.inMany') as StringKey, { n: inN }));
  if ((r.witnessIds?.length ?? 0) > 0) parts.push(tt(lang, r.kind === 'up' ? 'consequence.witnessUp' : 'consequence.witnessDown'));
  return parts.join(' · ');
}

export function consequenceLine(lang: Lang, r: RoomReaction, choice: string | null): string {
  const reaction = reactionPhrase(lang, r);
  return choice ? tt(lang, 'consequence.line', { choice, reaction }) : tt(lang, 'consequence.timeout', { reaction });
}
