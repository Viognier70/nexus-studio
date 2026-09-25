// ORDER 263 (Nexus v1 etapp 1) — sparmenyn: tre platser och veckokopior.
//
// Speldesign > Sparande: "Tre sparplatser per spelare" och "en egen
// kopia [per veckoavräkning], så att spelaren kan gå tillbaka en vecka".
// Varje plats visas med verksamhetens namn, veckodag och vecka i ord.

import { strings } from '../../content/strings.sv';
import { calendarFor } from '../../sim/calendar';
import { listWeeklyCopies, readSlot, slotNumbers } from '../../sim/save';
import { useSave } from './SaveContext';

const BACKDROP_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 200
};

const PANEL_STYLE: React.CSSProperties = {
  width: 'min(460px, 100%)',
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  padding: '16px 18px',
  background: 'rgba(30, 22, 16, 0.97)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
  boxShadow: '0 8px 28px rgba(0,0,0,0.5)'
};

const SLOT_STYLE: React.CSSProperties = {
  border: '1px solid rgba(168, 146, 106, 0.45)',
  borderRadius: 3,
  padding: '10px 12px',
  marginTop: 10
};

const BUTTON_STYLE: React.CSSProperties = {
  padding: '8px 14px',
  minHeight: 40,
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
  marginRight: 8,
  marginTop: 8
};

export function SaveMenu() {
  const save = useSave();
  if (!save.menuOpen) return null;
  const { store } = save;
  return (
    <div style={BACKDROP_STYLE} role="dialog" aria-modal="true" aria-label={strings.save.heading} onClick={save.closeMenu}>
      <div style={PANEL_STYLE} onClick={(e) => e.stopPropagation()} data-testid="save-menu">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{strings.save.heading}</strong>
          <button type="button" style={{ ...BUTTON_STYLE, marginTop: 0, marginRight: 0 }} onClick={save.closeMenu}>
            {strings.save.close}
          </button>
        </div>
        <p style={{ opacity: 0.75, fontSize: 12, margin: '8px 0 0' }}>
          {store ? strings.save.autosaveNote : strings.save.storageUnavailable}
        </p>
        {store &&
          slotNumbers().map((n) => {
            const read = readSlot(store, n);
            const weeks = read.status === 'ok' ? listWeeklyCopies(store, n) : [];
            const active = save.activeSlot === n;
            let summary: string = strings.save.empty;
            if (read.status === 'ok') {
              const cal = calendarFor(read.file.sim.day.dayNumber);
              summary = strings.save.savedAt(
                strings.calendar.weekdays[cal.weekday],
                cal.week,
                read.file.businessName ?? '—'
              );
            } else if (read.status !== 'empty') {
              summary = strings.save.olderVersion;
            }
            return (
              <div key={n} style={SLOT_STYLE} data-testid={`save-slot-${n}`}>
                <div>
                  <strong>{strings.save.slot(n)}</strong>
                  {active && <span style={{ opacity: 0.7 }}> · {strings.save.active}</span>}
                </div>
                <div style={{ opacity: 0.85 }}>{summary}</div>
                <div>
                  {read.status === 'ok' && (
                    <button type="button" style={BUTTON_STYLE} data-testid={`load-slot-${n}`} onClick={() => save.load(n)}>
                      {strings.save.load}
                    </button>
                  )}
                  <button type="button" style={BUTTON_STYLE} data-testid={`save-to-${n}`} onClick={() => save.saveTo(n)}>
                    {strings.save.saveHere}
                  </button>
                </div>
                {weeks.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    <span style={{ opacity: 0.7 }}>{strings.save.weeklyCopies}:</span>
                    <div>
                      {weeks.map((w) => (
                        <button
                          key={w}
                          type="button"
                          style={{ ...BUTTON_STYLE, fontSize: 12, minHeight: 32, padding: '4px 10px' }}
                          data-testid={`load-week-${n}-${w}`}
                          onClick={() => save.load(n, w)}
                        >
                          {strings.save.loadWeek(w)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
