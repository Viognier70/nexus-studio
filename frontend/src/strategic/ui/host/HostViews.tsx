// ORDER 296 (kärnan punkt 1) — det som ritas i rummet för hovmästaren:
// nålen med kortet, chipsen för Ge bord, verben vid ett bord och menyn för
// Flytta personal (Designs skärm 1–4). Placeras av scene/HostLayer.tsx och
// scene/WineBarFigures.tsx i drei-Html; här ligger bara DOM.

import { Gift, GlassWater, Martini, Users, Wine } from 'lucide-react';
import { t as tt, type StringKey } from '../../../content/nexusStrings';
import type { Lang } from '../../../content/language';
import type { PinKind } from '../../../sim/hostPins';
import './host.css';
import { SenderTag } from '../SenderTag';

const s = (lang: Lang, key: string, vars?: Record<string, string | number>) => tt(lang, key as StringKey, vars);
const ICON: Record<PinKind, typeof Users> = { door: Users, wine: Wine, bar: Martini, waited: GlassWater };

export interface PinTexts { where: string; q: string; a: [string, string] | string[]; done: string[] }

export function PinView(props: {
  lang: Lang; id: string; kind: PinKind; share: number; open: boolean; paused: boolean; texts: PinTexts; perAnswer: 0 | 1;
  onToggle: () => void; onAnswer: (a: 0 | 1) => void;
}) {
  const { lang, kind, share, open, texts } = props;
  const Icon = ICON[kind];
  return (
    <div className="nx-pin" data-testid={`host-pin-${kind}`} data-pin={props.id} data-open={open} data-paused={props.paused}>
      <button type="button" className="nx-pin-head" aria-label={texts.q} onClick={props.onToggle} style={{ ['--nx-pin-left' as string]: `${share * 360}deg` }}>
        <Icon size={18} aria-hidden />
      </button>
      <span className="nx-pin-stem" />
      <span className="nx-pin-dot" />
      {open && (
        <div className="nx-pin-card nx-paper" role="dialog" aria-label={texts.where} data-testid="host-pin-card" data-kind={kind}>
          <SenderTag sender="per" />
          <div className="nx-label">{texts.where}</div>
          <p className="nx-pin-q">{texts.q}</p>
          {([0, 1] as const).map((a) => {
            const per = props.perAnswer === a;
            return (
              <button key={a} type="button" className="nx-pin-answer" data-per={per} data-testid={`host-pin-answer-${a + 1}`} onClick={() => props.onAnswer(a)}>
                <span className="nx-pin-key">{a + 1}</span>
                <span className="nx-pin-answer-text">{texts.a[a]}</span>
                {per && <span className="nx-pin-per">{s(lang, 'pin.perTag')}</span>}
              </button>
            );
          })}
          <p className="nx-small nx-pin-note">{s(lang, 'pin.safeNote')}</p>
          <div className="nx-pin-foot"><strong>{s(lang, 'pin.per')}</strong><span>{s(lang, 'pin.keys')}</span></div>
          <span className="nx-pin-timer"><span style={{ width: `${share * 100}%` }} /></span>
        </div>
      )}
    </div>
  );
}

export function DoneChip({ text }: { text: string }) {
  return <div className="nx-pin-done" data-testid="host-pin-done">{text}</div>;
}

export function QueueChip({ lang, n, selected, onClick }: { lang: Lang; n: number; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className="nx-host-chip" data-selected={selected} data-testid="host-queue-party" onClick={onClick}>
      <Users size={14} aria-hidden /> {s(lang, 'host.party', { n })} · {s(lang, 'host.inQueue')}
    </button>
  );
}

export function SeatHereChip({ lang, onClick }: { lang: Lang; onClick: () => void }) {
  return (
    <button type="button" className="nx-host-chip" data-glow="true" data-testid="host-seat-here" onClick={onClick}>
      {s(lang, 'host.seat')} · {s(lang, 'host.fits')}
    </button>
  );
}

export function TableVerbs(props: {
  lang: Lang; table: number; stateKey: string; open: boolean;
  onToggle: () => void; onComp: (what: 'glass' | 'coffee') => void; onUpsell: (what: 'dessert' | 'wine') => void;
}) {
  const { lang, table } = props;
  return (
    <div className="nx-host-table" data-open={props.open}>
      <button type="button" className="nx-host-dot" aria-label={s(lang, 'host.place.table', { table })} data-testid="host-table" onClick={props.onToggle} />
      {props.open && (
        <div className="nx-host-verbs" data-testid="host-verbs">
          <span className="nx-host-chip" data-kind="label">{s(lang, 'host.place.table', { table })} · {s(lang, props.stateKey)}</span>
          <div className="nx-host-verb-row">
            <span className="nx-host-chip" data-kind="verb"><Gift size={14} aria-hidden /> {s(lang, 'host.comp')}</span>
            <button type="button" className="nx-host-chip" data-testid="host-comp-glass" onClick={() => props.onComp('glass')}>{s(lang, 'host.comp.glass')}</button>
            <button type="button" className="nx-host-chip" data-testid="host-comp-coffee" onClick={() => props.onComp('coffee')}>{s(lang, 'host.comp.coffee')}</button>
          </div>
          <div className="nx-host-verb-row">
            <span className="nx-host-chip" data-kind="verb" data-accent="true"><Wine size={14} aria-hidden /> {s(lang, 'host.upsell')}</span>
            <button type="button" className="nx-host-chip" data-testid="host-upsell-dessert" onClick={() => props.onUpsell('dessert')}>{s(lang, 'host.upsell.dessert')}</button>
            <button type="button" className="nx-host-chip" data-testid="host-upsell-wine" onClick={() => props.onUpsell('wine')}>{s(lang, 'host.upsell.wine')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MoveMenu({ lang, role, onMove }: { lang: Lang; role: string; onMove: (zone: 'bar' | 'floor' | 'lounge') => void }) {
  return (
    <div className="nx-host-verbs" style={{ position: 'static' }} data-testid="host-move">
      <span className="nx-host-chip" data-kind="label">{s(lang, `ring.role.${role}`)} · {s(lang, 'host.move')}</span>
      <div className="nx-host-verb-row">
        {(['bar', 'floor', 'lounge'] as const).map((zone) => (
          <button key={zone} type="button" className="nx-host-chip" data-testid={`host-move-${zone}`} onClick={(e) => { e.stopPropagation(); onMove(zone); }}>
            {s(lang, `host.zone.${zone}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
