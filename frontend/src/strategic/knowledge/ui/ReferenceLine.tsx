// ORDER 270 — referensen bakom en fråga eller händelse (titel och länk),
// visad med förklaringen när den finns. Fälten är tomma tills Vision
// Owner levererar referenserna; då visas ingenting.

import { strings } from '../../../content/strings';
import type { Reference } from '../../../sim/incidentBank';

export function ReferenceLine({ reference }: { reference: Reference | null | undefined }) {
  if (!reference) return null;
  return (
    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }} data-testid="reference">
      {strings.knowledge.referenceLabel}{' '}
      {/* ORDER 283 — utan länk visas titeln ensam. */}
      {reference.url ? (
        <a href={reference.url} target="_blank" rel="noopener noreferrer" style={{ color: '#e8d9a8' }}>
          {reference.title}
        </a>
      ) : (
        <span>{reference.title}</span>
      )}
    </div>
  );
}
