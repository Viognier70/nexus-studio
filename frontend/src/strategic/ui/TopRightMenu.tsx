// ORDER 050 §7 step 6 S1 (2026-08-10) — chrome consolidation.
//
// Vision Owner's first complaint of the day was that four elements
// competed with the room in the top-right corner: cash pill, speed
// toggle, mode-switch link, "Om" button. §6.5 says the room is the
// protagonist; four chrome pills at the eye's entry point contradict
// that even when none dominates individually.
//
// Fix: keep the two live controls visible (cash pill + speed
// toggle) and collapse the two occasional-use items — the
// first-person-prototype link and the About panel opener — into a
// single "⋯" button that reveals them in a compact dropdown. Three
// visible elements down from four, and the two occasional items
// vanish until the player asks for them.

import { useEffect, useRef, useState } from 'react';

interface Props {
  onOpenAbout: () => void;
}

const DROPDOWN_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '2.6rem',
  right: 0,
  minWidth: 220,
  padding: 4,
  background: 'rgba(20, 14, 10, 0.94)',
  border: '1px solid var(--gb-border)',
  borderRadius: 3,
  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  zIndex: 50
};

const DROPDOWN_ITEM_STYLE: React.CSSProperties = {
  display: 'block',
  padding: '8px 12px',
  background: 'transparent',
  color: 'var(--gb-text)',
  border: 0,
  borderRadius: 2,
  textAlign: 'left',
  textDecoration: 'none',
  font: 'inherit',
  fontSize: '0.85rem',
  letterSpacing: '0.04em',
  cursor: 'pointer',
  width: '100%',
  boxSizing: 'border-box'
};

const DROPDOWN_ITEM_HOVER_STYLE: React.CSSProperties = {
  ...DROPDOWN_ITEM_STYLE,
  background: 'rgba(255, 255, 255, 0.08)'
};

export function TopRightMenu({ onOpenAbout }: Props) {
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemStyle = (idx: number): React.CSSProperties =>
    hoverIdx === idx ? DROPDOWN_ITEM_HOVER_STYLE : DROPDOWN_ITEM_STYLE;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="gb-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Fler val"
      >
        ⋯
      </button>
      {open && (
        <div role="menu" style={DROPDOWN_STYLE}>
          <a
            role="menuitem"
            href="#/first-person-prototype"
            style={itemStyle(0)}
            onMouseEnter={() => setHoverIdx(0)}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => setOpen(false)}
          >
            Första-personsprototyp
          </a>
          <button
            role="menuitem"
            type="button"
            style={itemStyle(1)}
            onMouseEnter={() => setHoverIdx(1)}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => {
              onOpenAbout();
              setOpen(false);
            }}
          >
            Om denna prototyp
          </button>
        </div>
      )}
    </div>
  );
}
