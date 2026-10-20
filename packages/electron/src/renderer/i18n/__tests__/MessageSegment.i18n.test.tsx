import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { MessageSegment } from '../../../../../runtime/src/ui/AgentTranscript/components/MessageSegment';
import { FullscreenModal } from '../../../../../runtime/src/ui/AgentTranscript/components/FullscreenModal';
import { DiffViewer } from '../../../../../runtime/src/ui/AgentTranscript/components/DiffViewer';
import { JSONViewer } from '../../../../../runtime/src/ui/AgentTranscript/components/JSONViewer';
import { CommitRequestCard, parseCommitRequest } from '../../../../../runtime/src/ui/AgentTranscript/components/CommitRequestCard';
import type { TranscriptViewMessage } from '../../../../../runtime/src/ai/server/types';

const locale = i18next.createInstance();
const invoke = vi.fn();
const toggleTool = vi.fn();
type Props = React.ComponentProps<typeof MessageSegment>;
const attachment = { id: 'raw-attachment', type: 'document' as const, filename: 'raw.txt', filepath: '/raw/path.txt', size: 2048, mimeType: 'text/plain' };
const base: TranscriptViewMessage = { id: 1, sequence: 1, createdAt: new Date(2026, 8, 21), type: 'user_message', subagentId: null, attachments: [attachment] };
function translated(children: React.ReactNode, language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider>;
}
function localized(props: Partial<Props> = {}, language = 'ja') {
  return translated(<MessageSegment message={base} isUser showToolCalls showThinking expandedTools={new Set(['raw-tool'])} onToggleToolExpand={toggleTool} {...props} />, language);
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  invoke.mockReset(); toggleTool.mockReset();
  vi.stubGlobal('electronAPI', { invoke });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('message segment localized previews', () => {
  it.each([
    ['text', '[Binary file - preview not available]', '[Binary file - preview not available]'],
    ['binary', '[Binary file - preview not available]', '[バイナリファイルのためプレビューできません]'],
    ['missing', 'File not found', 'ファイルが見つかりません'],
    ['failed', 'Failed to read file', 'ファイルを読み込めませんでした'],
    ['unavailable', 'File reading not available', 'ファイルの読み取りを利用できません'],
    ['raw-error', 'Raw exception /literal', 'Raw exception /literal'],
    ['unknown-error', 'Failed to read file', 'ファイルを読み込めませんでした'],
  ])('updates %s preview presentation without refetching or translating file content', async (kind, english, japanese) => {
    if (kind === 'text') invoke.mockResolvedValue({ success: true, content: english });
    if (kind === 'binary') invoke.mockResolvedValue({ success: true, isBinary: true });
    if (kind === 'missing') invoke.mockResolvedValue(null);
    if (kind === 'failed') invoke.mockResolvedValue({ success: false });
    if (kind === 'unavailable') vi.stubGlobal('electronAPI', undefined);
    if (kind === 'raw-error') invoke.mockRejectedValue(new Error(english));
    if (kind === 'unknown-error') invoke.mockRejectedValue({ code: 'opaque' });
    const view = render(localized({}, 'en'));
    fireEvent.click(screen.getByTitle('Click to preview'));
    await screen.findByText(english);
    const portal = screen.getByRole('dialog', { name: 'Text file preview' });
    view.rerender(localized());
    expect(screen.getByRole('dialog', { name: 'テキストファイルのプレビュー' })).toBe(portal);
    expect(within(portal).getByText(japanese)).toBeTruthy();
    expect(within(portal).getByText('raw.txt')).toBeTruthy();
    expect(screen.getByText('2.0 KB')).toBeTruthy();
    if (kind === 'unavailable') expect(invoke).not.toHaveBeenCalled();
    else expect(invoke).toHaveBeenCalledExactlyOnceWith('read-file-content', '/raw/path.txt');
    view.rerender(localized({}, 'en'));
    expect(within(portal).getByText(english)).toBeTruthy();
    fireEvent.click(within(portal).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('switches the pending loading caption and renders the original delayed content', async () => {
    let resolveRead!: (value: unknown) => void;
    invoke.mockReturnValue(new Promise(resolve => { resolveRead = resolve; }));
    const view = render(localized({}, 'en'));
    fireEvent.click(screen.getByTitle('Click to preview'));
    expect(screen.getByText('Loading…')).toBeTruthy();
    view.rerender(localized());
    expect(screen.getByText('読み込み中…')).toBeTruthy();
    await act(async () => resolveRead({ success: true, content: 'Raw delayed content' }));
    expect(screen.getByText('Raw delayed content')).toBeTruthy();
    expect(invoke).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('preserves image source and filename while switching portal and close labels', () => {
    const image = { ...attachment, type: 'image' as const, filename: 'raw.png', filepath: 'data:image/png;base64,AA==', thumbnail: 'data:image/png;base64,BB==' };
    const props = { message: { ...base, attachments: [image] } };
    const view = render(localized(props, 'en'));
    fireEvent.click(screen.getByTitle('Click to preview'));
    const portal = screen.getByRole('dialog', { name: 'Image preview' });
    view.rerender(localized(props));
    expect(screen.getByRole('dialog', { name: '画像プレビュー' })).toBe(portal);
    expect(within(portal).getByRole('img', { name: 'raw.png' }).getAttribute('src')).toBe(image.filepath);
    fireEvent.click(within(portal).getByRole('img'));
    expect(screen.getByRole('dialog')).toBe(portal);
    fireEvent.click(within(portal).getByRole('button', { name: '閉じる' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('localizes the default modal name, preserves custom labels and backdrop dismissal', () => {
    const close = vi.fn();
    const child = <FullscreenModal isOpen onClose={close}><span>Raw child</span></FullscreenModal>;
    const view = render(translated(child, 'en'));
    const portal = screen.getByRole('dialog', { name: 'Modal' });
    view.rerender(translated(child));
    expect(screen.getByRole('dialog', { name: 'ダイアログ' })).toBe(portal);
    fireEvent.click(portal);
    expect(close).toHaveBeenCalledTimes(1);
    view.rerender(translated(<FullscreenModal isOpen onClose={close} ariaLabel="Custom label"><span>Raw child</span></FullscreenModal>));
    expect(screen.getByRole('dialog', { name: 'Custom label' })).toBe(portal);
  });
});

describe('message segment localized content', () => {
  it('keeps JSON keys, literals and user strings as technical data', () => {
    const data = { null: null, success: true, count: 3, label: 'Unknown file', list: [false, 'Thinking'] };
    const view = render(translated(<JSONViewer data={data} />, 'en'));
    const content = view.container.textContent;
    view.rerender(translated(<JSONViewer data={data} />));
    expect(view.container.textContent).toBe(content);
    expect(content).toContain('"null": null');
    expect(content).toContain('"success": true');
    expect(content).toContain('"Unknown file"');
  });

  it('localizes diff captions while keeping raw operations, instructions and path callbacks', () => {
    const onOpenFile = vi.fn();
    const edit = { operation: 'custom_op', instruction: 'Raw edit instruction' };
    const view = render(translated(<DiffViewer edit={edit} />, 'en'));
    expect(screen.getByText('Unknown file')).toBeTruthy();
    view.rerender(translated(<DiffViewer edit={edit} />));
    expect(screen.getByText('不明なファイル')).toBeTruthy();
    expect(screen.getByText('操作: custom_op')).toBeTruthy();
    expect(screen.getByText('Raw edit instruction')).toBeTruthy();
    view.rerender(translated(<DiffViewer edit={edit} filePath="display.md" absoluteFilePath="/raw/path.md" onOpenFile={onOpenFile} />));
    fireEvent.click(screen.getByTitle('/raw/path.mdを開く'));
    expect(onOpenFile).toHaveBeenCalledExactlyOnceWith('/raw/path.md');
    expect(screen.getByRole('button', { name: 'display.md' })).toBeTruthy();
  });

  it('retains diff text and stable hooks when locale and replacement count change', () => {
    const edit = { replacements: [{ oldText: 'old literal\nold second', newText: 'new literal' }, { oldText: 'old third', newText: 'new third' }] };
    const view = render(translated(<DiffViewer edit={edit} />, 'en'));
    expect(screen.getByText('Unknown file (1/2)')).toBeTruthy();
    view.rerender(translated(<DiffViewer edit={edit} />));
    expect(screen.getByText('不明なファイル (1/2)')).toBeTruthy();
    expect(screen.getByText('old literal')).toBeTruthy();
    expect(screen.getByText('new third')).toBeTruthy();
    view.rerender(translated(<DiffViewer edit={{ old_string: 'before', new_string: 'after' }} />));
    expect(screen.getByText('不明なファイル')).toBeTruthy();
    expect(screen.getByText('before')).toBeTruthy();
    expect(screen.getByText('after')).toBeTruthy();
    view.rerender(translated(<DiffViewer edit={{ content: 'Raw insertion' }} />));
    expect(screen.getByText('Raw insertion')).toBeTruthy();
  });

  it.each(['single', 'workstream'] as const)('localizes the %s commit card without changing its protocol parser', scenario => {
    const raw = 'Use the developer_git_commit_proposal tool to create a commit.\nHere are the files edited' +
      (scenario === 'workstream' ? ' across 3 sessions' : ' in this session') +
      '\n- src/raw.ts (modified)\n- src/new.ts (added)\nThis is a worktree branch';
    const request = parseCommitRequest(raw)!;
    expect(request).toEqual({ files: [{ path: 'src/raw.ts', status: 'modified' }, { path: 'src/new.ts', status: 'added' }], scenario, sessionCount: scenario === 'workstream' ? 3 : undefined, isWorktree: true });
    const view = render(translated(<CommitRequestCard request={request} />, 'en'));
    fireEvent.click(screen.getByRole('button', { name: /Requesting commit proposal/ }));
    const file = screen.getByText('raw.ts');
    view.rerender(translated(<CommitRequestCard request={request} />));
    expect(screen.getByRole('button', { name: /コミット案を依頼中/ })).toBeTruthy();
    expect(screen.getByText(scenario === 'workstream' ? '3件のセッションでファイル2件' : 'ファイル2件')).toBeTruthy();
    expect(screen.getByText('raw.ts')).toBe(file);
    expect(screen.getByText('worktree')).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('keeps the expanded thinking payload and user content verbatim', () => {
    const props = { isUser: false, message: { ...base, type: 'assistant_message' as const, text: 'Raw answer', thinking: 'Raw thinking payload' } };
    const view = render(localized(props, 'en'));
    const details = screen.getByText('Thinking').closest('details')!;
    details.open = true;
    view.rerender(localized(props));
    expect(screen.getByText('思考内容').closest('details')).toBe(details);
    expect(details.open).toBe(true);
    expect(screen.getByText('Raw thinking payload')).toBeTruthy();
    expect(screen.getByText('Raw answer')).toBeTruthy();
    view.rerender(localized({ ...props, showThinking: false }));
    expect(screen.queryByText('Raw thinking payload')).toBeNull();
  });

  it.each([undefined, 'Raw result', '{"success":false,"error":"Raw failure"}'])('localizes tool outcome with original payload %s', result => {
    const message: TranscriptViewMessage = { ...base, type: 'tool_call', toolCall: { toolName: 'web_search', toolDisplayName: 'web_search', status: 'completed', description: null, arguments: { query: 'Raw query' }, targetFilePath: null, mcpServer: null, mcpTool: null, providerToolCallId: 'raw-tool', progress: [], result } };
    const props = { isUser: false, message };
    const view = render(localized(props, 'en'));
    expect(screen.getByText('Parameters:')).toBeTruthy();
    view.rerender(localized(props));
    expect(screen.getByText('ウェブ検索')).toBeTruthy();
    expect(screen.getByText('パラメーター:')).toBeTruthy();
    expect(screen.getByText(result?.includes('false') ? '失敗' : '成功')).toBeTruthy();
    expect(screen.getByText(result ?? 'ツールから結果が返されませんでした。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /ウェブ検索/ }));
    expect(toggleTool).toHaveBeenCalledExactlyOnceWith('raw-tool');
  });

  it.each([1, 2])('localizes %s edit counts and retains the expanded diff subtree', count => {
    const message: TranscriptViewMessage = { ...base, type: 'tool_call', toolCall: { toolName: 'Edit', toolDisplayName: 'Edit', status: 'completed', description: null, arguments: {}, targetFilePath: null, mcpServer: null, mcpTool: null, providerToolCallId: 'raw-tool', progress: [], changes: Array.from({ length: count }, (_, index) => ({ path: `/raw/${index}.md`, patch: 'raw patch' })) } };
    const props = { isUser: false, showToolCalls: false, message };
    const view = render(localized(props, 'en'));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${count} edit`) }));
    const diffs = view.container.querySelectorAll('.diff-viewer');
    expect(diffs.length).toBe(count);
    view.rerender(localized(props));
    expect(screen.getByRole('button', { name: new RegExp(`${count}件の編集`) })).toBeTruthy();
    expect(view.container.querySelector('.diff-viewer')).toBe(diffs[0]);
  });

  it('translates only the generic fallback error, not provider diagnostics', () => {
    const props = { isUser: false, message: { ...base, type: 'assistant_message' as const, isError: true } };
    const view = render(localized(props));
    expect(screen.getByText('エラー')).toBeTruthy();
    view.rerender(localized({ ...props, message: { ...props.message, text: 'Raw provider diagnostic' } }));
    expect(screen.getByText('Raw provider diagnostic')).toBeTruthy();
  });
});
