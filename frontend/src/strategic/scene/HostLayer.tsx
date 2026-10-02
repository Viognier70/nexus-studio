// ORDER 296 (kärnan punkt 1) — hovmästarens nålar och handgrepp i rummet
// (Designs leverans hovmästaren och butiken §2–3, skärm 1–4).
//
// Nålarna: en rund pappersknapp med ikon på en kort stjälk där beslutet finns
// (dörren, ett bord, baren). Ringen runt knappen brinner ned medurs med tiden
// som återstår. Ett klick öppnar kortet åt sidan med två svar; tangenterna 1
// och 2 svarar, Esc stänger. Pers svar är det säkra: streckad kant, ljusare
// papper och märket Per · säkert. Bara ett kort öppet åt gången.
//
// Handgreppen: Ge bord (klicka sällskapet i kön; borden där det får plats
// lyser; klicka bordet), Bjud och Sälj in (klicka ett bord där någon sitter),
// Flytta personal (klicka en ring; WineBarFigures).
//
// Simuleringens gäster står i världens koordinater (seatSlot); höjden läses ur
// rummets golv.

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { useLanguage, type Lang } from '../../content/language';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { businessRoomRef } from './interiorSharedState';
import { pinsOf, PER_DEFAULT, tablesThatFit, type HostPinState } from '../../sim/hostPins';
import { zoneOfSeat } from '../../sim/hostZones';
import { tableOf } from '../simulation/guestOrders';
import { seatGroupsFree } from '../simulation/service';
import type { Guest, SimulationState } from '../types';
import type { WineBarRoom } from './wineBarRoom';
import { DoneChip, PinView, QueueChip, SeatHereChip, TableVerbs } from '../ui/host/HostViews';

const PIN_HEIGHT_M = 2.4;
const CHIP_HEIGHT_M = 1.9;
const DONE_MS = 2600;
const s = (lang: Lang, key: string, vars?: Record<string, string | number>) => tt(lang, key as StringKey, vars);
const keyOf = (g: Guest) => g.partyId ?? g.id;

type XZ = [number, number];

// En Html i världens koordinater, oberoende av förälderns transform.
export function WorldHtml({ at, y, children, z }: { at: XZ; y: number; children: React.ReactNode; z?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g || !g.parent) return;
    const p = new THREE.Vector3(at[0], y, at[1]);
    g.parent.worldToLocal(p);
    g.position.copy(p);
  });
  return (
    <group ref={ref}>
      <Html center zIndexRange={[z ?? 30, 0]}>{children}</Html>
    </group>
  );
}

function pinAnchor(sim: SimulationState, pin: HostPinState): XZ | null {
  const room = businessRoomRef.current;
  if (!room) return null;
  if (pin.kind === 'bar') {
    const bar = (room.seatKinds ?? []).map((k, i) => (k === 'bar' ? room.seats[i] : null)).filter((x): x is XZ => !!x);
    if (bar.length === 0) return null;
    return [bar.reduce((a, p) => a + p[0], 0) / bar.length, bar.reduce((a, p) => a + p[1], 0) / bar.length];
  }
  const party = sim.guests.filter((g) => keyOf(g) === pin.key);
  const g = party.find((x) => x.seatIndex !== null) ?? party[0];
  if (pin.kind === 'door' || pin.kind === 'waited' || !g) return room.entrance ?? null;
  return [g.position.x, g.position.z];
}

function pinText(lang: Lang, sim: SimulationState, pin: HostPinState) {
  const party = sim.guests.filter((g) => keyOf(g) === pin.key);
  const table = tableOf(party.find((x) => x.seatIndex !== null) ?? { seatIndex: null }) ?? 0;
  const queue = new Set(sim.guests.filter((g) => g.state === 'waiting').map(keyOf)).size;
  switch (pin.kind) {
    case 'door': return { where: s(lang, 'pin.where.door'), q: s(lang, 'pin.door.qn', { n: queue }), a: [s(lang, 'pin.door.a1n'), s(lang, 'pin.door.a2')], done: [s(lang, 'pin.door.done1'), s(lang, 'pin.door.done2')] };
    case 'wine': return { where: s(lang, 'pin.where.tableN', { table }), q: s(lang, 'pin.wine.qn', { table }), a: [s(lang, 'pin.wine.a1'), s(lang, 'pin.wine.a2')], done: [s(lang, 'pin.wine.done1n', { table }), s(lang, 'pin.wine.done2')] };
    case 'bar': return { where: s(lang, 'pin.where.bar'), q: s(lang, 'pin.bar.q'), a: [s(lang, 'pin.bar.a1'), s(lang, 'pin.bar.a2')], done: [s(lang, 'pin.bar.done1'), s(lang, 'pin.bar.done2')] };
    default: return { where: s(lang, 'pin.where.queue'), q: s(lang, 'pin.waited.q'), a: [s(lang, 'pin.waited.a1'), s(lang, 'pin.waited.a2')], done: [s(lang, 'pin.waited.done1'), s(lang, 'pin.waited.done2')] };
  }
}

export function HostLayer({ room }: { room: WineBarRoom }) {
  const sim = useSimState();
  const inService = sim.day.period === 'dinner' && sim.businessClass === 'vinbaren' && !!sim.day.doorsOpenedThisService;
  return inService ? <HostLayerInService room={room} /> : null;
}

function HostLayerInService({ room }: { room: WineBarRoom }) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const lang = useLanguage();
  const floorY = useMemo(() => room.group.localToWorld(new THREE.Vector3(0, room.floorY, 0)).y, [room]);
  const pins = pinsOf(sim);
  const rocket = !!sim.incidents?.active;
  const [openPin, setOpenPin] = useState<string | null>(null);
  const [done, setDone] = useState<{ at: XZ; text: string; until: number } | null>(null);
  const [seatFor, setSeatFor] = useState<string | null>(null);
  const [verbsFor, setVerbsFor] = useState<number | null>(null);
  const open = pins.open.find((p) => p.id === openPin) ?? null;

  // Kortet stängs när nålen försvinner (svarad av Per eller sällskapet gick).
  useEffect(() => { if (openPin && !open) setOpenPin(null); }, [openPin, open]);
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setDone(null), Math.max(0, done.until - Date.now()));
    return () => window.clearTimeout(t);
  }, [done]);

  const answer = (pin: HostPinState, a: 0 | 1) => {
    const at = pinAnchor(sim, pin);
    const txt = pinText(lang, sim, pin);
    dispatch({ type: 'HOST_PIN_ANSWER', id: pin.id, answer: a });
    setOpenPin(null);
    if (at) setDone({ at, text: txt.done[a], until: Date.now() + DONE_MS });
  };

  // Tangenterna 1 och 2 svarar på det öppna kortet, Esc stänger (före panelernas 1–3).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1' || e.key === '2') { e.preventDefault(); e.stopImmediatePropagation(); answer(open, e.key === '1' ? 0 : 1); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setOpenPin(null); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.id]);

  const shared = businessRoomRef.current;
  const waitingParties = useMemo(() => {
    const m = new Map<string, Guest[]>();
    for (const g of sim.guests) if (g.state === 'waiting') m.set(keyOf(g), [...(m.get(keyOf(g)) ?? []), g]);
    return [...m.entries()];
  }, [sim.guests]);
  const seatParty = waitingParties.find(([k]) => k === seatFor)?.[1] ?? null;
  const fitting = seatParty ? tablesThatFit(sim, seatParty.length) : [];
  const groups = seatGroupsFree(sim);
  const seatAt = (i: number): XZ | null => (shared?.seats[i] as XZ | undefined) ?? null;
  const centre = (seats: readonly number[]): XZ | null => {
    const pts = seats.map(seatAt).filter((x): x is XZ => !!x);
    return pts.length ? [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length] : null;
  };
  // Borden där någon sitter (bjuda och sälja in).
  const occupied = groups
    .map((g, gi) => ({ gi, seats: g.seats, guests: sim.guests.filter((x) => x.seatIndex !== null && g.seats.includes(x.seatIndex as number) && (x.state === 'seated' || x.state === 'ordering' || x.state === 'dining')) }))
    .filter((g) => g.guests.length > 0 && zoneOfSeat(g.seats[0]) !== 'bar');
  const stateKey = (g: Guest) => (g.state === 'dining' ? 'host.state.eating' : g.order ? 'host.state.paying' : 'host.state.menu');

  const flash = (at: XZ, text: string) => setDone({ at, text, until: Date.now() + DONE_MS });
  return (
    <>
      {/* Nålarna */}
      {pins.open.map((p) => {
        const at = pinAnchor(sim, p);
        if (!at) return null;
        const isOpen = open?.id === p.id;
        return (
          <WorldHtml key={p.id} at={at} y={floorY + PIN_HEIGHT_M} z={isOpen ? 40 : 32}>
            <PinView
              lang={lang} id={p.id} kind={p.kind} share={Math.max(0, Math.min(1, p.left / p.total))} open={isOpen} paused={rocket}
              texts={pinText(lang, sim, p)} perAnswer={PER_DEFAULT[p.kind]}
              onToggle={() => setOpenPin(isOpen ? null : p.id)} onAnswer={(a) => answer(p, a)}
            />
          </WorldHtml>
        );
      })}
      {done && (
        <WorldHtml at={done.at} y={floorY + PIN_HEIGHT_M} z={41}>
          <DoneChip text={done.text} />
        </WorldHtml>
      )}

      {/* Ge bord: sällskapen i kön, och borden där sällskapet får plats */}
      {waitingParties.map(([key, members]) => (
        <WorldHtml key={`q-${key}`} at={[members[0].position.x, members[0].position.z]} y={floorY + CHIP_HEIGHT_M}>
          <QueueChip lang={lang} n={members.length} selected={seatFor === key} onClick={() => { setSeatFor(seatFor === key ? null : key); setVerbsFor(null); }} />
        </WorldHtml>
      ))}
      {seatParty && seatFor && fitting.map((seats) => {
        const at = centre(seats);
        if (!at) return null;
        return (
          <WorldHtml key={`fit-${seats.join('-')}`} at={at} y={floorY + CHIP_HEIGHT_M}>
            <SeatHereChip lang={lang} onClick={() => { dispatch({ type: 'HOST_SEAT', key: seatFor, seats }); setSeatFor(null); flash(at, s(lang, 'host.done.seat')); }} />
          </WorldHtml>
        );
      })}

      {/* Bjuda och sälja in: borden där någon sitter */}
      {!seatParty && occupied.map((g) => {
        const at = centre(g.seats);
        if (!at) return null;
        const first = g.guests[0];
        const table = tableOf(first) ?? 0;
        const key = keyOf(first);
        const shown = verbsFor === g.gi;
        const doneText = s(lang, 'host.done.verb', { place: s(lang, 'host.place.table', { table }) });
        return (
          <WorldHtml key={`t-${g.gi}`} at={at} y={floorY + CHIP_HEIGHT_M} z={shown ? 36 : 28}>
            <TableVerbs
              lang={lang} table={table} stateKey={stateKey(first)} open={shown}
              onToggle={() => setVerbsFor(shown ? null : g.gi)}
              onComp={(what) => { dispatch({ type: 'HOST_COMP', key, what }); setVerbsFor(null); flash(at, doneText); }}
              onUpsell={(what) => { dispatch({ type: 'HOST_UPSELL', key, what }); setVerbsFor(null); flash(at, doneText); }}
            />
          </WorldHtml>
        );
      })}
    </>
  );
}
