// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Provider, createStore } from 'jotai';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { TrackerQuickAddOverlay } from '../TrackerQuickAddOverlay';
import { TypeTagsEditor } from '../TrackerTypeTagsEditor';
import { TrackerDetailPanelResizable } from '../TrackerDetailPanelResizable';
import { TrackerNewMenu } from '../TrackerNewMenu';
import { TrackerDocumentPanel } from '../TrackerDocumentPanel';
import { TrackerCardMilestoneChip } from '../TrackerCardMilestoneChip';

afterEach(cleanup);

it('renders quick-add and type-tag controls in Japanese', async () => {
  const i18n = await createI18nInstance('ja');

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <>
        <TrackerQuickAddOverlay type="task" onSubmit={vi.fn()} onClose={vi.fn()} />
        <TypeTagsEditor typeTags={['bug']} primaryType="task" onUpdate={vi.fn()} />
      </>
    </UiLanguageProvider>,
  );

  expect(screen.getByTestId('tracker-quick-add-input').getAttribute('placeholder')).toBe('taskを新規作成…');
  expect(Array.from(document.querySelector('select')!.options).map((option) => option.textContent)).toEqual([
    '低', '中', '高', '重大',
  ]);
  const buttons = Array.from(document.querySelectorAll('button'));
  expect(buttons.map((button) => button.textContent?.trim())).toContain('追加');
  expect(buttons.find((button) => button.hasAttribute('title'))?.getAttribute('title')).toBe('キャンセル（Esc）');
  expect(document.body.textContent).toContain('タイプタグ');
  expect(document.body.textContent).toContain('＋追加');
  expect(document.querySelector('[title="タグ「bug」を削除"]')).not.toBeNull();
});

it('localizes the detail-panel resize accessibility label', async () => {
  const i18n = await createI18nInstance('ja');

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <TrackerDetailPanelResizable fill={false} width={360} onWidthChange={vi.fn()}>
        <div>Detail</div>
      </TrackerDetailPanelResizable>
    </UiLanguageProvider>,
  );

  screen.getByRole('separator', { name: '詳細パネルのサイズを変更' });
});

it('renders tracker creation and import menu labels in Japanese', async () => {
  const i18n = await createI18nInstance('ja');

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <TrackerNewMenu canCreate onNewItem={vi.fn()} />
    </UiLanguageProvider>,
  );

  expect(screen.getByTestId('tracker-toolbar-new-button').textContent).toContain('新規');
  fireEvent.click(screen.getByRole('button', { name: '項目を追加するその他の方法' }));
  const importMenuText = screen.getByTestId('tracker-toolbar-new-menu').textContent ?? '';
  expect(importMenuText).toContain('nimbalyst-local/plansからインポート');
  expect(importMenuText).toContain('plans/からインポート');
  expect(importMenuText).toContain('design/からインポート');
});

it('renders the tracker document prompt and empty milestone chip in Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  const item = {
    id: 'plan-ja',
    primaryType: 'plan',
    typeTags: ['plan'],
    source: 'native',
    archived: false,
    syncStatus: 'local',
    system: { workspace: '/ws', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    fields: { title: '計画' },
  } as any;

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <Provider store={createStore()}>
        <TrackerDocumentPanel itemId="plan-ja" mode="chat" isActive={false} />
        <TrackerCardMilestoneChip item={item} />
      </Provider>
    </UiLanguageProvider>,
  );

  expect(screen.getByText('この項目についてチャット')).toBeDefined();
  expect(screen.getByText('この項目についてチャットするには、プロジェクトを開いてください。')).toBeDefined();
  screen.getByRole('button', { name: 'マイルストーンを割り当て' });
  expect(screen.getByTestId('tracker-card-milestone-chip').getAttribute('title'))
    .toBe('マイルストーンを割り当て');
});
