import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StrategicApp } from './strategic/StrategicApp';
import type { PlayerRegistration } from './strategic/types';
import { useLanguage } from './content/language';
import './index.css';
// ORDER 285 — den varma formen: typsnitten och tokens (Designs leverans 2026-09-29).
import './ui/theme/fonts';
// ORDER 290 — början (bussen, registreringen, startrutan) i den varma formen.
import './ui/theme/nexus-warm.css';
import './ui/theme/warm-start.css';

const VS01_HASH = '#/first-person-prototype';

function currentRoute(): 'strategic' | 'first-person' {
  return window.location.hash === VS01_HASH ? 'first-person' : 'strategic';
}

// ORDER 300 §4 (Anders 2026-10-04) — den gamla vildmarksstarten (bussen,
// VS001) är borttagen ur starten. Ordningen är
//   startskärmen → "Nytt spel" → namn och samtycke → första morgonen.
// Designs nya öppning (D2) kopplas in när den har levererats.
// `#/first-person-prototype` öppnar den gamla bussen fristående, som förut.
type Flow = 'start' | 'introduction';

function Root() {
  const [route, setRoute] = useState(currentRoute);
  const [flow, setFlow] = useState<Flow>('start');
  const [player, setPlayer] = useState<PlayerRegistration | undefined>(undefined);
  // ORDER 273 — språket; bussen (VS001) ritas också om vid byte.
  const lang = useLanguage();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  if (route === 'first-person') return <App />;
  if (flow === 'introduction') return <StrategicApp key="introduction" startIntroduction player={player} />;
  return <StrategicApp key="start" onNewGame={(p) => { setPlayer(p); setFlow('introduction'); }} />;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
