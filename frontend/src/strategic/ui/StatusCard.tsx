// ORDER 309 — kortet för gäst och personal ur Designs D5 (staffStatus.ts
// STATUS_CARD), ersätter ORDER 303 F:s små kort (StaffRingTag med läge,
// GuestStatusCard). Ett kort i papper bredvid figuren med en prickad tråd i
// ljuslåga från huvudet, som hovmästarens nålkort. Esc eller krysset stänger;
// bara ett kort är öppet åt gången. Kortet placeras mot HUD:ens verkliga
// paneler och läggs aldrig över en (cardPlacement.ts placeCardAmong).
//
// Personal: roll, namn, ork (minibild av ringen och ordet), trivsel (plattan
// och ordet), dricks i kväll (personalens pott delad lika, ORDER 280), och
// Kan med spelets tre kunskapsområden (vin, köket, service). Spelets områden
// är kan eller saknas, inte nivåer: ett område personen har står med tre
// prickar, ett som saknas med Saknas och streckad kant.
// Gäst: grupp, sällskapet, stämningen (D1:s symbol) och hur mycket gästen förlåter.

import { useEffect, useRef, useSyncExternalStore } from 'react';
import './foljder.css';
import { strings } from '../../content/strings';
import { useLanguage } from '../../content/language';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { useSimState } from '../simulation/SimulationProvider';
import { cardAnchor, openCard, setOpenCard, subscribeOpenCard } from './statusCardStore';
import { placeCardAmong, threadEnd } from './cardPlacement';
import type { Rect } from './hudLayout';
import { ORK_RING, STATUS_CARD, staminaOf, wellbeingOf, wellbeingSvg, type StaminaId } from '../scene/staffStatus';
import { SIM_ROLE_TO_STAFF } from '../scene/wineBarDirector';
import { skillsOf, staminaOf as simStamina, wellbeingOf as simWellbeing } from '../../sim/staffCondition';
import { STAFF_CONDITION } from '../../sim/balance';
import { ROLE_OF } from '../scene/staffMarks';
import { guestMoodValue, moodOf } from '../../sim/guestMood';
import { moodSymbolSvg } from '../scene/guestMood';
import { forgivesOf, groupOfGuestType } from '../scene/guestLooks';
import type { SimulationState } from '../types';

/** HUD:ens paneler som kortet inte får ligga över (samma som layoutkontrollen, och fokuslägets list). */
export const CARD_PANEL_SELECTOR = '.gb-topleft, .gb-topright, .nx-hud-tools, .nx-tabs, .nx-tab-dock, .nx-queue, [data-testid=event-stream], .nx-rocket, .nx-agency, .nx-focus-strip, .nx-pyr-moment';

/** Spelets kunskapsområden i kortets ordning. */
const AREAS = ['vin', 'mat', 'service'];

function panelRects(): Rect[] {
  const out: Rect[] = [];
  document.querySelectorAll(CARD_PANEL_SELECTOR).forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width <= 0 || r.height <= 0 || cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return;
    out.push({ id: `${el.className || el.tagName}#${i}`, x: r.left, y: r.top, w: r.width, h: r.height });
  });
  return out;
}

/** Orkringen i liten skala (D5: minibild av ringen), som SVG. */
export function staminaRingSvg(id: StaminaId, px = 22): string {
  const c = px / 2, ro = px / 2 - 1, ri = ro * (ORK_RING.innerM / ORK_RING.outerM);
  const seg = (Math.PI * 2) / ORK_RING.segments, gap = (ORK_RING.gapDeg * Math.PI) / 180;
  // Klockan 6 är mot betraktaren (nedåt i bilden).
  const front = Math.PI / 2;
  const pt = (r: number, a: number) => `${(c + Math.cos(a) * r).toFixed(2)} ${(c + Math.sin(a) * r).toFixed(2)}`;
  let paths = '';
  for (let i = 0; i < ORK_RING.segments; i++) {
    const a0 = front - seg / 2 + gap / 2 + i * seg, a1 = a0 + seg - gap;
    const filled = i < ORK_RING.count[id];
    const st = filled ? ORK_RING.filled : ORK_RING.empty;
    const d = `M ${pt(ro, a0)} A ${ro} ${ro} 0 0 1 ${pt(ro, a1)} L ${pt(ri, a1)} A ${ri} ${ri} 0 0 0 ${pt(ri, a0)} Z`;
    paths += `<path d="${d}" fill="${st.fill}" stroke="${filled ? 'rgba(42,28,19,.55)' : 'rgba(42,28,19,.55)'}" stroke-width="1"${filled ? '' : ' stroke-dasharray="2 2"'}/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">${paths}</svg>`;
}

function staffOf(sim: SimulationState, key: string) {
  return sim.staff.find((m) => SIM_ROLE_TO_STAFF[m.role] === key) ?? null;
}

export function StatusCard() {
  const card = useSyncExternalStore(subscribeOpenCard, openCard, openCard);
  const sim = useSimState();
  const lang = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenCard(null); };
    window.addEventListener('keydown', onKey);
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const el = ref.current;
      const a = cardAnchor.current;
      if (!el) return;
      if (!a) { el.style.visibility = 'hidden'; if (svgRef.current) svgRef.current.style.display = 'none'; return; }
      const W = window.innerWidth, H = window.innerHeight;
      const r = placeCardAmong(W, H, [a.x, a.y], el.offsetWidth, el.offsetHeight, panelRects());
      el.style.left = `${r.x}px`;
      el.style.top = `${r.y}px`;
      el.style.visibility = 'visible';
      el.dataset.x = String(r.x);
      el.dataset.y = String(r.y);
      const [ex, ey] = threadEnd(r, [a.x, a.y]);
      const l = lineRef.current;
      if (l && svgRef.current) {
        svgRef.current.style.display = '';
        l.setAttribute('x1', String(a.x)); l.setAttribute('y1', String(a.y));
        l.setAttribute('x2', String(ex)); l.setAttribute('y2', String(ey));
      }
    };
    frame();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  }, [card]);

  // Gästen har gått, eller personen finns inte i simuleringen: kortet stängs.
  const member = card?.kind === 'staff' ? staffOf(sim, card.key) : null;
  const guest = card?.kind === 'guest' ? sim.guests.find((g) => g.id === card.guestId) ?? null : null;
  useEffect(() => {
    if (card && !member && !guest) setOpenCard(null);
  }, [card, member, guest]);
  if (!card || (!member && !guest)) return null;

  const f = strings.foljder;
  const width = `max(${STATUS_CARD.minWidthPx}px, ${STATUS_CARD.widthCqh}vh)`;
  let body: JSX.Element;
  let testId: string;
  let state = '';
  if (member && card.kind === 'staff') {
    const st = staminaOf(simStamina(member));
    const wb = wellbeingOf(simWellbeing(member));
    const skills = skillsOf(member);
    const tips = Math.round((sim.day.tipsSek ?? 0) / Math.max(1, sim.staff.length));
    const role = tt(lang, `ring.role.${ROLE_OF[card.key]}` as StringKey);
    testId = 'staff-card';
    state = `${st}:${wb}`;
    body = (
      <>
        <div className="nx-scard-kicker">{role}</div>
        <div className="nx-scard-name">{f.staffName[card.key] ?? role}</div>
        <div className="nx-scard-row" data-testid="staff-card-stamina" data-value={st}>
          <span className="nx-scard-label">{f.stamina}</span>
          <span className="nx-scard-val"><span className="nx-scard-icon" dangerouslySetInnerHTML={{ __html: staminaRingSvg(st) }} />{f.staminaLevel[st]}</span>
        </div>
        <div className="nx-scard-row" data-testid="staff-card-wellbeing" data-value={wb}>
          <span className="nx-scard-label">{f.wellbeing}</span>
          <span className="nx-scard-val"><span className="nx-scard-icon" dangerouslySetInnerHTML={{ __html: wellbeingSvg(wb, 22) }} />{f.wellbeingLevel[wb]}</span>
        </div>
        <div className="nx-scard-row">
          <span className="nx-scard-label">{f.tips}</span>
          <span className="nx-scard-val nx-num">{tips.toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')} kr</span>
        </div>
        <div className="nx-scard-label nx-scard-topics-head">{f.topics}</div>
        <div className="nx-scard-topics">
          {AREAS.map((a) => {
            const has = skills.includes(a);
            return (
              <span key={a} className="nx-scard-topic" data-missing={!has} data-testid={`staff-card-topic-${a}`}>
                <span>{f.topic[a] ?? a}</span>
                {has ? <span className="nx-scard-dots" aria-hidden><i /><i /><i /></span> : <em>{f.missing}</em>}
              </span>
            );
          })}
        </div>
        <p className="nx-scard-hint">{f.hint[st]}</p>
      </>
    );
  } else {
    const g = guest!;
    const mood = moodOf(guestMoodValue(g, sim.day.roomMoodLift ?? 0));
    const size = g.partyId ? sim.guests.filter((x) => x.partyId === g.partyId).length : 1;
    const group = g.guestType ? groupOfGuestType(g.guestType) : null;
    testId = 'guest-card';
    state = `${group ?? '-'}:${mood}`;
    body = (
      <>
        <div className="nx-scard-kicker">{group ? f.group[group] : strings.feed.guest}</div>
        <div className="nx-scard-name">{f.party(size)}</div>
        <div className="nx-scard-row" data-testid="guest-card-mood" data-value={mood}>
          <span className="nx-scard-label">{f.mood}</span>
          <span className="nx-scard-val"><span className="nx-scard-icon" dangerouslySetInnerHTML={{ __html: moodSymbolSvg(mood, 22) }} />{tt(lang, `mood.${mood}` as StringKey)}</span>
        </div>
        {g.guestType && (
          <div className="nx-scard-row" data-testid="guest-card-forgives" data-value={forgivesOf(g.guestType)}>
            <span className="nx-scard-label">{f.forgives}</span>
            <span className="nx-scard-val">{f.forgivesLevel[forgivesOf(g.guestType)]}</span>
          </div>
        )}
      </>
    );
  }
  return (
    <>
      <svg ref={svgRef} className="nx-scard-thread" aria-hidden style={{ display: 'none' }}>
        <line ref={lineRef} stroke={STATUS_CARD.thread.colour} strokeWidth={2} strokeDasharray={STATUS_CARD.thread.dash.join(' ')} strokeLinecap="round" />
      </svg>
      <div ref={ref} className="nx-scard" role="dialog" data-testid={testId} data-state={state} style={{ width, visibility: 'hidden' }}>
        <button type="button" className="nx-scard-close" aria-label={f.close} data-testid="status-card-close" onClick={() => setOpenCard(null)}>×</button>
        {body}
      </div>
    </>
  );
}

// Kontroll av att tabellen och spelets områden hänger ihop (för testerna).
export const CARD_AREAS = AREAS.filter((a) => Object.values(STAFF_CONDITION.skillsByRole).some((s) => s.includes(a)) || Object.values(STAFF_CONDITION.trainingActivities).includes(a));
