// ORDER 332 G — vagnens plats i morgonrutan (Kvarteren, etapp 1: "Platsvalet är ett omdöme som kräver att spelaren
// läser kvarteret"). Fem platser (Designs D15) med avgiften, kvarterets gäster och det som gäller i kväll: terminen,
// konferensen, marknaden och om badsäsongen är slut. Inget tal om hur många som kommer: spelaren läser kvarteret.
// Valet syns i byn, där vagnen och kön står på platsen (scene/village).
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { useLanguage } from '../../content/language';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { formatSek } from '../ui/CashCounter';
import {
  districtTonight, playerTruckSpotOf, truckSpotFeeSek, truckSpotOpen, TRUCK_SPOT_IDS, TRUCK_SPOTS, type TruckSpotId
} from '../../sim/districts';

/** Det som står under valet: vem som finns i kvarteret och vad som gäller i kväll. Läses av testet. */
export function spotTonightKeys(spot: TruckSpotId, dayNumber: number): StringKey[] {
  const d = TRUCK_SPOTS[spot].district;
  const tonight = districtTonight(d, dayNumber);
  const keys: StringKey[] = [`spot.who.${d}` as StringKey];
  if (d === 'student') keys.push(tonight.term ? 'spot.tonight.term' : 'spot.tonight.outOfTerm');
  if (d === 'campus' && tonight.conference) keys.push('spot.tonight.conference');
  if (tonight.market) keys.push('spot.tonight.market');
  return keys;
}

export function TruckSpotPicker() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const lang = useLanguage();
  const day = sim.day.dayNumber;
  const current = playerTruckSpotOf(sim);
  const canChoose = sim.day.period === 'morning' || sim.day.period === 'afternoon';
  return (
    <div data-testid="truck-spot" data-spot={current} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
      <div className="nx-label" style={{ color: 'inherit' }}>{tt(lang, 'spot.label')}</div>
      <div role="radiogroup" aria-label={tt(lang, 'spot.label')} className="nxs-spot-grid">
        {TRUCK_SPOT_IDS.map((id) => {
          const open = truckSpotOpen(id, day);
          const fee = truckSpotFeeSek(id);
          const on = id === current;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!open || !canChoose}
              data-testid={`truck-spot-${id}`}
              className="nxs-spot"
              onClick={() => dispatch({ type: 'SET_TRUCK_SPOT', spot: id })}
            >
              <span className="nxs-spot-name">{tt(lang, `spot.name.${id}` as StringKey)}</span>
              <span className="nx-small">
                {!open ? tt(lang, 'spot.closed') : fee > 0 ? tt(lang, 'spot.fee', { price: formatSek(fee) }) : tt(lang, 'spot.feeTorget')}
              </span>
            </button>
          );
        })}
      </div>
      <p className="nx-small" data-testid="truck-spot-chosen" style={{ fontWeight: 700, margin: 0 }}>
        {tt(lang, 'spot.chosen', { spot: tt(lang, `spot.name.${current}` as StringKey) })}
      </p>
      <p className="nx-small" data-testid="truck-spot-who" style={{ margin: 0 }}>
        {spotTonightKeys(current, day).map((k) => tt(lang, k)).join(' ')}
      </p>
    </div>
  );
}
