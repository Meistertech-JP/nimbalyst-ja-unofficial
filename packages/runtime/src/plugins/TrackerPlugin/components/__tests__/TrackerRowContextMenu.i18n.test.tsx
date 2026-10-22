// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { TrackerRecord } from '../../../../core/TrackerRecord';
import { TrackerRowContextMenu } from '../TrackerRowContextMenu';

let i18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeEach(async () => {
  i18n = await createI18nInstance('ja');
});

function renderMenu(overrides: Partial<React.ComponentProps<typeof TrackerRowContextMenu>> = {}) {
  const onSetStatus = vi.fn();
  const onSetPriority = vi.fn();
  const closeContextMenu = vi.fn();
  const clearSelection = vi.fn();
  const refs = { setFloating: vi.fn() } as unknown as React.ComponentProps<typeof TrackerRowContextMenu>['refs'];

  render(
    <I18nextProvider i18n={i18n}>
      <TrackerRowContextMenu
        anchor={new DOMRect(0, 0, 10, 10)}
        refs={refs}
        floatingStyles={{}}
        selectedIds={new Set(['bug-1'])}
        activeTypeFilter="bug"
        statusOptions={[{ value: 'in-progress', label: 'In Progress' }]}
        onSetStatus={onSetStatus}
        onSetPriority={onSetPriority}
        closeContextMenu={closeContextMenu}
        clearSelection={clearSelection}
        {...overrides}
      />
    </I18nextProvider>,
  );

  return { onSetStatus, onSetPriority, closeContextMenu, clearSelection };
}

describe('TrackerRowContextMenu Japanese localization', () => {
  it('renders translated selection and action labels and preserves their actions', () => {
    const { onSetStatus, onSetPriority } = renderMenu({
      onAddToCollection: vi.fn(),
      collectionTargets: [{
        id: 'collection-1',
        primaryType: 'milestone',
        fields: { title: 'Release' },
      } as unknown as TrackerRecord],
      onCopyDeepLink: vi.fn(),
      onArchiveItems: vi.fn(),
      onDeleteItems: vi.fn(),
      confirmDelete: vi.fn().mockResolvedValue(true),
      onOpenDocument: vi.fn(),
      getLinkedSessions: () => [{ id: 'session-1', title: 'Linked run', timeLabel: '2h ago' }],
      onOpenSession: vi.fn(),
      onLaunchSession: vi.fn(),
      onLaunchWorktree: vi.fn(),
    });

    expect(screen.getByText('1件を選択中')).toBeTruthy();
    expect(screen.getByText('ステータスを設定')).toBeTruthy();
    expect(screen.getByText('優先度を設定')).toBeTruthy();
    expect(screen.getByText('コレクションに追加')).toBeTruthy();
    expect(screen.getByText('セッション（1）')).toBeTruthy();
    expect(screen.getByText('セッションを起動')).toBeTruthy();
    expect(screen.getByText('Worktreeを起動')).toBeTruthy();
    expect(screen.getByText('ドキュメントを開く')).toBeTruthy();
    expect(screen.getByText('リンクをコピー')).toBeTruthy();
    expect(screen.getByText('アーカイブ')).toBeTruthy();
    expect(screen.getByText('削除')).toBeTruthy();
    fireEvent.mouseEnter(screen.getByText('セッション（1）').parentElement!);
    expect(screen.getByTestId('tracker-row-context-open-session').getAttribute('title'))
      .toBe('セッションを開く: Linked run');

    fireEvent.mouseEnter(screen.getByText('ステータスを設定').parentElement!);
    fireEvent.click(screen.getByText('進行中'));
    expect(onSetStatus).toHaveBeenCalledWith('in-progress');

    fireEvent.mouseEnter(screen.getByText('優先度を設定').parentElement!);
    fireEvent.click(screen.getByText('高'));
    expect(onSetPriority).toHaveBeenCalledWith('high');
  });
});
