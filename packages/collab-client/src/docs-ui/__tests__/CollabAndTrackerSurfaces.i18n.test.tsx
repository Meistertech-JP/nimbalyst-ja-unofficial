// @vitest-environment jsdom
import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import {
  CollabItemMenu,
  CollabPageDeleteEntry,
  CollabPageHistoryEntry,
  CollabPageMenuHead,
} from '../CollabPageMenu';
import { TrackerListView } from '../../trackers-ui/TrackerListView';
import { TagBoard } from '../../trackers-ui/TagBoard';
import { PageHeaderBar } from '../../trackers-ui/page/PageHeaderBar';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('shared collaboration and tracker surfaces localization', () => {
  it('renders page actions, accessible labels, and tracker empty states in Japanese', () => {
    const noop = () => {};
    const onHistory = vi.fn();
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <>
          <CollabPageMenuHead
            onNewPageInside={noop}
            onSetType={noop}
            onPlaceType={noop}
            onRename={noop}
            onMoveTo={noop}
            onCopyLink={noop}
          />
          <CollabPageDeleteEntry childCount={2} onDelete={noop} />
          <CollabPageHistoryEntry onClick={onHistory} />
          <CollabItemMenu
            placed
            onNewPageInside={noop}
            onPlaceType={noop}
            onMoveTo={noop}
            onBackUnderType={noop}
            onHistory={onHistory}
            onArchive={noop}
          />
          <PageHeaderBar
            path={[]}
            title="ページタイトル"
            onShowHistory={onHistory}
            menuItems={[]}
          />
          <TrackerListView rows={[]} groupBy="none" loaded onOpenItem={noop} />
          <TagBoard items={[]} />
        </>
      </UiLanguageProvider>,
    );

    expect(screen.getAllByText('新しいページ').length).toBe(2);
    expect(screen.getAllByText('タイプを配置...').length).toBe(2);
    expect(screen.getByText('タイプを設定')).toBeTruthy();
    expect(screen.getAllByText('移動先...').length).toBe(2);
    expect(screen.getByText('リンクをコピー')).toBeTruthy();
    expect(screen.getByText('ゴミ箱に移動')).toBeTruthy();
    expect(screen.getByText('子ページ2件')).toBeTruthy();
    expect(screen.getAllByText('ページの履歴')).toHaveLength(2);
    const historyButtons = screen.getAllByRole('button', { name: /ページの履歴$/ });
    expect(historyButtons).toHaveLength(3);
    historyButtons.forEach(button => fireEvent.click(button));
    expect(onHistory).toHaveBeenCalledTimes(3);
    expect(screen.getByText('現在のビューに一致する項目はありません。')).toBeTruthy();
    expect(screen.getAllByText('表示する項目はありません').length).toBe(2);
  });
});
