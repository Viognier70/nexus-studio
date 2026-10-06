// ORDER 313 §3 (Anders 2026-10-06) — varje meddelande till spelaren har en
// avsändare: Åsa (mentorn), Banken, Per (hovmästaren), Byn (recensionerna
// och byns händelser) eller Måltidens hus (prov och kurser). Märket står
// överst i meddelandet. Formen kommer från Design (D6); till dess ett
// enkelt märke i designsystemets etikett.

import { strings } from '../../content/strings';
import './screens/screens.css';

export type Sender = 'asa' | 'bank' | 'per' | 'byn' | 'house';

export function SenderTag({ sender, className }: { sender: Sender; className?: string }) {
  return (
    <span className={`nx-label nx-sender ${className ?? ''}`} data-testid="sender" data-sender={sender}>
      {strings.senders[sender]}
    </span>
  );
}
