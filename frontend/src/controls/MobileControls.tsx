import { useEffect, useRef, type MutableRefObject } from 'react';
import type { LookDelta, MoveVector } from '../scene/Scene';

interface Props {
  moveRef: MutableRefObject<MoveVector>;
  lookRef: MutableRefObject<LookDelta>;
  onInteract: () => void;
  showInteract: boolean;
  interactLabel: string;
}

const STICK_RADIUS = 45;

export function MobileControls({
  moveRef,
  lookRef,
  onInteract,
  showInteract,
  interactLabel
}: Props) {
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const lookRef2 = useRef<HTMLDivElement>(null);
  const stickTouchId = useRef<number | null>(null);
  const lookTouchId = useRef<number | null>(null);
  const stickCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lookLast = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const stick = stickRef.current;
    const knob = knobRef.current;
    const lookRegion = lookRef2.current;
    if (!stick || !knob || !lookRegion) return;

    const resetStick = () => {
      stickTouchId.current = null;
      knob.style.transform = 'translate(0px, 0px)';
      moveRef.current.x = 0;
      moveRef.current.y = 0;
    };

    const onStickStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      const rect = stick.getBoundingClientRect();
      stickCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      stickTouchId.current = touch.identifier;
      event.preventDefault();
    };
    const onStickMove = (event: TouchEvent) => {
      if (stickTouchId.current === null) return;
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.identifier !== stickTouchId.current) continue;
        const dx = touch.clientX - stickCenter.current.x;
        const dy = touch.clientY - stickCenter.current.y;
        const mag = Math.min(Math.hypot(dx, dy), STICK_RADIUS);
        const angle = Math.atan2(dy, dx);
        const nx = Math.cos(angle) * mag;
        const ny = Math.sin(angle) * mag;
        knob.style.transform = `translate(${nx}px, ${ny}px)`;
        moveRef.current.x = nx / STICK_RADIUS;
        moveRef.current.y = ny / STICK_RADIUS;
        event.preventDefault();
      }
    };
    const onStickEnd = (event: TouchEvent) => {
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.identifier === stickTouchId.current) {
          resetStick();
        }
      }
    };

    const isOverInteractive = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return !!target.closest('.stick, .interact-btn, .hud-btn, .btn');
    };

    const onLookStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      if (isOverInteractive(touch.target)) return;
      lookTouchId.current = touch.identifier;
      lookLast.current = { x: touch.clientX, y: touch.clientY };
      event.preventDefault();
    };
    const onLookMove = (event: TouchEvent) => {
      if (lookTouchId.current === null) return;
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.identifier !== lookTouchId.current) continue;
        lookRef.current.dx += touch.clientX - lookLast.current.x;
        lookRef.current.dy += touch.clientY - lookLast.current.y;
        lookLast.current = { x: touch.clientX, y: touch.clientY };
        event.preventDefault();
      }
    };
    const onLookEnd = (event: TouchEvent) => {
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.identifier === lookTouchId.current) {
          lookTouchId.current = null;
        }
      }
    };

    stick.addEventListener('touchstart', onStickStart, { passive: false });
    window.addEventListener('touchmove', onStickMove, { passive: false });
    window.addEventListener('touchend', onStickEnd);
    window.addEventListener('touchcancel', onStickEnd);

    lookRegion.addEventListener('touchstart', onLookStart, { passive: false });
    window.addEventListener('touchmove', onLookMove, { passive: false });
    window.addEventListener('touchend', onLookEnd);
    window.addEventListener('touchcancel', onLookEnd);

    return () => {
      stick.removeEventListener('touchstart', onStickStart);
      window.removeEventListener('touchmove', onStickMove);
      window.removeEventListener('touchend', onStickEnd);
      window.removeEventListener('touchcancel', onStickEnd);
      lookRegion.removeEventListener('touchstart', onLookStart);
      window.removeEventListener('touchmove', onLookMove);
      window.removeEventListener('touchend', onLookEnd);
      window.removeEventListener('touchcancel', onLookEnd);
      resetStick();
    };
  }, [moveRef, lookRef]);

  return (
    <>
      <div ref={lookRef2} className="look-region" aria-hidden="true" />
      <div ref={stickRef} className="stick" aria-hidden="true">
        <div ref={knobRef} className="stick-knob" />
      </div>
      {showInteract && (
        <button
          type="button"
          className="interact-btn"
          onClick={onInteract}
          aria-label={interactLabel}
        >
          {interactLabel}
        </button>
      )}
    </>
  );
}
