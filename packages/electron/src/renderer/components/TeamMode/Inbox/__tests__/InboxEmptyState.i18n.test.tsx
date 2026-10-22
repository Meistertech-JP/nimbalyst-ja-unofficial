// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { InboxEmptyState, InboxOfflineWithoutCache } from '../InboxEmptyState';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});
afterEach(() => cleanup());

function renderJapanese(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={japaneseI18n}>{ui}</I18nextProvider>);
}

describe('Inbox empty-state localization', () => {
  it('localizes filter and search copy while preserving the user query', () => {
    renderJapanese(
      <InboxEmptyState
        filter="mentions"
        query="deploy-check"
        scopeActive={false}
        onClearFilters={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: '検索に一致する通知はありません' })).toBeDefined();
    expect(screen.getByText('メンションに「deploy-check」に一致する項目はありません。')).toBeDefined();
    expect(screen.getByRole('button', { name: 'フィルターをクリア' })).toBeDefined();
  });

  it('localizes the offline empty state', () => {
    renderJapanese(<InboxOfflineWithoutCache />);

    expect(screen.getByRole('heading', { name: '受信トレイへの接続が必要です' })).toBeDefined();
    expect(screen.getByText(/このデバイスにはキャッシュされた通知がありません/)).toBeDefined();
  });
});
