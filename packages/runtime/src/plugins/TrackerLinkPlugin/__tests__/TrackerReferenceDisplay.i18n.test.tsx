import * as React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Provider, createStore } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { globalRegistry } from '@nimbalyst/tracker-schema';
import { parseBuiltinTrackers } from '../../TrackerPlugin/models/ModelLoader';
import { trackerItemsMapAtom } from '../../TrackerPlugin/trackerDataAtoms';
import type { TrackerRecord } from '../../../core/TrackerRecord';
import { TrackerReferenceChip } from '../TrackerReferenceChip';
import { TrackerReferencePreview } from '../TrackerReferencePreview';

beforeEach(() => {
  globalRegistry.clearWorkspaceSchemas();
  for (const seed of parseBuiltinTrackers()) globalRegistry.register(seed, true);
});
afterEach(cleanup);

const record: TrackerRecord = {
  id: 'reference-locale-bug', issueKey: 'BUG-LOCALE', primaryType: 'bug', typeTags: ['bug'],
  source: 'native', archived: false, syncStatus: 'synced',
  system: { workspace: '/test', createdAt: '2026-10-30T00:00:00.000Z', updatedAt: '2026-10-30T00:00:00.000Z' },
  fields: { title: 'User-owned title', status: 'to-do', priority: 'medium' },
};

describe('tracker reference builtin display localization', () => {
  it('updates chip, tooltip, type accessibility and preview metadata on ja-en-ja changes', async () => {
    const i18n = await createI18nInstance('ja');
    const store = createStore();
    store.set(trackerItemsMapAtom, new Map([[record.id, record]]));
    const before = JSON.stringify(globalRegistry.get('bug'));
    const { container } = render(
      <I18nextProvider i18n={i18n}><Provider store={store}>
        <TrackerReferenceChip referenceKey="BUG-LOCALE" />
        <TrackerReferencePreview referenceKey="BUG-LOCALE" displayLabel="BUG-LOCALE"
          resolved={{ id: record.id, issueKey: 'BUG-LOCALE', title: 'User-owned title', type: 'bug', status: 'to-do', priority: 'medium' }} />
      </Provider></I18nextProvider>,
    );
    for (const [language, status, type, priority] of [
      ['ja', '未着手', 'バグ', '中'], ['en', 'To Do', 'Bug', 'Medium'], ['ja', '未着手', 'バグ', '中'],
    ]) {
      await act(async () => { await i18n.changeLanguage(language); });
      expect(container.querySelector('.tracker-reference-chip-status')?.textContent).toContain(status);
      expect(container.querySelector('.tracker-reference-chip')?.getAttribute('title')).toContain(status);
      expect(container.querySelector('.tracker-reference-chip-type-icon')?.getAttribute('aria-label')).toContain(type);
      expect(container.querySelector('.tracker-reference-preview-type')?.textContent).toContain(type);
      expect(container.querySelector('.tracker-reference-preview-status')?.textContent).toContain(status);
      expect(container.querySelector('.tracker-reference-preview-priority')?.textContent).toContain(priority);
      expect(container.querySelector('.tracker-reference-chip')?.getAttribute('data-status')).toBe('to-do');
    }
    expect(JSON.stringify(globalRegistry.get('bug'))).toBe(before);
    expect(store.get(trackerItemsMapAtom).get(record.id)?.fields.title).toBe('User-owned title');
  });

  it('preserves renamed builtin type and option labels instead of translating user copy', async () => {
    const model = structuredClone(globalRegistry.getBuiltinModel('bug')!);
    model.displayName = 'Custom issue';
    model.fields.find(field => field.name === 'status')!.options!.find(option => option.value === 'to-do')!.label = 'Team queue';
    model.fields.find(field => field.name === 'priority')!.options!.find(option => option.value === 'medium')!.label = 'Normal custom';
    globalRegistry.register(model);
    const i18n = await createI18nInstance('ja');
    const store = createStore();
    store.set(trackerItemsMapAtom, new Map([[record.id, record]]));
    const { container } = render(<I18nextProvider i18n={i18n}><Provider store={store}>
      <TrackerReferenceChip referenceKey="BUG-LOCALE" />
      <TrackerReferencePreview referenceKey="BUG-LOCALE" displayLabel="BUG-LOCALE"
        resolved={{ id: record.id, title: 'User-owned title', type: 'bug', status: 'to-do', priority: 'medium' }} />
    </Provider></I18nextProvider>);
    expect(container.querySelector('.tracker-reference-chip-status')?.textContent).toBe('Team queue');
    expect(container.querySelector('.tracker-reference-chip-type-icon')?.getAttribute('aria-label')).toContain('Custom issue');
    expect(container.querySelector('.tracker-reference-preview-status')?.textContent).toBe('Team queue');
    expect(container.querySelector('.tracker-reference-preview-priority')?.textContent).toContain('Normal custom');
  });
});
