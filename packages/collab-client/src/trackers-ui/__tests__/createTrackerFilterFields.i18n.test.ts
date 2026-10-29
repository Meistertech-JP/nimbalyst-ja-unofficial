// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { TrackerDataModel } from '@nimbalyst/runtime/plugins/TrackerPlugin/models';
import { globalRegistry, READINESS_FILTER_FIELD } from '@nimbalyst/tracker-schema';
import { parseBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models/ModelLoader';
import { resolveColumnsForType } from '@nimbalyst/runtime/plugins/TrackerPlugin/components/trackerColumns';
import { createTrackerFilterFields } from '../createTrackerFilterFields';

describe('placed-view filter field localization', () => {
  it('projects builtin vocabulary without changing filter identities or customized schema labels', async () => {
    const seed = parseBuiltinTrackers().find(model => model.type === 'plan')!;
    globalRegistry.register(seed, true);
    const i18n = await createI18nInstance('ja');
    const build = () => createTrackerFilterFields(resolveColumnsForType('plan'), 'plan', [globalRegistry.get('plan')!], key => i18n.t(key, { ns: 'tracker' }));
    const before = JSON.stringify(seed);
    for (const language of ['ja', 'en', 'ja']) {
      await i18n.changeLanguage(language);
      const fields = build();
      expect(fields.find(field => field.id === 'status')?.options?.find(option => option.value === 'in-development')?.label).toBe(language === 'ja' ? '開発中' : 'In Development');
      expect(fields.find(field => field.id === 'type')?.options?.[0]).toEqual({ value: 'plan', label: i18n.t('table.types.plan', { ns: 'tracker' }) });
    }
    const overridden = structuredClone(seed);
    overridden.displayName = 'Review plan';
    overridden.fields.find(field => field.name === 'status')!.options!.find(option => option.value === 'in-development')!.label = 'Reviewing';
    globalRegistry.register(overridden);
    expect(build().find(field => field.id === 'status')?.options?.find(option => option.value === 'in-development')?.label).toBe('Reviewing');
    expect(build().find(field => field.id === 'type')?.options?.[0]).toEqual({ value: 'plan', label: 'Review plan' });
    expect(JSON.stringify(seed)).toBe(before);
    globalRegistry.register(seed);
  });

  it('localizes fixed labels without changing values or user-authored schema labels', async () => {
    const i18n = await createI18nInstance('ja');
    const model = {
      type: 'example', displayName: 'My custom tracker',
      roles: { workflowStatus: 'status' },
      fields: [{ name: 'status', type: 'select', options: [{ value: 'custom', label: 'Custom status' }] }],
    } as TrackerDataModel;
    const fields = createTrackerFilterFields([], 'example', [model], key => i18n.t(key, { ns: 'tracker' }));
    expect(fields.find(field => field.id === 'owner')?.label).toBe('担当者');
    expect(fields.find(field => field.id === 'favorite')?.options).toEqual([
      { value: 'true', label: 'はい' }, { value: 'false', label: 'いいえ' },
    ]);
    const readiness = fields.find(field => field.id === READINESS_FILTER_FIELD);
    expect(readiness?.options?.map(option => option.value)).toEqual(['ready', 'blocked', 'closed']);
    expect(readiness?.options?.map(option => option.label)).toEqual(['準備完了', 'ブロック中', '完了']);
    expect(fields.flatMap(field => field.options ?? []).some(option => option.label === 'Custom status')).toBe(true);
  });

  it('keeps the English labels when the display language changes', async () => {
    const i18n = await createI18nInstance('ja');
    const labels = () => createTrackerFilterFields([], 'unknown', [], key => i18n.t(key, { ns: 'tracker' }));
    expect(labels().find(field => field.id === 'owner')?.label).toBe('担当者');
    await i18n.changeLanguage('en');
    expect(labels().find(field => field.id === 'owner')?.label).toBe('Owner');
    expect(labels().find(field => field.id === READINESS_FILTER_FIELD)?.options?.map(option => option.label))
      .toEqual(['Ready', 'Blocked', 'Closed']);
  });
});
