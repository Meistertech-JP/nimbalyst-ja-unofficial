// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { NewFileDialog } from '../NewFileDialog';
import { contributionToExtensionFileType } from '../NewFileMenu';

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

describe('NewFileDialog', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('en');
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getFolderContents: vi.fn().mockResolvedValue([]),
      },
    });
  });

  afterEach(async () => {
    cleanup();
    await i18next.changeLanguage('en');
  });

  it('renders an explicit dropdown affordance for the file type selector', () => {
    render(
      <NewFileDialog
        isOpen={true}
        onClose={() => {}}
        currentDirectory="/workspace"
        workspacePath="/workspace"
        onCreateFile={() => {}}
      />,
    );

    expect(screen.getByLabelText('Type').tagName).toBe('SELECT');
    expect(screen.getByTestId('new-file-type-chevron')).toBeTruthy();
    expect(document.querySelector('[data-icon="expand_more"]')).toBeTruthy();
  });

  it('updates labels and a visible validation error when the language changes', async () => {
    render(
      <NewFileDialog
        isOpen={true}
        onClose={() => {}}
        currentDirectory="/workspace"
        workspacePath="/workspace"
        onCreateFile={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByText('Please enter a file name')).toBeTruthy();

    await act(async () => {
      await i18next.changeLanguage('ja');
    });

    expect(screen.getByRole('heading', { name: '新しいファイル' })).toBeTruthy();
    expect(screen.getByLabelText('種類').tagName).toBe('SELECT');
    expect(screen.getByRole('button', { name: '作成' })).toBeTruthy();
    expect(screen.getByText('ファイル名を入力してください')).toBeTruthy();
  });

  it('localizes bundled extension file types while preserving third-party names', async () => {
    const extensionFileTypes = [
      {
        extensionId: 'com.nimbalyst.browser',
        extension: 'browser-tab',
        displayName: 'Browser Tab',
        icon: 'web',
        action: 'openVirtualTab' as const,
        virtualScheme: 'virtual://com.nimbalyst.browser/',
      },
      {
        extensionId: 'com.nimbalyst.calc-sheets',
        extension: '.calc.md',
        displayName: 'Calc Sheet',
        icon: 'table_view',
      },
      {
        extensionId: 'com.nimbalyst.csv-spreadsheet',
        extension: '.csv',
        displayName: 'CSV Spreadsheet',
        icon: 'grid_on',
      },
      {
        extensionId: 'com.nimbalyst.datamodellm',
        extension: '.prisma',
        displayName: 'Data Model',
        icon: 'schema',
      },
      {
        extensionId: 'com.nimbalyst.excalidraw',
        extension: '.excalidraw',
        displayName: 'Excalidraw Diagram',
        icon: 'draw',
      },
      {
        extensionId: 'com.nimbalyst.image-generation',
        extension: '.imgproj',
        displayName: 'Image Generation Project',
        icon: 'image',
      },
      {
        extensionId: 'com.nimbalyst.ios-dev',
        extension: '.swift',
        displayName: 'Swift File',
        icon: 'code',
      },
      {
        extensionId: 'com.nimbalyst.mockuplm',
        extension: '.mockup.html',
        displayName: 'Mockup',
        icon: 'palette',
      },
      {
        extensionId: 'com.nimbalyst.mockuplm',
        extension: '.mockupproject',
        displayName: 'Mockup Project',
        icon: 'dashboard',
      },
      {
        extensionId: 'com.example.browser',
        extension: '.example',
        displayName: 'Browser Tab',
        icon: 'extension',
      },
    ];

    render(
      <NewFileDialog
        isOpen={true}
        onClose={() => {}}
        currentDirectory="/workspace"
        workspacePath="/workspace"
        onCreateFile={() => {}}
        extensionFileTypes={extensionFileTypes}
      />,
    );

    expect(screen.getByRole('option', { name: 'Browser Tab' })).toBeTruthy();
    expect(
      document.querySelector<HTMLOptionElement>('option[value="ext:browser-tab"]'),
    ).toBeNull();

    await act(async () => {
      await i18next.changeLanguage('ja');
    });

    expect(screen.queryByRole('option', { name: 'ブラウザータブ' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Calcシート' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'CSVスプレッドシート' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'データモデル' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Excalidraw図' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '画像生成プロジェクト' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Swiftファイル' })).toBeTruthy();
    expect(screen.getAllByRole('option', { name: 'モックアップ' })).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'モックアッププロジェクト' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Browser Tab' })).toBeTruthy();
  });

  it('keeps the source extension id when adapting a menu contribution', () => {
    expect(
      contributionToExtensionFileType('com.nimbalyst.browser', {
        extension: 'browser-tab',
        displayName: 'Browser Tab',
        icon: 'web',
        action: 'openVirtualTab',
        virtualScheme: 'virtual://com.nimbalyst.browser/',
      }),
    ).toMatchObject({
      extensionId: 'com.nimbalyst.browser',
      extension: 'browser-tab',
      displayName: 'Browser Tab',
      action: 'openVirtualTab',
    });
  });
});
