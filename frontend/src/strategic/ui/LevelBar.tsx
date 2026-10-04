// ORDER 288 — fyra nivåer med egna knappar och tangenter (Vision Owner
// 2026-10-01): "byn, kvarteret, gatan och krogen. Varje nivå visar det som är
// viktigt på den höjden: krogarna och grupperna i byn, gästflödet i
// kvarteret, vem som är på väg in på gatan."
//
// Tangenterna ligger i en rad, från närmast till längst bort: Z krogen,
// X gatan, C kvarteret, V byn. De gäller också under servicen, där 1–3
// öppnar panelerna (ORDER 290); utanför servicen gäller 1–4 som förut
// (useDesktopControls.ts). V och knappen Byn går som förut (ORDER 290) ut
// till byn och tillbaka dit kameran stod.
//
// Nivån som visas räknas ur kamerans avstånd (body.dataset.level), så att
// knappen följer också när spelaren zoomar med hjulet.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { strings } from '../../content/strings';
import { useCamera } from '../camera/CameraContext';
import { subscribeVillageLive, villageLive } from '../scene/village/villageLive';
import type { CameraTarget } from '../types';
import { nearestLevel } from '../camera/eveningLevels';

export type Level = 'room' | 'street' | 'district' | 'village';

export const LEVEL_KEYS: Record<Level, string> = { room: 'z', street: 'x', district: 'c', village: 'v' };
const PRESET: Record<Level, 'myBusiness' | 'street' | 'district' | 'village'> = { room: 'myBusiness', street: 'street', district: 'district', village: 'village' };
const ORDER: Level[] = ['village', 'district', 'street', 'room'];

// Avståndet där nivån byts (meter): rummet syns under 55 m, gatan till 150 m,
// kvarteret till 450 m.
// ORDER 297 — nivån närmast avståndet bland Designs nivåer (24, 42, 90, 660 m).
const LEVEL_OF: Record<string, Level> = { venue: 'room', street: 'street', block: 'district', village: 'village' };
export function levelForDistance(d: number): Level {
  return LEVEL_OF[nearestLevel(d)];
}

export function LevelBar() {
  const { targetRef, actualRef, jumpToPreset } = useCamera();
  const saved = useRef<CameraTarget | null>(null);
  const [level, setLevel] = useState<Level>(() => levelForDistance(actualRef.current.distance));
  const live = useSyncExternalStore(subscribeVillageLive, villageLive, villageLive);
  const onWay = live.onWay.reduce((a, g) => a + g.n, 0);

  useEffect(() => {
    const id = window.setInterval(() => {
      const l = levelForDistance(actualRef.current.distance);
      document.body.dataset.level = l;
      setLevel((prev) => (prev === l ? prev : l));
    }, 250);
    return () => window.clearInterval(id);
  }, [actualRef]);

  const go = useCallback((l: Level) => {
    if (l === 'village') {
      // Byn och tillbaka (ORDER 290).
      if (saved.current && levelForDistance(targetRef.current.distance) === 'village') {
        targetRef.current = { ...saved.current, focus: { ...saved.current.focus } };
        saved.current = null;
        return;
      }
      const t = targetRef.current;
      saved.current = { ...t, focus: { ...t.focus } };
    } else {
      saved.current = null;
    }
    jumpToPreset(PRESET[l]);
  }, [targetRef, jumpToPreset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      const l = (Object.keys(LEVEL_KEYS) as Level[]).find((x) => LEVEL_KEYS[x] === k);
      if (l) go(l);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  return (
    <nav className="nx nx-levels" aria-label={strings.village.levels.aria} data-testid="level-bar" data-level={level}>
      {ORDER.map((l) => (
        <button
          key={l}
          type="button"
          className={`nx-level${level === l ? ' is-on' : ''}`}
          data-testid={l === 'village' ? 'village-toggle' : `level-${l}`}
          data-level-button={l}
          aria-pressed={level === l}
          title={`${strings.village.levels.hint[l]} · ${LEVEL_KEYS[l].toUpperCase()}`}
          onClick={() => go(l)}
        >
          <span className="nx-level-name">{l === 'village' && level === 'village' && saved.current ? strings.village.back : strings.village.levels[l]}</span>
          <kbd className="nx-level-key">{LEVEL_KEYS[l].toUpperCase()}</kbd>
        </button>
      ))}
      {onWay > 0 && level === 'street' && (
        <span className="nx-level-onway" data-testid="level-onway">{strings.village.onTheWay(onWay)}</span>
      )}
    </nav>
  );
}
