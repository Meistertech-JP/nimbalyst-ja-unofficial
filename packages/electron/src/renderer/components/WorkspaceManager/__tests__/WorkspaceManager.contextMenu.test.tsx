// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

const recentWorkspaces = [
  { path: '/projects/alpha', name: 'alpha', lastOpened: 1700000000000, exists: true, markdownCount: 2 },
];

const projectMigration = {
  canMove: vi.fn().mockResolvedValue({ canMove: true }),
  move: vi.fn(),
  rename: vi.fn(),
};

(window as unknown as { electronAPI: unknown }).electronAPI = {
  getResolvedThemeSync: () => 'dark',
  onThemeChange: vi.fn(),
  workspaceManager: {
    getRecentWorkspaces: vi.fn().mockResolvedValue(recentWorkspaces),
    getWorkspaceStats: vi.fn().mockResolvedValue({ fileCount: 1, markdownCount: 1, totalSize: 10, recentFiles: [] }),
    openWorkspace: vi.fn(),
  },
  tutorial: {
    getStatus: vi.fn().mockResolvedValue({ success: true, exists: false }),
    start: vi.fn(),
  },
  projectMigration,
};

const { WorkspaceManager } = await import('../WorkspaceManager');

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

function renderEnglish(tree: React.ReactElement) {
  return render(tree, {
    wrapper: ({ children }) => (
      <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
        {children}
      </UiLanguageProvider>
    ),
  });
}

function renderJapanese(tree: React.ReactElement) {
  return render(tree, {
    wrapper: ({ children }) => (
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        {children}
      </UiLanguageProvider>
    ),
  });
}

afterEach(() => cleanup());

// Locate the menu by its contents rather than by class, so the assertions below
// exercise positioning rather than the marker class name.
async function openContextMenuAt(clientX: number, clientY: number) {
  const { container } = renderEnglish(<WorkspaceManager />);
  const row = await screen.findByText('alpha');
  fireEvent.contextMenu(row, { clientX, clientY });
  const openProject = await screen.findByText('Open Project');
  return { menu: openProject.closest('div[style]') as HTMLElement, container };
}

describe('WorkspaceManager context menu positioning', () => {
  it('renders the context menu in a portal so it escapes overflow containers', async () => {
    const { menu, container } = await openContextMenuAt(120, 200);
    // FloatingPortal renders to document.body rather than inline in the picker.
    expect(container.contains(menu)).toBe(false);
  });

  it('positions via floating-ui instead of hardcoding the cursor coordinates', async () => {
    // A cursor near the bottom-right previously rendered the menu at
    // left: 5000px / top: 4000px and pushed it off screen.
    const { menu } = await openContextMenuAt(5000, 4000);
    expect(menu.style.left).not.toBe('5000px');
    expect(menu.style.top).not.toBe('4000px');
    expect(menu.style.position).toBe('absolute');
  });
});

describe('WorkspaceManager project migration errors', () => {
  it('translates structured tutorial errors and follows language changes', async () => {
    await japaneseI18n.changeLanguage('ja');
    const start = window.electronAPI.tutorial.start as ReturnType<typeof vi.fn>;
    start.mockResolvedValueOnce({ success: false, error: 'fixture diagnostic', templateFailure: { code: 'directory_missing', path: '/fixture/tutorial' } });
    renderJapanese(<WorkspaceManager />);
    const tutorialButtons = await screen.findAllByRole('button', { name: /チュートリアル/ });
    fireEvent.click(tutorialButtons[0]);
    expect(await screen.findByText('チュートリアルのテンプレートフォルダーが見つかりません：/fixture/tutorial')).toBeDefined();
    await act(async () => { await japaneseI18n.changeLanguage('en'); });
    expect(await screen.findByText('The tutorial template folder was not found: /fixture/tutorial')).toBeDefined();
  });
  it('localizes a fixed project-migration reason from the main process', async () => {
    await japaneseI18n.changeLanguage('ja');
    projectMigration.canMove.mockResolvedValueOnce({
      canMove: false,
      reason: { code: 'project_open' },
    });

    renderJapanese(<WorkspaceManager />);
    const row = await screen.findByText('alpha');
    fireEvent.contextMenu(row, { clientX: 120, clientY: 200 });
    fireEvent.click(await screen.findByText('名前を変更…'));

    expect(await screen.findByText('このプロジェクトは現在開かれています。移動または名前を変更する前に閉じてください。')).toBeDefined();

    await act(async () => {
      await japaneseI18n.changeLanguage('en');
    });

    expect(await screen.findByText('This project is currently open. Close it before moving or renaming it.')).toBeDefined();
  });

  it('preserves OS details while retranslating a rename failure', async () => {
    await japaneseI18n.changeLanguage('ja');
    projectMigration.rename.mockResolvedValueOnce({
      success: false,
      error: { code: 'rename_failed', detail: 'EACCES: test destination' },
    });

    renderJapanese(<WorkspaceManager />);
    fireEvent.contextMenu(await screen.findByText('alpha'), { clientX: 120, clientY: 200 });
    fireEvent.click(await screen.findByText('名前を変更…'));
    fireEvent.change(await screen.findByDisplayValue('alpha'), { target: { value: 'beta' } });
    fireEvent.click(screen.getByRole('button', { name: '名前を変更' }));

    expect(await screen.findByText('プロジェクト名を変更できませんでした：EACCES: test destination')).toBeDefined();
    await act(async () => { await japaneseI18n.changeLanguage('en'); });
    expect(await screen.findByText('Could not rename the project: EACCES: test destination')).toBeDefined();
  });
});
