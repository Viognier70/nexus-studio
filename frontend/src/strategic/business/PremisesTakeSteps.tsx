// ORDER 334 D — vinbaren tas över i två steg (Anders 2026-10-22: "Banken frågar efter krogens namn först när lokalen
// är vald, och namnet används på morgonen"): först lokalen (PremisesPicker), sedan banken, som säger var krogen ligger
// och frågar vad den ska heta. Namnet blir verksamhetens (BusinessContext), som morgonens rubrik läser.
// Används av Åsas kort på morgonen (ui/LadderOfferCard.tsx) och vid dörren (scenario/OwnerOfferScreen.tsx).
import { useState } from 'react';
import { useLanguage } from '../../content/language';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import type { PremisesId } from '../../sim/districts';
import { PremisesPicker } from './PremisesPicker';
import { useBusinessOptional } from './BusinessContext';

export type TakeStep = 'premises' | 'name';

export function useVinbarTake() {
  const business = useBusinessOptional();
  const [premises, setPremises] = useState<PremisesId>('torget');
  const [step, setStep] = useState<TakeStep>('premises');
  const [name, setName] = useState('');
  return {
    premises, setPremises, step, setStep, name, setName,
    named: name.trim().length > 0,
    /** Namnet blir verksamhetens när vinbaren tas över. */
    commitName: () => { if (name.trim()) business?.setName(name.trim()); }
  };
}

export function PremisesTakeSteps({ take }: { take: ReturnType<typeof useVinbarTake> }) {
  const lang = useLanguage();
  if (take.step === 'premises') return <PremisesPicker value={take.premises} onChange={take.setPremises} />;
  const at = tt(lang, `premises.at.${take.premises}` as StringKey);
  return (
    <div data-testid="premises-bank" data-premises={take.premises} style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '0.75em 0' }}>
      <div className="nx-label" style={{ color: 'inherit' }}>{tt(lang, 'premises.bankKicker')}</div>
      <p className="nx-body" style={{ margin: 0 }} data-testid="premises-bank-ask">{tt(lang, 'premises.bankAsk', { at })}</p>
      <input
        type="text"
        autoFocus
        value={take.name}
        maxLength={48}
        placeholder={tt(lang, 'premises.namePlaceholder')}
        aria-label={tt(lang, 'premises.namePlaceholder')}
        data-testid="premises-name"
        onChange={(e) => take.setName(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        style={{ font: 'inherit', padding: '0.45em 0.6em' }}
      />
    </div>
  );
}
