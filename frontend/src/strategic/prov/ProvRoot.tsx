// ORDER 321 — provspelets rot (main.tsx, bara med ?prov): startskärmen, sedan spelet i det valda steget.

import { useEffect, useState } from 'react';
import { useLanguage } from '../../content/language';
import { StrategicApp } from '../StrategicApp';
import { ProvStart } from './ProvStart';
import type { ProvSetup } from './provState';

export function ProvRoot() {
  const [setup, setSetup] = useState<ProvSetup | null>(null);
  const lang = useLanguage();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  if (!setup) return <ProvStart onStart={setSetup} />;
  return <StrategicApp key="prov" prov={setup} />;
}
