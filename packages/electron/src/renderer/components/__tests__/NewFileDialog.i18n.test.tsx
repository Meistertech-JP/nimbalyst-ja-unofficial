// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';

import { NewFileDialog } from '../NewFileDialog';

describe('NewFileDialog localization', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getFolderContents: async () => [{ name: 'src', path: '/workspace/src', type: 'directory' }],
      },
    });
  });

  it('shows Japanese file creation controls and validation', async () => {
    const i18n = await createI18nInstance('ja');
    render(
      <I18nextProvider i18n={i18n}>
        <NewFileDialog
          isOpen
          onClose={() => {}}
          currentDirectory="/workspace"
          workspacePath="/workspace"
          onCreateFile={() => {}}
        />
      </I18nextProvider>,
    );

    expect(screen.getByText('新しいファイル')).toBeTruthy();
    expect(screen.getByLabelText('種類').tagName).toBe('SELECT');
    expect(screen.getByText('場所')).toBeTruthy();
    expect(screen.getByText('名前')).toBeTruthy();
    expect(screen.getByPlaceholderText('ドキュメント')).toBeTruthy();
    expect(screen.getByText('キャンセル')).toBeTruthy();
    expect(screen.getByText('作成')).toBeTruthy();

    fireEvent.click(document.querySelector('.new-file-location-button')!);
    expect(await screen.findByText('workspace（ルート）')).toBeTruthy();

    fireEvent.click(screen.getByText('作成'));
    expect(screen.getByText('ファイル名を入力してください')).toBeTruthy();
  });
});
