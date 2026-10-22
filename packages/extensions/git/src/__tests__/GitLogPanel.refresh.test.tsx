import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

// GitLogPanel and ChangesTab both read `window.electronAPI` at module scope, so
// the stub has to exist before the imports are evaluated.
const invoke = vi.hoisted(() => {
  const fn = vi.fn();
  (window as unknown as { electronAPI: unknown }).electronAPI = { invoke: fn };
  return fn;
});

import { GitLogPanel } from '../components/GitLogPanel';

const WORKSPACE = '/repo';
let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
});

function renderPanel() {
  return render(
    <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
      <GitLogPanel host={makeHost()} />
    </UiLanguageProvider>,
  );
}

function makeHost() {
  const storage = new Map<string, unknown>();
  return {
    workspacePath: WORKSPACE,
    close: vi.fn(),
    onWorkspaceEvent: vi.fn(() => () => {}),
    storage: {
      get: <T,>(key: string) => storage.get(`w:${key}`) as T | undefined,
      set: (key: string, value: unknown) => { storage.set(`w:${key}`, value); },
      getGlobal: <T,>(key: string) => storage.get(`g:${key}`) as T | undefined,
      setGlobal: (key: string, value: unknown) => { storage.set(`g:${key}`, value); },
    },
  } as unknown as Parameters<typeof GitLogPanel>[0]['host'];
}

function workingChangesCalls() {
  return invoke.mock.calls.filter(([channel]) => channel === 'git:working-changes').length;
}

describe('GitLogPanel refresh', () => {
  beforeEach(async () => {
    await englishI18n.changeLanguage('en');
    invoke.mockReset();
    invoke.mockImplementation((channel: string) => {
      switch (channel) {
        case 'git:working-changes':
          return Promise.resolve({
            staged: [],
            unstaged: [{ path: 'src/picked.ts', status: 'M' }],
            untracked: [],
            conflicted: [],
          });
        case 'git:status':
          return Promise.resolve({ branch: 'main', ahead: 0, behind: 0, hasUncommitted: true });
        case 'git:branches':
          return Promise.resolve({ branches: ['main'], current: 'main' });
        case 'git:log':
          return Promise.resolve([]);
        case 'git:list-workspace-repos':
          return Promise.resolve({ success: true, repos: [WORKSPACE] });
        default:
          return Promise.resolve(null);
      }
    });
  });

  it('translates a persisted fast-forward strategy without changing the pull operation', async () => {
    const i18n = await createI18nInstance('en');
    const host = makeHost();
    await host.storage.setGlobal('pullStrategy', 'ff-only');
    render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <GitLogPanel host={host} />
      </UiLanguageProvider>,
    );
    await screen.findByTitle('Pull (Fast-forward only)');
    await act(() => i18n.changeLanguage('ja'));
    const pull = await screen.findByTitle('プル（ファストフォワードのみ）');
    fireEvent.click(pull);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('git:pull', WORKSPACE, { ffOnly: true }));
    expect(host.storage.getGlobal('pullStrategy')).toBe('ff-only');
  });

  it('updates the log UI when the language changes from English to Japanese', async () => {
    const i18n = await createI18nInstance('en');
    render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <GitLogPanel host={makeHost()} />
      </UiLanguageProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Log' })).not.toBeNull();
    expect(screen.getByPlaceholderText('Search commits by message, author, or hash')).not.toBeNull();
    await i18n.changeLanguage('ja');

    expect(await screen.findByRole('button', { name: 'ログ' })).not.toBeNull();
    expect(screen.getByPlaceholderText('コミットメッセージ、作成者、ハッシュで検索')).not.toBeNull();
    expect(screen.getByText('コミットが見つかりません')).not.toBeNull();
  });

  // The Refresh button lives in the shared header, so it used to reload only the
  // commit log and branch pill -- pressing it on the Changes tab left the file
  // list untouched, and a path that had just been gitignored kept showing.
  it('reloads the working-tree file list when the Changes tab is open', async () => {
    const { container } = renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /changes/i }));
    await screen.findByText('picked.ts');

    const beforeRefresh = workingChangesCalls();
    expect(beforeRefresh).toBeGreaterThan(0);

    const refreshButton = container.querySelector('.git-log-action-btn--refresh');
    if (!refreshButton) throw new Error('Refresh button not rendered');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(workingChangesCalls()).toBeGreaterThan(beforeRefresh);
    });
  });

  // Multi-root: every git call in the panel has to target the picked repo, not
  // the workspace. Getting this wrong shows the primary repo's branch and log
  // under the attached repo's name.
  it('hides the repo picker and targets the workspace when there is one repo', async () => {
    renderPanel();

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('git:branches', WORKSPACE));
    expect(screen.queryByRole('button', { name: /^Repository:/ })).toBeNull();
  });

  it('runs git against the selected repo once the workspace spans two', async () => {
    const ATTACHED = '/other/collab';
    invoke.mockImplementation((channel: string) => {
      switch (channel) {
        case 'git:list-workspace-repos':
          return Promise.resolve({ success: true, repos: [WORKSPACE, ATTACHED] });
        case 'git:status':
          return Promise.resolve({ branch: 'main', ahead: 0, behind: 0, hasUncommitted: false });
        case 'git:branches':
          return Promise.resolve({ branches: ['main'], current: 'main' });
        case 'git:log':
          return Promise.resolve([]);
        default:
          return Promise.resolve(null);
      }
    });

    renderPanel();

    const picker = await screen.findByRole('button', { name: `Repository: repo` });
    fireEvent.click(picker);
    fireEvent.click(await screen.findByTitle(ATTACHED));

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('git:branches', ATTACHED));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('git:log', ATTACHED, 100, expect.anything()));
  });

  it('keeps the active tab when switching repositories', async () => {
    const ATTACHED = '/other/tab-state';
    invoke.mockImplementation((channel: string) => {
      switch (channel) {
        case 'git:list-workspace-repos':
          return Promise.resolve({ success: true, repos: [WORKSPACE, ATTACHED] });
        case 'git:working-changes':
          return Promise.resolve({ staged: [], unstaged: [], untracked: [], conflicted: [] });
        case 'git:status':
          return Promise.resolve({ branch: 'main', ahead: 0, behind: 0, hasUncommitted: false });
        case 'git:branches':
          return Promise.resolve({ branches: ['main'], current: 'main' });
        case 'git:log':
          return Promise.resolve([]);
        default:
          return Promise.resolve(null);
      }
    });

    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: /changes/i }));
    expect(screen.getByRole('button', { name: /changes/i }).classList.contains('git-tab-btn--active')).toBe(true);

    fireEvent.click(await screen.findByRole('button', { name: `Repository: repo` }));
    fireEvent.click(await screen.findByTitle(ATTACHED));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /changes/i }).classList.contains('git-tab-btn--active')).toBe(true);
    });
  });
});

describe('GitLogPanel commit hover card', () => {
  const COMMIT = { hash: 'abc1234def', message: 'Fix the thing', author: 'Dev', date: '2026-10-01T12:00:00Z' };
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  beforeEach(async () => {
    await englishI18n.changeLanguage('en');
    invoke.mockReset();
    invoke.mockImplementation((channel: string) => {
      switch (channel) {
        case 'git:status':
          return Promise.resolve({ branch: 'main', ahead: 0, behind: 0, hasUncommitted: false });
        case 'git:branches':
          return Promise.resolve({ branches: ['main'], current: 'main' });
        case 'git:log':
          return Promise.resolve([COMMIT]);
        case 'git:list-workspace-repos':
          return Promise.resolve({ success: true, repos: [WORKSPACE] });
        case 'git:commit-detail':
          return Promise.resolve({
            body: 'Fix the thing',
            files: [{ status: 'M', path: 'src/thing.ts', added: 1, deleted: 1 }],
            summary: { filesChanged: 1, insertions: 1, deletions: 1 },
          });
        default:
          return Promise.resolve(null);
      }
    });
  });

  // When the detail loads, the card grows from its loading height and, for a
  // frame, overlaps the row under the cursor; the cursor then lands back on the
  // row. Treating that as a new hover reset the card to Loading and refetched,
  // which re-triggered the overlap: the card blinked as long as the mouse sat
  // still.
  it('does not reload the card when the cursor returns to the row it belongs to', async () => {
    renderPanel();
    // Panel state is per workspace and module-scoped, so an earlier test can
    // leave the Changes tab active.
    fireEvent.click(await screen.findByRole('button', { name: /^log$/i }));
    const row = (await screen.findByText('Fix the thing')).closest('tr');
    if (!row) throw new Error('Commit row not rendered');

    fireEvent.mouseEnter(row);
    await wait(400);
    const card = await screen.findByText('thing.ts').then(el => el.closest('.git-hover-card'));
    if (!card) throw new Error('Hover card not rendered');

    fireEvent.mouseLeave(row);
    fireEvent.mouseEnter(card);
    fireEvent.mouseLeave(card);
    fireEvent.mouseEnter(row);
    await wait(400);

    expect(invoke.mock.calls.filter(([channel]) => channel === 'git:commit-detail')).toHaveLength(1);
    expect(screen.queryByText('Loading...')).toBeNull();
    expect(screen.getByText('thing.ts')).toBeDefined();
  });
});
