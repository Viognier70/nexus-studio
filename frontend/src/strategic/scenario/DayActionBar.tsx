// ORDER 263 (Nexus v1 etapp 1) — morgonens beslut att öppna.
// ORDER 271 — formen efter Designs skärmar S1 (vardag) och S2 (söndag),
// paket 1: morgonens schema som en skärm över spelvyn.
//
// Ersätter tjänstelängdsväljaren (ORDER 043 v3 §10). Speldesign > Tiden:
// dagen har en service, kvällens, och spelaren väljer inte längden
// (balance.ts SERVICE). På söndagen är krogen stängd och morgonen
// avslutas i stället, med fyra schemaplatser.
//
// Skärmen samlar det morgonen redan hade: schemaplatserna, satsningarna
// (MorningActivityPanel), paviljongerna och medaljerna (MedalShelf, som
// öppnar Måltidens hus), menyn och inköpen (MorningMenuPanel), lagret i
// ord, morgonens händelser, avräkningen, tidningen, banken och knappen
// som öppnar för kvällen. Funktionerna och deras dispatch är oförändrade.
//
// "Rummet och personalen" lägger skärmen åt sidan till en list längst
// ned, så att rummet och morgonpanelerna som inte hör till schemat
// (personalen, investeringarna, nedskalningen) går att nå.
//
// Visas på morgonen (och eftermiddagen). Döljs under service och kväll.

import { useEffect, useRef, useState } from 'react';
import { isStrandedWithoutBusiness } from '../../sim/economy';
import { strings } from '../../content/strings';
import { calendarFor } from '../../sim/calendar';
import { SEASON } from '../../sim/balance';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { scheduleSlotsUsed } from '../knowledge/pavilionVisit';
import { MedalShelf } from '../knowledge/ui/MedalShelf';
import { settlementInWords, shownInWords } from '../economy/BankDialog';
import { stockForecast } from '../../sim/stockForecast';
import { eventsSince } from '../../sim/serviceEvents';
import { numberWord } from '../simulation/eveningAccount';
import { activityById } from '../simulation/activities';
import { MorningActivityPanel } from '../business/MorningActivityPanel';
import { MorningMenuPanel } from '../business/MorningMenuPanel';
import { morningRows } from '../simulation/morningBuy';
import { packagesFor } from '../simulation/packages';
import { menuFromStock, stockReadiness } from '../simulation/stockPackages';
import { findDish } from '../simulation/m4Catalogue';
import { NxButton, NxLabel } from '../ui/system/components';
import { NxIcon, ACTIVITY_ICON, PAVILION_ICON } from '../ui/screens/icons';
import { useMentor } from '../ui/screens/mentor';
import '../ui/screens/screens.css';

interface Props {
  // ORDER 264 — öppnar Måltidens hus (paviljongerna).
  onOpenHouse: () => void;
  // ORDER 265 — öppnar banken (söndag, eller utan verksamhet).
  onOpenBank: () => void;
  // ORDER 267 — söndagstidningen (bara söndag morgon efter en avräkning).
  onOpenNewspaper?: () => void;
  // ORDER 280 — morgonens inköp (Designs M1); schemat döljs medan M1 är öppen.
  onOpenBuy?: () => void;
  hidden?: boolean;
}

const s = strings.screens.morning;

export function DayActionBar({ onOpenHouse, onOpenBank, onOpenNewspaper, onOpenBuy, hidden }: Props) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const mentor = useMentor();
  const [aside, setAside] = useState(false);
  // En ny morgon börjar med schemat framme.
  useEffect(() => setAside(false), [sim.day.dayNumber]);
  // Morgonen börjar överst: schemats rubrik och platser, inte menyn längst
  // ned (ORDER 271, S1 öppnade nedskrollat efter mentorns avsked).
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (rootRef.current) rootRef.current.scrollTop = 0; }, [sim.day.dayNumber, sim.day.period]);
  const period = sim.day.period;
  if (period !== 'morning' && period !== 'afternoon') return null;
  if (hidden) return null;
  // ORDER 270 — utan verksamhet och utan pengar finns bara rutan mitt på
  // skärmen (NoBusinessBox), inga andra knappar.
  if (isStrandedWithoutBusiness(sim)) return null;
  const cal = calendarFor(sim.day.dayNumber);
  const used = scheduleSlotsUsed(sim);
  const business = sim.economy.businessClass;
  const sunday = !cal.isServiceDay;
  const settlement = sunday ? settlementInWords(sim) : [];
  const showBank = business === null || sunday;
  // ORDER 266 — morgonens händelser (inspektion, banken, självläkning).
  const morningEvents = eventsSince(sim, sim.day.periodStartAt);
  // ORDER 266 — lagret i ord före öppning (speldesign > Lagret).
  // ORDER 275 — i klasser med paket räknas kuverten på maten ur lagret
  // (drycken följer med varje gäst).
  const forecast = packagesFor(sim.economy.businessClass)
    ? stockForecast({ menu: menuFromStock(sim).filter((m) => findDish(m.dishId)?.kind !== 'drink'), stock: sim.stock })
    : stockForecast(sim);
  const forecastText = forecast.kind === 'noMenu'
    ? strings.service.stock.noMenu
    : forecast.covers === 0
      ? strings.service.stock.none
      : strings.service.stock.forecast(numberWord(forecast.covers));
  const canStart = cal.isServiceDay && !sim.scaleDown.closedDinner && business !== null;
  // ORDER 277 — servicen startar inte förrän menyn och dryckeslistan har
  // minst en rätt och en dryck i lager (stockPackages.ts stockReadiness).
  const readiness = stockReadiness(sim);

  const primary = canStart ? (
    <NxButton testId="start-service" disabled={!readiness.ready} onClick={() => dispatch({ type: 'START_SERVICE' })}>
      {strings.morning.startService}
    </NxButton>
  ) : sim.introduction ? null : (
    <NxButton testId="close-day" onClick={() => dispatch({ type: 'CLOSE_DAY' })}>
      {cal.isServiceDay ? strings.morning.closeDay : strings.morning.closeSunday}
    </NxButton>
  );
  const bankButton = period === 'morning' && showBank ? (
    <NxButton kind={primary ? 'secondary' : 'primary'} testId="open-bank" onClick={onOpenBank}>
      {strings.economy.bankButton}
    </NxButton>
  ) : null;

  if (aside) {
    return (
      <div className="nx nxs-minibar" data-testid="day-action-bar" data-aside="true" role="region" aria-label={s.heading}>
        <div className="nxs-btn-secondary-w">
          <NxButton kind="secondary" testId="morning-schedule" onClick={() => setAside(false)} arrow={false}>
            {s.backToSchedule}
          </NxButton>
        </div>
        {bankButton && <div className="nxs-btn-secondary-w">{bankButton}</div>}
        {primary && <div className="nxs-btn-primary-w">{primary}</div>}
      </div>
    );
  }

  // Schemats platser: dagens besök i Måltidens hus, sedan satsningarna.
  const visits = sim.day.pavilionVisitsToday ?? [];
  const filled: Array<{ kind: 'pavilion' | 'activity'; key: string; title: string; icon: React.ReactNode }> = [
    ...visits.map((p, i) => ({
      kind: 'pavilion' as const,
      key: `p-${p}-${i}`,
      title: strings.knowledge.pavilions[p],
      icon: <NxIcon name={PAVILION_ICON[p]} size={32} />
    })),
    ...sim.day.pickedActivityIds.map((id) => ({
      kind: 'activity' as const,
      key: `a-${id}`,
      title: activityById(id)?.name ?? id,
      icon: <NxIcon name={ACTIVITY_ICON[id] ?? 'users'} size={32} />
    }))
  ];
  const slots = Array.from({ length: Math.max(cal.scheduleSlots, filled.length) }, (_, i) => filled[i] ?? null);

  const screenId = sunday ? 'S2' : 'S1';
  const mentorLine = mentor.step !== null && mentor.step !== 'service' && !mentor.showScreen ? mentor.line : null;

  return (
    <div ref={rootRef} className="nx nx-screen nxs-morning" data-testid="day-action-bar" role="region" aria-label={s.heading}>
      <header className="nxs-head" data-testid={`screen-${screenId}`}>
        <div>
          <NxLabel>
            <span className="nx-accent-text">
              {s.label(strings.calendar.weekdays[cal.weekday], cal.week, SEASON.weeks)}
              {business && <> · {strings.economy.classes[business]}</>}
            </span>
          </NxLabel>
          <h1 className="nx-heading">{sunday ? s.sundayHeading : s.heading}</h1>
        </div>
        <div className="nx-small nx-muted" data-testid="schedule-slots">{strings.morning.slots(used, cal.scheduleSlots)}</div>
      </header>

      <div className="nxs-morning-grid">
        <div>
          <p className="nx-body">
            {business === null
              ? strings.economy.noBusinessBody
              : cal.isServiceDay ? strings.morning.serviceDayBody : strings.morning.sundayBody}
          </p>
          {morningEvents.length > 0 && (
            <p className="nx-small nxs-mt-8" data-testid="morning-events">
              <strong>{strings.service.morningEvents}:</strong> {morningEvents.map((e) => e.text).join(' ')}
            </p>
          )}

          <div className="nxs-slots nxs-mt-24" data-testid="schedule-cards">
            {slots.map((slot, i) => (
              <div key={slot?.key ?? `empty-${i}`} className="nxs-slot" data-filled={slot !== null}>
                <div className="nx-label">
                  {s.slot(i + 1)}
                  {slot && <> · {slot.kind === 'pavilion' ? s.slotPavilion : s.slotActivity}</>}
                </div>
                <div className="nxs-slot-title">
                  {slot ? <>{slot.icon}<span>{slot.title}</span></> : <span>{s.slotEmpty}</span>}
                </div>
              </div>
            ))}
          </div>

          {period === 'morning' && onOpenNewspaper && (
            <div className="nxs-box nxs-mt-24" data-testid="newspaper-card">
              <NxIcon name="newspaper" size={44} />
              <div style={{ flex: 1 }}>
                <div className="nxs-row-title">{s.newspaperArrived}</div>
                <div className="nxs-row-sub">{s.newspaperBody}</div>
              </div>
              <NxButton kind="quiet" testId="open-newspaper" onClick={onOpenNewspaper}>{strings.newspaper.open}</NxButton>
            </div>
          )}

          <div className="nxs-two-col">
            <div>
              <div className="nxs-list-head"><NxLabel>{s.activities}</NxLabel></div>
              <MorningActivityPanel />
            </div>
            <div>
              <div className="nxs-list-head"><NxLabel>{s.pavilions}</NxLabel></div>
              <MedalShelf onOpenHouse={period === 'morning' ? onOpenHouse : undefined} />
              {period === 'morning' && (
                <div className="nxs-mt-8">
                  <NxButton kind="quiet" testId="open-house" onClick={onOpenHouse}>{strings.knowledge.houseButton}</NxButton>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          {business !== null ? (
            <>
              {/* ORDER 275 — klasser med paket köper lagret som paket.
                  ORDER 280 — inköpen görs på en egen skärm (Designs M1). */}
              {packagesFor(sim.economy.businessClass) ? (
                <div className="nxs-dark-box" data-testid="morning-buy-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div className="nx-label" style={{ color: 'inherit' }}>{strings.morningBuy.menu} · {strings.morningBuy.wine}</div>
                  <p className="nx-body" data-testid="morning-buy-summary">
                    {strings.morningBuy.summary(
                      morningRows(sim).dishes.reduce((a, d) => a + d.portions, 0),
                      morningRows(sim).drinks.reduce((a, d) => a + d.bottles, 0)
                    )}
                  </p>
                  {period === 'morning' && onOpenBuy && (
                    <NxButton testId="open-buy" onClick={onOpenBuy}>{strings.morningBuy.open}</NxButton>
                  )}
                </div>
              ) : <MorningMenuPanel />}
              {/* ORDER 275 — i klasser med paket står prognosen i lagerpanelen. */}
              {cal.isServiceDay && !packagesFor(sim.economy.businessClass) && (
                <div className="nxs-dark-box nxs-mt-24" data-testid="stock-forecast">
                  <NxIcon name="package" size={36} />
                  <p className="nx-body">{forecastText}</p>
                </div>
              )}
            </>
          ) : (
            <div className="nxs-dark-box" data-testid="morning-bank-note">
              <NxIcon name="bank" size={36} />
              <p className="nx-body">{shownInWords(sim.medals)}</p>
            </div>
          )}
          {settlement.length > 0 && !onOpenNewspaper && (
            <div className="nxs-dark-box nxs-mt-24" data-testid="settlement">
              <p className="nx-body">
                <strong>{strings.economy.settlement.heading}.</strong> {settlement.join(' ')}
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="nxs-foot">
        <div className="nxs-measure">
          {canStart && !readiness.ready && (
            <p className="nx-small nx-accent-text" style={{ fontWeight: 700 }} data-testid="start-blocked" role="status">
              {strings.stock.notReady(readiness.dishes, readiness.drinks)}
            </p>
          )}
          {mentorLine && (
            <p className="nx-small nx-muted" data-testid="mentor-line" data-step={mentor.step ?? undefined}>
              {strings.introduction.mentor}: <span className="nxs-quote-mark">{mentorLine}</span>
            </p>
          )}
          {mentorLine && mentor.step === 'farewell' && (
            <NxButton kind="quiet" testId="mentor-close" onClick={mentor.closeFarewell}>{strings.introduction.farewellClose}</NxButton>
          )}
        </div>
        <div className="nxs-foot-buttons">
          {period === 'morning' && (
            <NxButton kind="quiet" testId="morning-aside" onClick={() => setAside(true)}>{s.aside}</NxButton>
          )}
          {bankButton && <div className="nxs-btn-secondary-w">{bankButton}</div>}
          {primary && <div className="nxs-btn-primary-w">{primary}</div>}
        </div>
      </footer>
    </div>
  );
}
