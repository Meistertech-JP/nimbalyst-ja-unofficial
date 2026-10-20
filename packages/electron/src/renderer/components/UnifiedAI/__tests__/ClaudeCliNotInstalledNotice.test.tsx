// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import {
  ClaudeCliNotInstalledNotice,
  CLAUDE_CODE_INSTALL_URL,
} from '../ClaudeCliNotInstalledNotice';

const openExternal = vi.fn();

beforeEach(() => {
  openExternal.mockReset();
  (window as unknown as { electronAPI: { openExternal: typeof openExternal } }).electronAPI = {
    openExternal,
  };
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await i18next.changeLanguage('en');
});

describe('ClaudeCliNotInstalledNotice', () => {
  it('renders Japanese installation guidance while preserving the CLI literal', async () => {
    await i18next.changeLanguage('ja');
    const { container, getByRole, getByText } = render(<ClaudeCliNotInstalledNotice variant="panel" />);
    expect(getByText('Claude Code CLIがインストールされていません')).toBeTruthy();
    expect(container.querySelector('code')?.textContent).toBe('claude');
    fireEvent.click(getByRole('button', { name: 'Claude Codeをインストール' }));
    expect(openExternal).toHaveBeenCalledWith(CLAUDE_CODE_INSTALL_URL);
  });

  it('renders the banner variant with the install affordance', () => {
    const { container } = render(<ClaudeCliNotInstalledNotice variant="banner" />);
    expect(
      container.querySelector('.claude-cli-not-installed-notice--banner'),
    ).toBeTruthy();
    expect(
      container.querySelector('.claude-cli-not-installed-notice-install'),
    ).toBeTruthy();
  });

  it('renders the panel variant', () => {
    const { container } = render(<ClaudeCliNotInstalledNotice variant="panel" />);
    expect(
      container.querySelector('.claude-cli-not-installed-notice--panel'),
    ).toBeTruthy();
  });

  it('opens the setup docs externally when Install is clicked', () => {
    const { container } = render(<ClaudeCliNotInstalledNotice variant="banner" />);
    const button = container.querySelector('.claude-cli-not-installed-notice-install');
    expect(button).toBeTruthy();
    fireEvent.click(button!);
    expect(openExternal).toHaveBeenCalledTimes(1);
    expect(openExternal).toHaveBeenCalledWith(CLAUDE_CODE_INSTALL_URL);
    expect(CLAUDE_CODE_INSTALL_URL).toBe(
      'https://docs.anthropic.com/en/docs/claude-code/setup',
    );
  });
});
