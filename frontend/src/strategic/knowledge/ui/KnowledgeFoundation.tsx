// ORDER 301 (Anders 2026-10-04) — sidan Kunskapsgrunden i Måltidsbiblioteket,
// med källorna (documentation/foundation/KUNSKAPSGRUND_TRIAD.md §1–2), och
// eftertexterna med samma källor. Sidan öppnas från bibliotekets rad i
// Måltidens hus och från "Läs mer" i introduktionen Tre sätt att kunna;
// eftertexterna från menyn.

import { useSyncExternalStore } from 'react';
import { strings } from '../../../content/strings';
import { NxButton } from '../../ui/system/components';
import '../../ui/screens/screens.css';

type Page = 'foundation' | 'credits' | null;
let page: Page = null;
const subs = new Set<() => void>();
const set = (p: Page) => { page = p; subs.forEach((f) => f()); };
export const openKnowledgeFoundation = () => set('foundation');
export const openCredits = () => set('credits');
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

function Sources() {
  const k = strings.knowledgeBase;
  return (
    <>
      <h3 className="nx-label nxs-mt-24">{k.sourcesHeading}</h3>
      <ul className="nxs-kf-sources" data-testid="kf-sources">
        {k.sources.map((s) => <li key={s} className="nx-small">{s}</li>)}
      </ul>
      <p className="nx-small nx-muted nxs-mt-8">{k.sourcesNote}</p>
      <p className="nx-small nx-muted nxs-mt-8">{k.more}</p>
    </>
  );
}

export function KnowledgeFoundationLayer() {
  const p = useSyncExternalStore(subscribe, () => page, () => page);
  if (!p) return null;
  const k = strings.knowledgeBase;
  if (p === 'credits') {
    const c = strings.credits;
    return (
      <div className="nx nxs-rules" role="dialog" aria-modal="true" aria-label={c.heading} data-testid="credits-page">
        <div className="nx-panel nxs-rules-panel">
          <div className="nx-label nx-accent-text">{c.heading}</div>
          <p className="nx-heading nxs-mt-16 nxs-rules-tagline">{c.studio}</p>
          <p className="nx-body nxs-mt-16 nxs-measure">{c.model}</p>
          <Sources />
          <div className="nxs-mt-24 nxs-w-300"><NxButton testId="credits-close" onClick={() => set(null)} arrow={false} autoFocus>{k.close}</NxButton></div>
        </div>
      </div>
    );
  }
  return (
    <div className="nx nxs-rules" role="dialog" aria-modal="true" aria-label={k.heading} data-testid="knowledge-foundation">
      <div className="nx-panel nxs-rules-panel nxs-kf-panel">
        <div className="nx-label nx-accent-text">{k.label}</div>
        <h2 className="nx-heading nxs-mt-16 nxs-rules-tagline">{k.heading}</h2>
        <div className="nxs-kf-cols">
        <div>
        <p className="nx-small nxs-mt-16" data-testid="kf-attribution">{k.attribution}</p>
        <h3 className="nx-label nxs-mt-24">{k.formsHeading}</h3>
        <div className="nxs-kf-forms">
          {k.forms.map((f) => (
            <section key={f.name} className="nxs-kf-form">
              <div className="nx-label">{f.name}</div>
              <p className="nx-small nxs-mt-8"><em>{f.question}</em></p>
              <p className="nx-small nxs-mt-8">{f.register}</p>
              <p className="nx-small nx-muted">{f.inference}</p>
            </section>
          ))}
        </div>
        <h3 className="nx-label nxs-mt-24">{k.gripHeading}</h3>
        <ul className="nxs-rules-not">{k.grip.map((g) => <li key={g} className="nx-small">{g}</li>)}</ul>
        </div>
        <div>
        <h3 className="nx-label nxs-mt-16">{k.quotesHeading}</h3>
        <div data-testid="kf-quotes">
          {k.quotes.map((q) => <p key={q} className="nx-small nxs-mt-8" style={{ fontStyle: 'italic' }}>{q}</p>)}
          <p className="nx-small nx-muted nxs-mt-8">{k.quoteBy}</p>
        </div>
        <Sources />
        </div>
        </div>
        <div className="nxs-mt-24 nxs-w-300"><NxButton testId="kf-close" onClick={() => set(null)} arrow={false} autoFocus>{k.close}</NxButton></div>
      </div>
    </div>
  );
}
