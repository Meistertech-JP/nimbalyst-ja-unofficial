// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';

import { NewFileDialog } from '../NewFileDialog';
import { NewFileMenu } from '../NewFileMenu';

describe('NewFileDialog localization', () => {
  afterEach(cleanup);
  it('keeps the extension identity when selecting a translated file-menu item', async () => {
    const i18n = await createI18nInstance('ja');
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<I18nextProvider i18n={i18n}>
      <NewFileMenu x={10} y={10} onSelect={onSelect} onClose={onClose}
        extensionFileTypes={[{ extension: '.html', displayName: 'HTML page', icon: 'html' }]} />
    </I18nextProvider>);
    expect(screen.getByText('HTMLページ').textContent).toBe('HTMLページ');
    await act(async () => { await i18n.changeLanguage('en'); });
    fireEvent.click(screen.getByText('HTML page'));
    expect(onSelect).toHaveBeenCalledWith('ext:.html');
    expect(onClose).toHaveBeenCalledOnce();
  });
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getFolderContents: async () => [{ name: 'src', path: '/workspace/src', type: 'directory' }],
      },
    });
  });

  it('translates built-in type choices on language changes without changing creation identities', async () => {
    const i18n = await createI18nInstance('ja');
    const onCreateFile = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <NewFileDialog isOpen onClose={() => {}} currentDirectory="/workspace"
          workspacePath="/workspace" onCreateFile={onCreateFile}
          extensionFileTypes={[
            { extension: '.html', displayName: 'HTML page', icon: 'html' },
            { extension: '.custom', displayName: 'Custom Editor', icon: 'edit' },
          ]}
        />
      </I18nextProvider>,
    );
    const selector = screen.getByLabelText('種類');
    expect(screen.getByRole('option', { name: 'HTMLページ' }).getAttribute('value')).toBe('ext:.html');
    expect(screen.getByRole('option', { name: 'Custom Editor' }).getAttribute('value')).toBe('ext:.custom');
    fireEvent.change(selector, { target: { value: 'ext:.html' } });
    fireEvent.change(screen.getByPlaceholderText('ドキュメント'), { target: { value: 'sample' } });
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByRole('option', { name: 'HTML page' }).getAttribute('value')).toBe('ext:.html');
    expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe('ext:.html');
    fireEvent.click(screen.getByText('Create'));
    expect(onCreateFile).toHaveBeenCalledWith('sample', 'ext:.html');
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
