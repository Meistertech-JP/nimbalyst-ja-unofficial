// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { TrackerDataModel } from '@nimbalyst/tracker-schema';
import { ImportFromSourceDialog } from '../ImportFromSourceDialog';
import { useTrackerTypeShareMenu } from '../TrackerTypeShareMenu';

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: () => null,
}));

vi.mock('../teamTypeSharing', () => ({
  canShareTrackerTypeWithTeam: () => true,
  shareTrackerTypeWithTeam: vi.fn(),
}));

function ShareMenuHarness() {
  const { onContextMenuFor, element } = useTrackerTypeShareMenu('/workspace', true);
  return (
    <>
      <button onContextMenu={onContextMenuFor({} as TrackerDataModel)}>Open menu</button>
      {element}
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ImportFromSourceDialog localization', () => {
  it('renders the empty repository state and controls in Japanese', async () => {
    const invoke = vi.fn(async () => []);
    vi.stubGlobal('electronAPI', { invoke });
    const i18n = await createI18nInstance('ja');

    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <ImportFromSourceDialog
          providerId="github"
          providerLabel="GitHub"
          workspacePath="/workspace"
          onClose={() => undefined}
        />
      </UiLanguageProvider>,
    );

    expect((await screen.findByText('GitHubからインポート')).textContent).toBe('GitHubからインポート');
    expect(screen.getByTitle('閉じる')).toBeDefined();
    expect(screen.getByPlaceholderText('検索…')).toBeDefined();
    expect(screen.getByText(/このワークスペースにGitHubのリポジトリが見つかりません。/).textContent)
      .toContain('このワークスペースにGitHubのリポジトリが見つかりません。');
    expect(screen.getByText(/GitリモートがGitHubを指すプロジェクト/).textContent)
      .toContain('gh auth login');
    expect(screen.getByRole('button', { name: 'キャンセル' }).textContent).toBe('キャンセル');
    expect(screen.getByRole('button', { name: '0件をインポート' }).textContent).toBe('0件をインポート');
    expect(invoke).toHaveBeenCalledWith('tracker:importer:listBindings', {
      workspacePath: '/workspace',
      providerId: 'github',
    });
  });

  it('renders the tracker type sharing action in Japanese', async () => {
    const i18n = await createI18nInstance('ja');

    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <ShareMenuHarness />
      </UiLanguageProvider>,
    );

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('button', { name: 'チームと共有…' })).toBeDefined();
  });
});
