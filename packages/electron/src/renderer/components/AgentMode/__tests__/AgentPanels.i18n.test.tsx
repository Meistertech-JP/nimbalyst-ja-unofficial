// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { SuperFilesPanel } from '../SuperFilesPanel';
import { TrackerPanel } from '../TrackerPanel';
import { TaskListPanel } from '../TaskListPanel';
import { TodoPanel } from '../TodoPanel';
import { ResizablePanel } from '../../AgenticCoding/ResizablePanel';
import { sessionRegistryAtom, sessionStoreAtom } from '../../../store/atoms/sessions';
import { superProgressAtom } from '../../../store/atoms/superLoop';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));
vi.mock('../../../hooks/useResizeDragShield', () => ({
  useResizeDragShield: () => vi.fn(),
}));

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});
afterEach(() => {
  cleanup();
  invoke.mockReset();
  vi.unstubAllGlobals();
});

function renderJapanese(tree: React.ReactNode) {
  return render(
    <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
      {tree}
    </UiLanguageProvider>,
  );
}

describe('Agent panels localization', () => {
  it('localizes the tracker panel heading', () => {
    const store = createStore();
    store.set(sessionRegistryAtom, new Map([
      ['workstream-1', { id: 'workstream-1', linkedTrackerItemIds: ['tracker-1'] } as never],
    ]));

    renderJapanese(
      <Provider store={store}>
        <TrackerPanel workstreamId="workstream-1" />
      </Provider>,
    );

    screen.getByText('トラッカー');
  });

  it('localizes Super Loop labels while keeping technical filenames unchanged', async () => {
    vi.stubGlobal('window', Object.assign(window, { electronAPI: { invoke } }));
    invoke.mockImplementation(async (channel: string) => channel === 'super-loop:get-by-worktree'
      ? { success: true, loop: { id: 'loop-1', worktreeId: 'worktree-1', taskDescription: 'Task', status: 'running', currentIteration: 2, maxIterations: 5, createdAt: 0, updatedAt: 0 } }
      : { success: true, progress: { phase: 'planning', currentIteration: 2, learnings: [{ iteration: 1, summary: 'lesson', filesChanged: [] }], blockers: [] } });
    const store = createStore();
    store.set(superProgressAtom('loop-1'), {
      currentIteration: 2,
      phase: 'planning',
      status: 'running',
      completionSignal: false,
      learnings: [{ iteration: 1, summary: 'lesson', filesChanged: [] }],
      blockers: [],
    });

    renderJapanese(
      <Provider store={store}>
        <SuperFilesPanel worktreeId="worktree-1" worktreePath="/worktree" onFileClick={vi.fn()} />
      </Provider>,
    );

    expect(await screen.findByText('ループの進行状況')).toBeTruthy();
    screen.getByText('計画中');
    screen.getByText('最近の学び');
    screen.getByText('JSONを表示');
    screen.getByText('計画');
    screen.getByTitle('.superloop/task.md');
  });

  it('localizes task list heading and blocked-by label without changing task identifiers', () => {
    const store = createStore();
    store.set(sessionStoreAtom('session-1'), {
      id: 'session-1',
      title: 'Session',
      createdAt: 0,
      metadata: { currentTaskList: [
        { id: 'one', subject: 'First task', status: 'pending', blocks: ['two'] },
        { id: 'two', subject: 'Second task', status: 'pending', blockedBy: ['one'] },
      ] },
    } as never);

    renderJapanese(
      <Provider store={store}>
        <TaskListPanel sessionId="session-1" />
      </Provider>,
    );

    screen.getByText('タスクリスト');
    screen.getByText('#oneの完了待ち');
    expect(screen.getByText('Second task').closest('[data-task-id]')?.getAttribute('data-task-id')).toBe('two');
  });

  it('localizes the agent todo panel heading', () => {
    const store = createStore();
    store.set(sessionStoreAtom('session-2'), {
      id: 'session-2',
      title: 'Session',
      createdAt: 0,
      metadata: { currentTodos: [
        { status: 'pending', content: 'Review changes', activeForm: 'Reviewing changes' },
      ] },
    } as never);

    renderJapanese(
      <Provider store={store}>
        <TodoPanel sessionId="session-2" />
      </Provider>,
    );

    screen.getByText('タスク');
  });

  it('localizes session-history resize accessibility text', () => {
    renderJapanese(<ResizablePanel leftPanel={<span>History</span>} rightPanel={<span>Content</span>} leftWidth={260} onWidthChange={vi.fn()} />);

    screen.getByRole('separator', { name: 'セッション履歴パネルのサイズを変更' });
  });
});
