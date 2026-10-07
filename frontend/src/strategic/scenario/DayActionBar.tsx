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

import { MorningReviewLine } from '../ui/MorningReviewLine';
import { SalvageCard } from './SalvageCard';
import { BookingBook } from './BookingBook';
import { useEffect, useRef, useState } from 'react';
import { isStrandedWithoutBusiness } from '../../sim/economy';
import { strings } from '../../content/strings';
import { TeamPanel } from '../business/TeamPanel';
import { InvestmentPanel } from '../business/InvestmentPanel';
import { ScaleDownPanel } from '../business/ScaleDownPanel';
import { calendarFor } from '../../sim/calendar';
import { SEASON } from '../../sim/balance';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { scheduleSlotsUsed } from '../knowledge/pavilionVisit';
import { MedalShelf } from '../knowledge/ui/MedalShelf';
import { bankBelowZeroWarning, settlementInWords, shownInWords } from '../economy/BankDialog';
import { stockForecast } from '../../sim/stockForecast';
import { eventsSince } from '../../sim/serviceEvents';
import { numberWord } from '../simulation/eveningAccount';
import { activityById, activityName } from '../simulation/activities';
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
import { useOpenGuard } from '../ui/OpenGuard';
import { SenderTag } from '../ui/SenderTag';
import { ladderStep } from '../../sim/ladderStep';
import { refitProgress } from '../../sim/ladder';
import { PATH_KEY } from '../ui/DinVag';
import { conceptTonight } from '../simulation/guestTypes';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import { useBusiness } from '../business/BusinessContext';

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
  waitForName?: boolean;
}

const s = strings.screens.morning;

export function DayActionBar({ onOpenHouse, onOpenBank, onOpenNewspaper, onOpenBuy, hidden, waitForName }: Props) {
  const sim = useSimState();
  // ORDER 296 — ingen öppning med för lite i lagret utan att fråga först
  // (hooken före komponentens tidiga returer).
  const guard = useOpenGuard(onOpenBuy ?? null);
  const dispatch = useSimDispatch();
  const mentor = useMentor();
  const lang = useLanguage();
  const { business: bizState } = useBusiness();
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
  // ORDER 289 — namnet frågas innan morgonen visas (NameEntryOverlay har
  // samma villkor: inte i introduktionen).
  if (waitForName && !sim.introduction) return null;
  // ORDER 270 — utan verksamhet och utan pengar finns bara rutan mitt på
  // skärmen (NoBusinessBox), inga andra knappar.
  if (isStrandedWithoutBusiness(sim)) return null;
  const cal = calendarFor(sim.day.dayNumber);
  const used = scheduleSlotsUsed(sim);
  const business = sim.economy.businessClass;
  const sunday = !cal.isServiceDay;
  // ORDER 315b del 2 — morgonens rad och brickan "Från i dag" (D7 venueTier.ts).
  const step = ladderStep(sim);
  const stepName = step ? tt(lang, PATH_KEY[step] as StringKey) : null;
  const tierNow = conceptTonight(sim);
  const tierChanged = !!tierNow && sim.day.conceptYesterday !== undefined && sim.day.conceptYesterday !== null && sim.day.conceptYesterday !== tierNow;
  const bizName = bizState.name ?? null;
  const refit = refitProgress(sim);
  // De fyra stegen (tömt, byggt, dukat, tänt) fördelade på de stängda dagarna.
  const REFIT_PHASES = 4;
  const refitPhase = refit ? Math.min(REFIT_PHASES, Math.ceil((refit.day * REFIT_PHASES) / refit.of)) : 0;
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

  // ORDER 284 — vägen från morgonen till inköpen (tredje provspelet): utan
  // lager är huvudknappen inköpen, inte en avstängd Öppna för kvällen.
  const needsBuy = canStart && !readiness.ready && period === 'morning' && !!onOpenBuy && !!packagesFor(sim.economy.businessClass);
  const primary = needsBuy ? (
    <NxButton testId="open-buy-foot" onClick={onOpenBuy}>
      {strings.morningBuy.open}
    </NxButton>
  ) : canStart ? (
    <NxButton testId="start-service" disabled={!readiness.ready} onClick={() => guard.request()}>
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
      <>
      {guard.dialog}
      {/* ORDER 291 punkt 8 — laget, investeringen och skala ner i den varma
          formen, till vänster om rummet och ovanför bottenraden. */}
      <div className="nxr-aside" data-testid="room-and-staff">
        <TeamPanel />
        <div className="nxr-stack">
          <InvestmentPanel />
          <ScaleDownPanel />
        </div>
      </div>
      <div className="nx nxs-minibar" data-testid="day-action-bar" data-aside="true" role="region" aria-label={s.heading}>
        <div className="nxs-btn-secondary-w">
          <NxButton kind="secondary" testId="morning-schedule" onClick={() => setAside(false)} arrow={false}>
            {s.backToSchedule}
          </NxButton>
        </div>
        {bankButton && <div className="nxs-btn-secondary-w">{bankButton}</div>}
        {primary && <div className="nxs-btn-primary-w">{primary}</div>}
      </div>
      </>
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
      title: (() => { const a = activityById(id); return a ? activityName(a) : id; })(),
      icon: <NxIcon name={ACTIVITY_ICON[id] ?? 'users'} size={32} />
    }))
  ];
  const slots = Array.from({ length: Math.max(cal.scheduleSlots, filled.length) }, (_, i) => filled[i] ?? null);

  const screenId = sunday ? 'S2' : 'S1';
  const mentorLine = mentor.step !== null && mentor.step !== 'service' && !mentor.showScreen ? mentor.line : null;

  return (
    <div ref={rootRef} className="nx nx-screen nxs-morning" data-testid="day-action-bar" role="region" aria-label={s.heading}>
      {guard.dialog}
      <header className="nxs-head" data-testid={`screen-${screenId}`}>
        <div>
          <NxLabel>
            <span className="nx-accent-text">
              {s.label(strings.calendar.weekdays[cal.weekday], cal.week, SEASON.weeks)}
              {/* ORDER 315b del 2 — Designs D7 (venueTier.ts morningLine): krogens namn, steget och nivån. */}
              {business && bizName && <> · {bizName}</>}
              {business && <> · {stepName ?? strings.economy.classes[business]}</>}
              {business && tierNow && <> · {strings.shopTabs.tier[tierNow]}</>}
            </span>
          </NxLabel>
          {tierChanged && <span className="nxs-tier-changed" data-testid="tier-changed" data-tier={tierNow ?? ''}>{tt(lang, 'tier.changed' as StringKey, { tier: strings.shopTabs.tier[tierNow!] })}</span>}
          <h1 className="nx-heading">{sunday ? s.sundayHeading : s.heading}</h1>
        </div>
        <div className="nxs-head-side">
          {/* ORDER 300 §3 — Måltidens hus i rubrikraden, så att listan får höjden. */}
          {period === 'morning' && (
            <NxButton kind="quiet" testId="open-house" onClick={onOpenHouse}>{strings.knowledge.houseButton}</NxButton>
          )}
          <div className="nx-small nx-muted" data-testid="schedule-slots">{strings.morning.slots(used, cal.scheduleSlots)}</div>
        </div>
      </header>

      <div className="nxs-morning-grid">
        <div className="nxs-morning-left">
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
            {/* ORDER 300 §1/§3 — listorna scrollar i sin egen panel om de
                inte ryms; skärmen scrollar inte. */}
            <div>
              <div className="nxs-list-head"><NxLabel>{s.activities}</NxLabel></div>
              <div className="nxs-list-scroll" data-testid="morning-activities-scroll"><MorningActivityPanel /></div>
            </div>
            <div>
              <div className="nxs-list-head"><NxLabel>{s.pavilions}</NxLabel></div>
              <div className="nxs-list-scroll nxs-shelf-list"><MedalShelf onOpenHouse={period === 'morning' ? onOpenHouse : undefined} /></div>
            </div>
          </div>
        </div>

        <div className="nxs-morning-right">
          {/* ORDER 303 C — Recensioner i morse. */}
          {period === 'morning' && <MorningReviewLine review={sim.day.morningReview} />}
          {/* ORDER 300 §3 — mentorns rad står här, inte i bottenraden över listan. */}
          {mentorLine && (
            <div className="nxs-dark-box nxs-mentor-box" data-testid="mentor-line" data-step={mentor.step ?? undefined}>
              <div style={{ flex: 1 }}>
                <SenderTag sender="asa" />
                <div className="nx-label nx-accent-text">{strings.introduction.mentor}</div>
                <p className="nx-small nxs-mt-8"><span className="nxs-quote-mark">{mentorLine}</span></p>
                {mentor.step === 'farewell' && (
                  <div className="nxs-mt-8"><NxButton kind="quiet" testId="mentor-close" onClick={mentor.closeFarewell}>{strings.introduction.farewellClose}</NxButton></div>
                )}
              </div>
            </div>
          )}
          {business !== null ? (
            <>
              {/* ORDER 275 — klasser med paket köper lagret som paket.
                  ORDER 280 — inköpen görs på en egen skärm (Designs M1). */}
              {/* ORDER 285 — bokningsboken (Designs morgon): kvällens väntade gäster. */}
              {/* ORDER 287a — med kvällens gäster efter typ (Designs skärm 1). */}
              {packagesFor(sim.economy.businessClass) && cal.isServiceDay && <BookingBook sim={sim} />}
              {/* ORDER 285 — gårdagens rester: en fråga om tillvaratagande. */}
              <SalvageCard />
              {packagesFor(sim.economy.businessClass) ? (
                <div className="nxs-dark-box nxs-mt-24" data-testid="morning-buy-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
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
              ) : sim.economy.businessClass === 'foodtruck' ? (
                // ORDER 315b — foodtruckens meny vid luckan; varorna köps efter kön.
                <div className="nxs-dark-box nxs-mt-24" data-testid="truck-menu" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div className="nx-label" style={{ color: 'inherit' }}>{strings.ladder.truckMenuLabel}</div>
                  <p className="nx-body">{strings.ladder.truckMenu}</p>
                </div>
              ) : <MorningMenuPanel />}
              {/* ORDER 275 — i klasser med paket står prognosen i lagerpanelen. */}
              {cal.isServiceDay && !packagesFor(sim.economy.businessClass) && sim.economy.businessClass !== 'foodtruck' && (
                <div className="nxs-dark-box nxs-mt-24" data-testid="stock-forecast">
                  <NxIcon name="package" size={36} />
                  <p className="nx-body">{forecastText}</p>
                </div>
              )}
            </>
          ) : (
            <div className="nxs-dark-box" data-testid="morning-bank-note">
              <NxIcon name="bank" size={36} />
              <div><SenderTag sender="bank" /><p className="nx-body">{shownInWords(sim.medals)}</p></div>
            </div>
          )}
          {/* ORDER 315b del 2 — ombyggnaden (Designs D7 bistroRefit.ts REFIT_PHASES): stängt, och var bygget står. */}
          {refit && (
            <div className="nxs-dark-box nxs-mt-24" data-testid="refit-box" data-day={refit.day} data-of={refit.of} data-phase={refitPhase}>
              <NxIcon name="package" size={36} />
              <div>
                <div className="nx-label">{tt(lang, 'refit.title' as StringKey)} · {tt(lang, 'refit.sub' as StringKey)}</div>
                <p className="nx-body">{strings.ladder.refitDay(refit.day, refit.of)} {tt(lang, `refit.p${refitPhase}` as StringKey)}.</p>
                <ol className="nxs-refit-phases">
                  {[1, 2, 3, 4].map((k) => <li key={k} data-done={k <= refitPhase}>{tt(lang, `refit.p${k}` as StringKey)}</li>)}
                </ol>
              </div>
            </div>
          )}
          {/* ORDER 318 — Bankens varning före stängningen, varje morgon tills nästa bokslut. */}
          {bankBelowZeroWarning(sim) && (
            <div className="nxs-dark-box nxs-mt-24" data-testid="bank-below-zero" data-below={sim.economy.risk?.belowZeroInRow ?? 0} role="alert">
              <NxIcon name="bank" size={36} />
              <div><SenderTag sender="bank" /><p className="nx-body" style={{ fontWeight: 700 }}>{bankBelowZeroWarning(sim)}</p></div>
            </div>
          )}
          {settlement.length > 0 && !onOpenNewspaper && (
            <div className="nxs-dark-box nxs-mt-24" data-testid="settlement">
              <SenderTag sender="bank" />
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
