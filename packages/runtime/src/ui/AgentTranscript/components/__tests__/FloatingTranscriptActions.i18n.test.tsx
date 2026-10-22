import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { FloatingTranscriptActions } from '../FloatingTranscriptActions';

let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;

function renderWithJapanese(node: React.ReactNode) {
  return render(<I18nextProvider i18n={testI18n}>{node}</I18nextProvider>);
}

beforeEach(async () => {
  testI18n = await createI18nInstance('ja');
});

afterEach(() => {
  cleanup();
});

describe('FloatingTranscriptActions localization', () => {
  it('renders the prompts menu and empty state in Japanese', () => {
    renderWithJapanese(
      <FloatingTranscriptActions prompts={[]} onNavigateToPrompt={vi.fn()} />,
    );

    const promptsButton = screen.getByRole('button', { name: 'プロンプトメニュー' });
    expect(promptsButton.getAttribute('title')).toBe('このセッションのプロンプトを表示');
    fireEvent.click(promptsButton);
    expect(screen.getByText('このセッションにはプロンプトがありません').textContent)
      .toBe('このセッションにはプロンプトがありません');
  });

  it('renders phase actions and file-history labels in Japanese', () => {
    const onSetPhase = vi.fn();
    const onToggleSidebar = vi.fn();
    renderWithJapanese(
      <FloatingTranscriptActions
        prompts={[]}
        onNavigateToPrompt={vi.fn()}
        isSidebarCollapsed
        onToggleSidebar={onToggleSidebar}
        currentPhase="todo"
        phaseColumns={[{ value: 'todo', label: '未着手', color: '#777' }]}
        onSetPhase={onSetPhase}
      />,
    );

    const phaseButton = screen.getByRole('button', { name: 'フェーズを設定' });
    expect(phaseButton.getAttribute('title')).toBe('フェーズ: 未着手');
    fireEvent.click(phaseButton);
    fireEvent.click(screen.getByRole('button', { name: /ボードから削除/ }));
    expect(onSetPhase).toHaveBeenCalledWith(null);

    const historyButton = screen.getByRole('button', { name: 'ファイル履歴を表示' });
    expect(historyButton.getAttribute('title')).toBe('ファイル履歴を表示');
    fireEvent.click(historyButton);
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });
});
