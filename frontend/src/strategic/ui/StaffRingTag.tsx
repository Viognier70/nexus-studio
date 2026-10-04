// ORDER 296 (punkt 6, provspel av 64b27c0): "ringarna får en förklaring
// (etiketten vid hovring)". Designs etikett ur ringleveransen (staffRingStrings:
// ring.chip "{role} · {task}"), visad när muspekaren står över en anställd
// eller ringen under hen (scene/WineBarFigures.tsx).

import { strings } from '../../content/strings';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';

// ORDER 303 F — i statusläget ett litet kort: orken och trivseln i tre lägen
// och kunskapsområdena.
export interface StaffCondition { stamina: number; wellbeing: number; skills: readonly string[] }
export const conditionLevel = (v: number) => (v >= 2 / 3 ? 2 : v >= 1 / 3 ? 1 : 0);

export function StaffRingTag({ role, task, condition }: { role: string; task: string; condition?: StaffCondition | null }) {
  const lang = useLanguage();
  const r = tt(lang, `ring.role.${role}` as StringKey);
  const k = tt(lang, `ring.task.${task}` as StringKey);
  if (!condition) return <div className="nx-ring-tag" data-testid="ring-tag">{tt(lang, 'ring.chip', { role: r, task: k })}</div>;
  const s = strings.status;
  return (
    <div className="nx-ring-tag nx-status-card" data-testid="staff-card">
      <div className="nx-status-card-head">{tt(lang, 'ring.chip', { role: r, task: k })}</div>
      <div>{s.stamina}: {s.level[conditionLevel(condition.stamina)]} · {s.wellbeing}: {s.level[conditionLevel(condition.wellbeing)]}</div>
      <div>{s.skills}: {condition.skills.length > 0 ? condition.skills.map((a) => s.area[a] ?? a).join(', ') : s.noSkills}</div>
    </div>
  );
}
