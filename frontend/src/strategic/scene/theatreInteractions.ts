// ORDER 292 — samspelen i rummet (Vision Owner 2026-10-01: "samspelen i
// figureInteractions.ts (passet, vinserveringen, betalningen, mötet i gången
// och de andra), så att figurerna gör saker tillsammans").
//
// Designs samspel (figureInteractions.ts, teaterns grund 2026-09-29) är data:
// vilka klipp varje part spelar och när, i förhållande till varandra
// (scheduleInteraction). Regissören (wineBarDirector.ts) bestämmer vem som gör
// vad och när det börjar; här läses det varje bildruta och blir klipp med
// samma tid för båda parterna:
//   - beställningen (order): servitörens uppgift vid sällskapet efter menyn,
//     och sällskapets första gäst;
//   - notan (payment): servitörens uppgift när sällskapet bett om notan;
//   - vinserveringen (wineService): sommelierns presentation vid bordet, och
//     sällskapets första gäst som provar;
//   - skålen (toast): sällskapets två första när regissören låter dem skåla;
//   - samtalet (talk): sällskapets två första medan de sitter med drycken;
//   - passet (passHandoff): kocken som lägger upp vid passet och servitören
//     som hämtar där;
//   - disken (dishHandoff): servitören som lämnar disk och diskaren;
//   - mötet i gången (dodge): två i personalen som går mot varandra; den som
//     inte bär kliver åt sidan.
// Tempot är 'normal' (regissörens tider är skrivna i det).

import { clipSeconds, type TempoId } from './figureClips';
import { scheduleInteraction } from './figureInteractions';
import type { FigureSample, StaffKey, WineBarDirector } from './wineBarDirector';

export interface ClipOverride { id: string; time: number }

type Schedule = ReturnType<typeof scheduleInteraction>;
const cache = new Map<string, Schedule>();
function schedule(id: string, tempo: TempoId = 'normal'): Schedule {
  const k = `${id}:${tempo}`;
  let s = cache.get(k);
  if (!s) { s = scheduleInteraction(id, tempo); cache.set(k, s); }
  return s;
}

// Klippet en part spelar `elapsed` sekunder in i samspelet, eller null utanför.
export function clipAt(id: string, role: string, elapsed: number): ClipOverride | null {
  const list = schedule(id).roles[role];
  if (!list || elapsed < 0) return null;
  for (const c of list) {
    if (elapsed >= c.start && elapsed < c.start + c.seconds) return { id: c.id, time: elapsed - c.start };
  }
  return null;
}

export function interactionSeconds(id: string): number {
  return schedule(id).seconds;
}

// Gästerna sitter med drycken (inget annat pågår vid bordet): samtalet får spelas.
const FREE_GUEST_POSES = new Set(['drink', 'talk', 'waitCalm']);
// Avståndet där diskaren tar emot och där två i gången möts (meter).
const HANDOFF_NEAR_M = 0.9;
const DODGE_NEAR_M = 1.6;
// Samtalet går i en cykel: samspelets längd och sedan en paus.
const TALK_PAUSE_S = 6;

export class InteractionDirector {
  private dishStart = -Infinity;
  private dodge: { a: number; b: number; start: number } | null = null;

  frame(director: WineBarDirector, keys: readonly StaffKey[], t: number): { staff: Map<number, ClipOverride>; guests: Map<string, ClipOverride> } {
    const staff = new Map<number, ClipOverride>();
    const guests = new Map<string, ClipOverride>();
    const ss = director.staffSamples;
    const gs = director.guestSamples;
    const guestPose = new Map<string, FigureSample>();
    for (const g of gs) if (g.visible && g.guestId) guestPose.set(g.guestId, g);

    // Uppgifterna vid borden: beställningen, notan och vinet.
    keys.forEach((key, i) => {
      const task = director.staffTaskDetail(key, t);
      if (!task || t < task.arrive || task.guestIds.length === 0) return;
      const elapsed = t - task.arrive;
      const first = task.guestIds.find((id) => guestPose.has(id));
      const pair: [string, string, string] | null =
        task.kind === 'order' ? ['order', 'waiter', 'guest'] :
        task.kind === 'bill' ? ['payment', 'waiter', 'guest'] :
        task.kind === 'wine' ? ['wineService', 'sommelier', 'host'] : null;
      if (!pair) return;
      const [id, staffRole, guestRole] = pair;
      const sc = clipAt(id, staffRole, elapsed);
      if (sc) staff.set(i, sc);
      const gc = first ? clipAt(id, guestRole, elapsed) : null;
      if (first && gc) guests.set(first, gc);
    });

    // Skålen och samtalet vid borden.
    for (const p of director.partyViews()) {
      const two = p.memberIds.filter((id) => guestPose.has(id)).slice(0, 2);
      if (two.length < 2 || guests.has(two[0]) || guests.has(two[1])) continue;
      const [a, b] = two;
      const toastElapsed = p.toastAt >= 0 ? t - p.toastAt : -1;
      if (toastElapsed >= 0 && toastElapsed < interactionSeconds('toast')) {
        const ca = clipAt('toast', 'a', toastElapsed);
        const cb = clipAt('toast', 'b', toastElapsed);
        if (ca && cb) { guests.set(a, ca); guests.set(b, cb); }
        continue;
      }
      const pa = guestPose.get(a)!.pose;
      const pb = guestPose.get(b)!.pose;
      if (p.servedAt < 0 || !FREE_GUEST_POSES.has(pa) || !FREE_GUEST_POSES.has(pb)) continue;
      const cycle = interactionSeconds('talk') + TALK_PAUSE_S;
      const e = (t - p.servedAt) % cycle;
      const ca = clipAt('talk', 'a', e);
      const cb = clipAt('talk', 'b', e);
      if (ca && cb) { guests.set(a, ca); guests.set(b, cb); }
    }

    // Passet: kocken lägger upp och servitören hämtar, var och en från sitt
    // segments början.
    keys.forEach((key, i) => {
      if (staff.has(i)) return;
      const seg = director.staffSegment(key, t);
      if (!seg || seg.kind !== 'hold' || seg.pose !== 'serve') return;
      if (key === 'cook') {
        const c = clipAt('passHandoff', 'cook', t - seg.t0);
        if (c) staff.set(i, c);
      } else if ((key === 'server' || key === 'server2') && !ss[i].carrying) {
        const c = clipAt('passHandoff', 'waiter', t - seg.t0 + schedule('passHandoff').roles.waiter[0].start);
        if (c) staff.set(i, c);
      }
    });

    // Disken: en servitör som bär disk når diskaren.
    const dishIx = keys.indexOf('dish');
    if (dishIx >= 0 && !staff.has(dishIx) && ss[dishIx]?.visible) {
      const d = ss[dishIx];
      const near = keys.some((k, i) => (k === 'server' || k === 'server2') && ss[i].visible && ss[i].carrying === 'dishes' && Math.hypot(ss[i].x - d.x, ss[i].z - d.z) < HANDOFF_NEAR_M + 1);
      if (near && t - this.dishStart > interactionSeconds('dishHandoff')) this.dishStart = t;
      const c = clipAt('dishHandoff', 'dishwasher', t - this.dishStart);
      if (c) staff.set(dishIx, c);
    }

    // Mötet i gången: två som går mot varandra; den som inte bär väjer.
    const walking = (i: number) => ss[i].visible && (ss[i].pose === 'walk' || ss[i].pose === 'serveWalk');
    if (this.dodge && t - this.dodge.start > clipSeconds('staff.dodge', 'normal')) this.dodge = null;
    if (!this.dodge) {
      for (let i = 0; i < ss.length && !this.dodge; i++) {
        for (let j = i + 1; j < ss.length; j++) {
          if (!walking(i) || !walking(j)) continue;
          if (Math.hypot(ss[i].x - ss[j].x, ss[i].z - ss[j].z) > DODGE_NEAR_M) continue;
          const facingDot = Math.cos(ss[i].facing - ss[j].facing);
          if (facingDot > -0.5) continue;
          const yielder = ss[i].carrying && !ss[j].carrying ? j : i;
          this.dodge = { a: yielder, b: yielder === i ? j : i, start: t };
          break;
        }
      }
    }
    if (this.dodge && !staff.has(this.dodge.a)) staff.set(this.dodge.a, { id: 'staff.dodge', time: t - this.dodge.start });
    return { staff, guests };
  }
}
