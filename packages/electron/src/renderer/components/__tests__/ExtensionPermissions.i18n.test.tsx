// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtensionPermissionPrompt } from '../ExtensionPermissions/ExtensionPermissionPrompt';
import { ExtensionBackendModulesSection } from '../ExtensionPermissions/ExtensionBackendModulesSection';
import { extensionPermissionPromptQueueAtom } from '../../store/atoms/extensionPermissions';

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: () => null,
}));

const descriptors = [{
  id: 'workspace-files',
  label: 'Workspace files',
  description: 'Read and write files inside the current workspace.',
  risk: 'low',
}];

describe('extension permission localization', () => {
  const permissions = {
    listDescriptors: vi.fn(async () => descriptors),
    listEffective: vi.fn(async () => []),
    listHostState: vi.fn(async () => []),
    grantModule: vi.fn(async () => undefined),
    resolvePrompt: vi.fn(),
  };
  let originalAPI: typeof window.electronAPI;

  beforeEach(async () => {
    vi.clearAllMocks();
    originalAPI = window.electronAPI;
    window.electronAPI = { extensions: { permissions } } as unknown as typeof window.electronAPI;
    await i18next.changeLanguage('en');
  });

  afterEach(async () => {
    cleanup();
    window.electronAPI = originalAPI;
    await i18next.changeLanguage('en');
  });

  it('updates the warning and catalog labels without changing the grant payload', async () => {
    const store = createStore();
    store.set(extensionPermissionPromptQueueAtom, [{
      id: 'prompt-1', extensionId: 'com.example.extension', moduleId: 'backend',
      extensionName: 'Example Extension', purpose: 'Extension-authored purpose',
      workspacePath: '/workspace', declaredPermissions: ['workspace-files'],
      reason: { kind: 'first-use' },
    } as PermissionPromptRequestRow]);
    render(<Provider store={store}><ExtensionPermissionPrompt /></Provider>);

    await screen.findByText('Workspace files');
    expect(screen.getByText('Enable Example Extension?')).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('Example Extensionを有効にしますか？')).toBeTruthy();
    expect(screen.getByText(i18next.t('extensions:permission_catalog.workspace-files.label'))).toBeTruthy();
    expect(screen.getByText('この拡張機能はコンピューター上でネイティブコードを実行します。')).toBeTruthy();
    expect(screen.getByText('Extension-authored purpose')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '有効にする' }));
    await waitFor(() => expect(permissions.resolvePrompt).toHaveBeenCalledWith('prompt-1', { decision: 'enable-global' }));
    expect(permissions.grantModule).toHaveBeenCalledWith({
      extensionId: 'com.example.extension', moduleId: 'backend',
      permissions: ['workspace-files'], scope: 'global', workspacePath: undefined,
    });
  });

  it('keeps backend identifiers intact while translating unavailable workspace state', async () => {
    render(<Provider><ExtensionBackendModulesSection
      extensionId="com.example.extension"
      modules={[{ id: 'backend', entry: 'index.js', runtime: 'utility-process',
        permissions: ['workspace-files'],
        enablement: { default: 'disabled', promptOn: 'firstUse', purpose: 'Extension-authored purpose' },
      }]}
    /></Provider>);
    await screen.findByText('Workspace files');
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByTitle('ワークスペースが開かれていません')).toBeTruthy();
    expect(screen.getByText('(utility-process)')).toBeTruthy();
    expect(screen.getByText(i18next.t('extensions:permission_catalog.workspace-files.description'), { exact: false })).toBeTruthy();
  });
});
