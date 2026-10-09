// ORDER 321 — markeringen i hörnet under hela provspelet.

import { useLanguage } from '../../content/language';
import { t } from '../../content/nexusStrings';
import './prov.css';

export function ProvBadge() {
  const lang = useLanguage();
  return <div className="nx-prov-badge" data-testid="prov-badge" aria-label={t(lang, 'prov.badge')}>{t(lang, 'prov.badge')}</div>;
}
