// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Provider, createStore } from 'jotai';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { actionPromptsAtomFamily, type ActionPromptListState } from '../../../store/atoms/actionPrompts';
import { ActionPromptsDropdown } from '../ActionPromptsDropdown';

vi.mock('posthog-js/react', () => ({ usePostHog: () => undefined }));
vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({ MaterialSymbol: () => null }));

afterEach(() => cleanup());

async function renderDropdown(state: ActionPromptListState) {
  const workspacePath = '/workspace';
  const store = createStore();
  store.set(actionPromptsAtomFamily(workspacePath), state);
  const i18n = await createI18nInstance('ja');

  return render(
    <Provider store={store}>
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
        <ActionPromptsDropdown
          open
          workspacePath={workspacePath}
          onInsert={() => undefined}
        />
      </UiLanguageProvider>
    </Provider>,
  );
}

describe('ActionPromptsDropdown localization', () => {
  it('renders Japanese labels and rich text when the workspace has no action file', async () => {
    await renderDropdown({ actions: [], diagnostics: [], filePath: null, fileExists: false, loaded: true });

    expect(screen.getByRole('button', { name: 'アクション (0)' })).toBeTruthy();
    screen.getByText('アクションプロンプト');
    screen.getByText('サンプル付きai-actions.mdを作成');
    screen.getByText((_content, element) => element?.textContent === 'このワークスペースにはai-actions.mdがありません。編集できるサンプルプロンプトを作成できます。');
    screen.getByText('ai-actions.mdを開く…');
  });

  it('renders Japanese guidance for an empty action file', async () => {
    await renderDropdown({ actions: [], diagnostics: [], filePath: '/workspace/ai-actions.md', fileExists: true, loaded: true });

    screen.getByText('ai-actions.mdから');
    screen.getByText((_content, element) => element?.textContent === 'ai-actions.mdに## Heading形式のセクションがありません。ファイルを開いて追加してください。');
    screen.getByText('アクションを編集…');
  });

  it('localizes action labels without translating configured content', async () => {
    await renderDropdown({
      actions: [{
        id: 'review',
        label: 'My review action',
        body: 'Review this workspace',
        config: { launch: 'new-session', model: 'provider/model-1', foreground: true, autoSubmit: false, worktree: false },
      }],
      diagnostics: [],
      filePath: '/workspace/ai-actions.md',
      fileExists: true,
      loaded: true,
    });

    screen.getByText('ai-actions.mdから');
    screen.getByText('My review action');
    screen.getByText('新しいセッションを開く · provider/model-1');
  });
});
