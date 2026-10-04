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

import { setSound, useSoundSettings } from './sound/sound';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getJuice, setJuice, type Juice } from './juice/juice';
import { strings } from '../../content/strings';
import { LANGUAGES, setLanguage, useLanguage, type Lang } from '../../content/language';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { VILLAGE_LIGHT } from '../village/villageEvening';
import { setVillageLightLevel, subscribeVillageLight, villageLightLevel } from '../village/villageLight';

// ORDER 273 — språkvalet (Designs leverans 2026-09-28 §2: spelet går på
// engelska som standard och byter språk med en inställning). Namnen på
// språken står i strängtabellen (menu.english / menu.swedish).
const LANGUAGE_NAME: Record<Lang, () => string> = {
  en: () => strings.menu.english,
  sv: () => strings.menu.swedish
};

interface Props {
  onOpenAbout: () => void;
  // ORDER 263 — öppnar sparmenyn.
  onOpenSave: () => void;
}

const DROPDOWN_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '2.6rem',
  right: 0,
  minWidth: 220,
  padding: 4,
  background: 'var(--w-hud)',
  border: 'var(--w-hud-border)',
  borderRadius: 14,
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

const LANGUAGE_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 12px',
  borderTop: '1px solid var(--gb-border)',
  marginTop: 2
};

const LANGUAGE_LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.75rem',
  letterSpacing: '0.06em',
  opacity: 0.72,
  marginRight: 'auto'
};

const LANGUAGE_BUTTON_STYLE: React.CSSProperties = {
  padding: '4px 8px',
  background: 'transparent',
  color: 'var(--gb-text)',
  border: '1px solid var(--gb-border)',
  borderRadius: 2,
  font: 'inherit',
  fontSize: '0.8rem',
  cursor: 'pointer'
};

const LANGUAGE_ACTIVE_STYLE: React.CSSProperties = {
  ...LANGUAGE_BUTTON_STYLE,
  background: 'rgba(255, 255, 255, 0.16)',
  fontWeight: 700
};

export function TopRightMenu({ onOpenAbout, onOpenSave }: Props) {
  const sound = useSoundSettings();
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lang = useLanguage();
  const lightLevel = useSyncExternalStore(subscribeVillageLight, villageLightLevel, villageLightLevel);
  const [juice, setJuiceState] = useState<Juice>(getJuice());

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
        className="nx"
        style={{ height: '100%', minWidth: 'calc(62 * var(--nx-u))', background: 'var(--w-hud)', color: 'var(--w-cream)', border: 'var(--w-hud-border)', borderRadius: 999, boxShadow: 'var(--w-shadow-hud)', fontSize: 'max(14px, calc(26 * var(--nx-u)))', cursor: 'pointer' }}
        onClick={() => setOpen((o) => !o)}
        aria-label={strings.menu.button}
        data-testid="menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        title={strings.menu.button}
      >
        ☰
      </button>
      {open && (
        <div role="menu" style={DROPDOWN_STYLE}>
          <button
            role="menuitem"
            type="button"
            style={itemStyle(2)}
            data-testid="menu-save"
            onMouseEnter={() => setHoverIdx(2)}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => {
              onOpenSave();
              setOpen(false);
            }}
          >
            {strings.save.menuItem}
          </button>
          <a
            role="menuitem"
            href="#/first-person-prototype"
            style={itemStyle(0)}
            onMouseEnter={() => setHoverIdx(0)}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => setOpen(false)}
          >
            {strings.menu.firstPerson}
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
            {strings.pause.aboutHeading}
          </button>
          {/* ORDER 280 — Designs inställning: Animationer · Balatro / Lugn. */}
          <div role="group" aria-label={strings.back.juice} data-testid="menu-juice" style={LANGUAGE_ROW_STYLE}>
            <span style={LANGUAGE_LABEL_STYLE}>{strings.back.juice}</span>
            {(['balatro', 'calm'] as const).map((j) => (
              <button
                key={j}
                role="menuitemradio"
                type="button"
                aria-checked={juice === j}
                data-testid={`menu-juice-${j}`}
                style={juice === j ? LANGUAGE_ACTIVE_STYLE : LANGUAGE_BUTTON_STYLE}
                onClick={() => { setJuice(j); setJuiceState(j); }}
              >
                {j === 'calm' ? strings.back.juiceCalm : strings.back.juiceBalatro}
              </button>
            ))}
          </div>
          {/* ORDER 290 — ljudet: på eller av, och volymen (lågt som standard). */}
          <div role="group" aria-label={strings.sound.label} data-testid="menu-sound" style={LANGUAGE_ROW_STYLE}>
            <span style={LANGUAGE_LABEL_STYLE}>{strings.sound.label}</span>
            <button
              role="menuitemcheckbox"
              type="button"
              aria-checked={sound.enabled}
              data-testid="menu-sound-toggle"
              style={sound.enabled ? LANGUAGE_ACTIVE_STYLE : LANGUAGE_BUTTON_STYLE}
              onClick={() => setSound({ enabled: !sound.enabled })}
            >
              {sound.enabled ? strings.sound.on : strings.sound.off}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(sound.volume * 100)}
              aria-label={strings.sound.volume}
              data-testid="menu-sound-volume"
              disabled={!sound.enabled}
              onChange={(e) => setSound({ volume: Number(e.target.value) / 100 })}
              style={{ flex: 1, minWidth: 80, accentColor: '#e8b93a' }}
            />
          </div>
          {/* ORDER 297 — ljusnivån i byn (Designs VILLAGE_LIGHT, 0,5–2). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} data-testid="menu-village-light">
            <span style={LANGUAGE_LABEL_STYLE}>{tt(lang, 'byk.light' as StringKey)}</span>
            <input
              type="range"
              min={VILLAGE_LIGHT.range[0]}
              max={VILLAGE_LIGHT.range[1]}
              step={0.1}
              value={lightLevel}
              aria-label={tt(lang, 'byk.light' as StringKey)}
              data-testid="menu-village-light-range"
              onChange={(e) => setVillageLightLevel(Number(e.target.value))}
              style={{ flex: 1, minWidth: 80, accentColor: '#e8b93a' }}
            />
          </div>
          <div role="group" aria-label={strings.menu.language} data-testid="menu-language" style={LANGUAGE_ROW_STYLE}>
            <span style={LANGUAGE_LABEL_STYLE}>{strings.menu.language}</span>
            {LANGUAGES.map((l) => (
              <button
                key={l}
                role="menuitemradio"
                type="button"
                aria-checked={l === lang}
                data-testid={`menu-language-${l}`}
                style={l === lang ? LANGUAGE_ACTIVE_STYLE : LANGUAGE_BUTTON_STYLE}
                onClick={() => setLanguage(l)}
              >
                {LANGUAGE_NAME[l]()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
