// ORDER 313 §3 (Anders 2026-10-06) — varje meddelande till spelaren har en
// avsändare: Åsa (mentorn), Banken, Per (hovmästaren), Byn (recensionerna
// och byns händelser) eller Måltidens hus (prov och kurser).
// ORDER 317 — Designs D6 del 2 (d6Ui.ts SENDERS): märket, namnet och raden om
// vad avsändaren är. Banken, Per, Byn och Måltidens hus har ett runt märke
// (glyfen på sin platta med kant); Åsa har sitt porträtt; personalen (BESLUT
// 2026-10-07 del 4 punkt 7) har initialen i rollringens färg och raden
// "namn, roll", till exempel "Sara, servitör".

import { t as tt, type StringKey } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import { strings } from '../../content/strings';
import { ROLE_RING, SENDERS, type SenderId } from './d6Ui';
import { AsaPortrait } from './AsaBubble';
import './screens/screens.css';

export type Sender = 'asa' | 'bank' | 'per' | 'byn' | 'house' | 'staff';

/** Personen i laget: nyckeln i strings.fika.people/roles och rollringen (d6Ui ROLE_RING). */
export interface StaffSender { person: string; ring: keyof typeof ROLE_RING }

const D6_ID: Record<Sender, SenderId> = { asa: 'asa', bank: 'bank', per: 'per', byn: 'village', house: 'house', staff: 'staff' };

function Badge({ id }: { id: SenderId }) {
  const s = SENDERS[id];
  if (!s.glyph) return null;
  return (
    <svg className="nx-sender-badge" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill={s.plate} stroke={s.rim} strokeWidth="1.4" />
      {s.glyph.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill ?? 'none'} stroke={p.stroke ?? 'none'} strokeWidth={p.sw ?? 0} fillRule={p.rule} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

export function SenderTag({ sender, className, staff }: { sender: Sender; className?: string; staff?: StaffSender }) {
  const lang = useLanguage();
  const id = D6_ID[sender];
  const spec = SENDERS[id];
  if (sender === 'staff' && staff) {
    const name = strings.fika.people[staff.person] ?? '';
    const role = strings.fika.roles[staff.person] ?? '';
    return (
      <span className={`nx-sender nx-sender-staff ${className ?? ''}`} data-testid="sender" data-sender="staff" data-person={staff.person}>
        <span className="nx-sender-initial" style={{ borderColor: ROLE_RING[staff.ring] }} aria-hidden>{(name || role).charAt(0).toUpperCase()}</span>
        <span className="nx-sender-name">{name ? tt(lang, 'sender.staff' as StringKey, { name, role }) : role.charAt(0).toUpperCase() + role.slice(1)}</span>
      </span>
    );
  }
  return (
    <span className={`nx-sender ${className ?? ''}`} data-testid="sender" data-sender={sender}>
      {sender === 'asa' ? <AsaPortrait className="nx-sender-portrait" /> : <Badge id={id} />}
      <span className="nx-sender-name">{tt(lang, spec.nameKey as StringKey)}</span>
      {spec.subKey && <span className="nx-sender-sub">{tt(lang, spec.subKey as StringKey)}</span>}
    </span>
  );
}
