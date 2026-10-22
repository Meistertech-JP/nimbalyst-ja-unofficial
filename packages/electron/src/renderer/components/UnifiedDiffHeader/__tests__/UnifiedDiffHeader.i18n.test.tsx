// @vitest-environment jsdom
import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: () => null,
}));

vi.mock('posthog-js/react', () => ({
  usePostHog: () => undefined,
}));

import { UnifiedDiffHeader } from '../UnifiedDiffHeader';
import { CustomEditorAIEditedBar } from '../CustomEditorAIEditedBar';
import type { UnifiedDiffHeaderProps } from '../DiffCapabilities';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

const props: UnifiedDiffHeaderProps = {
  filePath: '/workspace/notes.md',
  fileName: 'notes.md',
  sessionInfo: {
    sessionId: 'session-1',
    sessionTitle: '作業セッション',
    editedAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  onGoToSession: vi.fn(),
  editorType: 'lexical',
  readOnlyWhileReviewing: true,
  capabilities: {
    onAcceptAll: vi.fn(),
    onRejectAll: vi.fn(),
    changeGroups: {
      count: 3,
      currentIndex: 0,
      onNavigatePrevious: vi.fn(),
      onNavigateNext: vi.fn(),
      onAcceptCurrent: vi.fn(),
      onRejectCurrent: vi.fn(),
    },
  },
};

describe('UnifiedDiffHeader Japanese localization', () => {
  it('localizes review actions, navigation labels, session tooltip, and relative time', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <UnifiedDiffHeader {...props} />
      </I18nextProvider>,
    );

    expect(screen.getByRole('button', { name: '前の変更' }).getAttribute('aria-label')).toBe('前の変更');
    expect(screen.getByRole('button', { name: '次の変更' }).getAttribute('aria-label')).toBe('次の変更');
    expect(screen.getByRole('button', { name: '元に戻す' }).getAttribute('title')).toBe('この変更を元に戻す');
    expect(screen.getByRole('button', { name: '保持' }).getAttribute('title')).toBe('この変更を保持');
    expect(screen.getByRole('button', { name: 'すべてを元に戻す' }).textContent).toContain('すべてを元に戻す');
    expect(screen.getByRole('button', { name: 'すべて保持' }).textContent).toContain('すべて保持');
    expect(screen.getByTitle('「作業セッション」セッションを開く')).toBeDefined();
    expect(screen.getByText('2 時間前に編集').textContent).toBe('2 時間前に編集');
    expect(screen.getByText('確認中は読み取り専用です。編集するには適用または元に戻してください。').parentElement?.getAttribute('title')).toBe('AIの変更を確認している間、このファイルは読み取り専用です。編集を再開するには変更を適用するか、元に戻してください。');
  });

  it('localizes the custom-editor AI-edited label, session actions, and history tooltip', () => {
    const onGoToSession = vi.fn();
    const onViewHistory = vi.fn();
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <CustomEditorAIEditedBar
          fileName="notes.md"
          sessionInfo={{ sessionId: 'session-2', sessionTitle: '作業セッション', editedAt: Date.now() - 2 * 60 * 60 * 1000 }}
          onGoToSession={onGoToSession}
          onViewHistory={onViewHistory}
        />
      </I18nextProvider>,
    );

    expect(screen.getByText('作業セッション').parentElement?.textContent).toContain('notes.mdを編集');
    expect(screen.getByText('2 時間前')).toBeDefined();
    expect(screen.getByRole('button', { name: 'セッションへ移動' }).getAttribute('title')).toBe('これらの変更を行ったAIセッションを開く');
    expect(screen.getByRole('button', { name: '履歴を表示' }).getAttribute('title')).toBe('変更履歴を表示');
    fireEvent.click(screen.getByRole('button', { name: 'セッションへ移動' }));
    fireEvent.click(screen.getByRole('button', { name: '履歴を表示' }));
    expect(onGoToSession).toHaveBeenCalledWith('session-2');
    expect(onViewHistory).toHaveBeenCalledOnce();
  });

  it('localizes the fallback label when no session information is available', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <CustomEditorAIEditedBar fileName="notes.md" />
      </I18nextProvider>,
    );

    expect(screen.getByText('AIがnotes.mdを編集')).toBeDefined();
  });
});
