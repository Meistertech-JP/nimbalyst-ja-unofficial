import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createHeadingNode } from '@lexical/rich-text';
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { RuntimeSettingsProvider } from '../../../../../runtime/src/editor/context/RuntimeSettingsContext';
import FloatingDocumentActionsPlugin from '../../../../../runtime/src/editor/plugins/FloatingDocumentActionsPlugin';
import { $getFrontmatter, getEditorTransformers } from '../../../../../runtime/src/editor/markdown';

const locale = i18next.createInstance();
const invoke = vi.fn();
const copyToClipboard = vi.fn();
const onSwitchToAgentMode = vi.fn();
const onOpenSessionInChat = vi.fn();
const onToggleMarkdownMode = vi.fn();
const onViewHistory = vi.fn();
const onDirtyChange = vi.fn();
const notifyFrontmatterChanged = vi.fn();
const filePath = String.raw`C:\Raw Folder\Plan.md`;
let editor: LexicalEditor;
function CaptureEditor() { [editor] = useLexicalComposerContext(); return null; }
const config = {
  namespace: 'floating-actions-i18n', onError: (error: Error) => { throw error; },
  nodes: [...new Set(getEditorTransformers().flatMap(transformer => 'dependencies' in transformer ? transformer.dependencies : []))],
  editorState: () => { $getRoot().append($createHeadingNode('h2').append($createTextNode('Raw heading')), $createParagraphNode().append($createTextNode('Raw body'))); },
};
function localized(language = 'ja', props: Partial<React.ComponentProps<typeof FloatingDocumentActionsPlugin>> = {}) {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    <RuntimeSettingsProvider><LexicalComposer initialConfig={config}><CaptureEditor /><ContentEditable aria-label="Raw editor" />
      <FloatingDocumentActionsPlugin filePath={filePath} workspaceId="raw-workspace" onSwitchToAgentMode={onSwitchToAgentMode} onOpenSessionInChat={onOpenSessionInChat}
        config={{ onToggleMarkdownMode, onViewHistory, onDirtyChange }} {...props} />
    </LexicalComposer></RuntimeSettingsProvider>
  </RuntimeTranslationProvider>;
}
const tr = (key: string, language = 'ja') => locale.getFixedT(language)(key);
function actions(language = 'ja') { fireEvent.click(screen.getByRole('button', { name: tr('editor:shared_ui.document_actions', language) })); }
function sessions(language = 'ja') { fireEvent.click(screen.getByRole('button', { name: tr('editor:tooltips.ai_sessions', language) })); }
function types(language = 'ja') { fireEvent.mouseEnter(screen.getByText(tr('editor:document_type.set', language))); }
function session(id: string, elapsed: number, messageCount = 2) {
  return { id, title: `Raw ${id}`, provider: 'RawProvider', updatedAt: Date.now() - elapsed, createdAt: 1, messageCount };
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.resetAllMocks();
  invoke.mockResolvedValue([]);
  copyToClipboard.mockResolvedValue(undefined);
  vi.stubGlobal('electronAPI', { invoke, copyToClipboard });
  vi.stubGlobal('documentService', { notifyFrontmatterChanged });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('floating document actions localization and unchanged editor/session contracts', () => {
  it('keeps an open action menu across locales and preserves host callbacks and copied Markdown', async () => {
    const view = render(localized('en'));
    actions('en');
    const menu = view.container.querySelector('.floating-doc-actions-dropdown');
    expect(screen.getByText('Toggle Markdown Mode')).toBeTruthy();
    view.rerender(localized());
    expect(view.container.querySelector('.floating-doc-actions-dropdown')).toBe(menu);
    fireEvent.click(screen.getByText('Markdownモードを切り替え'));
    expect(onToggleMarkdownMode).toHaveBeenCalledExactlyOnceWith();
    expect(view.container.querySelector('.floating-doc-actions-dropdown')).toBeNull();
    actions();
    fireEvent.click(screen.getByText('履歴を表示'));
    expect(onViewHistory).toHaveBeenCalledExactlyOnceWith();
    actions();
    await act(async () => fireEvent.click(screen.getByText('Markdownとしてコピー')));
    expect(copyToClipboard).toHaveBeenCalledExactlyOnceWith('## Raw heading\nRaw body');
    expect(onDirtyChange).not.toHaveBeenCalled();
  });

  it('retains raw headings, heading identity and scroll target, then renders the live empty state', async () => {
    const view = render(localized('en'));
    fireEvent.click(screen.getByRole('button', { name: 'Table of Contents' }));
    const headingItem = view.container.querySelector('.toc-item')!;
    view.rerender(localized());
    expect(view.container.querySelector('.toc-item')).toBe(headingItem);
    expect(headingItem.textContent).toBe('Raw heading');
    const scroll = vi.fn();
    editor.getRootElement()!.firstElementChild!.scrollIntoView = scroll;
    await act(async () => fireEvent.click(headingItem));
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'center' });
    expect(view.container.querySelector('.floating-doc-toc-dropdown')).toBeNull();
    await act(async () => editor.update(() => { $getRoot().clear().append($createParagraphNode().append($createTextNode('Raw replacement'))); }));
    fireEvent.click(screen.getByRole('button', { name: '目次' }));
    expect(screen.getByText('ドキュメントに見出しはありません')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(view.container.querySelector('.floating-doc-toc-dropdown')).toBeNull();
  });

  it('translates pending sessions without refetching on locale changes and preserves session routing', async () => {
    let resolve!: (value: unknown) => void;
    invoke.mockReturnValue(new Promise(result => { resolve = result; }));
    const view = render(localized('en'));
    sessions('en');
    expect(screen.getByText('Loading sessions…')).toBeTruthy();
    const calls = invoke.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    for (const args of invoke.mock.calls) expect(args).toEqual(['sessions:get-by-file', 'raw-workspace', filePath]);
    const menu = view.container.querySelector('.floating-doc-ai-sessions-dropdown');
    view.rerender(localized());
    expect(view.container.querySelector('.floating-doc-ai-sessions-dropdown')).toBe(menu);
    expect(screen.getByText('セッションを読み込み中…')).toBeTruthy();
    expect(invoke).toHaveBeenCalledTimes(calls);
    await act(async () => resolve([session('raw-id', 120000)]));
    expect(screen.getByText('Raw raw-id')).toBeTruthy();
    expect(view.container.querySelector('.ai-session-meta')!.textContent).toContain('RawProvider');
    fireEvent.click(screen.getByTitle(tr('aichat:chat_sidebar.open_agent')));
    expect(onSwitchToAgentMode).toHaveBeenCalledExactlyOnceWith(undefined, 'raw-id');
    expect(view.container.querySelector('.floating-doc-ai-sessions-dropdown')).toBeNull();
    invoke.mockResolvedValue([session('raw-id', 120000)]);
    await act(async () => sessions());
    fireEvent.click(screen.getByTitle(tr('editor:tooltips.open_chat')));
    expect(onOpenSessionInChat).toHaveBeenCalledExactlyOnceWith('raw-id');
    await act(async () => sessions());
    fireEvent.click(screen.getByText(tr('editor:ai_sessions.start_new')));
    expect(onSwitchToAgentMode).toHaveBeenLastCalledWith(filePath);
  });

  it('keeps relative-time thresholds, localized older dates and raw session data across locales', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-21T12:00:00Z').getTime());
    const rows = [session('now', 0), session('minutes', 300000), session('hours', 7200000), session('days', 259200000), session('old', 777600000)];
    invoke.mockResolvedValue(rows);
    const view = render(localized('en'));
    await act(async () => sessions('en'));
    const metas = () => [...view.container.querySelectorAll('.ai-session-meta')].map(node => node.textContent);
    expect(metas()).toEqual(['just now', '5m ago', '2h ago', '3d ago', new Date(rows[4].updatedAt).toLocaleDateString('en')].map(time => `RawProvider • ${time} • 2 turns`));
    const count = invoke.mock.calls.length;
    view.rerender(localized());
    const t = locale.getFixedT('ja');
    expect(metas()).toEqual([
      t('sessions:relative_time.compact_just_now'), t('sessions:relative_time.compact_minutes', { count: 5 }),
      t('sessions:relative_time.compact_hours', { count: 2 }), t('sessions:relative_time.compact_days', { count: 3 }),
      new Date(rows[4].updatedAt).toLocaleDateString('ja'),
    ].map(time => `RawProvider • ${time} • ${t('aichat:session_dropdown.turns', { count: 2 })}`));
    expect(invoke).toHaveBeenCalledTimes(count);
    expect(screen.getByText('Raw old')).toBeTruthy();
  });

  it.each(['empty', 'null', 'error'])('retains the %s session fallback and the start-session action', async outcome => {
    if (outcome === 'null') invoke.mockResolvedValue(null);
    if (outcome === 'error') invoke.mockRejectedValue(new Error('Raw provider detail'));
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const view = render(localized('en'));
    await act(async () => sessions('en'));
    expect(screen.getByText('No AI sessions have edited this file yet')).toBeTruthy();
    view.rerender(localized());
    expect(screen.getByText('このファイルを編集したAIセッションはありません')).toBeTruthy();
    fireEvent.click(screen.getByText(tr('editor:ai_sessions.start_new')));
    expect(onSwitchToAgentMode).toHaveBeenCalledExactlyOnceWith(filePath);
    expect(diagnostic.mock.calls.length > 0).toBe(outcome === 'error');
  });

  it.each(['plan', 'decision'])('localizes the built-in %s display without changing persisted keys or notification payloads', async type => {
    const view = render(localized('en'));
    actions('en'); types('en');
    const menu = view.container.querySelector('.action-menu-submenu');
    view.rerender(localized());
    expect(view.container.querySelector('.action-menu-submenu')).toBe(menu);
    await act(async () => fireEvent.click(screen.getByText(tr(`editor:document_type.${type}`))));
    const field = type === 'plan' ? 'planStatus' : 'decisionStatus';
    const data = editor.getEditorState().read(() => $getFrontmatter());
    expect(Object.keys(data!)).toEqual([field]);
    expect(data![field]).toMatchObject({ status: type === 'plan' ? 'draft' : 'to-do', priority: 'medium', title: '' });
    expect(onDirtyChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(notifyFrontmatterChanged.mock.calls[0][0]).toBe(filePath);
    expect(notifyFrontmatterChanged.mock.calls[0][1][field]).toMatchObject({ status: type === 'plan' ? 'draft' : 'to-do' });
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toContain('Raw body');
    actions(); types();
    const selected = screen.getByText(tr(`editor:document_type.${type}`)).closest('button')!;
    expect(within(selected).getByText('✓')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByText(tr('editor:document_type.remove'))));
    expect(notifyFrontmatterChanged).toHaveBeenLastCalledWith(filePath, {});
    expect(onDirtyChange).toHaveBeenCalledTimes(2);
    expect(view.container.querySelector('.floating-doc-actions-dropdown')).toBeNull();
  });

  it('keeps missing-context session visibility guards and handles clipboard failure without modifying the document', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    copyToClipboard.mockRejectedValue(new Error('Raw clipboard failure'));
    const view = render(localized('ja', { workspaceId: undefined }));
    expect(screen.queryByRole('button', { name: 'AIセッション' })).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
    actions();
    await act(async () => fireEvent.click(screen.getByText('Markdownとしてコピー')));
    expect(diagnostic).toHaveBeenCalledWith('Failed to copy markdown:', expect.any(Error));
    expect(onDirtyChange).not.toHaveBeenCalled();
    expect(view.container.querySelector('.floating-doc-actions-dropdown')).toBeNull();
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toContain('Raw body');
  });
});
