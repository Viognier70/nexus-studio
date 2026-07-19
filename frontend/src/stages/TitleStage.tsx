import { useEffect, useState } from 'react';
import { strings } from '../content/strings.sv';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface Props {
  onDone: () => void;
}

export function TitleStage({ onDone }: Props) {
  const reduce = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fadeIn = window.setTimeout(
      () => setVisible(true),
      reduce ? 80 : 900
    );
    const advance = window.setTimeout(onDone, reduce ? 1400 : 4600);
    return () => {
      window.clearTimeout(fadeIn);
      window.clearTimeout(advance);
    };
  }, [onDone, reduce]);

  return (
    <div className="stage title-stage" role="presentation">
      <div className={`title-inner ${visible ? 'visible' : ''}`}>
        <h1 className="title">{strings.title}</h1>
        <p className="subtitle">{strings.subtitle}</p>
      </div>
    </div>
  );
}
