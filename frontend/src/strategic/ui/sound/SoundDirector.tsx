// ORDER 290 — ljudet i spelet: läser simuleringen och spelar det som hände
// sedan förra renderingen (sound.ts). Raketens rätt och fel, våningen och
// hela pyramiden; en ny gäst som kommer in; kassan när en gäst betalar; och
// sorlet som följer trycket i rummet. Klirret när gäster skålar spelas av
// rummet (WineBarFigures.tsx), där skålen syns.

import { useEffect, useRef } from 'react';
import { useSimState } from '../../simulation/SimulationProvider';
import { installSoundUnlock, play, setMurmur } from './sound';
import { isSeatedCapacity } from '../../simulation/service';

export function SoundDirector() {
  const sim = useSimState();
  const seenGuests = useRef<Set<string>>(new Set());
  const lastPaidAt = useRef<number>(-Infinity);
  const revealKey = useRef<string | null>(null);
  const outcomeKey = useRef<string | null>(null);
  useEffect(() => { installSoundUnlock(); }, []);

  const inService = sim.day.period === 'lunch' || sim.day.period === 'dinner';

  // En ny gäst kommer in.
  useEffect(() => {
    let fresh = false;
    for (const g of sim.guests) {
      if (seenGuests.current.has(g.id)) continue;
      seenGuests.current.add(g.id);
      if (inService && g.state === 'arriving' && !g.walkAwayOnArrival) fresh = true;
    }
    if (fresh) play('guestIn');
    if (!inService && seenGuests.current.size > 400) seenGuests.current.clear();
  }, [sim.guests, inService]);

  // Kassan tar betalt.
  useEffect(() => {
    const paid = sim.eventStream.filter((e) => e.feed === 'paid' && e.at > lastPaidAt.current);
    if (paid.length === 0) return;
    lastPaidAt.current = paid[paid.length - 1].at;
    if (inService) play('pay');
  }, [sim.eventStream, inService]);

  // Raketen: rätt svar och våningen, fel svar, hela pyramiden.
  const active = sim.incidents?.active ?? null;
  const rk = active?.revealed ? `${active.id}:${active.openedAt}:${active.revealed.step}` : null;
  useEffect(() => {
    if (!rk || rk === revealKey.current) return;
    revealKey.current = rk;
    play('right');
    play('level', active?.revealed?.step ?? 0);
  }, [rk]);
  const last = sim.incidents?.lastOutcome ?? null;
  const ok = last ? `${last.incidentId}:${last.at}` : null;
  useEffect(() => {
    if (!ok || ok === outcomeKey.current) return;
    const first = outcomeKey.current === null;
    outcomeKey.current = ok;
    if (first && !inService) return;
    if (last?.reveal?.cleared) {
      play('right');
      play('level', last.reveal.step);
      window.setTimeout(() => play('full'), 260);
    } else {
      play('wrong');
    }
  }, [ok]);

  // Sorlet: gästerna i rummet och kön mot rummets platser.
  const seats = inService ? Math.max(1, isSeatedCapacity(sim)) : 1;
  const pressure = inService ? (sim.seatedIds.length + sim.waitingIds.length) / seats : 0;
  useEffect(() => { setMurmur(pressure); }, [pressure]);
  useEffect(() => () => setMurmur(0), []);
  return null;
}
