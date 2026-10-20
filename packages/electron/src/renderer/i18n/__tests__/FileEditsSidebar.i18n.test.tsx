import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { FileEditsSidebar } from '../../../../../runtime/src/ui/AgentTranscript/components/FileEditsSidebar';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import type { FileEditSummary } from '../../../../../runtime/src/ui/AgentTranscript/types';
import { DiffPeekPopover } from '../../../../../runtime/src/ui/git/DiffPeekPopover';
import { UnifiedDiffView, diffStats } from '../../../../../runtime/src/ui/git/UnifiedDiffView';

const locale = i18next.createInstance();
const invoke = vi.fn();
const filePath = '/workspace/src/User File.ts';
const fileEdits = [{ filePath, linkType: 'edited', operation: 'edit', timestamp: '2026-09-18', linesAdded: 2, linesRemoved: 1 }] as FileEditSummary[];

function localized(props: React.ComponentProps<typeof FileEditsSidebar>, language = 'ja') {
  return translated(<FileEditsSidebar {...props} />, language);
}

function translated(children: React.ReactNode, language = 'ja') {
  const translate = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => translate(key, { ...params, defaultValue }) }}>
    {children}
  </RuntimeTranslationProvider>;
}

beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  invoke.mockReset().mockResolvedValue({ success: true, status: { 'src/User File.ts': { status: 'modified' } } });
  vi.stubGlobal('electronAPI', { invoke, on: () => () => {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('FileEditsSidebar Japanese presentation', () => {
  it('localizes dynamic status tooltips while preserving paths, selection, and drag protocol', async () => {
    const onFileClick = vi.fn();
    const onSelectionChange = vi.fn();
    const onSelectAll = vi.fn();
    const props = { fileEdits, workspacePath: '/workspace', onFileClick, onSelectionChange, onSelectAll, showCheckboxes: true, pendingReviewFiles: new Set([filePath]) };
    const view = render(localized(props));
    const row = await screen.findByTitle('src/User File.ts - 編集済み (変更あり)');
    expect(screen.getByTitle('レビュー待ち - 変更は未コミットです')).toBeTruthy();
    expect(screen.getByText('すべて選択（未コミット1件）')).toBeTruthy();
    fireEvent.click(row.querySelector('.file-edits-sidebar__checkbox')!);
    expect(onSelectionChange).toHaveBeenCalledWith(filePath, true);
    fireEvent.click(screen.getByText('User File.ts'));
    expect(onFileClick).toHaveBeenCalledWith(filePath);
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(row, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/x-nimbalyst-file-mention', 'src/User File.ts');
    expect(dataTransfer.effectAllowed).toBe('copy');
    view.rerender(localized(props, 'en'));
    expect(screen.getByTitle('src/User File.ts - Edited (modified)')).toBe(row);
    expect(invoke).toHaveBeenCalledWith('git:get-file-status', '/workspace', ['src/User File.ts']);
  });

  it.each([
    ['ファイル画面で開く', 'onOpenInFiles'], ['差分を表示', 'onViewDiff'],
    ['VS Codeで開く', 'onOpenInExternalEditor'], ['パスをコピー', 'onCopyPath'],
  ] as const)('keeps the %s action target unchanged', async (label, action) => {
    const callback = vi.fn();
    render(localized({ fileEdits, workspacePath: '/workspace', [action]: callback, externalEditorName: 'VS Code' }));
    await act(async () => { fireEvent.contextMenu(screen.getByText('User File.ts'), { clientX: 20, clientY: 30 }); });
    fireEvent.click(screen.getByText(label));
    expect(callback).toHaveBeenCalledWith(filePath);
    expect(document.querySelector('.file-edits-sidebar__context-menu')).toBeNull();
  });

  it('retains the deleted-file guard', async () => {
    invoke.mockResolvedValue({ success: true, status: {} });
    const onFileClick = vi.fn();
    render(localized({ fileEdits: [{ ...fileEdits[0], operation: 'delete' }], workspacePath: '/workspace', onFileClick }));
    expect(await screen.findByTitle('src/User File.ts - 削除・コミット済み')).toBeTruthy();
    expect(screen.getByText('（削除済み）')).toBeTruthy();
    fireEvent.click(screen.getByText('User File.ts'));
    expect(onFileClick).not.toHaveBeenCalled();
  });

  it.each([
    ['current-changes', 0, 'まだ編集されたファイルはありません'],
    ['current-changes', 3, '未コミットの変更はありません'],
    ['session-files', 0, 'このセッションで編集されたファイルはありません'],
    ['all-changes', 3, '未コミットのファイルはありません'],
  ] as const)('preserves empty-state scope %s with %s session files', (scopeMode, totalSessionFilesCount, message) => {
    const onShowSessionFiles = vi.fn();
    const onShowAllUncommitted = vi.fn();
    render(localized({ fileEdits: [], scopeMode, totalSessionFilesCount, totalUncommittedCount: 5, onShowSessionFiles, onShowAllUncommitted }));
    expect(screen.getByText(message)).toBeTruthy();
    if (scopeMode === 'all-changes') {
      fireEvent.click(screen.getByText('セッション内の編集を表示（3件）'));
      expect(onShowSessionFiles).toHaveBeenCalledOnce();
    } else {
      fireEvent.click(screen.getByText('未コミットのファイルをすべて表示（5件）'));
      expect(onShowAllUncommitted).toHaveBeenCalledOnce();
    }
  });

  it('preserves collapsed folders across a language change', async () => {
    const props = { fileEdits, workspacePath: '/workspace' };
    const view = render(localized(props));
    await waitFor(() => expect(screen.getByTitle('src/User File.ts - 編集済み (変更あり)')).toBeTruthy());
    fireEvent.click(screen.getByTitle('ディレクトリ別にグループ化'));
    fireEvent.click(screen.getByTitle('すべて折りたたむ'));
    expect(screen.queryByText('User File.ts')).toBeNull();
    view.rerender(localized(props, 'en'));
    expect(screen.queryByText('User File.ts')).toBeNull();
    fireEvent.click(screen.getByTitle('Expand all'));
    expect(screen.getByText('User File.ts')).toBeTruthy();
  });

  it('relocalizes an unavailable cached diff without refetching or closing the popover', async () => {
    const onGetDiff = vi.fn(async () => null);
    const props = { fileEdits, workspacePath: '/workspace', onGetDiff };
    const view = render(localized(props));
    await act(async () => { fireEvent.click(screen.getByTestId('files-edited-file-peek')); });
    expect(await screen.findByText('この環境では差分を表示できません')).toBeTruthy();
    const popover = screen.getByRole('dialog');
    expect(screen.getByTitle('差分を隠す')).toBeTruthy();
    view.rerender(localized(props, 'en'));
    expect(screen.getByText('Diff not available on this platform')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBe(popover);
    expect(onGetDiff).toHaveBeenCalledExactlyOnceWith(filePath);
    await act(async () => { fireEvent.click(screen.getByTitle('Hide diff')); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([
    [{ loading: true }, '差分を読み込み中…'],
    [{ isBinary: true }, 'バイナリファイル'],
    [{}, 'テキストの変更はありません'],
    [{ error: 'EACCES: User <A> & B' }, 'EACCES: User <A> & B'],
  ])('translates diff placeholders but preserves raw error diagnostics: %s', (props, message) => {
    render(translated(<UnifiedDiffView diff="" {...props} />));
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('keeps diff content, counts, keyboard controls, and editor actions unchanged', async () => {
    const diff = '@@ -1,1 +1,1 @@\n-Original English\n+User English content';
    const onPin = vi.fn();
    const onClose = vi.fn();
    const onOpenInEditor = vi.fn();
    render(translated(<DiffPeekPopover anchorRect={new DOMRect(0, 0, 10, 10)} filePath={filePath} mode="peek" diff={diff} isBinary={false} loading={false} error={null} onPin={onPin} onClose={onClose} onOpenInEditor={onOpenInEditor} />));
    expect(screen.getByText('プレビュー中')).toBeTruthy();
    expect(screen.getByText('Original English')).toBeTruthy();
    expect(screen.getByText('User English content')).toBeTruthy();
    expect(diffStats(diff)).toEqual({ added: 1, removed: 1 });
    expect(screen.getByTitle(filePath)).toBeTruthy();
    fireEvent.click(screen.getByText('エディターで開く'));
    expect(onOpenInEditor).toHaveBeenCalledOnce();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onPin).toHaveBeenCalledOnce();
    await act(async () => { fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
