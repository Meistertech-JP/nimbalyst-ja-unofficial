import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { createHeadlessEditor } from '@lexical/headless';
import { $createMarkNode, MarkNode } from '@lexical/mark';
import { $createParagraphNode, $createTextNode, $getRoot, getNearestEditorFromDOMNode, KEY_ENTER_COMMAND, type LexicalEditor } from 'lexical';
import { Doc } from 'yjs';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import CommentsPlugin, { OPEN_COMMENT_COMPOSER_COMMAND } from '../../../../../runtime/src/editor/plugins/CommentPlugin';
import { CommentStore, createComment, createThread, type Thread } from '../../../../../runtime/src/editor/commenting';
import { CommentCollabProvider } from '../../../../../runtime/src/editor/commenting/CommentCollabProvider';
import type { CommentsConfig } from '../../../../../runtime/src/editor/commenting/types';

// jsdom cannot measure a native text-selection rectangle; all editor/store operations remain real.
vi.mock('../../../../../runtime/src/editor/utils/getDOMRangeRect', () => ({ getDOMRangeRect: () => new DOMRect(0, 0, 20, 20) }));
const locale = i18next.createInstance();
let doc: Doc;
let pane: HTMLDivElement;
let anchor: HTMLDivElement;
let editor: LexicalEditor;
let config: CommentsConfig;
function CaptureEditor() { [editor] = useLexicalComposerContext(); return null; }
const initialConfig = {
  namespace: 'comments-i18n', nodes: [MarkNode], onError: (error: Error) => { throw error; },
  editorState: () => { $getRoot().append($createParagraphNode().append($createMarkNode(['thread-raw']).append($createTextNode('Raw quoted text')))); },
};
function localized(language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    <LexicalComposer initialConfig={initialConfig}><CaptureEditor /><ContentEditable aria-label="Raw document" /><CommentsPlugin config={config} anchorElem={anchor} /></LexicalComposer>
  </RuntimeTranslationProvider>;
}
function seed(threads: Thread[]) {
  const store = new CommentStore(createHeadlessEditor({ namespace: 'seed-comments', onError: error => { throw error; } }));
  const dispose = store.registerCollaboration(new CommentCollabProvider(doc));
  for (const thread of threads) store.addComment(thread);
  dispose();
}
const comment = (id = 'comment-raw', body = 'Raw comment body') => createComment(body, 'Raw Reviewer', {
  id, timeStamp: new Date('2026-09-20T08:05:00Z').getTime(), actor: { kind: 'user', userId: 'reviewer-id', displayName: 'Raw Reviewer' },
});
const sharedThreads = () => doc.getArray('comments').toJSON() as Array<Record<string, any>>;
async function enterReply(text: string) {
  const input = screen.getByRole('textbox', { name: '' });
  const nested = getNearestEditorFromDOMNode(input);
  if (!nested) throw new Error('Expected the real nested comment editor');
  await act(async () => nested.update(() => { $getRoot().clear().append($createParagraphNode().append($createTextNode(text))); }));
  return { input, nested };
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  doc = new Doc();
  pane = document.createElement('div'); anchor = document.createElement('div');
  pane.append(anchor); document.body.append(pane);
  config = { getYDoc: vi.fn(() => doc), currentUser: { id: 'me-id', name: 'Raw Me' }, getMembers: vi.fn(() => []), documentTitle: 'Raw Doc', documentId: 'doc-raw', documentUri: 'collab://org:raw:doc:raw', onMention: vi.fn(), onReply: vi.fn() };
});
afterEach(() => { cleanup(); pane.remove(); doc.destroy(); vi.restoreAllMocks(); });

describe('localized collaborative comments with real Y.Doc state', () => {
  it('updates docked empty-panel labels without remounting or reconnecting the store', () => {
    const view = render(localized('en'));
    fireEvent.click(screen.getByTestId('comments-toggle'));
    const panel = screen.getByTestId('comments-panel');
    expect(pane.contains(panel)).toBe(true);
    expect(pane.classList.contains('comments-panel-open')).toBe(true);
    const calls = vi.mocked(config.getYDoc).mock.calls.length;
    view.rerender(localized());
    expect(screen.getByTestId('comments-panel')).toBe(panel);
    expect(screen.getByText('コメントはまだありません。ドキュメント内のテキストを選択して追加してください。')).toBeTruthy();
    expect(config.getYDoc).toHaveBeenCalledTimes(calls);
    fireEvent.click(screen.getByRole('button', { name: 'コメントを閉じる' }));
    expect(screen.getByRole('button', { name: 'コメントの表示を切り替え' }).title).toBe('コメント');
    expect(pane.classList.contains('comments-panel-open')).toBe(false);
  });

  it('localizes agent attribution, reply targets and dates without modifying content or session routing', () => {
    const agent = createComment('Raw agent body', 'legacy', { id: 'agent-comment', timeStamp: 1000, replyToCommentId: 'comment-raw', actor: { kind: 'agent', sessionId: 'agent-id', sessionName: 'Raw Agent', onBehalfOfUserId: 'owner-id', onBehalfOfDisplayName: 'Raw Owner' } });
    const orphan = createComment('Raw orphan', 'Raw author', { replyToCommentId: 'missing-id' });
    seed([createThread('Raw quote', [comment(), agent, orphan], 'thread-raw')]);
    const view = render(localized('en'));
    fireEvent.click(screen.getByTestId('comments-toggle'));
    const snapshot = sharedThreads();
    const event = vi.fn();
    window.addEventListener('open-ai-session', event);
    try {
      view.rerender(localized());
      expect(screen.getByText('Raw Ownerの代理')).toBeTruthy();
      expect(screen.getByText('Raw Reviewerへの返信')).toBeTruthy();
      expect(screen.getByText('以前のコメントへの返信')).toBeTruthy();
      expect(screen.getByText('Raw agent body')).toBeTruthy();
      fireEvent.click(screen.getByTitle('エージェントセッション「Raw Agent」を開く'));
      expect(event).toHaveBeenCalledOnce();
      expect((event.mock.calls[0][0] as CustomEvent).detail).toEqual({ sessionId: 'agent-id' });
      expect(sharedThreads()).toEqual(snapshot);
      expect(pane.querySelector('.nim-comment-time')!.textContent).toBe(new Date(comment().timeStamp).toLocaleString('ja', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
    } finally { window.removeEventListener('open-ai-session', event); }
  });

  it.each([1, 2])('keeps %i comments and mark identity through resolve, locale switch and unresolve', async count => {
    seed([createThread('Raw quote', Array.from({ length: count }, (_, index) => comment(`comment-${index}`)), 'thread-raw')]);
    const view = render(localized('en'));
    fireEvent.click(screen.getByTestId('comments-toggle'));
    const mark = view.container.querySelector('mark');
    fireEvent.click(screen.getByText('Resolve'));
    expect(sharedThreads()[0].resolved).toBe(true);
    expect(screen.getByText(`${count} ${count === 1 ? 'comment' : 'comments'} · Resolved`)).toBeTruthy();
    view.rerender(localized());
    expect(screen.getByText(`コメント${count}件 · 解決済み`)).toBeTruthy();
    expect(view.container.querySelector('mark')).toBe(mark);
    expect(sharedThreads()[0].comments).toHaveLength(count);
    fireEvent.click(screen.getByText('未解決に戻す'));
    expect(sharedThreads()[0].resolved).toBe(false);
    expect(screen.getByTitle('スレッドを削除')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByTitle('スレッドを削除')));
    expect(sharedThreads()).toEqual([]);
    expect(view.container.querySelector('mark')).toBeNull();
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('Raw quoted text');
  });

  it('retains a drafted reply across locales and submits the same trimmed text, IDs and reply notification once', async () => {
    seed([createThread('Raw quote', [comment()], 'thread-raw')]);
    const view = render(localized('en'));
    fireEvent.click(screen.getByTestId('comments-toggle'));
    const { input, nested } = await enterReply('  Raw reply\nsecond line  ');
    view.rerender(localized());
    expect(screen.getByRole('textbox', { name: '' })).toBe(input);
    expect(input.getAttribute('aria-placeholder')).toBe('返信…');
    expect(input.textContent).toContain('Raw reply');
    await act(async () => nested.dispatchCommand(KEY_ENTER_COMMAND, new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true })));
    const reply = sharedThreads()[0].comments[1];
    expect(reply).toMatchObject({ content: 'Raw reply\nsecond line', replyToCommentId: 'comment-raw', actor: { kind: 'user', userId: 'me-id', displayName: 'Raw Me' } });
    expect(config.onReply).toHaveBeenCalledExactlyOnceWith(['reviewer-id'], expect.objectContaining({ commentId: reply.id, clientMutationId: reply.clientMutationId, replyToCommentId: 'comment-raw', threadId: 'thread-raw', sourceTitle: 'Raw Doc', snippet: reply.content, url: config.documentUri }));
    expect(config.onMention).not.toHaveBeenCalled();
    expect((screen.getByText('返信').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('removes only the requested comment and localizes a missing quote', async () => {
    seed([createThread('', [comment('first', 'Raw first'), comment('second', 'Raw second')], 'thread-raw')]);
    render(localized());
    fireEvent.click(screen.getByTestId('comments-toggle'));
    expect(screen.getByText('（引用なし）')).toBeTruthy();
    const first = screen.getByText('Raw first').closest('.nim-comment')! as HTMLElement;
    await act(async () => fireEvent.click(within(first).getByRole('button', { name: 'コメントを削除' })));
    expect(sharedThreads()[0].comments.map((item: { id: string }) => item.id)).toEqual(['second']);
    expect(screen.getByText('Raw second')).toBeTruthy();
  });

  it('translates only a deleted sentinel, preserving identical user-written text and canonical storage', () => {
    const deleted = createComment('[Deleted Comment]', 'Raw author', { deleted: true });
    seed([createThread('Raw quote', [deleted, comment('literal', '[Deleted Comment]'), createComment('Raw archived content', 'Raw author', { deleted: true })], 'thread-raw')]);
    const view = render(localized('en'));
    fireEvent.click(screen.getByTestId('comments-toggle'));
    const snapshot = sharedThreads();
    view.rerender(localized());
    expect(screen.getByText('［削除済みコメント］')).toBeTruthy();
    expect(screen.getByText('[Deleted Comment]')).toBeTruthy();
    expect(screen.getByText('Raw archived content')).toBeTruthy();
    expect(sharedThreads()).toEqual(snapshot);
  });

  it.each(['cancel', 'submit'])('localizes a new-comment popover, retains its draft and preserves %s behavior', async action => {
    const view = render(localized('en'));
    await act(async () => editor.update(() => { $getRoot().select(0, 1); }));
    await act(async () => editor.dispatchCommand(OPEN_COMMENT_COMPOSER_COMMAND, undefined));
    expect(screen.getByTestId('comment-composer')).toBeTruthy();
    const { input } = await enterReply('Raw unsent draft');
    view.rerender(localized());
    expect(input.getAttribute('aria-placeholder')).toBe('コメントを追加… @でメンション');
    expect(input.textContent).toBe('Raw unsent draft');
    expect(sharedThreads()).toHaveLength(1);
    if (action === 'cancel') {
      await act(async () => fireEvent.click(screen.getByText('キャンセル')));
      expect(sharedThreads()).toEqual([]);
      expect(screen.queryByTestId('comment-composer')).toBeNull();
    } else {
      await act(async () => fireEvent.click(within(screen.getByTestId('comment-composer')).getByRole('button', { name: locale.getFixedT('ja')('common:pull_request.comment') })));
      expect(sharedThreads()[0].comments).toHaveLength(1);
      expect(sharedThreads()[0].comments[0]).toMatchObject({ content: 'Raw unsent draft', actor: { kind: 'user', userId: 'me-id', displayName: 'Raw Me' } });
      expect(screen.getByTestId('comments-panel')).toBeTruthy();
      expect(document.querySelector('.nim-comment-composer-popover')).toBeNull();
      expect(config.onMention).not.toHaveBeenCalled();
      expect(config.onReply).not.toHaveBeenCalled();
    }
  });
});
