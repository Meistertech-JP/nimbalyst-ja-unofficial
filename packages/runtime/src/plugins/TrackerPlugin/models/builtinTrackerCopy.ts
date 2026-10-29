/** Canonical seed copy only; this module intentionally has no runtime imports. */
const statuses: Record<string, string> = {
  plan: 'draft ready-for-development in-development in-review changes-requested approved completed rejected blocked',
  bug: 'to-do in-progress in-review changes-requested approved done wont-do duplicate',
  task: 'to-do in-progress in-review changes-requested approved done wont-do duplicate',
  decision: 'to-do in-progress decided implemented',
  idea: 'new considering accepted rejected',
  milestone: 'planned active done cancelled',
  release: 'planned in-progress released cancelled',
  source: 'active superseded unavailable',
  capture: 'recorded stale unresolvable',
  citation: 'asserted verified stale broken',
};

function translate(key: string, label: string, t?: (key: string) => string): string {
  const result = t?.(key);
  return result && result !== key ? result : label;
}

function title(value: string): string {
  return value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function builtinTrackerTypeCopy(type: string, label: string, t?: (key: string) => string, plural = false): string {
  if (!Object.hasOwn(statuses, type) || label !== title(type) + (plural ? 's' : '')) return label;
  const prefix = ['source', 'capture', 'citation'].includes(type) ? 'builtin_display.types' : 'table.types';
  return translate(`${prefix}.${type}${plural ? '_plural' : ''}`, label, t);
}

export function builtinTrackerOptionCopy(type: string, field: string, value: string, label: string, t?: (key: string) => string): string {
  if (!Object.hasOwn(statuses, type)) return label;
  if (field === 'priority' && ['critical', 'high', 'medium', 'low'].includes(value) && label === title(value)) {
    return translate(`kanban.priority_${value}`, label, t);
  }
  if (field !== 'status' || !statuses[type].split(' ').includes(value)) return label;
  const expected = type === 'decision' && value === 'to-do' ? 'To Decide'
    : type === 'decision' && value === 'in-progress' ? 'Evaluating'
      : value === 'ready-for-development' ? 'Ready' : value === 'wont-do' ? "Won't Do" : title(value);
  if (label !== expected) return label;
  const statusType = type === 'task' ? 'bug' : type;
  const prefix = ['bug', 'decision', 'plan'].includes(statusType) ? 'ontology_domain_display.statuses' : 'builtin_display.statuses';
  return translate(`${prefix}.${statusType}.${value}`, label, t);
}
