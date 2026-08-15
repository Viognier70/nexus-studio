// ORDER 086 §6 step 4 — RoomCardPanel.
//
// Right column, below InstrumentsPanel. One card per staff + one card
// per living guest. Attention-priority sort with seatIndex tiebreak
// (ORDER 086 pick 2).
//
// ORDER 090 §6 — position + top offset dropped; parent RIGHT
// PanelColumn (see ui/PanelColumn.tsx) owns anchor + max-height +
// overflow. Previously this file picked top: 680 to clear
// InstrumentsPanel — a constant that had to be kept in lockstep with
// InstrumentsPanel's own picked top, its content height, and the
// EventStream above it. At 1280×720 the calc(100vh - 700px) max
// left the panel 20 px tall (effectively invisible). Under the
// PanelColumn the panel takes its natural height, siblings shift
// automatically, and the column scrolls if the total ever exceeds
// the viewport.
//
// Width still fixed 260 px so text wraps predictably; overflow-y:
// auto retained so a service with many guests scrolls INSIDE the
// panel (keeps the "In the room" header visible while scrolling).
//
// Layout contract still holds at 1280×720, 1920×1080, 2560×1440;
// verified by scene.panelLayout.test.tsx.

import { useMemo } from 'react';
import { useSimState } from '../../simulation/SimulationProvider';
import type { Guest, StaffMember, StaffRole } from '../../types';
import {
  deriveGuestAction,
  deriveStaffAction,
  guestAttentionPriority,
  staffAttentionPriority
} from './deriveActions';
import { deriveGuestFace, deriveStaffFace, recentAnswerHit } from './deriveFaces';
import { FaceCard, type CardTone, type FaceCardModel } from './FaceCard';

const PANEL_STYLE: React.CSSProperties = {
  width: 260,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minHeight: 0,
  overflowY: 'auto',
  pointerEvents: 'auto',
  zIndex: 34
};

const HEADER_STYLE: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  color: '#d8be82',
  opacity: 0.72,
  padding: '4px 2px',
  fontFamily: 'system-ui, sans-serif'
};

// Rhythm → tone mapping. Matches the puck's ring so cards and
// the in-scene ring read the same colour tick-for-tick.
function toneFromRhythm(rhythm: 'green' | 'amber' | 'red' | null): CardTone {
  return rhythm ?? 'neutral';
}

const ROLE_LABEL: Record<StaffRole, string> = {
  kock: 'Chef',
  servitör: 'Server',
  värd: 'Host',
  lärling: 'Apprentice'
};

function seatHeader(guest: Guest): string {
  if (guest.seatIndex === null) return 'At the door';
  return `Seat ${guest.seatIndex + 1}`;
}

export function RoomCardPanel() {
  const sim = useSimState();

  const models: FaceCardModel[] = useMemo(() => {
    const rhythm = sim.day.serviceRhythm;
    const answerHit = recentAnswerHit(sim.enablers, sim.simTime);

    // Build staff cards.
    const staffCards: FaceCardModel[] = sim.staff.map((s: StaffMember) => {
      const action = deriveStaffAction(s, sim.guests, sim.day, sim.simTime, sim.menu);
      const target = s.targetGuestId
        ? sim.guests.find((g) => g.id === s.targetGuestId) ?? null
        : null;
      const face = deriveStaffFace({
        staff: s,
        day: sim.day,
        simTime: sim.simTime,
        recentAnswerHitFlag: answerHit,
        targetGuestSatisfaction: target?.satisfaction ?? null
      });
      const priority = staffAttentionPriority(s, sim.day, sim.simTime);
      return {
        key: `staff-${s.id}`,
        face,
        headerText: ROLE_LABEL[s.role],
        actionText: action.text,
        iconKey: action.iconKey,
        tone: toneFromRhythm(rhythm),
        sideBarValue: s.workload,
        // ORDER 098 §5 — etiketten följer fältnamnet. `StaffMember.workload`
        // är källan (service.ts:349/354); tidigare etikett `load` antydde
        // ett annat fält (`TeamMember.load` existerar inte). Se
        // LOAD_CHAIN_TRACE_2026-08-15.md för spårningen bakom valet.
        sideBarLabel: 'workload',
        // priority + seatIndex-esque tiebreak; staff have no seatIndex,
        // so use a stable id hash via string compare in the sort.
        __priority: priority
      } as FaceCardModel & { __priority: number };
    });

    // Build guest cards.
    const guestCards: (FaceCardModel & { __priority: number; __seat: number })[] =
      sim.guests.map((g: Guest) => {
        const action = deriveGuestAction(g, sim.simTime, sim.menu);
        const face = deriveGuestFace(g, sim.simTime);
        const priority = guestAttentionPriority(g, sim.simTime);
        return {
          key: `guest-${g.id}`,
          face,
          headerText: seatHeader(g),
          actionText: action.text,
          iconKey: action.iconKey,
          tone: toneFromRhythm(rhythm),
          sideBarValue: g.satisfaction,
          sideBarLabel: 'satisfaction',
          __priority: priority,
          __seat: g.seatIndex ?? 999
        };
      });

    // Sort: attention-priority DESC, seatIndex ASC as tiebreak so cards
    // don't shuffle each tick when two share a priority.
    const staffSorted = [...staffCards].sort((a, b) => {
      const pa = (a as FaceCardModel & { __priority: number }).__priority;
      const pb = (b as FaceCardModel & { __priority: number }).__priority;
      if (pb !== pa) return pb - pa;
      return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    });
    const guestSorted = [...guestCards].sort((a, b) => {
      if (b.__priority !== a.__priority) return b.__priority - a.__priority;
      return a.__seat - b.__seat;
    });

    return [...staffSorted, ...guestSorted];
  }, [sim.staff, sim.guests, sim.day, sim.simTime, sim.menu, sim.enablers]);

  return (
    <div style={PANEL_STYLE} data-testid="room-card-panel">
      <div style={HEADER_STYLE}>In the room</div>
      {models.map((m) => (
        <FaceCard key={m.key} model={m} />
      ))}
    </div>
  );
}
