import React, { useEffect, useReducer, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StrategicApp } from './strategic/StrategicApp';
import { NEW_GAME_FLOW_START, newGameFlow } from './strategic/opening/newGameFlow';
import { useLanguage } from './content/language';
// ORDER 321 — provspelsläget, bara med ?prov i adressen.
import { ProvRoot } from './strategic/prov/ProvRoot';
import { isProvSearch } from './strategic/prov/provState';
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
// VS001) är borttagen ur starten.
// ORDER 308 (Anders 2026-10-05) — Designs öppning (D2, omtag 2026-10-04)
// spelas före första morgonen. Ordningen är
//   startskärmen → "Nytt spel" → namn och samtycke → öppningen → första morgonen.
// Öppningen spelas i samma StrategicApp som morgonen, så att morgonen tonar
// upp ur öppningens svärta utan att scenen laddas om (strategic/opening/).
// Flödet är en liten reducer (strategic/opening/newGameFlow.ts, med tester).
// `#/first-person-prototype` öppnar den gamla bussen fristående, som förut.

function Root() {
  const [route, setRoute] = useState(currentRoute);
  const [game, send] = useReducer(newGameFlow, NEW_GAME_FLOW_START);
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
  if (game.flow === 'introduction') {
    return <StrategicApp key="introduction" startIntroduction player={game.player} opening={game.opening} onOpeningDone={() => send({ type: 'openingDone' })} />;
  }
  return <StrategicApp key="start" onNewGame={(player) => send({ type: 'newGame', player })} />;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {isProvSearch(window.location.search) ? <ProvRoot /> : <Root />}
  </React.StrictMode>
);
