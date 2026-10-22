import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilesScopeDropdown } from '../FilesScopeDropdown';

vi.mock('@nimbalyst/i18n/react', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string | number>) => {
      const labels: Record<string, string> = {
        'scope.current_title': '未コミットのセッション編集',
        'scope.current_description': 'AIが編集した未コミットのファイル',
        'scope.session_title': 'すべてのセッション編集',
        'scope.session_description': 'AIが触れたすべてのファイル',
        'scope.all_title': 'すべての未コミットファイル',
        'scope.all_description': 'リポジトリ内のすべての未コミットファイル',
        'scope.all_worktree_description': '{{name}}内のすべての未コミットファイル',
        'scope.in_worktree': '{{name}}内',
        'scope.in_this_worktree': 'このWorktree内',
        'scope.in_this_workspace': 'このWorkspace内',
        'scope.in_current_session': '現在のセッション内',
        'scope.in_workstream': 'このWorkstream内（{{count}}セッション）',
        'scope.in_session': 'このセッション内',
        'scope.scope': '範囲',
        'scope.all_sessions': 'すべてのセッション（{{count}}）',
        'scope.current_session_only': '現在のセッションのみ',
        'scope.display': '表示',
        'filter.show_files': '表示するファイル',
        'sidebar.group_by_directory': 'ディレクトリ別にグループ化',
      };
      return (labels[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name] ?? ''));
    },
  }),
}));

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({ MaterialSymbol: () => null }));
vi.mock('../../../hooks/useFloatingMenu', () => ({
  FloatingPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFloatingMenu: () => ({
    isOpen: true,
    setIsOpen: vi.fn(),
    refs: { setReference: vi.fn(), setFloating: vi.fn() },
    getReferenceProps: () => ({}),
    getFloatingProps: () => ({}),
    floatingStyles: {},
  }),
}));

afterEach(cleanup);

const baseProps = {
  fileScopeMode: 'current-changes' as const,
  onFileScopeModeChange: vi.fn(),
  hasMultipleSessions: true,
  activeSessionId: 'session-1',
  filterToCurrentSession: false,
  onFilterToCurrentSessionChange: vi.fn(),
  groupByDirectory: false,
  onGroupByDirectoryChange: vi.fn(),
  isWorktree: false,
  workstreamSessionCount: 3,
};

describe('FilesScopeDropdown localization', () => {
  it('localizes scope labels, descriptions, filters, display options, and accessible name', () => {
    const { getByTestId, getByText, getAllByText } = render(<FilesScopeDropdown {...baseProps} />);

    expect(getByTestId('files-scope-dropdown').getAttribute('aria-label'))
      .toBe('未コミットのセッション編集 — このWorkstream内（3セッション）');
    expect(getByText('表示するファイル')).toBeTruthy();
    expect(getAllByText('未コミットのセッション編集')).toHaveLength(2);
    expect(getByText('AIが編集した未コミットのファイル')).toBeTruthy();
    expect(getByText('すべてのセッション（3）')).toBeTruthy();
    expect(getByText('現在のセッションのみ')).toBeTruthy();
    expect(getByText('表示')).toBeTruthy();
    expect(getByText('ディレクトリ別にグループ化')).toBeTruthy();
  });

  it('uses the translated worktree description and context with the worktree name', () => {
    const { getByText, getByTestId } = render(
      <FilesScopeDropdown {...baseProps} fileScopeMode="all-changes" isWorktree worktreeName="feature-branch" />,
    );

    expect(getByTestId('files-scope-dropdown').getAttribute('aria-label'))
      .toBe('すべての未コミットファイル — feature-branch内');
    expect(getByText('feature-branch内のすべての未コミットファイル')).toBeTruthy();
  });

  it('preserves the scope change callbacks', () => {
    const onFileScopeModeChange = vi.fn();
    const onFilterToCurrentSessionChange = vi.fn();
    const { container } = render(
      <FilesScopeDropdown {...baseProps} onFileScopeModeChange={onFileScopeModeChange} onFilterToCurrentSessionChange={onFilterToCurrentSessionChange} />,
    );

    fireEvent.click(container.querySelectorAll('input[name="fileScopeMode"][type="radio"]')[1]);
    fireEvent.click(container.querySelectorAll('input[name="sessionFilter"][type="radio"]')[1]);
    expect(onFileScopeModeChange).toHaveBeenCalledWith('session-files');
    expect(onFilterToCurrentSessionChange).toHaveBeenCalledWith(true);
  });
});
