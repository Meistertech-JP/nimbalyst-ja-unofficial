import React from 'react';
import i18next from 'i18next';
import { Provider, createStore } from 'jotai';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { GitCommitConfirmationWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/GitCommitConfirmationWidget';
import { noopInteractiveWidgetHost } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/InteractiveWidgetHost';
import { interactiveWidgetHostAtom } from '../../../../../runtime/src/store/atoms/interactiveWidgetHost';
import { buildCodexToolLookupId } from '../../../../../runtime/src/ai/server/toolLookupIds';
import type { TranscriptViewMessage } from '../../../../../runtime/src/ai/server/types';

const locale = i18next.createInstance();
const sessionId = 'git-commit-i18n';
let store: ReturnType<typeof createStore>;
const commit = vi.fn();
const cancel = vi.fn();
const track = vi.fn();
const setAuto = vi.fn();
const host = { ...noopInteractiveWidgetHost, gitCommit: commit, gitCommitCancel: cancel, trackEvent: track, setAutoCommitEnabled: setAuto };
const files = [{ path: 'src/z.ts', status: 'added' }, { path: 'src/a.ts', status: 'deleted' }, 'readme.md'];
function message(result?: unknown, id = 'raw-tool', args: Record<string, unknown> = {}): TranscriptViewMessage {
  return { id: 7, sequence: 1, type: 'tool_call', subagentId: null, createdAt: new Date(1000), toolCall: {
    toolName: 'git_commit_proposal', toolDisplayName: 'git_commit_proposal', status: 'completed', description: null,
    arguments: { filesToStage: files, commitMessage: 'Original message', reasoning: 'Original reasoning', ...args },
    targetFilePath: null, mcpServer: null, mcpTool: null, providerToolCallId: id, progress: [], result: result as string,
  } };
}
function widget(msg: TranscriptViewMessage) {
  return <GitCommitConfirmationWidget sessionId={sessionId} message={msg} isExpanded onToggle={() => {}} />;
}
function localized(msg: TranscriptViewMessage, language = 'ja') {
  const t = locale.getFixedT(language);
  return <Provider store={store}><RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    {widget(msg)}
  </RuntimeTranslationProvider></Provider>;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  commit.mockReset().mockResolvedValue({ success: true, commitHash: 'abcdef123456', commitDate: '2026-09-21T01:02:00Z' });
  cancel.mockReset().mockResolvedValue(undefined); track.mockReset(); setAuto.mockReset();
  store = createStore(); store.set(interactiveWidgetHostAtom(sessionId), host);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Git commit proposal localization and preserved actions', () => {
  it('retains input, selection, folder state and raw payload through locale changes', async () => {
    const msg = message();
    const view = render(localized(msg, 'en'));
    expect(screen.getByText('Commit Proposal')).toBeTruthy();
    const input = screen.getByTestId('git-commit-message-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '  Edited message /literal  ' } });
    fireEvent.click(screen.getByTitle('New file'));
    fireEvent.click(view.container.querySelector('.git-commit-widget__directory-header')!);
    view.rerender(localized(msg));
    expect(screen.getByText('コミットの提案')).toBeTruthy();
    expect(screen.getByText('分析')).toBeTruthy();
    expect(screen.getByText('Original reasoning')).toBeTruthy();
    expect(screen.getByText('ステージするファイル（2/3）')).toBeTruthy();
    expect(screen.queryByText('z.ts')).toBeNull();
    expect(screen.getByTestId('git-commit-message-input')).toBe(input);
    expect(input.value).toBe('  Edited message /literal  ');
    expect(input.placeholder).toBe(locale.getFixedT('ja')('git:commit_placeholder'));
    fireEvent.click(view.container.querySelector('.git-commit-widget__directory-header')!);
    expect(screen.getByTitle(locale.getFixedT('ja')('files:edits.deleted'))).toBeTruthy();
    expect(screen.getByTitle(locale.getFixedT('ja')('files:edits.modified'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /確認してコミット/ }));
    await screen.findByText('変更をコミットしました');
    expect(commit).toHaveBeenCalledExactlyOnceWith('raw-tool', ['src/a.ts', 'readme.md'], '  Edited message /literal  ');
    expect(screen.getByText('2個のファイルをコミットしました')).toBeTruthy();
    expect(screen.getByText('abcdef1')).toBeTruthy();
    expect(track).toHaveBeenCalledWith('git_commit_proposal_response', { action: 'committed', file_count: '1-5', success: true, auto_commit: false });
    view.rerender(localized(msg, 'en'));
    expect(screen.getByText('2 files committed')).toBeTruthy();
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it.each(['raw-tool', 'item_8', 'nimtc|item_8|1000|7'])('preserves proposal lookup IDs on cancel: %s', async id => {
    const msg = message(undefined, id);
    const view = render(localized(msg));
    fireEvent.click(screen.getByTestId('git-commit-cancel'));
    expect(screen.getByTestId('git-commit-widget').getAttribute('data-state')).toBe('cancelled');
    expect(screen.getByTestId('git-commit-cancelled').textContent).toBe(locale.getFixedT('ja')('aichat:interactive.cancelled'));
    expect(cancel).toHaveBeenCalledExactlyOnceWith(id === 'item_8' ? buildCodexToolLookupId(id, 1000, 7) : id);
    expect(commit).not.toHaveBeenCalled();
    view.rerender(localized(msg, 'en'));
    expect(screen.getByText('Cancelled')).toBeTruthy();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('keeps mobile pending state until the synced result arrives, without duplicate commits', async () => {
    commit.mockResolvedValue({ success: false, pending: true });
    const msg = message();
    const view = render(localized(msg, 'en'));
    fireEvent.click(screen.getByTestId('git-commit-confirm'));
    await screen.findByText('Committing...');
    view.rerender(localized(msg));
    expect(screen.getByText(locale.getFixedT('ja')('git:committing'))).toBeTruthy();
    expect((screen.getByTestId('git-commit-confirm') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('git-commit-cancel') as HTMLButtonElement).disabled).toBe(true);
    view.rerender(localized(message({ action: 'committed', commitHash: 'abcdef1234' })));
    expect(screen.getByText('変更をコミットしました')).toBeTruthy();
    expect(screen.getByText('abcdef1')).toBeTruthy();
    expect(commit).toHaveBeenCalledTimes(1);
    expect(track).not.toHaveBeenCalled();
  });

  it.each([
    { action: 'failed' }, { success: false }, { status: 'failed' },
  ])('localizes only generated failure fallbacks: %j', result => {
    const msg = message(result);
    const view = render(localized(msg, 'en'));
    expect(screen.getByTestId('git-commit-error').textContent).toBe('Commit Failed');
    view.rerender(localized(msg));
    expect(screen.getByTestId('git-commit-error').textContent).toBe('コミットに失敗しました');
  });

  it.each(['Commit failed', 'Custom Git error /path'])('preserves real error text even if it matches an old fallback: %s', error => {
    render(localized(message({ action: 'error', error })));
    expect(screen.getByTestId('git-commit-error').textContent).toBe(error);
  });

  it('preserves rejected host errors and local-result state through locale switches', async () => {
    commit.mockRejectedValue(new Error('Raw exception'));
    const msg = message();
    const view = render(localized(msg));
    fireEvent.click(screen.getByTestId('git-commit-confirm'));
    expect((await screen.findByTestId('git-commit-error')).textContent).toBe('Raw exception');
    view.rerender(localized(msg, 'en'));
    expect(screen.getByText('Commit Failed')).toBeTruthy();
    expect(screen.getByTestId('git-commit-error').textContent).toBe('Raw exception');
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it.each(['structured', 'json', 'text', 'content', 'nested'])('retains completed parsing/hash/date for %s results', shape => {
    const data = { action: 'committed', commitHash: 'abcdef1234', commitDate: '2026-09-21T01:02:00Z' };
    const text = 'Changes committed\nCommit hash: abcdef1234\nCommit date: 2026-09-21T01:02:00Z';
    const result = shape === 'structured' ? data : shape === 'json' ? JSON.stringify(data) : shape === 'text' ? text : shape === 'content' ? [{ type: 'text', text }] : { result: data };
    const msg = message(result, 'raw-tool', { filesToStage: ['raw.ts'] });
    const view = render(localized(msg, 'en'));
    expect(screen.getByText('1 file committed')).toBeTruthy();
    view.rerender(localized(msg));
    expect(screen.getByText('1個のファイルをコミットしました')).toBeTruthy();
    expect(screen.getByText('abcdef1')).toBeTruthy();
    expect(screen.getByText(new Date(data.commitDate).toLocaleString('ja', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }))).toBeTruthy();
    expect(screen.getByTitle('raw.ts')).toBeTruthy();
    expect(commit).not.toHaveBeenCalled();
  });

  it.each(['cancelled', 'canceled', { status: 'cancelled' }])('retains cancellation protocol interpretation: %j', result => {
    render(localized(message(result)));
    expect(screen.getByTestId('git-commit-widget').getAttribute('data-state')).toBe('cancelled');
    expect(cancel).not.toHaveBeenCalled();
  });

  it('keeps server auto-commit success latched when disabled, without renderer commits', () => {
    store.set(interactiveWidgetHostAtom(sessionId), { ...host, autoCommitEnabled: true });
    const msg = message();
    const view = render(localized(msg));
    fireEvent.click(screen.getByRole('checkbox', { name: '今後のコミットを自動承認する' }));
    expect(setAuto).toHaveBeenCalledExactlyOnceWith(false);
    expect(track).toHaveBeenCalledWith('auto_commit_disabled', { source: 'commit_success_widget' });
    act(() => store.set(interactiveWidgetHostAtom(sessionId), host));
    view.rerender(localized(msg, 'en'));
    expect(screen.getByText('Changes Committed')).toBeTruthy();
    expect(screen.getByText('Auto-approve future commits')).toBeTruthy();
    expect(screen.queryByTestId('git-commit-confirm')).toBeNull();
    expect(commit).not.toHaveBeenCalled();
  });

  it('still confirms immediately when auto-approval is enabled on a pending proposal', async () => {
    render(localized(message()));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(setAuto).toHaveBeenCalledWith(true);
    await screen.findByText('変更をコミットしました');
    expect(commit).toHaveBeenCalledExactlyOnceWith('raw-tool', ['src/z.ts', 'src/a.ts', 'readme.md'], 'Original message');
    expect(track).toHaveBeenCalledWith('auto_commit_enabled', { source: 'commit_widget' });
  });

  it('preserves disable-auto-approve action on completed results', () => {
    store.set(interactiveWidgetHostAtom(sessionId), { ...host, autoCommitEnabled: true });
    render(localized(message({ action: 'committed' })));
    fireEvent.click(screen.getByRole('button', { name: '自動承認を無効にする' }));
    expect(setAuto).toHaveBeenCalledExactlyOnceWith(false);
    expect(track).toHaveBeenCalledWith('auto_commit_disabled', { source: 'commit_success_widget' });
    expect(commit).not.toHaveBeenCalled();
  });

  it.each(['tool', 'arguments', 'id'])('handles missing %s followed by valid data without changing hook order', missing => {
    const invalid = message(undefined, missing === 'id' ? '' : 'raw-tool');
    if (missing === 'tool') invalid.toolCall = undefined;
    if (missing === 'arguments') invalid.toolCall!.arguments = null as never;
    const view = render(localized(invalid));
    expect(view.container.textContent).toBe('');
    view.rerender(localized(message()));
    expect(screen.getByText('コミットの提案')).toBeTruthy();
    expect((screen.getByTestId('git-commit-message-input') as HTMLTextAreaElement).value).toBe('Original message');
  });

  it('keeps selection/message guards and JSON-string file inputs', async () => {
    const msg = message(undefined, 'raw-tool', { filesToStage: JSON.stringify(['raw.ts']), commitMessage: '   ' });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(localized(msg));
    const confirm = screen.getByTestId('git-commit-confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('git-commit-message-input'), { target: { value: 'New message' } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(screen.getByText('raw.ts'));
    expect(confirm.disabled).toBe(true);
    fireEvent.click(confirm);
    expect(commit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('raw.ts'));
    fireEvent.click(confirm);
    await waitFor(() => expect(commit).toHaveBeenCalledExactlyOnceWith('raw-tool', ['raw.ts'], 'New message'));
  });

  it.each([1, 2])('provides grammatical English fallback without a translation host (%s files)', count => {
    render(<Provider store={store}>{widget(message({ action: 'committed' }, 'raw-tool', { filesToStage: ['a.ts', 'b.ts'].slice(0, count) }))}</Provider>);
    expect(screen.getByText(count === 1 ? '1 file committed' : '2 files committed')).toBeTruthy();
  });

  it('translates diff peek titles while preserving the pinned file, selection and cached request', async () => {
    const getDiff = vi.fn().mockResolvedValue({ unifiedDiff: '', isBinary: true });
    store.set(interactiveWidgetHostAtom(sessionId), { ...host, gitFileDiff: getDiff });
    const msg = message(undefined, 'raw-tool', { filesToStage: ['raw.bin'] });
    const view = render(localized(msg, 'en'));
    fireEvent.click(screen.getByTitle('Show diff'));
    await waitFor(() => expect(getDiff).toHaveBeenCalledExactlyOnceWith('raw.bin'));
    expect(screen.getByTitle('Hide diff')).toBeTruthy();
    view.rerender(localized(msg));
    expect(screen.getByTitle(locale.getFixedT('ja')('files:edits.hide_diff'))).toBeTruthy();
    expect(screen.getByText('ステージするファイル（1/1）')).toBeTruthy();
    fireEvent.click(screen.getByTitle(locale.getFixedT('ja')('files:edits.hide_diff')));
    expect(screen.getByTitle(locale.getFixedT('ja')('files:edits.show_diff'))).toBeTruthy();
    expect(getDiff).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
  });
});
