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
