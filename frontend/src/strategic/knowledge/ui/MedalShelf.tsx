// ORDER 264 (Nexus v1 etapp 2) — spelarens medaljer i ord.
// ORDER 271 — formen efter Designs S1 (paket 1): paviljongerna i
// Måltidens hus som en lista i morgonens schema, med medaljen som rund
// form. Varje rad öppnar Måltidens hus (där övning och prov väljs).
//
// Speldesign > Medaljerna: ett bevis som öppnar vägar och aldrig kan
// tas tillbaka. Visas i morgonens schema så att medaljerna syns varje
// dag, också efter att spelet laddats om.

import { strings } from '../../../content/strings.sv';
import { useSimState } from '../../simulation/SimulationProvider';
import type { PavilionKey } from '../../types';
import { isPavilionUnlocked } from '../pavilionVisit';
import { NxIcon, PAVILION_ICON } from '../../ui/screens/icons';
import { MedalDisc } from '../../ui/screens/MedalDisc';
import '../../ui/screens/screens.css';

const ORDER: readonly PavilionKey[] = ['maltidbiblioteket', 'metodkoket', 'stensota', 'kalastorget', 'gastronomiskateatern'];

export function MedalShelf({ onOpenHouse }: { onOpenHouse?: () => void } = {}) {
  const sim = useSimState();
  const k = strings.knowledge;
  return (
    <div className="nx" data-testid="medal-shelf" aria-label={k.medalsHeading}>
      {ORDER.map((p) => {
        const level = sim.medals[p];
        const locked = !isPavilionUnlocked(sim, p);
        const inner = (
          <>
            <NxIcon name={locked ? 'lock' : PAVILION_ICON[p]} size={32} />
            <span className="nxs-row-title" style={{ flex: 1 }}>{k.pavilions[p]}</span>
            {level && <span className="nxs-row-sub">{k.medals[level]}</span>}
            {!locked && <MedalDisc level={level} size={40} />}
          </>
        );
        const testId = level ? `shelf-${p}` : `shelf-empty-${p}`;
        return onOpenHouse && !locked ? (
          <button key={p} type="button" className="nxs-list-row" data-testid={testId} onClick={onOpenHouse}>
            {inner}
          </button>
        ) : (
          <div key={p} className="nxs-list-row" data-static="true" aria-disabled={locked} data-testid={testId}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
