// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { TagBoard } from '../TagBoard';

afterEach(cleanup);

function item(id: string, tags: string[]): TrackerRecord {
  return {
    id, primaryType: 'task', typeTags: ['task'], source: 'native',
    archived: false, syncStatus: 'local',
    system: { workspace: '/ws', createdAt: '', updatedAt: '' },
    fields: { title: id, tags },
  };
}

describe('TagBoard localization', () => {
  it('updates the untagged heading without translating user tags or changing selection', async () => {
    const i18n = await createI18nInstance('en');
    const onItemSelect = vi.fn();
    render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <TagBoard items={[item('no-tag', []), item('tagged', ['Untagged'])]} onItemSelect={onItemSelect} />
      </UiLanguageProvider>,
    );
    expect(screen.getByTestId('tracker-tag-board-column-__untagged__').textContent).toContain('Untagged');
    expect(screen.getByTestId('tracker-tag-board-column-Untagged').textContent).toContain('#Untagged');
    await act(async () => { await i18n.changeLanguage('ja'); });
    expect(screen.getByTestId('tracker-tag-board-column-__untagged__').textContent).toContain('タグなし');
    expect(screen.getByTestId('tracker-tag-board-column-Untagged').textContent).toContain('#Untagged');
    fireEvent.click(screen.getByText('no-tag'));
    expect(onItemSelect).toHaveBeenCalledWith('no-tag');
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByTestId('tracker-tag-board-column-__untagged__').textContent).toContain('Untagged');
  });
});
