// ORDER 296 (punkt 6, provspel av 64b27c0): "ringarna får en förklaring
// (etiketten vid hovring)". Designs etikett ur ringleveransen (staffRingStrings:
// ring.chip "{role} · {task}"), visad när muspekaren står över en anställd
// eller ringen under hen (scene/WineBarFigures.tsx).

import { t as tt, type StringKey } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';

export function StaffRingTag({ role, task }: { role: string; task: string }) {
  const lang = useLanguage();
  const r = tt(lang, `ring.role.${role}` as StringKey);
  const k = tt(lang, `ring.task.${task}` as StringKey);
  return <div className="nx-ring-tag" data-testid="ring-tag">{tt(lang, 'ring.chip', { role: r, task: k })}</div>;
}
