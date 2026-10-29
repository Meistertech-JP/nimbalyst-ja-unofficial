// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { globalRegistry } from '@nimbalyst/tracker-schema';
import type { TrackerRecord } from '../../../../core/TrackerRecord';
import { parseBuiltinTrackers } from '../ModelLoader';
import { groupTrackerRecordsByAxis } from '../trackerGrouping';
import { resolveTrackerGroupDisplayLabel } from '../trackerGroupDisplayLabels';

beforeEach(() => {
  globalRegistry.clearWorkspaceSchemas();
  for (const seed of parseBuiltinTrackers()) globalRegistry.register(seed, true);
});

function record(id: string, type = 'plan', status = 'in-development'): TrackerRecord {
  return {
    id, primaryType: type, typeTags: [type], source: 'native', archived: false, syncStatus: 'local',
    fields: { title: `User ${id}`, status, priority: 'medium' },
    system: { workspace: '/test', createdAt: '2026-10-29T00:00:00Z', updatedAt: '2026-10-29T00:00:00Z' },
  };
}

describe('group and board display projection', () => {
  it('localizes group labels without changing first-seen ordering, keys, membership or record data', async () => {
    const records = [record('working'), record('draft', 'plan', 'draft')];
    const groups = groupTrackerRecordsByAxis(records, 'status');
    const before = JSON.stringify(groups);
    const i18n = await createI18nInstance('ja');
    const t = (key: string) => i18n.t(key, { ns: 'tracker' });
    for (const [language, labels] of [['ja', ['開発中', '下書き']], ['en', ['In Development', 'Draft']], ['ja', ['開発中', '下書き']]] as const) {
      await i18n.changeLanguage(language);
      expect(groups.map(group => resolveTrackerGroupDisplayLabel(group, 'status', group.items, t))).toEqual(labels);
      expect(JSON.stringify(groups)).toBe(before);
    }
    expect(groups.map(group => group.key)).toEqual(['status:value:in-development', 'status:value:draft']);
    expect(groups.map(group => group.items.map(item => item.id))).toEqual([['working'], ['draft']]);
  });

  it('resolves empty board lanes from their known schema owner and preserves raw drop values', async () => {
    const i18n = await createI18nInstance('ja');
    const t = (key: string) => i18n.t(key, { ns: 'tracker' });
    const column = { key: 'completed', value: 'completed', label: 'Completed', empty: false };
    expect(resolveTrackerGroupDisplayLabel(column, 'status', [], t, 'plan')).toBe('完了');
    expect(column).toEqual({ key: 'completed', value: 'completed', label: 'Completed', empty: false });
    expect(resolveTrackerGroupDisplayLabel(column, 'status', [], t, 'all')).toBe('Completed');
    expect(resolveTrackerGroupDisplayLabel({ key: 'priority:value:medium', label: 'Medium' }, 'priority', [record('a')], t)).toBe('中');
    expect(resolveTrackerGroupDisplayLabel({ key: 'type:value:plan', label: 'Plans' }, 'type', [record('a')], t)).toBe('プラン');
  });

  it('does not pick a builtin translation for mixed schemas with a different custom label', async () => {
    const custom = structuredClone(globalRegistry.getBuiltinModel('plan')!);
    custom.type = 'custom-plan';
    custom.fields.find(field => field.name === 'status')!.options!.find(option => option.value === 'in-development')!.label = 'Custom workflow';
    globalRegistry.register(custom);
    const i18n = await createI18nInstance('ja');
    const t = (key: string) => i18n.t(key, { ns: 'tracker' });
    const records = [record('builtin'), record('custom', 'custom-plan')];
    const group = groupTrackerRecordsByAxis(records, 'status')[0];
    expect(resolveTrackerGroupDisplayLabel(group, 'status', records, t)).toBe('In Development');
    expect(resolveTrackerGroupDisplayLabel(group, 'status', [records[1]], t)).toBe('Custom workflow');
    custom.displayNamePlural = 'Plans';
    expect(resolveTrackerGroupDisplayLabel({ key: 'type:value:custom-plan', label: 'Plans' }, 'type', [records[1]], t)).toBe('Plans');
  });

  it('preserves user tags, identities, relationship titles, unknown types and malformed group keys', async () => {
    const i18n = await createI18nInstance('ja');
    const t = (key: string) => i18n.t(key, { ns: 'tracker' });
    for (const axis of ['tag', 'assignee', 'goal', 'milestone'] as const) {
      expect(resolveTrackerGroupDisplayLabel({ key: `${axis}:value:in-development`, label: 'In Development' }, axis, [record('a')], t)).toBe('In Development');
    }
    expect(resolveTrackerGroupDisplayLabel({ key: 'type:value:unknown-type', label: 'Unknown Type' }, 'type', [], t)).toBe('Unknown Type');
    expect(resolveTrackerGroupDisplayLabel({ key: 'status:value:%bad', label: 'Raw label' }, 'status', [], t)).toBe('Raw label');
    expect(resolveTrackerGroupDisplayLabel({ key: 'assignee:empty', label: 'Unassigned' }, 'assignee', [], t)).toBe('未割り当て');
    expect(resolveTrackerGroupDisplayLabel({ key: 'milestone:empty', label: 'No milestone' }, 'milestone', [], t)).toBe('マイルストーン未設定');
  });
});
