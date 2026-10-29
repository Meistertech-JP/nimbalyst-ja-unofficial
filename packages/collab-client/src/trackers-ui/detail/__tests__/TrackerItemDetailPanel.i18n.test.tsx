// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { globalRegistry } from '@nimbalyst/tracker-schema';
import { loadBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models/ModelLoader';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { TrackerItemDetailPanel } from '../TrackerItemDetailPanel';

vi.mock('../../TrackerCommentsSection', () => ({ TrackerCommentsSection: () => null }));
vi.mock('../../TrackerRecentActivityChip', () => ({ TrackerRecentActivityChip: () => null }));

const item = {
  id: 'detail-localization', primaryType: 'plan', typeTags: ['plan'], source: 'native', archived: false, syncStatus: 'local',
  fields: { title: 'Project title', status: 'in-development', priority: 'medium' },
  system: { workspace: '/test', createdAt: '2026-10-29T00:00:00Z', updatedAt: '2026-10-29T00:00:00Z' },
} as TrackerRecord;

beforeEach(async () => {
  await loadBuiltinTrackers();
  globalRegistry.clearWorkspaceSchema('plan');
  const seed = globalRegistry.getBuiltinModel('plan')!;
  globalRegistry.register({ ...seed, fields: seed.fields.filter(field => ['title', 'status', 'priority'].includes(field.name)) });
});
afterEach(cleanup);

describe('shared tracker detail builtin labels', () => {
  it('updates type, compact summary and dropdown options while keeping callbacks and stored data untranslated', async () => {
    const change = vi.fn();
    const i18n = await createI18nInstance('ja');
    const before = JSON.stringify(globalRegistry.get('plan'));
    const { container } = render(<I18nextProvider i18n={i18n}>
      <TrackerItemDetailPanel item={item} identity={null} onFieldChange={change} commentMutate={vi.fn()} formatTimestamp={String} compact editing />
    </I18nextProvider>);
    for (const [language, type, status, priority, completed] of [
      ['ja', 'プラン', '開発中', '中', '完了'],
      ['en', 'Plan', 'In Development', 'Medium', 'Completed'],
      ['ja', 'プラン', '開発中', '中', '完了'],
    ]) {
      await act(() => i18n.changeLanguage(language));
      expect(container.querySelector('.tracker-item-detail-header')?.textContent).toContain(type);
      expect(container.querySelector('.tracker-phone-summary > span')?.textContent).toBe(status);
      const selects = Array.from(container.querySelectorAll('select'));
      expect(selects.find(select => select.value === 'in-development')?.selectedOptions[0].textContent).toBe(status);
      expect(selects.find(select => select.value === 'medium')?.selectedOptions[0].textContent).toBe(priority);
      expect(container.querySelector('option[value="completed"]')?.textContent).toBe(completed);
    }
    expect(change).not.toHaveBeenCalled();
    const statusSelect = screen.getAllByRole('combobox').find(select => (select as HTMLSelectElement).value === 'in-development')!;
    fireEvent.change(statusSelect, { target: { value: 'completed' } });
    expect(change).toHaveBeenCalledWith('status', 'completed');
    expect(JSON.stringify(globalRegistry.get('plan'))).toBe(before);
    expect(item.fields.status).toBe('in-development');
  });

  it('preserves customized builtin type and option labels in read-only details', async () => {
    const model = structuredClone(globalRegistry.get('plan')!);
    model.displayName = 'Delivery';
    model.fields.find(field => field.name === 'status')!.options!.find(option => option.value === 'in-development')!.label = 'Building';
    model.fields.find(field => field.name === 'priority')!.options!.find(option => option.value === 'medium')!.label = 'Normal';
    globalRegistry.register(model);
    const i18n = await createI18nInstance('ja');
    const { container } = render(<I18nextProvider i18n={i18n}>
      <TrackerItemDetailPanel item={item} identity={null} commentMutate={vi.fn()} formatTimestamp={String} compact editing />
    </I18nextProvider>);
    expect(container.querySelector('.tracker-item-detail-header')?.textContent).toContain('Delivery');
    expect(container.querySelector('.tracker-phone-summary > span')?.textContent).toBe('Building');
    const properties = container.querySelector('.tracker-phone-properties')!;
    expect(properties.textContent).toContain('Building');
    expect(properties.textContent).toContain('Normal');
  });
});
