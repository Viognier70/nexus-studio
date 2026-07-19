import { useEffect, useState } from 'react';

function detect(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  );
}

export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState<boolean>(detect);

  useEffect(() => {
    const update = () => setIsTouch(detect());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isTouch;
}
