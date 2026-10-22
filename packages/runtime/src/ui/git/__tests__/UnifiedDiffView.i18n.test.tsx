import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';

import { DiffPeekPopover } from '../DiffPeekPopover';
import { UnifiedDiffView } from '../UnifiedDiffView';

describe('UnifiedDiffView localization', () => {
  it('renders Japanese loading, binary and empty states', async () => {
    const i18n = await createI18nInstance('ja');

    const { rerender } = render(
      <I18nextProvider i18n={i18n}>
        <UnifiedDiffView diff="" loading />
      </I18nextProvider>,
    );
    expect(screen.getByText('差分を読み込み中…')).toBeTruthy();

    rerender(
      <I18nextProvider i18n={i18n}>
        <UnifiedDiffView diff="" isBinary />
      </I18nextProvider>,
    );
    expect(screen.getByText('バイナリファイルのため、テキスト差分はありません。')).toBeTruthy();

    rerender(
      <I18nextProvider i18n={i18n}>
        <UnifiedDiffView diff="" />
      </I18nextProvider>,
    );
    expect(screen.getByText('このファイルに表示できるテキスト変更はありません。')).toBeTruthy();
  });

  it('localizes diff peek state and keyboard hints', async () => {
    const i18n = await createI18nInstance('ja');

    render(
      <I18nextProvider i18n={i18n}>
        <DiffPeekPopover
          anchorRect={new DOMRect(10, 10, 20, 20)}
          filePath="src/example.ts"
          mode="peek"
          diff=""
          isBinary={false}
          loading={false}
          error={null}
          onClose={() => {}}
          onPin={() => {}}
          onOpenInEditor={() => {}}
        />
      </I18nextProvider>,
    );

    expect(screen.getByText('プレビュー中')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'エディターで開く' })).toBeTruthy();
    expect(screen.getByText('閉じる')).toBeTruthy();
    expect(screen.getByText('固定')).toBeTruthy();
  });
});
