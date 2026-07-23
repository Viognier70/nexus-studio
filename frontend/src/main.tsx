import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StrategicApp } from './strategic/StrategicApp';
import './index.css';

const VS01_HASH = '#/first-person-prototype';

function currentRoute(): 'strategic' | 'first-person' {
  return window.location.hash === VS01_HASH ? 'first-person' : 'strategic';
}

function Root() {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return route === 'first-person' ? <App /> : <StrategicApp />;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
