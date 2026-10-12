// ORDER 331 C (Anders 2026-10-12) — grundregeln, varje val syns: det spelaren valt som scenen i vinbaren och bistron
// ska visa, läst ur simuleringens tillstånd. Inget här påverkar simuleringen.
//
// - Laget (HIRE_TEAM_MEMBER, FIRE_TEAM_MEMBER): rummets sju står för klassens lag (TEAM_BY_CLASS, en värd, en servitör
//   och en kock) och rummets fasta besättning (bartendern, sommeliern, diskaren och den andra servitören). Saknas
//   någon i lagets roller syns den figuren inte (värden Per, servitören, kocken); finns fler än klassens lag syns
//   en till: en servitör ('extra') för värd, servitör och lärling, en kock ('cook2') för kocken. Byråns lärling
//   räknas inte här (330 H, extraStaff).
// - Morgonens satsningar (activities.ts): genomgången, provningen, gästkocken, de lokala lådorna och komposten.
// - Utrustningen i bruk (sim/goods.ts, guestOrders.ts, incidents.ts): vinkylen när ett sällskap har vin i
//   beställningen, ostvagnen när det har ost, flamberingsvagnen vid efterrätten och avecvagnen när bordet stannar
//   för avec (day.roomReactions detail 'avec'). Humidorn har ingen försäljning i simuleringen än.

import { HOST, TEAM_BY_CLASS } from '../../sim/balance';
import { equipmentOwned } from '../../sim/goods';
import { findDish } from '../simulation/m4Catalogue';
import type { SimulationState, StaffRole } from '../types';
import { SIM_ROLE_TO_STAFF, type EquipmentUse, type MorningShow, type StaffKey } from './wineBarDirector';

const SEATED = new Set(['seated', 'ordering', 'serving', 'dining']);

export function crewShown(team: SimulationState['team']): { off: StaffKey[]; hired: StaffKey[] } {
  const base = new Map<StaffRole, number>();
  for (const r of TEAM_BY_CLASS.roles.vinbar) base.set(r, (base.get(r) ?? 0) + 1);
  const have = new Map<StaffRole, number>();
  for (const m of team.members) if (!m.isAgency) have.set(m.role, (have.get(m.role) ?? 0) + 1);
  const off: StaffKey[] = [];
  const hired: StaffKey[] = [];
  for (const [role, n] of base) if ((have.get(role) ?? 0) < n) off.push(SIM_ROLE_TO_STAFF[role]);
  for (const [role, n] of have) {
    if (n <= (base.get(role) ?? 0)) continue;
    const key: StaffKey = role === 'kock' ? 'cook2' : 'extra';
    if (!hired.includes(key)) hired.push(key);
  }
  return { off, hired };
}

/**
 * Vagnens lag (TEAM_BY_CLASS.foodtruck: grillaren, kocken, och Nils, lärlingen): saknas någon av dem står den
 * platsen tom; har någon anställts utöver laget står Jonas vid grillen hela tiden (som den extra handen, 330 G).
 */
export function truckCrewShown(team: SimulationState['team']): { grill: boolean; hatch: boolean; jonas: boolean } {
  const regular = team.members.filter((m) => !m.isAgency);
  const n = (r: StaffRole) => regular.filter((m) => m.role === r).length;
  return { grill: n('kock') > 0, hatch: n('lärling') > 0, jonas: regular.length > TEAM_BY_CLASS.roles.foodtruck.length };
}

const SHOW_OF: Record<string, MorningShow> = {
  'train-service': 'briefing',
  'wine-tasting': 'tasting',
  'guest-chef': 'guestChef',
  'local-sourcing': 'local',
  'compost-audit': 'compost'
};

export function morningShowsOf(pickedActivityIds: readonly string[] | undefined): MorningShow[] {
  return (pickedActivityIds ?? []).flatMap((id) => (SHOW_OF[id] ? [SHOW_OF[id]] : []));
}

/** Osträtterna i katalogen (m4Catalogue): de som ostvagnen serverar. */
export const CHEESE_DISH_IDS: readonly string[] = ['brie-plate', 'munster-plate', 'vasterbotten-plate'];

export function equipmentUsesOf(state: Pick<SimulationState, 'guests' | 'equipment' | 'day'>): EquipmentUse[] {
  const out: EquipmentUse[] = [];
  const seen = new Set<string>();
  const fridge = equipmentOwned(state, 'vinkyl'), cheese = equipmentOwned(state, 'ostvagn'), flambe = equipmentOwned(state, 'flamberingsvagn');
  const add = (u: EquipmentUse) => { if (!seen.has(u.id)) { seen.add(u.id); out.push(u); } };
  if (fridge || cheese || flambe) {
    for (const g of state.guests) {
      if (!g.order || !SEATED.has(g.state)) continue;
      const party = g.partyId ?? g.id;
      if (fridge && g.order.drinks.some((d) => (findDish(d)?.drink ?? '').startsWith('wine'))) add({ id: `fridge|${party}`, kind: 'fridge', guestIds: [g.id] });
      if (cheese && g.order.dishId && CHEESE_DISH_IDS.includes(g.order.dishId)) add({ id: `cheese|${party}`, kind: 'cheese', guestIds: [g.id] });
      if (flambe && g.order.dishId && HOST.dessertDishIds.includes(g.order.dishId)) add({ id: `flambe|${party}`, kind: 'flambe', guestIds: [g.id] });
    }
  }
  if (equipmentOwned(state, 'avecvagn')) {
    for (const r of state.day.roomReactions ?? []) if (r.detail === 'avec') add({ id: `avec|${r.at}|${r.table}`, kind: 'avec', guestIds: r.guestIds });
  }
  return out;
}
