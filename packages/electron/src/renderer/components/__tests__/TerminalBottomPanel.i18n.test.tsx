// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  visibleAtom: { key: 'visible' },
  heightAtom: { key: 'height' },
  hydratedAtom: { key: 'hydrated' },
  closeAtom: { key: 'close' },
  listAtom: { key: 'list' },
  activeIdAtom: { key: 'active-id' },
  commandRunningAtom: { key: 'command-running' },
  workstreamAtom: vi.fn(() => ({ key: 'workstream' })),
  worktreeIdAtom: vi.fn(() => ({ key: 'worktree-id' })),
  loadTerminals: vi.fn(),
  initTerminalListeners: vi.fn(() => vi.fn()),
}));

vi.mock('jotai', () => ({
  useAtomValue: (atom: { key: string }) => {
    switch (atom.key) {
      case 'visible': return true;
      case 'height': return 240;
      case 'hydrated': return true;
      case 'list': return [];
      case 'active-id': return undefined;
      case 'workstream': return undefined;
      case 'worktree-id': return undefined;
      case 'command-running': return false;
      default: return undefined;
    }
  },
  useSetAtom: () => vi.fn(),
}));

vi.mock('@nimbalyst/runtime/store', () => ({
  store: { get: vi.fn(), set: vi.fn() },
}));

vi.mock('../../store/atoms/terminals', () => ({
  terminalListAtom: mocks.listAtom,
  activeTerminalIdAtom: mocks.activeIdAtom,
  terminalPanelVisibleAtom: mocks.visibleAtom,
  terminalPanelHeightAtom: mocks.heightAtom,
  terminalPanelHydratedAtom: mocks.hydratedAtom,
  closeTerminalPanelAtom: mocks.closeAtom,
  loadTerminals: mocks.loadTerminals,
  setActiveTerminal: vi.fn(),
  removeTerminalFromList: vi.fn(),
  initTerminalListeners: mocks.initTerminalListeners,
  setTerminalCommandRunning: vi.fn(),
  terminalCommandRunningAtom: mocks.commandRunningAtom,
}));

vi.mock('../../store/atoms/sessions', () => ({
  selectedWorkstreamAtom: mocks.workstreamAtom,
  sessionWorktreeIdAtom: mocks.worktreeIdAtom,
}));

vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));
vi.mock('../Terminal/TerminalPanel', () => ({ TerminalPanel: () => null }));
vi.mock('../TerminalBottomPanel/TerminalTab', () => ({ TerminalTab: () => null }));

import { TerminalBottomPanel } from '../TerminalBottomPanel/TerminalBottomPanel';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

afterAll(() => cleanup());

function renderPanel(i18n: typeof englishI18n) {
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
    <I18nextProvider i18n={i18n}>
      <TerminalBottomPanel workspacePath="C:/workspace" />
    </I18nextProvider>,
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
});
