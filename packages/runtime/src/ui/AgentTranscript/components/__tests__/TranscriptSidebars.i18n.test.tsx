import React, { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { PromptMarker, TodoItem } from '../../types';
import type { TranscriptViewMessage } from '../../../../ai/server/transcript/TranscriptProjector';
import { TranscriptSidebar } from '../TranscriptSidebar';
import { TodosSidebar } from '../TodosSidebar';
import { TranscriptSearchBar } from '../TranscriptSearchBar';

let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;

function renderWithJapanese(node: React.ReactNode) {
  return render(<I18nextProvider i18n={testI18n}>{node}</I18nextProvider>);
}

beforeEach(async () => {
  testI18n = await createI18nInstance('ja');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Agent transcript sidebar localization', () => {
  it('renders the Japanese prompt history and empty state', () => {
    renderWithJapanese(
      <TranscriptSidebar
        sessionId="session-1"
        prompts={[]}
        onNavigateToPrompt={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'プロンプト履歴' }).textContent).toBe('プロンプト履歴');
    expect(screen.getByText('プロンプトはまだありません。プロンプトを入力して開始してください。').textContent)
      .toBe('プロンプトはまだありません。プロンプトを入力して開始してください。');
  });

  it('renders Japanese task labels, counts, and relative time', () => {
    const todos: TodoItem[] = [
      { id: 'progress', content: 'Implement', activeForm: 'Implementing', status: 'in_progress', timestamp: new Date(Date.now() - 120_000).toISOString() },
      { id: 'pending', content: 'Review', activeForm: 'Reviewing', status: 'pending' },
      { id: 'complete', content: 'Plan', activeForm: 'Planning', status: 'completed' },
    ];

    const { container } = renderWithJapanese(<TodosSidebar todos={todos} />);

    expect(screen.getByRole('heading', { name: /タスク/ }).textContent).toContain('タスク');
    expect(container.textContent).toContain('3件中1件完了');
    expect(container.textContent).toContain('進行中 (1)');
    expect(container.textContent).toContain('未着手 (1)');
    expect(container.textContent).toContain('完了 (1)');
    expect(container.textContent).toMatch(/\d+分前/);
  });

  it('renders Japanese find-in-transcript labels and updates the case toggle title', () => {
    vi.stubGlobal('CSS', { highlights: { delete: vi.fn(), set: vi.fn() } });
    renderWithJapanese(
      <TranscriptSearchBar
        isVisible
        messages={[] as TranscriptViewMessage[]}
        containerRef={createRef<HTMLDivElement>()}
        onClose={vi.fn()}
        onScrollToMessage={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('トランスクリプト内を検索...').getAttribute('placeholder'))
      .toBe('トランスクリプト内を検索...');
    expect(screen.getByText('一致する箇所はありません').textContent).toBe('一致する箇所はありません');
    expect(screen.getByTitle('前の一致箇所（Shift+EnterまたはCmd+Shift+G）').getAttribute('title'))
      .toBe('前の一致箇所（Shift+EnterまたはCmd+Shift+G）');
    expect(screen.getByTitle('次の一致箇所（EnterまたはCmd+G）').getAttribute('title'))
      .toBe('次の一致箇所（EnterまたはCmd+G）');
    expect(screen.getByTitle('大文字と小文字を区別しない').getAttribute('title')).toBe('大文字と小文字を区別しない');

    fireEvent.click(screen.getByTitle('大文字と小文字を区別しない'));
    expect(screen.getByTitle('大文字と小文字を区別').getAttribute('title')).toBe('大文字と小文字を区別');
    expect(screen.getByTitle('閉じる（Escape）').getAttribute('title')).toBe('閉じる（Escape）');
  });
});
