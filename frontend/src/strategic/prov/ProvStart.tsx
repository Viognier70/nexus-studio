// ORDER 321 — provspelets startskärm: var, veckan i säsongen, kassan, vädret och en situation i kväll.
// Kassan förifylls för steget när platsen byts (provState.ts defaultCashSek).

import { useState } from 'react';
import { useLanguage } from '../../content/language';
import { t, type StringKey } from '../../content/nexusStrings';
import { defaultCashSek, defaultSetup, PROV_PLACES, PROV_WEATHERS, PROV_WEEKS, provIncidents, type ProvPlace, type ProvSetup, type ProvWeather } from './provState';
import '../business/name-entry.css';
import './prov.css';

const WEATHER_KEY: Record<ProvWeather, StringKey> = {
  auto: 'prov.weather.auto', sun: 'weather.sun', rain: 'weather.rain', wind: 'weather.wind', cool: 'weather.cool'
};

export function ProvStart({ onStart }: { onStart: (setup: ProvSetup) => void }) {
  const lang = useLanguage();
  // ORDER 323 §8 — fältet är tomt: krogen heter det spelaren skriver, annars Hyttgrillen (platshållaren).
  const [setup, setSetup] = useState<ProvSetup>(() => defaultSetup());
  const incidents = provIncidents(setup.place);
  const set = (patch: Partial<ProvSetup>) => setSetup((s) => ({ ...s, ...patch }));
  const choosePlace = (place: ProvPlace) => set({ place, cashSek: defaultCashSek(place), incidentId: null });
  return (
    <div className="business-name-overlay nx-prov-start" role="dialog" aria-modal="true">
      <form
        className="business-name-card"
        data-testid="prov-start"
        onSubmit={(e) => { e.preventDefault(); onStart(setup); }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="business-name-kicker">{t(lang, 'prov.kicker')}</div>
        <h2>{t(lang, 'prov.heading')}</h2>
        <p>{t(lang, 'prov.body')}</p>
        <label className="business-name-label">
          <span>{t(lang, 'prov.name')}</span>
          <input type="text" value={setup.name} maxLength={40} placeholder={t(lang, 'prov.businessName')} autoComplete="off" onChange={(e) => set({ name: e.target.value })} data-testid="prov-name" />
        </label>
        <fieldset className="nx-prov-places">
          <legend>{t(lang, 'prov.place')}</legend>
          {PROV_PLACES.map((p) => (
            <label key={p}>
              <input type="radio" name="prov-place" value={p} checked={setup.place === p} onChange={() => choosePlace(p)} data-testid={`prov-place-${p}`} />
              {t(lang, `prov.place.${p}` as StringKey)}
            </label>
          ))}
        </fieldset>
        <label className="business-name-label">
          <span>{t(lang, 'prov.week')}</span>
          <select value={setup.week} onChange={(e) => set({ week: Number(e.target.value) })} data-testid="prov-week">
            {PROV_WEEKS.map((w) => <option key={w} value={w}>{t(lang, 'prov.weekN', { n: w })}</option>)}
          </select>
        </label>
        <label className="business-name-label">
          <span>{t(lang, 'prov.cash')}</span>
          <input type="number" step={1000} value={setup.cashSek} onChange={(e) => set({ cashSek: Number(e.target.value) || 0 })} data-testid="prov-cash" />
        </label>
        <label className="business-name-label">
          <span>{t(lang, 'prov.weather')}</span>
          <select value={setup.weather} onChange={(e) => set({ weather: e.target.value as ProvWeather })} data-testid="prov-weather">
            {PROV_WEATHERS.map((w) => <option key={w} value={w}>{t(lang, WEATHER_KEY[w])}</option>)}
          </select>
          <small>{t(lang, 'prov.weatherNote')}</small>
        </label>
        <label className="business-name-label">
          <span>{t(lang, 'prov.incident')}</span>
          <select value={setup.incidentId ?? ''} onChange={(e) => set({ incidentId: e.target.value || null })} data-testid="prov-incident">
            <option value="">{t(lang, 'prov.incident.none')}</option>
            {incidents.map((i) => <option key={i.id} value={i.id}>{`${i.id} · ${i.title}`}</option>)}
          </select>
          <small>{t(lang, 'prov.incidentNote')}</small>
        </label>
        <div className="business-name-actions">
          <button type="submit" data-testid="prov-begin">{t(lang, 'prov.start')}</button>
        </div>
      </form>
    </div>
  );
}
