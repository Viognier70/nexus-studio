// ORDER 266 (Nexus v1 etapp 4) — rycka in själv (action-knappen).
//
// Speldesign > Action-knappen. Under servicen: knappen "Rycka in" öppnar
// kön (gäster som går att hjälpa just nu, de som är på väg att gå
// först). Ett val startar insatsen; under tjugo spelsekunder täcks
// resten av rummet (BlindOverlay nedan), så spelaren kan missa något
// annat. Högst tre insatser per kväll.
//
// PLACEHOLDER_DESIGN — spelarens figur i rummet (designspecifikationen
// 4.3) finns inte i Designs leveranser ännu. Tills dess visas insatsen
// som täckningen av rummet med en mening om var spelaren är.

import { useState } from 'react';
import { strings } from '../../content/strings.sv';
import { actionQueue, interventionsLeft, isBlind } from '../../sim/actionButton';
import { numberWord } from '../simulation/eveningAccount';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const t = strings.service;
const VISIBLE_TASKS = 6;

const BUTTON: React.CSSProperties = {
  padding: '10px 16px',
  minHeight: 44,
  background: '#5a3a1e',
  color: '#f5f0e0',
  border: '1px solid #d8b46a',
  borderRadius: 3,
  font: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer'
};

const PANEL: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  bottom: 24,
  width: 'min(360px, calc(100vw - 32px))',
  maxHeight: 'calc(100vh - 140px)',
  overflowY: 'auto',
  padding: '12px 14px',
  background: 'rgba(30, 22, 16, 0.94)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.4,
  zIndex: 42,
  boxSizing: 'border-box'
};

const TASK: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  marginTop: 6,
  padding: '8px 10px',
  minHeight: 40,
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  font: 'inherit',
  cursor: 'pointer'
};

export function ActionButtonPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const [open, setOpen] = useState(false);
  const inService = sim.day.period === 'lunch' || sim.day.period === 'dinner';
  if (!inService || isBlind(sim)) return null;
  const left = interventionsLeft(sim);
  if (!open) {
    return (
      <div style={{ ...PANEL, width: 'auto', padding: 8 }}>
        <button type="button" style={BUTTON} data-testid="action-button" disabled={left <= 0} onClick={() => setOpen(true)}>
          {t.actionButton}
        </button>
      </div>
    );
  }
  // De mest akuta först; en lång lista hjälper inte i stressen.
  const queue = actionQueue(sim).slice(0, VISIBLE_TASKS);
  return (
    <div style={PANEL} data-testid="action-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{t.actionHeading}</strong>
        <button type="button" style={{ ...TASK, width: 'auto', marginTop: 0 }} onClick={() => setOpen(false)}>
          {t.close}
        </button>
      </div>
      <div style={{ opacity: 0.8, marginTop: 4 }}>{left > 0 ? t.actionBody(numberWord(left)) : t.noneLeft}</div>
      {left > 0 && queue.length === 0 && <div style={{ marginTop: 6 }}>{t.queueEmpty}</div>}
      {left > 0 &&
        queue.map((task) => (
          <button
            key={`${task.kind}-${task.guestId}`}
            type="button"
            style={TASK}
            data-testid={`task-${task.kind}-${task.guestId}`}
            data-at-risk={task.atRisk ? 'true' : 'false'}
            onClick={() => {
              dispatch({ type: 'INTERVENE', kind: task.kind, guestId: task.guestId });
              setOpen(false);
            }}
          >
            {t.tasks[task.kind]}
            {task.atRisk && <span style={{ color: '#e8a88a' }}> · {t.atRisk}</span>}
          </button>
        ))}
    </div>
  );
}

// Tjugo spelsekunder utan överblick: rummet och panelerna täcks.
export function BlindOverlay() {
  const sim = useSimState();
  if (!isBlind(sim)) return null;
  const a = sim.actionButton.active!;
  return (
    <div
      data-testid="blind-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(8, 6, 4, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 44,
        color: '#f5f0e0',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 18,
        textAlign: 'center'
      }}
    >
      {t.blind[a.kind]}
    </div>
  );
}
