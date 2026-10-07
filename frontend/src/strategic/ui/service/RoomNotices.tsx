// ORDER 299 (Vision Owner 2026-10-03, "Notiser"):
// - en notis per händelse, som visas i NOTICE.showMs och sedan tonas bort;
// - samma händelse upprepas inte (provspelet: "+115 kr · Bord 4 beställer mer
//   · 1 ny gäst in" låg kvar i 15 minuter speltid, eftersom taggen över bordet
//   var en drei-Html som inte följde gruppens synlighet);
// - antalet gäster är detsamma i notisen och i rummet: notisen räknar de
//   gäster som har kommit in sedan svaret (de släpps in en i taget), högst så
//   många som släpptes in;
// - högst NOTICE.max notiser staplas samtidigt.
// Notisen står i rummets fria del (nedtill, mitt i det som ramas mellan 36 och
// 96 % när raketkortet står till vänster), där ingen panel ligger.

import { useEffect, useRef, useState } from 'react';
import { useSimState } from '../../simulation/SimulationProvider';
import { useLanguage } from '../../../content/language';
import { formatSek } from '../CashCounter';
import { reactionPhrase } from './consequenceLine';
import { strings } from '../../../content/strings';
import type { RoomReaction, SimulationState } from '../../types';
import './service.css';
import { SenderTag, type StaffSender } from '../SenderTag';

// ORDER 317 — lagets roller till personerna (strings.fika.people) och rollringen.
const STAFF_SENDER: Record<string, StaffSender> = { värd: { person: 'host', ring: 'host' }, servitör: { person: 'server', ring: 'waiter' }, kock: { person: 'cook', ring: 'cook' } };
// Lärlingen har inget namn i laget och får ingen avsändare.

// sameEventSimS: React kan rendera ett svar två gånger med några tick
// emellan när spelet går fort (uppdateringen läggs om på köade TICK), så att
// samma händelse syns med två tider. En reaktion vid samma bord och åt samma
// håll inom så här många simsekunder är samma händelse och ersätter den.
export const NOTICE = { showMs: 3000, fadeMs: 400, max: 3, sameEventSimS: 1 } as const;

interface Shown { key: number; reaction: RoomReaction; bornAt: number; takeover: string | null; by: StaffSender | null }

function arrivedSince(sim: SimulationState, r: RoomReaction): number {
  const n = sim.guests.filter((g) => g.scenarioSource && g.arrivalTime >= r.at && g.arrivalTime <= sim.simTime).length;
  return Math.min(r.guestsIn ?? 0, n);
}

export function RoomNotices() {
  const sim = useSimState();
  const lang = useLanguage();
  const latest = sim.day.roomReactions?.at(-1) ?? null;
  // Händelser som fanns när komponenten monterades (en laddad sparfil) visas inte.
  const seen = useRef<Set<number>>(new Set((sim.day.roomReactions ?? []).map((r) => r.at)));
  const [shown, setShown] = useState<Shown[]>([]);
  const [, setNow] = useState(0);

  useEffect(() => {
    if (!latest || seen.current.has(latest.at)) return;
    seen.current.add(latest.at);
    // Vem i personalen som tar över efter ett fel står i samma notis.
    const last = sim.incidents?.lastOutcome;
    const t = last && last.at === latest.at ? last.takeover : null;
    const s = strings.service.incident;
    const role = t ? s.staffRoles[t.role] ?? s.staffFallback : '';
    const takeover = t ? strings.rocket.card.takeover(role ? role[0].toUpperCase() + role.slice(1) : role) : null;
    // ORDER 317 (BESLUT del 4 punkt 7) — avsändaren är personens namn och roll.
    const by = t ? STAFF_SENDER[t.role] ?? null : null;
    setShown((list) => {
      const same = list.findIndex((n) => n.reaction.table === latest.table && n.reaction.kind === latest.kind && Math.abs(n.reaction.at - latest.at) <= NOTICE.sameEventSimS);
      if (same >= 0) return list.map((n, i) => (i === same ? { ...n, reaction: latest, takeover: takeover ?? n.takeover, by: by ?? n.by } : n));
      return [...list, { key: latest.at, reaction: latest, bornAt: performance.now(), takeover, by }].slice(-NOTICE.max);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest]);

  useEffect(() => {
    if (shown.length === 0) return;
    const id = window.setInterval(() => {
      const now = performance.now();
      setNow(now);
      setShown((list) => list.filter((n) => now - n.bornAt < NOTICE.showMs + NOTICE.fadeMs));
    }, 100);
    return () => window.clearInterval(id);
  }, [shown.length]);

  if (sim.day.period !== 'dinner' || shown.length === 0) return null;
  const now = performance.now();
  return (
    <div className="nx-room-notices" data-testid="room-notices" aria-live="polite">
      {shown.map((n) => {
        const r = n.reaction;
        const inNow = arrivedSince(sim, r);
        const phrase = reactionPhrase(lang, { ...r, guestsIn: inNow });
        const amount = r.amountSek ?? 0;
        return (
          <div key={n.key} className="nx-room-reaction nx-room-notice" data-kind={r.kind} data-testid="room-notice" data-at={r.at} data-guests-in={inNow} data-fading={now - n.bornAt >= NOTICE.showMs}>
            {amount !== 0 && <strong>{amount > 0 ? `+${formatSek(amount)}` : formatSek(Math.abs(amount))}</strong>}
            {n.by && <SenderTag sender="staff" staff={n.by} />}
            <span>{phrase}{n.takeover ? ` · ${n.takeover}` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}
