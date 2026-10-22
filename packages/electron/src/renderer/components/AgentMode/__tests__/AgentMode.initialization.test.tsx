import React, { useEffect } from 'react';
import { act, cleanup, render as testingLibraryRender, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { store } from '@nimbalyst/runtime/store';
const { addSessionMock } = vi.hoisted(() => ({ addSessionMock: vi.fn() }));
import { addSessionFullAtom, selectedWorkstreamAtom } from '../../../store';
import { blitzAnalysisCreatedAtom } from '../../../store/atoms/blitz';
import { workstreamStateAtom } from '../../../store/atoms/workstreamState';
import { AgentMode } from '../AgentMode';
import { activeWorkspacePathAtom } from '../../../store/atoms/openProjects';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

function render(tree: React.ReactElement, language: 'en' | 'ja' = 'en') {
  return testingLibraryRender(
    tree,
    { wrapper: ({ children }) => (
      <UiLanguageProvider i18n={language === 'ja' ? japaneseI18n : englishI18n} preference={language} systemLocale="en-US">
        <Provider store={store}>{children}</Provider>
      </UiLanguageProvider>
    ) },
  );
}

vi.mock('../../../store', async () => {
  const { atom } = await import('jotai');
  const { store } = await import('@nimbalyst/runtime/store');
  const selected = atom({ id: 'restored-session', type: 'session' });
  const role = atom('standard');
  const { activeWorkspacePathAtom } = await import('../../../store/atoms/openProjects');
  return {
    store,
    selectedWorkstreamAtom: () => selected,
    sessionHistoryWidthAtom: atom(260), sessionHistoryCollapsedAtom: atom(false),
    sessionAgentRoleAtom: () => role, isRestoringNavigationAtom: atom(false),
    activeSessionIdAtom: atom(null), viewModeAtom: atom('list'),
    initSessionList: vi.fn(), initSessionEditors: vi.fn(),
    initAgentModeLayout: (path: string, options?: { setActive?: boolean }) => {
      if (options?.setActive !== false) store.set(activeWorkspacePathAtom, path);
    },
    addSessionFullAtom: atom(null, (_get, _set, session) => addSessionMock(session)),
    registerWorkstreamSelectedHook: () => () => {},
    ...Object.fromEntries(['setSelectedWorkstreamAtom', 'setSessionHistoryWidthAtom',
      'refreshSessionListAtom', 'pushNavigationEntryAtom',
      'setViewModeAtom', 'fetchSessionSharesAtom'].map(name => [name, atom(null, () => {})])),
  };
});
vi.mock('../../../store/atoms/agentFileViewer', async () => { const { atom } = await import('jotai'); return { moveWorkstreamEditorAtom: atom(null, () => {}) }; });
vi.mock('../../../store/atoms/blitz', async () => {
  const { atom } = await import('jotai');
  const valueAtom = atom<unknown>(null);
  return { blitzAnalysisCreatedAtom: atom<unknown, [unknown], void>(get => get(valueAtom), (_get, set, value) => set(valueAtom, value)) };
});
vi.mock('../../../store/atoms/agentMode', async () => { const { atom } = await import('jotai'); return { requestOpenSessionAtom: atom(null, () => {}), toggleSessionHistoryCollapsedAtom: atom(null, () => {}) }; });
vi.mock('../../../tips/atoms', async () => { const { atom } = await import('jotai'); return { tipCreateWorktreeSessionRequestAtom: atom(null, () => {}) }; });
vi.mock('../../../store/atoms/appSettings', async () => { const { atom } = await import('jotai'); return { defaultAgentModelAtom: atom(null, () => {}) }; });
vi.mock('../../../store/actions/sessionHistoryActions', async () => { const { atom } = await import('jotai'); return { blitzDialogOpenAtom: atom(null, () => {}), sessionQuickOpenRequestedAtom: atom(null, () => {}), selectSessionActionAtom: atom(null, () => {}), openSessionInTabActionAtom: atom(null, () => {}), createNewSessionActionAtom: atom(null, () => {}), createNewWorktreeSessionActionAtom: atom(null, () => {}), createWorktreeSessionCoreActionAtom: atom(null, () => {}), addSessionToWorktreeActionAtom: atom(null, () => {}) }; });
vi.mock('../../../hooks/useGitRepoProbe', () => ({ useGitRepoProbe: () => true }));
vi.mock('../../../hooks/useSuperLoop', () => ({ useSuperLoopInit: () => {} }));
vi.mock('../../../store/sessionStateListeners', () => ({ initSessionStateListeners: () => () => {}, updateSessionStateListenerWorkspace: () => {} }));
vi.mock('../../../store/listeners/fileStateListeners', () => ({ initFileStateListeners: () => () => {} }));
vi.mock('../../../store/listeners/fileTreeListeners', () => ({ initFileTreeListeners: () => () => {} }));
vi.mock('../../../store/listeners/sessionListListeners', () => ({ initSessionListListeners: () => () => {} }));
vi.mock('../../../store/listeners/sessionTranscriptListeners', () => ({ initSessionTranscriptListeners: () => () => {} }));
vi.mock('../../../store/listeners/deepLinkListeners', () => ({ initDeepLinkListeners: () => () => {} }));
vi.mock('../../../store/listeners/trayListeners', async () => ({
  initTrayListeners: () => () => {}, trayNewSessionRequestAtom: (await import('jotai')).atom(null),
}));
vi.mock('../../AgenticCoding/SessionHistory', () => ({ SessionHistory: () => null }));
vi.mock('../../TrackerMode/SessionKanbanBoard', () => ({ SessionKanbanBoard: () => null }));
vi.mock('../../BlitzDialog/BlitzDialog', () => ({ BlitzDialog: () => null }));
vi.mock('../../MetaAgentMode/MetaAgentMode', () => ({ MetaAgentMode: () => null }));
vi.mock('../../AgenticCoding/ResizablePanel', () => ({ ResizablePanel: ({ rightPanel }: { rightPanel: React.ReactNode }) => rightPanel }));
vi.mock('../AgentWorkstreamPanel', () => ({
  AgentWorkstreamPanel: ({ workspacePath, workstreamId }: { workspacePath: string; workstreamId: string }) => {
    // GitOperationsPanel clears saved staging in a passive effect when restored
    // Git status is already clean. Exercise the real persistence path here.
    useEffect(() => { store.set(workstreamStateAtom(workstreamId), { commitMessage: workspacePath }); }, [workspacePath, workstreamId]);
    return null;
  },
}));

afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); addSessionMock.mockReset(); });

it('initializes persistence before restored child effects and routes writes after a project switch', async () => {
  vi.useFakeTimers();
  const invoke = vi.fn(async (channel: string) => channel === 'workspace:get-state' ? {} : true);
  vi.stubGlobal('window', Object.assign(window, { electronAPI: { invoke } }));
  // A late primary-workspace render must not steal the restored rail selection.
  store.set(activeWorkspacePathAtom, '/restored-project');
  const view = render(<AgentMode workspacePath="/project-32" workspaceName="project-32" />);
  expect(store.get(activeWorkspacePathAtom)).toBe('/restored-project');
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });
  expect(invoke).toHaveBeenCalledWith('workspace:set-workstream-state', expect.objectContaining({ workspacePath: '/project-32', workstreamId: 'restored-session' }));
  invoke.mockClear();
  view.rerender(<AgentMode workspacePath="/project-01" workspaceName="project-01" />);
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });
  expect(invoke).toHaveBeenCalledWith('workspace:set-workstream-state', expect.objectContaining({ workspacePath: '/project-01', workstreamId: 'restored-session' }));
  expect(invoke).not.toHaveBeenCalledWith('workspace:set-workstream-state', expect.objectContaining({ workspacePath: '/project-32' }));
});

it('localizes the empty state when no session is selected', () => {
  store.set(selectedWorkstreamAtom('/project'), null);

  render(<AgentMode workspacePath="/project" workspaceName="project" />, 'ja');

  screen.getByText('セッションを選択するか、新しいセッションを作成して開始してください');
  screen.getByRole('button', { name: '新しいセッション' });
});

it('localizes generated analysis session titles', async () => {
  vi.stubGlobal('window', Object.assign(window, { electronAPI: { invoke: vi.fn(async () => true) } }));
  render(<AgentMode workspacePath="/project" workspaceName="project" />, 'ja');

  await act(async () => {
    store.set(blitzAnalysisCreatedAtom, {
      payload: { analysisSessionId: 'analysis-1', workspacePath: '/project', blitzId: 'blitz-1' },
    } as never);
  });

  expect(addSessionMock).toHaveBeenCalledWith(expect.objectContaining({ title: '分析' }));
});
