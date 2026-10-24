// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { Provider, createStore } from 'jotai';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  terminalListAtom,
  terminalListWorkspaceAtom,
  activeTerminalIdAtom,
  terminalPanelVisibleAtom,
  terminalPanelHeightAtom,
  terminalPanelHydratedAtom,
  type TerminalInstance,
} from '../../store/atoms/terminals';

const mocks = vi.hoisted(() => ({
  loadTerminals: vi.fn(),
  initTerminalListeners: vi.fn(() => vi.fn()),
}));

vi.mock('@nimbalyst/runtime/store', () => ({
  store: { get: vi.fn(), set: vi.fn() },
}));

vi.mock('../../store/atoms/terminals', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../store/atoms/terminals')>(),
  loadTerminals: mocks.loadTerminals,
  initTerminalListeners: mocks.initTerminalListeners,
}));

vi.mock('../../store/atoms/sessions', async () => {
  const { atom } = await import('jotai');
  const noSession = atom(undefined);
  return {
    selectedWorkstreamAtom: () => noSession,
    sessionWorktreeIdAtom: () => noSession,
  };
});

vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));
vi.mock('../Terminal/TerminalPanel', () => ({
  TerminalPanel: ({ terminalId, workspacePath }: { terminalId: string; workspacePath: string }) => (
    <div data-testid="terminal-instance">{workspacePath}:{terminalId}</div>
  ),
}));
vi.mock('../TerminalBottomPanel/TerminalTab', () => ({ TerminalTab: () => null }));

import { TerminalBottomPanel } from '../TerminalBottomPanel/TerminalBottomPanel';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPanel(
  i18n: typeof englishI18n,
  terminals: TerminalInstance[] = [],
  listWorkspace = 'C:/workspace',
) {
  const store = createStore();
  store.set(terminalPanelVisibleAtom, true);
  store.set(terminalPanelHeightAtom, 240);
  store.set(terminalPanelHydratedAtom, true);
  store.set(terminalListAtom, terminals);
  store.set(terminalListWorkspaceAtom, listWorkspace);
  store.set(activeTerminalIdAtom, terminals[0]?.id);
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      terminal: {
        onCommandRunning: vi.fn(),
        setPanelVisible: vi.fn(),
      },
    },
  });

  return render(
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <TerminalBottomPanel workspacePath="C:/workspace" />
      </I18nextProvider>
    </Provider>,
  );
}

describe('TerminalBottomPanel localization', () => {
  it('renders English empty-state and panel controls', () => {
    renderPanel(englishI18n);

    expect(screen.getByText('No terminals open')).toBeDefined();
    expect(screen.getByRole('button', { name: 'New Terminal' })).toBeDefined();
    expect(screen.getByTitle('New Terminal').getAttribute('aria-label')).toBe('New Terminal');
    expect(screen.getByRole('button', { name: 'Close panel' })).toBeDefined();
  });

  it('renders Japanese empty-state and panel controls', () => {
    renderPanel(japaneseI18n);

    expect(screen.getByText('開いているターミナルはありません')).toBeDefined();
    expect(screen.getByTitle('新しいターミナル')).toBeDefined();
    expect(screen.getByTitle('新しいターミナル').getAttribute('aria-label')).toBe('新しいターミナル');
    expect(screen.getByText('新しいターミナル')).toBeDefined();
    expect(screen.getByRole('button', { name: 'パネルを閉じる' })).toBeDefined();
  });

  const terminal: TerminalInstance = {
    id: 'terminal-other-project', title: 'Test shell', shellName: 'pwsh',
    shellPath: 'pwsh.exe', cwd: 'C:/other-workspace', createdAt: 1, lastActiveAt: 1,
  };

  it.each([
    ['en', 'No terminals open'],
    ['ja', '開いているターミナルはありません'],
  ])('keeps the %s empty-state while another workspace owns the terminal list', (language, emptyText) => {
    renderPanel(language === 'ja' ? japaneseI18n : englishI18n, [terminal], 'C:/other-workspace');

    expect(screen.getByText(emptyText).textContent).toBe(emptyText);
    expect(screen.queryByTestId('terminal-instance')).toBeNull();
    expect(mocks.loadTerminals).toHaveBeenCalledWith('C:/workspace');
    expect(mocks.initTerminalListeners).toHaveBeenCalledWith('C:/workspace');
  });

  it('mounts a terminal only when its loaded workspace matches the panel', () => {
    renderPanel(japaneseI18n, [terminal]);

    expect(screen.getByTestId('terminal-instance').textContent).toBe('C:/workspace:terminal-other-project');
    expect(screen.queryByText('開いているターミナルはありません')).toBeNull();
  });
});
