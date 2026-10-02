// ORDER 293 — de fem händelserna spelas som teater när deras raket är igång
// (Vision Owner 2026-10-01: "de fem händelserna (födelsedagen, vasen, gästen
// som vinglar, tillsynen i varianterna A–C, gästen vid passet), med kameran,
// strålkastaren och rätt och fel slut enligt manusen").
//
// Raketen styr manuset:
//   - Manuset börjar när raketen öppnas (uppbyggnaden), och står still vid
//     varje fråga (takterna `card`, ph 'ask') tills spelaren har svarat.
//   - Rätt svar spelar vidare i rätt-varianten. Ett fel i steg k byter till
//     felvarianten för steget (`wrong{k+1}`, samma tidslinje fram till felet),
//     och scenen spelas klart (LEVERANSNOT §2: "scenen spelas alltid klart").
//     Har manuset ingen felvariant för steget används den närmaste som finns
//     (Designs §13: "Varje fel visar *ett* av felsvaren").
//   - Tillsynens variant (A–D) väljs av simuleringen (sim/incidents.ts
//     inspectionVariant) och spelas som 'right', 'rightB', 'rightC', 'rightD';
//     felen visas i variant A, som i manuset.
//   - När scenen har spelats klart går kameran tillbaka och rummets egna
//     figurer tar över igen.
// Manusets tid går i verkliga sekunder (Designs tempo), inte i spelets fart.

import * as THREE from 'three';
import { EVENTS } from './events/handelserManus';
import type { EventScript, ScriptView, Vec2 } from './events/handelserManus';
import { EventTheatre, type TheatreSeat } from './eventTheatre';
import type { ActiveIncident, IncidentRecord } from '../../sim/incidents';

export const EVENT_OF_INCIDENT: Record<string, { event: string; right: string }> = {
  'vb32-fodelsedagen': { event: 'bday', right: 'right' },
  'vb33-vasen': { event: 'vase', right: 'right' },
  'vb34-vinglar': { event: 'drunk', right: 'right' },
  'vb35-tillsynen-a': { event: 'inspection', right: 'right' },
  'vb35-tillsynen-b': { event: 'inspection', right: 'rightB' },
  'vb35-tillsynen-c': { event: 'inspection', right: 'rightC' },
  'vb35-tillsynen-d': { event: 'inspection', right: 'rightD' },
  'vb36-passet': { event: 'kitchen', right: 'right' }
};

export function isEventIncident(id: string | null | undefined): boolean {
  return !!id && id in EVENT_OF_INCIDENT;
}

function scriptFor(event: string, variant: string): EventScript {
  const ev = EVENTS.find((e) => e.id === event);
  if (!ev) throw new Error('okänd händelse ' + event);
  return ev.build(null, variant);
}

/** Felvarianten för ett fel i steget (0-baserat), eller den närmaste som manuset har. */
export function wrongVariant(event: string, step: number): string | null {
  const ev = EVENTS.find((e) => e.id === event);
  if (!ev) return null;
  const wrong = ev.variants.filter((v) => v.startsWith('wrong')).map((v) => ({ v, k: Number(v.slice(5)) - 1 }));
  if (wrong.length === 0) return null;
  wrong.sort((a, b) => Math.abs(a.k - step) - Math.abs(b.k - step));
  return wrong[0].v;
}

export interface EventFrame {
  playing: boolean;
  view: ScriptView | null;
  /** Kameran ska tillbaka till spelarens vinkel. */
  game: boolean;
  spot: Vec2 | null;
  spotK: number;
}

export class EventPlayer {
  readonly theatre: EventTheatre;
  private key: string | null = null;
  private incidentId: string | null = null;
  private openedAt = 0;
  private event = '';
  private variant = '';
  private t = 0;
  private finished = false;
  private spotK = 0;

  constructor(parent: THREE.Object3D, floorY: number, seats: TheatreSeat[]) {
    this.theatre = new EventTheatre(parent, floorY, seats);
    this.theatre.root.visible = false;
  }

  get playing(): boolean { return this.key !== null; }
  get scriptTime(): number { return this.t; }
  get currentVariant(): string { return this.variant; }

  dispose(): void { this.theatre.dispose(); }

  private start(active: ActiveIncident): void {
    const m = EVENT_OF_INCIDENT[active.id];
    this.key = `${active.id}:${active.openedAt}`;
    this.incidentId = active.id;
    this.openedAt = active.openedAt;
    this.event = m.event;
    this.variant = m.right;
    this.t = 0;
    this.finished = false;
    this.theatre.load(scriptFor(this.event, this.variant));
    this.theatre.root.visible = true;
  }

  stop(): void {
    this.key = null;
    this.incidentId = null;
    this.theatre.clear();
    this.theatre.root.visible = false;
    this.spotK = 0;
  }

  /** En bildruta: raketens läge och verklig tid sedan förra rutan. */
  update(active: ActiveIncident | null, log: readonly IncidentRecord[], dt: number): EventFrame {
    if (active && isEventIncident(active.id) && `${active.id}:${active.openedAt}` !== this.key) this.start(active);
    else if (active && this.key && `${active.id}:${active.openedAt}` !== this.key) this.stop();
    if (!this.key) return { playing: false, view: null, game: true, spot: null, spotK: 0 };

    // Hur långt raketen har kommit: besvarade steg, och felet om det kom ett.
    let answered = 0;
    if (active && `${active.id}:${active.openedAt}` === this.key) {
      answered = Math.max(active.step ?? 0, active.revealed ? active.revealed.step + 1 : 0);
    } else if (!this.finished) {
      this.finished = true;
      const rec = [...log].reverse().find((r) => r.id === this.incidentId && r.at >= this.openedAt);
      if (rec && rec.step !== null) {
        const wrong = wrongVariant(this.event, rec.step);
        if (wrong && wrong !== this.variant) {
          this.variant = wrong;
          this.theatre.load(scriptFor(this.event, wrong));
        }
      }
    }
    const card = this.theatre.cardTimes();
    const limit = this.finished ? this.theatre.duration : card.ask[Math.min(answered, card.ask.length - 1)] ?? this.theatre.duration;
    this.t = Math.min(this.t + Math.max(0, dt), Math.max(this.t, limit));
    this.theatre.frame(this.t);

    const back = this.finished && this.t >= card.back;
    const spot = back ? null : this.theatre.spotAt(this.t);
    this.spotK += ((spot ? 1 : 0) - this.spotK) * Math.min(1, dt * 2);
    const { v, game } = this.theatre.view(this.t);
    if (this.finished && this.t >= this.theatre.duration) {
      this.stop();
      return { playing: false, view: null, game: true, spot: null, spotK: 0 };
    }
    return { playing: true, view: back ? null : v, game: back || game, spot, spotK: this.spotK };
  }
}
