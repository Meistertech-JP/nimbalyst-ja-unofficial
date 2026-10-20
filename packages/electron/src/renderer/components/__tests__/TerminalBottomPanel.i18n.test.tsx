// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TerminalBottomPanel } from '../TerminalBottomPanel/TerminalBottomPanel';

const mocks = vi.hoisted(() => ({ load: vi.fn(), initListeners: vi.fn(() => vi.fn()), close: vi.fn(), create: vi.fn(async () => ({ success: false })) }));
vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));
vi.mock('../Terminal/TerminalPanel', () => ({ TerminalPanel: () => null }));
vi.mock('../../store/atoms/sessions', async () => {
  const { atom } = await import('jotai');
  const empty = atom(null);
  return { selectedWorkstreamAtom: () => empty, sessionWorktreeIdAtom: () => empty };
});
vi.mock('../../store/atoms/terminals', async () => {
  const { atom } = await import('jotai');
  return {
    terminalListAtom: atom([]), activeTerminalIdAtom: atom(undefined),
    terminalPanelVisibleAtom: atom(true), terminalPanelHeightAtom: atom(250), terminalPanelHydratedAtom: atom(true),
    closeTerminalPanelAtom: atom(null, mocks.close), loadTerminals: mocks.load,
    initTerminalListeners: mocks.initListeners, setActiveTerminal: vi.fn(), removeTerminalFromList: vi.fn(),
    setTerminalCommandRunning: vi.fn(), terminalCommandRunningAtom: () => atom(false),
  };
});

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal('electronAPI', { terminal: { create: mocks.create, setPanelVisible: vi.fn(), onCommandRunning: vi.fn(() => vi.fn()) } });
  await i18next.changeLanguage('ja');
});
afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await i18next.changeLanguage('en');
});

it('renders existing translations and keeps terminal creation and listeners unchanged across locales', async () => {
  render(<TerminalBottomPanel workspacePath="F:/User project" />);
  expect(screen.getByText('開いているターミナルはありません')).toBeTruthy();
  expect(screen.getByTitle('新しいターミナル')).toBeTruthy();
  expect(screen.getByTitle('パネルを閉じる')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: '新しいターミナル' })).toHaveLength(2);
  await act(async () => fireEvent.click(screen.getAllByRole('button', { name: '新しいターミナル' })[1]));
  expect(mocks.create).toHaveBeenCalledWith('F:/User project', { cwd: 'F:/User project', title: 'ターミナル1', source: 'panel' });
  await act(() => i18next.changeLanguage('en'));
  expect(screen.getByText('No terminals open')).toBeTruthy();
  expect(screen.getByTitle('New Terminal')).toBeTruthy();
  expect(mocks.load).toHaveBeenCalledTimes(1);
  expect(mocks.initListeners).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByTitle('Close panel'));
  expect(mocks.close).toHaveBeenCalledTimes(1);
});
