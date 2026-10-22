// ORDER 315b del 2 — Åsas erbjudande vid dörren efter stängning (Designs D7,
// ownerOffer.ts OFFER_CARD, med tillägget 2026-10-07: Åsa äger inte huset,
// hon har nycklarna och förmedlar ägarens erbjudande).
//
// Kortet: "Ett erbjudande", Åsa och hennes roll, repliken och fyra rader om
// vad det betyder: stängt i {days} dagar (balance.ts LADDER.refitDays),
// kontantinsatsen (erbjudandets depositSek), ryktet och att personalen och
// kunskapen följer med. Ryktet följer med oförändrat (Anders beslut,
// BESLUT 2026-10-07 del 2 fråga 1), så raden säger det och inte D7:s "börjar
// om till hälften". Ta över: handslaget, svaret och "Till ombyggnaden". Inte
// än: Åsas svar; erbjudandet står kvar och kostar ingenting.

import { useState } from 'react';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import { LADDER } from '../../sim/balance';
import { canTakeOffer, offerAtDoorTonight } from '../../sim/ladder';
import { PATH_KEY } from '../ui/DinVag';
import type { SimulationState } from '../types';
import { NxButton, NxLabel } from '../ui/system/components';
import { AsaPortrait } from '../ui/AsaBubble';
import { PremisesTakeSteps, useVinbarTake } from '../business/PremisesTakeSteps';
import { useSimDispatch } from '../simulation/SimulationProvider';
import '../ui/service/service.css';
import './ownerOffer.css';

export function OwnerOfferScreen({ sim, onContinue }: { sim: SimulationState; onContinue: () => void }) {
  const dispatch = useSimDispatch();
  const lang = useLanguage();
  const S = (k: string, v?: Record<string, string | number>) => tt(lang, k as StringKey, v);
  const [answer, setAnswer] = useState<'take' | 'notyet' | null>(null);
  // ORDER 333 D — lokalen när vinbaren tas över; ORDER 334 D — sedan frågar banken efter namnet.
  const vin = useVinbarTake();
  const offer = offerAtDoorTonight(sim);
  if (!offer && !answer) return null;
  const kr = (n: number) => `${Math.round(n).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')} kr`;
  const can = canTakeOffer(sim);
  const rows = [
    LADDER.refitDays > 0 ? S('asa.row.closed', { days: LADDER.refitDays }) : null,
    offer ? S('asa.row.deposit', { deposit: kr(offer.depositSek) }) : null,
    S('asa.row.rep'),
    S('asa.row.keep')
  ].filter((r): r is string => r !== null);
  const vinbar = offer?.to === 'vinbar';
  const take = () => { if (vinbar) vin.commitName(); dispatch({ type: 'LADDER_TAKE', ...(vinbar ? { premises: vin.premises } : {}) }); setAnswer('take'); };
  const notYet = () => { dispatch({ type: 'LADDER_DECLINE' }); setAnswer('notyet'); };
  return (
    // Inte en helskärm: scenen vid dörren (OwnerAtDoor.tsx) syns, kortet står till höger (D7).
    <div className="nx nx-owner-overlay" data-testid="evening-bar" role="dialog" aria-label={S('asa.kicker')}>
      <div className="nx-owner-offer" data-testid="screen-owner-offer" data-to={offer?.to ?? ''} data-answer={answer ?? ''}>
        <div className="nx-owner-card" role="dialog" aria-label={S('asa.kicker')}>
          <NxLabel>{S('asa.kicker')}</NxLabel>
          <div className="nx-owner-who">
            <AsaPortrait className="nx-owner-portrait" />
            <div>
              <div className="nx-owner-name">{S('asa.name')}</div>
              <div className="nx-small nx-owner-role">{S('asa.role')}</div>
            </div>
          </div>
          {answer === null ? (
            <>
              <p className="nx-owner-line" data-testid="owner-line">{S('asa.line')}</p>
              {offer && <div className="nx-small nx-owner-step">{S(PATH_KEY[offer.to] ?? offer.to)}</div>}
              <NxLabel muted>{S('asa.what')}</NxLabel>
              <ul className="nx-owner-rows" data-testid="owner-rows">
                {rows.map((r) => <li key={r}>{r}</li>)}
              </ul>
              {vinbar && <PremisesTakeSteps take={vin} />}
              <div className="nx-owner-actions">
                {vinbar && vin.step === 'name'
                  ? <button type="button" className="nx-btn nx-btn-quiet" data-testid="premises-back" onClick={() => vin.setStep('premises')}>{S('premises.back')}</button>
                  : <button type="button" className="nx-btn nx-btn-quiet" data-testid="owner-not-yet" onClick={notYet}>{S('asa.notyet')}</button>}
                {vinbar && vin.step === 'premises'
                  ? <NxButton testId="premises-to-bank" onClick={() => vin.setStep('name')} disabled={can !== 'ok'}>{S('premises.toBank')}</NxButton>
                  : <NxButton testId="owner-take" onClick={take} disabled={can !== 'ok' || (vinbar && !vin.named)}>{S('asa.take')}</NxButton>}
              </div>
            </>
          ) : (
            <>
              <p className="nx-owner-line nx-owner-reply" data-testid="owner-reply">{S(answer === 'take' ? 'asa.reply.take' : 'asa.reply.notyet')}</p>
              <div className="nx-owner-actions">
                <NxButton testId="owner-continue" onClick={onContinue}>{answer === 'take' ? S('asa.toRefit') : S('path.back')}</NxButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
