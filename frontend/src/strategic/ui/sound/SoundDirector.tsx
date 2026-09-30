// ORDER 290 — ljudet i spelet: läser simuleringen och spelar det som hände
// sedan förra renderingen (sound.ts). Raketens rätt och fel, våningen och
// hela pyramiden; en ny gäst som kommer in; kassan när en gäst betalar; och
// sorlet som följer trycket i rummet. Klirret när gäster skålar spelas av
// rummet (WineBarFigures.tsx), där skålen syns.

import { useEffect, useRef } from 'react';
import { useSimState } from '../../simulation/SimulationProvider';
import { installSoundUnlock, play, setMurmur } from './sound';

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
    // Rätt när svaret låses; våningen när den är full (900 ms, LJUDEN.md §3).
    play('right');
    const floor = active?.revealed?.step ?? 0;
    window.setTimeout(() => play('floor', floor), 900);
  }, [rk]);
  const last = sim.incidents?.lastOutcome ?? null;
  const ok = last ? `${last.incidentId}:${last.at}` : null;
  useEffect(() => {
    if (!ok || ok === outcomeKey.current) return;
    const first = outcomeKey.current === null;
    outcomeKey.current = ok;
    if (first && !inService) return;
    if (last?.reveal?.cleared) {
      // Den sista våningen: hela pyramiden ersätter våningens ljud (§4),
      // 300 ms in i firandet som börjar när våningen fyllts (1 300 ms).
      play('right');
      window.setTimeout(() => play('full'), 1600);
    } else {
      play('wrong');
    }
  }, [ok]);

  // Sorlet: gästerna i rummet (LJUDEN.md §8), dämpat när raketkortet är öppet.
  const guests = inService ? sim.seatedIds.length + sim.waitingIds.length : 0;
  const rocketOpen = !!sim.incidents?.active;
  useEffect(() => { setMurmur(guests, rocketOpen); }, [guests, rocketOpen]);
  useEffect(() => () => setMurmur(0), []);
  return null;
}
