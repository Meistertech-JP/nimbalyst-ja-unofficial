// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { TrackerDependencyCycleBanner } from '../TrackerDependencyCycleBanner';

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

function record(id: string, title: string, issueKey: string, localKey?: string): TrackerRecord {
  return {
    id,
    primaryType: 'task',
    typeTags: ['task'],
    issueKey,
    localKey,
    source: 'native',
    archived: false,
    syncStatus: 'synced',
    system: { workspace: '/workspace', createdAt: '', updatedAt: '' },
    fields: { title },
  };
}

describe('TrackerDependencyCycleBanner localization', () => {
  it('localizes cycle copy and controls while preserving item opening and dismissal', () => {
    const onOpenItem = vi.fn();
    const { rerender } = render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <TrackerDependencyCycleBanner
          items={[record('task-1', '計画を確認', 'NIM.7', 'NIM.7'), record('task-2', '作業を整理', 'KB-2')]}
          onOpenItem={onOpenItem}
        />
      </UiLanguageProvider>,
    );

    expect(screen.getByText(/2件の項目が依存関係の循環にあります。/)).toBeTruthy();
    expect(screen.getByText(/これらの項目は互いに依存しているため/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '項目を表示' }));
    expect(screen.getByRole('button', { name: '項目を隠す' })).toBeTruthy();
    expect(screen.getByText(/ドット付きの参照番号はこのマシン上だけ/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /計画を確認/ }));
    expect(onOpenItem).toHaveBeenCalledWith('task-1');

    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.queryByTestId('tracker-dependency-cycle-banner')).toBeNull();

    rerender(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <TrackerDependencyCycleBanner items={[]} onOpenItem={onOpenItem} />
      </UiLanguageProvider>,
    );
  });
});
