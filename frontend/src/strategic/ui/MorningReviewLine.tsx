// ORDER 303 C — "Recensioner i morse": gårdagens kväll som byn såg den, hur
// ryktet ändrades och varför (sim/morningReview.ts). Morgonens skärm.

import { strings } from '../../content/strings';
import type { MorningReview } from '../../sim/morningReview';

export function morningReviewText(r: MorningReview): string {
  const t = strings.reviews;
  const parts: string[] = [];
  if (r.wrongTables > 0) parts.push(t.wrong(r.wrongTables, r.wrongTitles.join(', ')));
  if (r.rightTables > 0) parts.push(t.right(r.rightTables, r.rightTitles.join(', ')));
  const rest = r.change - r.fromAnswers;
  if (rest !== 0) parts.push(t.guests(rest));
  if (parts.length === 0) parts.push(t.quiet);
  const body = parts.join(', ');
  return `${t.change(r.change)}: ${body.charAt(0).toLowerCase()}${body.slice(1)}.`;
}

export function MorningReviewLine({ review }: { review: MorningReview | null | undefined }) {
  if (!review) return null;
  return (
    <div className="nxs-dark-box nxs-review-box" data-testid="morning-review" data-change={review.change}>
      <div style={{ flex: 1 }}>
        <div className="nx-label nx-accent-text">{strings.reviews.label}</div>
        <p className="nx-small nxs-mt-8">{morningReviewText(review)}</p>
      </div>
    </div>
  );
}
