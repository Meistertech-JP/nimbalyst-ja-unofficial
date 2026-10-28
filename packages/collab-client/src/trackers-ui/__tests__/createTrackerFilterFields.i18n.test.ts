// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { TrackerDataModel } from '@nimbalyst/runtime/plugins/TrackerPlugin/models';
import { READINESS_FILTER_FIELD } from '@nimbalyst/tracker-schema';
import { createTrackerFilterFields } from '../createTrackerFilterFields';

describe('placed-view filter field localization', () => {
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
