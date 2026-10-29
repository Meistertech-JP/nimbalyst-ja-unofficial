// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { globalRegistry } from '@nimbalyst/tracker-schema';
import { parseBuiltinTrackers } from '../ModelLoader';
import { resolveTrackerFieldDisplayLabel, resolveTrackerTypeDisplayLabel } from '../trackerDisplayLabels';

beforeEach(() => {
  globalRegistry.clearWorkspaceSchemas();
  for (const seed of parseBuiltinTrackers()) globalRegistry.register(seed, true);
});

describe('builtin tracker display labels', () => {
  it('has real Japanese resources for every builtin name, status and priority option', async () => {
    const i18n = await createI18nInstance('ja');
    const t = (key: string) => i18n.t(key, { ns: 'tracker' });
    for (const seed of parseBuiltinTrackers()) {
      expect(resolveTrackerTypeDisplayLabel(seed.type, t), seed.type).not.toBe(seed.displayName);
      expect(resolveTrackerTypeDisplayLabel(seed.type, t, true), seed.type).not.toBe(seed.displayNamePlural);
      for (const field of seed.fields.filter(field => ['status', 'priority'].includes(field.name))) {
        for (const option of field.options ?? []) {
          expect(resolveTrackerFieldDisplayLabel(seed.type, field.name, option.value, t), `${seed.type}/${field.name}/${option.value}`).not.toBe(option.label);
        }
      }
    }
  });

  it('localizes unchanged builtin names, statuses and priorities without mutating registry data', async () => {
    const before = JSON.stringify(globalRegistry.get('plan'));
    const i18n = await createI18nInstance('ja');
    const t = (key: string) => i18n.t(key, { ns: 'tracker' });
    for (const [language, type, status, priority] of [
      ['ja', 'プラン', '開発中', '中'],
      ['en', 'Plans', 'In Development', 'Medium'],
      ['ja', 'プラン', '開発中', '中'],
    ]) {
      await i18n.changeLanguage(language);
      expect(resolveTrackerTypeDisplayLabel('plan', t, true)).toBe(type);
      expect(resolveTrackerFieldDisplayLabel('plan', 'status', 'in-development', t)).toBe(status);
      expect(resolveTrackerFieldDisplayLabel('plan', 'priority', 'medium', t)).toBe(priority);
    }
    expect(JSON.stringify(globalRegistry.get('plan'))).toBe(before);
  });

  it('preserves custom types and renamed properties even if another builtin label is identical', () => {
    const seed = globalRegistry.getBuiltinModel('plan')!;
    const t = (key: string) => `translated:${key}`;
    globalRegistry.register({ ...structuredClone(seed), type: 'custom-plan' });
    expect(resolveTrackerTypeDisplayLabel('custom-plan', t, true)).toBe('Plans');
    expect(resolveTrackerTypeDisplayLabel('missing-type', t)).toBe('missing-type');
    globalRegistry.register({ ...structuredClone(seed), displayNamePlural: 'Release plans' });
    expect(resolveTrackerTypeDisplayLabel('plan', t, true)).toBe('Release plans');
    expect(resolveTrackerTypeDisplayLabel('plan', t)).toBe('translated:table.types.plan');
    expect(resolveTrackerTypeDisplayLabel('plan', t, true, { type: 'plan', displayNamePlural: 'Custom plans' })).toBe('Custom plans');
  });

  it('preserves overridden option labels, custom fields, unknown values and their semantic IDs', () => {
    const seed = globalRegistry.getBuiltinModel('plan')!;
    const model = structuredClone(seed);
    model.fields.find(field => field.name === 'priority')!.options!.find(option => option.value === 'medium')!.label = 'Normal';
    model.fields.push({ name: 'customPriority', type: 'select', options: [{ value: 'medium', label: 'Medium' }] });
    globalRegistry.register(model);
    const before = JSON.stringify(model);
    const t = (key: string) => `translated:${key}`;
    expect(resolveTrackerFieldDisplayLabel('plan', 'priority', 'medium', t)).toBe('Normal');
    expect(resolveTrackerFieldDisplayLabel('plan', 'customPriority', 'medium', t)).toBe('Medium');
    expect(resolveTrackerFieldDisplayLabel('plan', 'status', 'unknown', t, 'Unknown status')).toBe('Unknown status');
    expect(resolveTrackerFieldDisplayLabel('plan', 'status', 'in-development', t)).toBe('translated:ontology_domain_display.statuses.plan.in-development');
    expect(JSON.stringify(model)).toBe(before);
  });

  it('does not leak missing translation keys and supports all built-in status families', () => {
    for (const seed of parseBuiltinTrackers()) {
      const status = seed.fields.find(field => field.name === 'status')?.options?.[0];
      if (!status) continue;
      expect(resolveTrackerFieldDisplayLabel(seed.type, 'status', status.value, key => key)).toBe(status.label);
      expect(resolveTrackerFieldDisplayLabel(seed.type, 'status', status.value, key => `translated:${key}`)).toMatch(/^translated:/);
      expect(resolveTrackerTypeDisplayLabel(seed.type, key => key, true)).toBe(seed.displayNamePlural);
    }
  });
});
