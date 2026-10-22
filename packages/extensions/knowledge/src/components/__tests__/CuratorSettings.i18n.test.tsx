// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { KnowledgeCuratorSettings } from '../CuratorSettings';

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('knowledge curator settings localization', () => {
  it('renders Japanese fixed settings copy while preserving provider and credential identifiers', async () => {
    const callBackendTool = vi.fn().mockResolvedValue({
      provider: 'typesafe',
      typesafeConfigured: false,
      cloudflareConfigured: false,
      decisionsLogged: 0,
    });

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <KnowledgeCuratorSettings callBackendTool={callBackendTool as never} />
      </UiLanguageProvider>,
    );

    expect(await screen.findByText('Jevプロバイダー')).toBeDefined();
    expect(screen.getByText('アルファ')).toBeDefined();
    expect(screen.getByText('Cloudflare Workers AI')).toBeDefined();
    expect(screen.getByPlaceholderText('TypeSafe APIキー')).toBeDefined();
    expect(screen.getByPlaceholderText('アカウントID')).toBeDefined();
    expect(screen.getByPlaceholderText('AI Gateway ID（任意）')).toBeDefined();
    expect(screen.getAllByRole('button', { name: '保存' })).toHaveLength(2);
    expect(screen.getByText(/TypeSafeを使用中です/)).toBeDefined();
    expect(screen.getByText(/振り分け判断を0件記録/)).toBeDefined();
  });
});
