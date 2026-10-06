// ORDER 267 (Nexus v1 etapp 5) — söndagstidningen.
//
// Veckoavräkningen som söndagsnumret av en lokaltidning i Grythyttan
// (sim/newspaper.ts). Öppnas av sig själv söndag morgon efter varje
// avräkning och kan läsas igen från morgonraden.
//
// ORDER 271 — formen efter Designs skärm T1 (paket 1): tidningssidan
// med recensionen i två spalter och marknaden, banken och det som kommer
// i sidospalten. Innehållet är oförändrat (sim/newspaper.ts). Designens
// vinglas, citat och tidningsnamn är platshållare utan motsvarighet i
// spelet och är inte byggda.

import { snapshotScene } from '../scene/SceneSnapshot';
import { useEffect, useState } from 'react';
import { strings } from '../../content/strings';
import { calendarFor } from '../../sim/calendar';
import { newspaperFor } from '../../sim/newspaper';
import { requirementsFor } from '../../sim/economy';
import { useBusiness } from '../business/BusinessContext';
import { useSimState } from '../simulation/SimulationProvider';
import { missingInWords, settlementInWords } from './BankDialog';
import { NxButton } from '../ui/system/components';
import '../ui/screens/screens.css';
import { SenderTag } from '../ui/SenderTag';

const t = strings.newspaper;
const PHOTO_TRIES = 40;
const PHOTO_RETRY_MS = 250;

// Öppen söndag morgon för veckan som just avräknats, tills spelaren
// lägger ifrån sig tidningen; `openAgain` öppnar den igen.
export function useNewspaper() {
  const sim = useSimState();
  const week = sim.economy.lastSettlement?.week ?? null;
  const cal = calendarFor(sim.day.dayNumber);
  const sundayMorning = !cal.isServiceDay && sim.day.period === 'morning' && week !== null;
  const [readWeek, setReadWeek] = useState<number | null>(null);
  const [again, setAgain] = useState(false);
  useEffect(() => {
    if (!sundayMorning) setAgain(false);
  }, [sundayMorning]);
  const open = sundayMorning && (readWeek !== sim.day.dayNumber || again);
  return {
    available: sundayMorning,
    open,
    close: () => {
      setReadWeek(sim.day.dayNumber);
      setAgain(false);
    },
    openAgain: () => setAgain(true)
  };
}

export function NewspaperDialog({ open, onClose, onOpenBank }: { open: boolean; onClose: () => void; onOpenBank?: () => void }) {
  const sim = useSimState();
  const { business } = useBusiness();
  // ORDER 285 — fotot: scenen från spelarens kamera när tidningen öppnas,
  // med den varma graderingen i CSS (screens.css .nxs-paper-photo).
  const [photo, setPhoto] = useState<string | null>(null);
  // Scenen kan monteras efter tidningen (spelet laddat på en söndag); då
  // prövas bilden igen en stund.
  useEffect(() => {
    if (!open) return;
    let tries = 0;
    let timer = 0;
    const attempt = () => {
      const url = snapshotScene();
      if (url) { setPhoto(url); return; }
      if (++tries < PHOTO_TRIES) timer = window.setTimeout(attempt, PHOTO_RETRY_MS);
    };
    attempt();
    return () => window.clearTimeout(timer);
  }, [open]);
  if (!open) return null;
  const paper = newspaperFor(sim, business.name ?? '', settlementInWords(sim), (id) =>
    missingInWords(id, sim.medals, requirementsFor(sim, id))
  );
  if (!paper) return null;
  const review = paper.sections.find((x) => x.id === 'review');
  const side = paper.sections.filter((x) => x.id !== 'review');
  const cal = calendarFor(sim.day.dayNumber);
  return (
    <div className="nx nx-screen nxs-paper-back" role="dialog" aria-modal="true" aria-label={paper.masthead}>
      <article className="nxs-paper nx-paper" data-testid="newspaper">
        <header className="nxs-paper-head" data-testid="screen-T1">
          <SenderTag sender="byn" />
          <h1 className="nxs-masthead">{paper.masthead}</h1>
          <div className="nx-small" style={{ fontWeight: 700, textAlign: 'right' }}>
            <div>{strings.calendar.weekdays[cal.weekday]}</div>
            <div>{paper.subhead}</div>
          </div>
        </header>
        <div className="nxs-paper-grid">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {review && (
              <section data-testid={`newspaper-${review.id}`}>
                <div className="nxs-review-head">
                  <span className="nx-label nxs-chip">{review.heading}</span>
                </div>
                {review.title && <h2 className="nx-heading nxs-mt-24">{review.title}</h2>}
                {photo && (
                  <figure className="nxs-paper-figure">
                    <img className="nxs-paper-photo" src={photo} alt="" data-testid="newspaper-photo" />
                    <figcaption className="nx-small nx-muted">{t.photoCaption}</figcaption>
                  </figure>
                )}
                <p className="nx-small nxs-columns">{review.lines.join(' ')}</p>
              </section>
            )}
            <div className="nxs-foot" style={{ marginTop: 'auto' }}>
              <NxButton kind="quiet" testId="close-newspaper" onClick={onClose}>{t.close}</NxButton>
              {onOpenBank && (
                <div className="nxs-btn-primary-w">
                  <NxButton testId="newspaper-to-bank" onClick={onOpenBank}>{strings.screens.newspaper.toBank}</NxButton>
                </div>
              )}
            </div>
          </div>
          <aside>
            {side.map((section) => (
              <section key={section.id} className="nxs-side-section" data-testid={`newspaper-${section.id}`}>
                <div className="nx-label">{section.heading}</div>
                {section.title && <h3>{section.title}</h3>}
                {section.items && (
                  <ol className="nx-small nxs-mt-8 nxs-ranking" data-testid="newspaper-ranking-list">
                    {section.items.map((it) => <li key={it}>{it.replace(/^\d+\.\s*/, '')}</li>)}
                  </ol>
                )}
                {section.lines.length > 0 && <p className="nx-small nxs-mt-8">{section.lines.join(' ')}</p>}
              </section>
            ))}
          </aside>
        </div>
      </article>
    </div>
  );
}
