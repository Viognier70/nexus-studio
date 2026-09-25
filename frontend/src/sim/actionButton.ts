// ORDER 266 (Nexus v1 etapp 4) — action-knappen.
//
// Speldesign > Servicen > Action-knappen: "Spelaren kan rycka in själv.
// Hon väljer en uppgift ur kön, till exempel att ta en beställning, bära
// ut en rätt eller lugna en gäst som väntat länge, och hennes figur
// utför den. Insatsen går snabbare ju fler techne-krediter hon har.
// Under tiden ser hon inte resten av rummet i tjugo spelsekunder, så hon
// kan missa något annat. Högst tre insatser per kväll. En lyckad insats,
// som en gäst som stannar i stället för att gå, ger en techne-kredit."
//
// Uppgifterna härleds ur gästerna i rummet (F25):
//   calm  — en gäst i kön: nöjdheten höjs och väntan börjar om, så att
//           gästen inte ger upp. Lyckad om gästen fortfarande är kvar
//           när insatsen är klar.
//   order — en gäst som väntar på att beställa: beställningen tas, och
//           gästen går vidare till att äta. Lyckad om gästen är kvar.
// Alla tal kommer från balance.ts.

import { ACTION_BUTTON, REPUTATION } from './balance';
import { strings } from '../content/strings.sv';
import type { Guest, SimulationState } from '../strategic/types';

export type InterventionKind = 'calm' | 'order';

export interface ActiveIntervention {
  kind: InterventionKind;
  guestId: string;
  startedAt: number;
  completesAt: number;
  blindUntil: number;
}

export interface InterventionResult {
  kind: InterventionKind;
  guestId: string;
  success: boolean;
  at: number;
}

export interface ActionButtonState {
  usedThisService: number;
  active: ActiveIntervention | null;
  lastResult: InterventionResult | null;
  successesTotal: number;
  // Kvällar där minst en insats lyckades (mognad, etapp 12: "fem kvällar
  // vända med action-knappen").
  eveningsTurned: number;
  // Har den här kvällen redan räknats som vänd?
  turnedThisService: boolean;
}

export function initialActionButton(): ActionButtonState {
  return { usedThisService: 0, active: null, lastResult: null, successesTotal: 0, eveningsTurned: 0, turnedThisService: false };
}

export interface ActionTask {
  kind: InterventionKind;
  guestId: string;
  atRisk: boolean;
  // Hur länge gästen väntat i sitt nuvarande läge (sim-sekunder).
  waitedSec: number;
}

function inService(state: SimulationState): boolean {
  return state.day.period === 'lunch' || state.day.period === 'dinner';
}

function taskFor(g: Guest, now: number): ActionTask | null {
  if (g.state === 'waiting') {
    return { kind: 'calm', guestId: g.id, atRisk: g.satisfaction < ACTION_BUTTON.atRiskSatisfaction, waitedSec: now - g.stateTime };
  }
  // En gäst som väntar på att beställa går inte; bara kön kan vara "på
  // väg att gå".
  if (g.state === 'ordering') {
    return { kind: 'order', guestId: g.id, atRisk: false, waitedSec: now - g.stateTime };
  }
  return null;
}

// Kön: gäster som går att hjälpa just nu, de som riskerar att gå först,
// därefter de som väntat längst.
export function actionQueue(state: SimulationState): ActionTask[] {
  if (!inService(state)) return [];
  return state.guests
    .map((g) => taskFor(g, state.simTime))
    .filter((t): t is ActionTask => t !== null)
    .sort((a, b) => Number(b.atRisk) - Number(a.atRisk) || b.waitedSec - a.waitedSec);
}

export function interventionsLeft(state: SimulationState): number {
  return ACTION_BUTTON.maxPerEvening - (state.actionButton?.usedThisService ?? 0);
}

export function interventionSeconds(techneCredits: number): number {
  return Math.max(
    ACTION_BUTTON.minSimSeconds,
    ACTION_BUTTON.baseSimSeconds / (1 + ACTION_BUTTON.techneSpeedPerCredit * techneCredits)
  );
}

export function isBlind(state: SimulationState): boolean {
  const a = state.actionButton?.active;
  return a !== null && a !== undefined && state.simTime < a.blindUntil;
}

export function startIntervention(state: SimulationState, kind: InterventionKind, guestId: string): SimulationState {
  if (!inService(state)) return state;
  const ab = state.actionButton;
  if (ab.active !== null || interventionsLeft(state) <= 0) return state;
  const task = actionQueue(state).find((t) => t.kind === kind && t.guestId === guestId);
  if (!task) return state;
  const now = state.simTime;
  return {
    ...state,
    actionButton: {
      ...ab,
      usedThisService: ab.usedThisService + 1,
      active: {
        kind,
        guestId,
        startedAt: now,
        completesAt: now + interventionSeconds(state.knowledgeCredits.techne),
        blindUntil: now + ACTION_BUTTON.blindSimSeconds
      }
    }
  };
}

// Körs varje tick: insatsen blir klar, och rummet syns igen efter
// tjugo spelsekunder. Returnerar resultatet när insatsen blev klar
// (så att reducern kan ge krediten via ACCUMULATE_KNOWLEDGE).
export function tickIntervention(draft: SimulationState): InterventionResult | null {
  const ab = draft.actionButton;
  const a = ab?.active;
  if (!a) return null;
  const now = draft.simTime;
  let result: InterventionResult | null = null;
  if (now >= a.completesAt && (ab.lastResult === null || ab.lastResult.at < a.startedAt)) {
    const guest = draft.guests.find((g) => g.id === a.guestId);
    const stillHere = guest !== undefined && guest.state !== 'leaving' && guest.state !== 'declined';
    if (stillHere && guest) {
      if (a.kind === 'calm' && guest.state === 'waiting') {
        guest.satisfaction = Math.min(1, guest.satisfaction + ACTION_BUTTON.calmSatisfactionBoost);
        guest.stateTime = now;
      } else if (a.kind === 'order' && guest.state === 'ordering') {
        guest.state = 'dining';
        guest.stateTime = now;
      }
    }
    result = { kind: a.kind, guestId: a.guestId, success: stillHere, at: now };
    const turned = stillHere && !ab.turnedThisService;
    draft.actionButton = {
      ...ab,
      lastResult: result,
      successesTotal: ab.successesTotal + (stillHere ? 1 : 0),
      eveningsTurned: ab.eveningsTurned + (turned ? 1 : 0),
      turnedThisService: ab.turnedThisService || stillHere
    };
    // Återhämtning (F26): upp mot målet, inte över det.
    const target = REPUTATION.recoveryTarget / REPUTATION.scale;
    if (stillHere && draft.reputation < target) {
      draft.reputation = Math.min(target, draft.reputation + REPUTATION.actionSuccessBonus / REPUTATION.scale);
    }
    const t = strings.service.intervention;
    const text = stillHere ? (a.kind === 'calm' ? t.calmSuccess : t.orderSuccess) : t.missed;
    draft.eventStream = [
      ...draft.eventStream,
      {
        at: now,
        text,
        category: stillHere ? 'positive' : 'ambient',
        causeTag: null,
        causeChainId: null,
        sustainability: 'social',
        kind: 'v1_intervention',
        scenarioId: null
      }
    ];
  }
  if (now >= a.blindUntil && now >= a.completesAt) {
    draft.actionButton = { ...draft.actionButton, active: null };
  }
  return result;
}

// Ny kväll: räknarna för kvällen nollställs.
export function resetForService(ab: ActionButtonState): ActionButtonState {
  return { ...ab, usedThisService: 0, active: null, turnedThisService: false };
}
