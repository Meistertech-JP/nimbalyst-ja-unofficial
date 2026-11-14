import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

function renderPanel(host = makeHost()) {
  return render(
    <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
      <GitLogPanel host={host} />
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
  it.each(['en', 'ja'])('localizes a successful branch switch in %s and preserves the branch name', async language => {
    const target = 'feature/日本語';
    let current = 'main';
    const original = invoke.getMockImplementation()!;
    invoke.mockImplementation((channel: string, ...args: unknown[]) => {
      if (channel === 'git:status') return Promise.resolve({ branch: current, ahead: 0, behind: 0, hasUncommitted: false });
      if (channel === 'git:list-branches-detailed') return Promise.resolve({
        current: { branch: current, detached: false, headSha: 'a'.repeat(40), headReachable: true },
        local: ['main', target].map(name => ({ name, upstream: null, ahead: 0, behind: 0, upstreamGone: false, lastCommitDate: null, isCurrent: name === current, occupiedBy: null })),
        remoteOnly: [], lastFetchedAt: null, managedWorktree: null, worktreeLookupFailed: false,
      });
      if (channel === 'git:switch-preflight') return Promise.resolve({ blocked: null, targetBranch: target, dirtyFiles: [], dirtyCount: 0, runningSessions: [], unreachableHead: null, localExists: false, needsConfirm: false, confirmToken: 'fixture-confirmation' });
      if (channel === 'git:switch-branch') { current = target; return Promise.resolve({ success: true, branch: target }); }
      return original(channel, ...args);
    });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /switch branch/i }));
    const listbox = await screen.findByRole('listbox', { name: 'Branches' });
    await act(async () => { await englishI18n.changeLanguage(language); });
    fireEvent.click(within(listbox).getByText(target));
    await screen.findByText(language === 'ja' ? `${target} に切り替えました` : `Switched to ${target}`);
    expect(invoke.mock.calls.filter(([channel]) => channel === 'git:switch-branch')).toHaveLength(1);
  });
  it.each(['future-strategy', '__proto__'])('uses the default pull strategy for invalid saved value %s', async (saved) => {
    const host = makeHost();
    await host.storage.setGlobal('pullStrategy', saved);
    const view = renderPanel(host);
    await waitFor(() => {
      const label = englishI18n.t('log_panel.pull_title', {
        ns: 'git', strategy: englishI18n.t('log_panel.pull_strategies.rebase', { ns: 'git' }),
      });
      expect(view.getByTitle(label)).toBeTruthy();
    });
  });
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

// #1959: the Log follows the checked-out branch unless the "Showing:" filter
// pins another one; a pinned filter survives a checkout.
describe('GitLogPanel log branch filter', () => {
  it('follows checkouts until the user pins a branch', async () => {
    let branch = 'main';
    invoke.mockReset();
    invoke.mockImplementation((channel: string) => {
      switch (channel) {
        case 'git:status':
          return Promise.resolve({ branch, ahead: 0, behind: 0, hasUncommitted: false });
        case 'git:branches':
          return Promise.resolve({ branches: ['main', 'feature/x', 'release'], current: branch });
        case 'git:log':
          return Promise.resolve([]);
        case 'git:list-workspace-repos':
          return Promise.resolve({ success: true, repos: [WORKSPACE] });
        default:
          return Promise.resolve(null);
      }
    });
    const host = makeHost();
    const statusHandlers: Array<(data: unknown) => void> = [];
    (host.onWorkspaceEvent as ReturnType<typeof vi.fn>).mockImplementation((event: string, handler: (data: unknown) => void) => {
      if (event === 'git:status-changed') statusHandlers.push(handler);
      return () => {};
    });
    const lastLogBranch = () => {
      const logCalls = invoke.mock.calls.filter(([channel]) => channel === 'git:log');
      return (logCalls[logCalls.length - 1]?.[3] as { branch?: string } | undefined)?.branch;
    };
    const checkout = (next: string) => {
      branch = next;
      statusHandlers[statusHandlers.length - 1]({ workspacePath: WORKSPACE, status: { branch: next, ahead: 0, behind: 0, hasUncommitted: false } });
    };

    render(<GitLogPanel host={host} />);
    fireEvent.click(await screen.findByRole('button', { name: /^log$/i }));
    await waitFor(() => expect(lastLogBranch()).toBe('main'));

    checkout('feature/x');
    await waitFor(() => expect(lastLogBranch()).toBe('feature/x'));

    fireEvent.click(screen.getByRole('button', { name: /^Log branch filter/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'release' }));
    await waitFor(() => expect(lastLogBranch()).toBe('release'));

    const logCallsBefore = invoke.mock.calls.filter(([c]) => c === 'git:log').length;
    checkout('main');
    await waitFor(() => expect(invoke.mock.calls.filter(([c]) => c === 'git:log').length).toBeGreaterThan(logCallsBefore));
    await new Promise(resolve => setTimeout(resolve, 50));
    const afterCheckout = invoke.mock.calls.filter(([c]) => c === 'git:log').slice(logCallsBefore);
    expect(afterCheckout.map(call => (call[3] as { branch?: string }).branch)).toEqual(afterCheckout.map(() => 'release'));
  });
});

describe('GitLogPanel stale log responses', () => {
  // A slow `git:log` for the branch the Log used to follow must not repaint
  // over the newer branch's commits when it finally lands.
  it('keeps the newest branch filter\'s commits when an older request resolves late', async () => {
    let branch = 'main';
    let resolveMainLog: (commits: unknown[]) => void = () => {};
    invoke.mockReset();
    invoke.mockImplementation((channel: string, _repo: string, _limit: number, opts?: { branch?: string }) => {
      switch (channel) {
        case 'git:status':
          return Promise.resolve({ branch, ahead: 0, behind: 0, hasUncommitted: false });
        case 'git:branches':
          return Promise.resolve({ branches: ['main', 'feature/x'], current: branch });
        case 'git:log':
          if (opts?.branch === 'main') return new Promise(r => { resolveMainLog = r; });
          if (opts?.branch === 'feature/x') {
            return Promise.resolve([{ hash: 'f'.repeat(40), message: 'Feature commit', author: 'Dev', date: '2026-10-01T12:00:00Z' }]);
          }
          return Promise.resolve([]);
        case 'git:list-workspace-repos':
          return Promise.resolve({ success: true, repos: [WORKSPACE] });
        default:
          return Promise.resolve(null);
      }
    });
    const host = makeHost();
    const statusHandlers: Array<(data: unknown) => void> = [];
    (host.onWorkspaceEvent as ReturnType<typeof vi.fn>).mockImplementation((event: string, handler: (data: unknown) => void) => {
      if (event === 'git:status-changed') statusHandlers.push(handler);
      return () => {};
    });

    render(<GitLogPanel host={host} />);
    fireEvent.click(await screen.findByRole('button', { name: /^log$/i }));
    await waitFor(() => expect(invoke.mock.calls.some(([c, , , o]) => c === 'git:log' && (o as { branch?: string })?.branch === 'main')).toBe(true));

    branch = 'feature/x';
    statusHandlers[statusHandlers.length - 1]({ workspacePath: WORKSPACE, status: { branch: 'feature/x', ahead: 0, behind: 0, hasUncommitted: false } });
    await screen.findByText('Feature commit');

    resolveMainLog([{ hash: 'm'.repeat(40), message: 'Main commit', author: 'Dev', date: '2026-10-01T12:00:00Z' }]);
    await new Promise(r => setTimeout(r, 20));
    expect(screen.queryByText('Main commit')).toBeNull();
    screen.getByText('Feature commit');
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
