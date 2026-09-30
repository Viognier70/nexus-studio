import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StrategicApp } from './strategic/StrategicApp';
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

// ORDER 267 (Nexus v1 etapp 5) — ett nytt spel börjar med bussen
// (VS001) och fortsätter i introduktionen i strategiska spelet:
//   startrutan → "Nytt spel" → bussen → registreringen → introduktionen.
// `#/first-person-prototype` öppnar bussen fristående, som förut.
type Flow = 'start' | 'bus' | 'introduction';

function Root() {
  const [route, setRoute] = useState(currentRoute);
  const [flow, setFlow] = useState<Flow>('start');
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
  if (flow === 'bus') return <App onFinished={() => setFlow('introduction')} />;
  if (flow === 'introduction') return <StrategicApp key="introduction" startIntroduction />;
  return <StrategicApp key="start" onNewGame={() => setFlow('bus')} />;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
