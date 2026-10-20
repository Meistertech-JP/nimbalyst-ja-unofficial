// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TerminalPanel } from '../TerminalPanel';
import { loadTerminalGhostty } from '../ghosttyInstance';

vi.mock('ghostty-web', () => ({ Terminal: vi.fn(), FitAddon: vi.fn(), OSC8LinkProvider: vi.fn(), UrlRegexProvider: vi.fn() }));
vi.mock('../ghosttyInstance', () => ({ loadTerminalGhostty: vi.fn() }));
vi.mock('../TerminalContextMenu', () => ({ TerminalContextMenu: () => null }));

beforeEach(async () => {
  await i18next.changeLanguage('ja');
  vi.mocked(loadTerminalGhostty).mockReset().mockRejectedValue('unavailable');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await i18next.changeLanguage('en');
});

describe('TerminalPanel Japanese initialization UI', () => {
  it('shows translated initialization without spawning a hidden terminal', () => {
    render(<TerminalPanel terminalId="hidden-ja" workspacePath="/workspace" isActive={false} panelVisible={false} />);
    expect(screen.getByText('ターミナルを初期化中…')).toBeTruthy();
    expect(loadTerminalGhostty).not.toHaveBeenCalled();
  });

  it('localizes initialization failure and preserves full retry behavior', async () => {
    render(<TerminalPanel terminalId="failed-ja" workspacePath="/workspace" isActive panelVisible />);
    expect(await screen.findByText('ターミナルを初期化できませんでした: 不明なエラー')).toBeTruthy();
    expect(loadTerminalGhostty).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    await waitFor(() => expect(loadTerminalGhostty).toHaveBeenCalledTimes(2));
  });

  it('updates controls on language change without retrying or recreating the terminal', async () => {
    render(<TerminalPanel terminalId="locale-ja" workspacePath="/workspace" isActive panelVisible />);
    await screen.findByRole('button', { name: '再試行' });
    await act(async () => { await i18next.changeLanguage('en'); });
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(loadTerminalGhostty).toHaveBeenCalledTimes(1);
  });
});
