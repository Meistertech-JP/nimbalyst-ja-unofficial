// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { globalRegistry } from '@nimbalyst/tracker-schema';
import { parseBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models/ModelLoader';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { TrackerListView } from '../TrackerListView';
import { TrackerBoardSurface } from '../board/TrackerBoardSurface';

beforeEach(() => {
  globalRegistry.clearWorkspaceSchemas();
  for (const seed of parseBuiltinTrackers()) globalRegistry.register(seed, true);
  globalRegistry.register({ ...structuredClone(globalRegistry.getBuiltinModel('plan')!), type: 'custom-plan' });
});
afterEach(cleanup);

function record(id: string, type: string): TrackerRecord {
  return {
    id, primaryType: type, typeTags: [type], source: 'native', archived: false, syncStatus: 'local',
    system: { workspace: '/test', createdAt: '', updatedAt: '', lastIndexed: '' },
    fields: { title: `User title ${id}`, status: 'in-development', priority: 'medium' },
  };
}

describe('Tracker list builtin display labels', () => {
  it('updates shared board priority lanes without changing card identities or raw column keys', async () => {
    const i18n = await createI18nInstance('en');
    const rows = [record('shared-board-plan', 'plan')];
    const onOpen = vi.fn();
    const before = JSON.stringify(rows);
    const { container } = render(<I18nextProvider i18n={i18n}><TrackerBoardSurface rows={rows} trackerType="plan" groupBy="priority" ordering="manual" onOpenItem={onOpen} /></I18nextProvider>);
    const keys = () => [...container.querySelectorAll('[data-column-key]')].map(lane => lane.getAttribute('data-column-key'));
    const originalKeys = keys();
    for (const language of ['ja', 'en', 'ja']) {
      await act(async () => { await i18n.changeLanguage(language); });
      const lane = container.querySelector('[data-column-key="priority:value:medium"]')!;
      expect(lane.querySelector('.flex-1.truncate.text-xs')?.textContent).toBe(language === 'ja' ? '中' : 'Medium');
      expect(keys()).toEqual(originalKeys);
      fireEvent.click(lane.querySelector('[data-item-id="shared-board-plan"]')!);
      expect(onOpen).toHaveBeenLastCalledWith('shared-board-plan');
    }
    expect(JSON.stringify(rows)).toBe(before);
  });

  it('updates grouped status headings without changing group keys, order or item membership', async () => {
    const i18n = await createI18nInstance('en');
    const rows = [record('working-plan', 'plan'), record('draft-plan', 'plan')];
    rows[1].fields.status = 'draft';
    const before = JSON.stringify(rows);
    const { container } = render(<I18nextProvider i18n={i18n}><TrackerListView rows={rows} groupBy="status" loaded onOpenItem={vi.fn()} /></I18nextProvider>);
    const groups = () => [...container.querySelectorAll('[data-group-key]')];
    const keys = groups().map(group => group.getAttribute('data-group-key'));
    for (const language of ['ja', 'en', 'ja']) {
      await act(async () => { await i18n.changeLanguage(language); });
      expect(groups()[0].querySelector('.sticky')?.textContent).toContain(language === 'ja' ? '開発中' : 'In Development');
      expect(groups()[1].querySelector('.sticky')?.textContent).toContain(language === 'ja' ? '下書き' : 'Draft');
      expect(groups().map(group => group.getAttribute('data-group-key'))).toEqual(keys);
      expect(groups()[0].querySelector('[data-item-id]')?.getAttribute('data-item-id')).toBe('working-plan');
      expect(groups()[1].querySelector('[data-item-id]')?.getAttribute('data-item-id')).toBe('draft-plan');
    }
    expect(JSON.stringify(rows)).toBe(before);
  });

  it.each([false, true])('updates language without translating user schema or row identity (stacked=%s)', async stacked => {
    const i18n = await createI18nInstance('ja');
    const rows = [record('builtin-plan', 'plan'), record('custom-plan', 'custom-plan')];
    const before = JSON.stringify(rows);
    const onOpen = vi.fn();
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <TrackerListView rows={rows} groupBy="none" loaded onOpenItem={onOpen} stacked={stacked} />
      </I18nextProvider>,
    );
    for (const language of ['ja', 'en', 'ja']) {
      await act(async () => { await i18n.changeLanguage(language); });
      const builtin = container.querySelector('[data-item-id="builtin-plan"]')!;
      const custom = container.querySelector('[data-item-id="custom-plan"]')!;
      expect(builtin.textContent).toContain(language === 'ja' ? '開発中' : 'In Development');
      expect(builtin.textContent).toContain(i18n.t('table.types.plan', { ns: 'tracker' }));
      expect(custom.textContent).toContain('In Development');
      expect(custom.textContent).toContain('Plan');
      expect(custom.textContent).toContain('User title custom-plan');
      fireEvent.click(builtin);
      expect(onOpen).toHaveBeenLastCalledWith('builtin-plan', expect.anything());
    }
    expect(JSON.stringify(rows)).toBe(before);
  });
});
