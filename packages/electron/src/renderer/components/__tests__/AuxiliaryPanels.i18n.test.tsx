// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DiffPreview } from '../DiffPreview/DiffPreview';
import { PlanFilters } from '../PlansPanel/PlanFilters';
import { PlanListItem, type PlanData } from '../PlansPanel/PlanListItem';
import { TerminalTab } from '../TerminalBottomPanel/TerminalTab';
import { MockupPickerMenuHost, showMockupPickerMenu } from '../MockupPickerMenu/MockupPickerMenu';

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon, title }: { icon: string; title?: string }) => <span data-icon={icon} title={title} />,
  hasMockupPlatformService: () => true,
  getMockupPlatformService: () => ({ listMockupFiles: async () => [{ absolutePath: '/repo/My Mockup.mockup.html', relativePath: 'My Mockup.mockup.html', name: 'My Mockup' }] }),
  INSERT_MOCKUP_COMMAND: 'insert-mockup',
  generateMockupScreenshot: vi.fn(),
}));

afterEach(async () => {
  cleanup();
  await i18next.changeLanguage('en');
});

describe('auxiliary panels in Japanese', () => {
  it('translates diff actions without modifying supplied title or content', async () => {
    await i18next.changeLanguage('ja');
    const onAccept = vi.fn(), onReject = vi.fn();
    const view = render(<DiffPreview original="User original" modified="User revision" onAccept={onAccept} onReject={onReject} />);
    expect(screen.getByRole('heading', { name: '提案された変更' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '変更を承認' }));
    fireEvent.click(screen.getByRole('button', { name: '却下' }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
    view.rerender(<DiffPreview title="Custom user title" original="User original" modified="User revision" onAccept={onAccept} onReject={onReject} />);
    expect(screen.getByRole('heading', { name: 'Custom user title' })).toBeTruthy();
    expect(view.container.textContent).toContain('original');
    expect(view.container.textContent).toContain('revision');
  });

  it('localizes plan filters while retaining fixed metadata values', async () => {
    await i18next.changeLanguage('ja');
    const onStatusChange = vi.fn(), onPriorityChange = vi.fn();
    render(<PlanFilters searchTerm="" onSearchChange={vi.fn()} statusFilter="all" onStatusChange={onStatusChange} priorityFilter="all" onPriorityChange={onPriorityChange} hideCompleted={false} onHideCompletedChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('プランを検索…')).toBeTruthy();
    expect(screen.getByRole('option', { name: '開発中' }).getAttribute('value')).toBe('in-development');
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'in-development' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'critical' } });
    expect(onStatusChange).toHaveBeenCalledWith('in-development');
    expect(onPriorityChange).toHaveBeenCalledWith('critical');
  });

  it('localizes plan metadata, dates, and synthetic titles without altering the clicked plan', async () => {
    await i18next.changeLanguage('ja');
    const plan: PlanData = { id: 'p1', title: 'User title', status: 'ready-for-development', owner: 'User', priority: 'critical', progress: 0, path: '/repo/plan.md', lastUpdated: new Date(Date.now() - 3 * 3600000), planType: 'bug-fix' };
    const onClick = vi.fn();
    const view = render(<PlanListItem plan={plan} onClick={onClick} />);
    expect(screen.getByText('準備完了')).toBeTruthy();
    expect(screen.getByText('3時間前')).toBeTruthy();
    expect(screen.getByTitle('優先度: 重大')).toBeTruthy();
    expect(screen.getByTitle('バグ修正')).toBeTruthy();
    fireEvent.click(screen.getByText('User title'));
    expect(onClick).toHaveBeenCalledWith(plan);
    view.rerender(<PlanListItem plan={{ ...plan, title: 'Untitled', isTitleFallback: true, status: 'user-status', planType: 'custom-type' }} onClick={onClick} />);
    expect(screen.getByText('無題')).toBeTruthy();
    expect(screen.getByText('user status')).toBeTruthy();
    expect(screen.getByTitle('custom-type')).toBeTruthy();
  });

  it('localizes terminal tooltips but preserves the terminal title, shell, and path', async () => {
    await i18next.changeLanguage('ja');
    const terminal = { id: 'terminal-id', title: 'My Terminal', shellName: 'pwsh', shellPath: '/bin/pwsh', cwd: '/repo', worktreeId: 'wt-1', worktreeName: 'feature-branch', createdAt: 0, lastActiveAt: 0 };
    const onClose = vi.fn();
    render(<TerminalTab terminal={terminal} isActive isActiveWorktree terminalIndex={0} terminalCount={1} onSelect={vi.fn()} onClose={onClose} onCloseOthers={vi.fn()} onCloseAll={vi.fn()} onCloseToRight={vi.fn()} />);
    const title = screen.getByRole('tab').getAttribute('title');
    expect(title).toContain('My Terminal\n/repo\n');
    expect(title).toContain('pwsh');
    expect(title).not.toContain('Shell:');
    expect(screen.getByText('feature-branch')).toBeTruthy();
    fireEvent.click(screen.getByTitle('ターミナルを閉じる'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('localizes the mockup picker while preserving names and keyboard navigation', async () => {
    await i18next.changeLanguage('ja');
    render(<MockupPickerMenuHost />);
    act(() => showMockupPickerMenu());
    expect(await screen.findByText('My Mockup')).toBeTruthy();
    expect(screen.getByPlaceholderText('モックアップを検索…')).toBeTruthy();
    fireEvent.click(screen.getByText('+ 新しいモックアップ'));
    expect(screen.getByPlaceholderText('モックアップ名を入力…')).toBeTruthy();
    expect(screen.getByText('Enterで作成、Escapeでキャンセル')).toBeTruthy();
    fireEvent.keyDown(screen.getByPlaceholderText('モックアップ名を入力…'), { key: 'Escape' });
    expect(screen.getByPlaceholderText('モックアップを検索…')).toBeTruthy();
  });
});
