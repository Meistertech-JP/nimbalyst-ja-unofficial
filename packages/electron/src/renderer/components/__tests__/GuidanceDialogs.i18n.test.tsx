// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { ClaudeCommandsLearnMoreDialog } from '../ClaudeCommandsLearnMoreDialog';
import { RosettaWarning } from '../RosettaWarning/RosettaWarning';
import { WindowsClaudeCodeWarning } from '../WindowsClaudeCodeWarning/WindowsClaudeCodeWarning';
import { DiscordInvitation } from '../DiscordInvitation/DiscordInvitation';

vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));

describe('guidance dialogs in Japanese', () => {
  const originalAPI = Object.getOwnPropertyDescriptor(window, 'electronAPI');
  afterEach(async () => {
    cleanup();
    if (originalAPI) Object.defineProperty(window, 'electronAPI', originalAPI);
    else delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    await i18next.changeLanguage('en');
  });

  it('translates command explanations and preserves executable commands and styled paths', async () => {
    const onClose = vi.fn();
    const onOpenSettings = vi.fn();
    const { container } = render(<ClaudeCommandsLearnMoreDialog isOpen onClose={onClose} onOpenSettings={onOpenSettings} />);
    await act(async () => { await i18next.changeLanguage('ja'); });
    for (const command of ['/track', '/mockup', '/analyze-code', '/write-tests', '/roadmap', '/user-research']) {
      expect(screen.getByText(command).tagName).toBe('CODE');
    }
    expect(screen.getByText('nimbalyst-local').tagName).toBe('CODE');
    expect(screen.getByText('.gitignore').tagName).toBe('CODE');
    expect(container.querySelector('pre')?.textContent).toContain('plans/        # 計画ドキュメント (.md)');
    fireEvent.click(screen.getByRole('button', { name: 'プロジェクト設定' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it.each([
    [RosettaWarning, 'dismiss-rosetta-warning', 'Apple Silicon版をダウンロード'],
    [WindowsClaudeCodeWarning, 'dismiss-claude-code-windows-warning', 'インストール手順を表示'],
  ] as const)('preserves platform warning actions and dismissal IPC (%s)', async (Warning, channel, actionLabel) => {
    await i18next.changeLanguage('ja');
    const send = vi.fn();
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: { send } });
    const onAction = vi.fn();
    const onClose = vi.fn();
    const onDismiss = vi.fn();
    render(<Warning isOpen onClose={onClose} onDismiss={onDismiss} onDownload={onAction} onOpenSettings={onAction} />);
    expect(screen.getByRole('button', { name: '閉じる' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: actionLabel }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '今後表示しない' }));
    expect(send).toHaveBeenCalledWith(channel);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('preserves community links and dismiss actions while localizing the invitation', async () => {
    await i18next.changeLanguage('ja');
    const invoke = vi.fn();
    const send = vi.fn();
    const onDismiss = vi.fn();
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke, send } });
    render(<DiscordInvitation isOpen onClose={vi.fn()} onDismiss={onDismiss} />);
    expect(screen.getByRole('dialog', { name: 'コミュニティに参加' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Discordに参加' }));
    expect(invoke).toHaveBeenCalledWith('open-external', 'https://discord.gg/ubZDt4esEn');
    fireEvent.click(screen.getByRole('button', { name: '今後表示しない' }));
    expect(send).toHaveBeenCalledWith('dismiss-discord-invitation');
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
