import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { PropsWithChildren, ReactNode } from 'react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { CardData } from '../BoardCardNode';
import { BoardConfigDialog } from '../BoardConfigDialog';
import { CardEditDialog } from '../CardEditDialog';

afterEach(cleanup);

async function renderWithJapanese(element: ReactNode) {
  const i18n = await createI18nInstance('ja');
  const Wrapper = ({ children }: PropsWithChildren) => (
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
      {children}
    </UiLanguageProvider>
  );
  return render(element, { wrapper: Wrapper });
}

const initialCard: CardData = {
  title: '',
  priority: 'medium',
};

it('localizes card editing and saves the translated fallback title without changing card fields', async () => {
  const onSave = vi.fn();
  const onHide = vi.fn();
  await renderWithJapanese(
    <CardEditDialog visible onHide={onHide} onSave={onSave} initialData={initialCard} />
  );

  expect(screen.getByRole('heading', { name: 'カードを編集' }).textContent).toBe('カードを編集');
  expect(screen.getByLabelText('タイトル').getAttribute('placeholder')).toBe('カードのタイトル');
  expect(screen.getByLabelText('担当者').getAttribute('placeholder')).toBe('担当者');
  expect(screen.getByLabelText('期限').getAttribute('type')).toBe('date');
  expect((screen.getByLabelText('優先度') as HTMLSelectElement).options).toHaveLength(3);
  expect(Array.from((screen.getByLabelText('優先度') as HTMLSelectElement).options).map((option) => option.textContent)).toEqual(['低', '中', '高']);
  expect(screen.getByLabelText('説明').getAttribute('placeholder')).toBe('説明を追加…');

  fireEvent.click(screen.getByRole('button', { name: '保存' }));
  expect(onSave).toHaveBeenCalledWith({
    title: '無題',
    owner: undefined,
    dueDate: undefined,
    priority: 'medium',
    description: undefined,
  });
  expect(onHide).toHaveBeenCalledOnce();
});

it('localizes board configuration and preserves config while saving visible field changes', async () => {
  const onSelect = vi.fn();
  const onHide = vi.fn();
  const initialConfig = {
    entityTypeId: 'task',
    statusPropertyId: 'status',
    visibleFields: { owner: true, dueDate: true, priority: true, description: false },
  };
  await renderWithJapanese(
    <BoardConfigDialog
      visible
      onHide={onHide}
      onSelect={onSelect}
      initialConfig={initialConfig}
    />
  );

  expect(screen.getByRole('heading', { name: 'ボードの設定' }).textContent).toBe('ボードの設定');
  expect(screen.getByText('カードに表示する項目:').textContent).toBe('カードに表示する項目:');
  expect(screen.getByText('カードの担当者を表示').textContent).toBe('カードの担当者を表示');
  expect(screen.getByText('期限を表示').textContent).toBe('期限を表示');
  expect(screen.getByText('優先度の表示を有効にする').textContent).toBe('優先度の表示を有効にする');
  expect(screen.getByText('説明欄を表示').textContent).toBe('説明欄を表示');

  fireEvent.click(screen.getByRole('checkbox', { name: /カードの担当者を表示/ }));
  fireEvent.click(screen.getByRole('button', { name: '設定を保存' }));
  expect(onSelect).toHaveBeenCalledWith({
    ...initialConfig,
    visibleFields: { owner: false, dueDate: true, priority: true, description: false },
  });
  expect(onHide).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'キャンセル' }).textContent).toBe('キャンセル');
});
