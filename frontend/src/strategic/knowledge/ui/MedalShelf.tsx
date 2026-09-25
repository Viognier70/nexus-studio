// ORDER 264 (Nexus v1 etapp 2) — spelarens medaljer i ord.
//
// Speldesign > Medaljerna: ett bevis som öppnar vägar och aldrig kan
// tas tillbaka. Visas på morgonens rad så att medaljerna syns varje dag,
// också efter att spelet laddats om.

import { strings } from '../../../content/strings.sv';
import { useSimState } from '../../simulation/SimulationProvider';
import type { PavilionKey } from '../../types';

const ORDER: readonly PavilionKey[] = ['maltidbiblioteket', 'metodkoket', 'stensota', 'kalastorget', 'gastronomiskateatern'];

export function MedalShelf() {
  const sim = useSimState();
  const k = strings.knowledge;
  const held = ORDER.filter((p) => sim.medals[p]);
  return (
    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }} data-testid="medal-shelf">
      <span style={{ opacity: 0.75 }}>{k.medalsHeading}: </span>
      {held.length === 0
        ? k.noMedalsYet
        : held.map((p, i) => (
            <span key={p} data-testid={`shelf-${p}`}>
              {i > 0 ? ' · ' : ''}
              {k.pavilions[p]} {k.medals[sim.medals[p]!]}
            </span>
          ))}
    </div>
  );
}
