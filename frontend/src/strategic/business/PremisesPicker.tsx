// ORDER 333 D — lokalen när vinbaren tas över (avsnitt 8 punkt 4): Torget som förut eller en av D15:s tre lokaler.
// Under valet står vem som finns i lokalens kvarter (samma rader som vagnens platser, spot.who.*). Klassen är densamma i
// alla lokaler; spelaren läser kvarteret. Valet syns i världen: vinbaren står i lokalens hus.
// ORDER 334 A — hyran står vid varje lokal (källaren är billigare, balance.ts DISTRICTS.premisesRentK).
import { useLanguage } from '../../content/language';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { PREMISES, PREMISES_IDS, type PremisesId } from '../../sim/districts';
import { weeklyRentSek } from '../../sim/economy';
import '../ui/screens/screens.css';

export function PremisesPicker({ value, onChange }: { value: PremisesId; onChange: (p: PremisesId) => void }) {
  const lang = useLanguage();
  return (
    <div data-testid="premises-picker" data-premises={value} style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '0.75em 0' }}>
      <div className="nx-label" style={{ color: 'inherit' }}>{tt(lang, 'premises.label')}</div>
      <div role="radiogroup" aria-label={tt(lang, 'premises.label')} className="nxs-spot-grid">
        {PREMISES_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === value}
            data-testid={`premises-${id}`}
            className="nxs-spot"
            onClick={() => onChange(id)}
          >
            <span className="nxs-spot-name">{tt(lang, `premises.name.${id}` as StringKey)}</span>
            <span className="nx-small">{tt(lang, `premises.where.${id}` as StringKey)}</span>
            <span className="nx-small" data-testid={`premises-rent-${id}`} data-rent={weeklyRentSek('vinbar', undefined, id)}>{tt(lang, 'premises.rent', { rent: weeklyRentSek('vinbar', undefined, id).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB') })}</span>
          </button>
        ))}
      </div>
      <p className="nx-small" data-testid="premises-who" style={{ margin: 0 }}>
        {tt(lang, `spot.who.${PREMISES[value].district}` as StringKey)}
      </p>
    </div>
  );
}
