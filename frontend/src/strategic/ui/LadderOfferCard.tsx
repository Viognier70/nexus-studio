// ORDER 315a — Åsas erbjudande om nästa steg på karriärstegen (sim/ladder.ts).
//
// Kortet kommer på morgonen när kraven för nästa steg var uppfyllda vid
// dagens slut, efter morgonens recensioner: avsändaren Åsa, steget, Åsas
// replik, priset (insatsen ur kassan och lånet) och knapparna "Ta över" och
// "Inte än" (Designs D7). "Inte än" kostar inget: erbjudandet står kvar som
// en rad som öppnar kortet igen. Formen kommer från D7; till dess
// designsystemets enkla delar.

import { useState } from 'react';
import { strings } from '../../content/strings';
import { useLanguage } from '../../content/language';
import { canTakeOffer, currentOffer } from '../../sim/ladder';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { useReviewPending } from './MorningReviewLine';
import { SpeakerLine } from './SenderTag';
import { NxButton } from './system/components';
import './ladder.css';
import { DinVag } from './DinVag';
import { ladderStep } from '../../sim/ladder';
import { PremisesTakeSteps, useVinbarTake } from '../business/PremisesTakeSteps';
import { t as tt } from '../../content/nexusStrings';

export function LadderOfferCard({ hidden }: { hidden?: boolean }) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const lang = useLanguage();
  const reviewPending = useReviewPending(sim);
  const [reopened, setReopened] = useState<number | null>(null);
  // ORDER 333 D — lokalen när vinbaren tas över; ORDER 334 D — sedan frågar banken efter namnet.
  const vin = useVinbarTake();
  const offer = sim.day.period === 'morning' ? currentOffer(sim) : null;
  if (!offer || hidden || reviewPending) return null;
  const l = strings.ladder;
  const kr = (n: number) => Math.round(n).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB');
  const title = l.title[offer.to];
  const open = offer.state === 'offered' || reopened === sim.day.dayNumber;
  if (!open) {
    return (
      <button type="button" className="nx-btn nx-btn-quiet nx-ladder-standing" data-testid="ladder-standing" onClick={() => setReopened(sim.day.dayNumber)}>
        {l.standing(title)}
      </button>
    );
  }
  const can = canTakeOffer(sim);
  return (
    <div className="nx-ladder-backdrop" data-testid="ladder-offer-backdrop">
      <section className="nx-paper nx-ladder-offer" role="dialog" aria-label={title} data-testid="ladder-offer" data-to={offer.to}>
        {/* ORDER 330 A — Åsa med porträttet, namnet och rollen under, och repliken till höger. */}
        <SpeakerLine sender="asa">
          <h2 className="nx-heading" style={{ margin: '0 0 0.4em' }}>{title}</h2>
          <p className="nx-body" data-testid="ladder-line">{l.line[offer.to]}</p>
        </SpeakerLine>
        <p className="nx-small" data-testid="ladder-price">{offer.to === 'foodtruck' ? l.truckPrice : l.price(kr(offer.depositSek), kr(offer.loanSek))}</p>
        {can === 'cash' && <p className="nx-small" data-testid="ladder-cash-short">{l.cashShort(kr(offer.depositSek))}</p>}
        <p className="nx-small" style={{ opacity: 0.8 }}>{l.notYetNote}</p>
        {offer.to === 'vinbar' && <PremisesTakeSteps take={vin} />}
        <DinVag sim={sim} />
        <div style={{ display: 'flex', gap: '0.75em', justifyContent: 'flex-end', marginTop: '1em' }}>
          {offer.to === 'vinbar' && vin.step === 'name'
            ? <button type="button" className="nx-btn nx-btn-quiet" data-testid="premises-back" onClick={() => vin.setStep('premises')}>{tt(lang, 'premises.back')}</button>
            : <button type="button" className="nx-btn nx-btn-quiet" data-testid="ladder-not-yet" onClick={() => { setReopened(null); if (offer.state === 'offered') dispatch({ type: 'LADDER_DECLINE' }); }}>{l.notYet}</button>}
          {offer.to === 'vinbar' && vin.step === 'premises'
            ? <NxButton testId="premises-to-bank" onClick={() => vin.setStep('name')} disabled={can !== 'ok'}>{tt(lang, 'premises.toBank')}</NxButton>
            : <NxButton testId="ladder-take" onClick={() => { if (offer.to === 'vinbar') vin.commitName(); dispatch({ type: 'LADDER_TAKE', ...(offer.to === 'vinbar' ? { premises: vin.premises } : {}) }); }} disabled={can !== 'ok' || (offer.to === 'vinbar' && !vin.named)}>{l.take}</NxButton>}
        </div>
      </section>
    </div>
  );
}

// ORDER 315a — "Din väg" på morgonen: hela stegen, var spelaren står och
// kraven för nästa steg (formen kommer från D7).
// ORDER 315b del 2 — knappen står i morgonens rubrikrad (DayActionBar), bredvid Måltidens hus:
// den fasta knappen låg under morgonens skärm och gick inte att trycka på (flödeskontrollen).
export function DinVagButton({ hidden }: { hidden?: boolean }) {
  const sim = useSimState();
  const [open, setOpen] = useState(false);
  if (hidden || sim.day.period !== 'morning' || !ladderStep(sim)) return null;
  const l = strings.ladder;
  if (!open) return <NxButton kind="quiet" testId="din-vag-open" onClick={() => setOpen(true)}>{l.open}</NxButton>;
  return (
    <div className="nx-ladder-backdrop" data-testid="din-vag-backdrop" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: 'calc(100% - 32px)' }}>
        <DinVag sim={sim} />
        <div style={{ textAlign: 'right', marginTop: 8 }}><NxButton testId="din-vag-close" onClick={() => setOpen(false)}>{l.close}</NxButton></div>
      </div>
    </div>
  );
}
