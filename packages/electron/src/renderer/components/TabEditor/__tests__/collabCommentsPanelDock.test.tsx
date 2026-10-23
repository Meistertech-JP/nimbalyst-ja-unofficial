// @vitest-environment jsdom
/**
 * The host-owned comments pane for a collaborative extension tab, driven the
 * way the product drives it: through the SDK service's `openPanel`, and through
 * a deep-link request queued before the pane exists.
 *
 * Everything under test is production code over a real Y.Doc — the repository,
 * the hosted service, the anchor-adapter registry, and the shared panel. Only
 * the notification lane is replaced.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Doc } from 'yjs';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { errorNotificationService } from '../../../services/ErrorNotificationService';

import {
  collabCommentAnchorAdapterRegistry,
  collabCommentControllerRegistry,
} from '@nimbalyst/runtime/editor/commenting/CollabCommentControllerRegistry';
import type { CommentAnchor } from '@nimbalyst/runtime/editor/commenting/types';
import type { MountedCommentAnchorAdapter } from '@nimbalyst/extension-sdk';

import {
  createCommentPanelOpener,
  requestCommentPanel,
  resetCommentPanelRequests,
} from '../collabCommentPanelRequests';
import {
  CollabCommentsPanelDock,
  useCollabCommentsPanel,
} from '../CollabCommentsPanelDock';
import {
  createHostedCollaborationComments,
  type HostedCollaborationComments,
} from '../collaborationCommentsService';

vi.mock('../../../services/ErrorNotificationService', () => ({
  errorNotificationService: { showError: vi.fn() },
}));

const DOCUMENT_URI = 'collab://org:org-1:doc:mockup-1';
let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeEach(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

const PIN_ANCHOR: CommentAnchor = {
  kind: 'entity',
  entityType: 'mockup-pin',
  entityId: 'pin-1',
  labelSnapshot: 'button:Save changes',
};

function Harness({ hosted }: { hosted: HostedCollaborationComments }) {
  const panel = useCollabCommentsPanel({
    documentUri: DOCUMENT_URI,
    panelSource: hosted.panelSource,
  });
  return <CollabCommentsPanelDock hosted={hosted} panel={panel} />;
}

function renderHarness(
  hosted: HostedCollaborationComments,
  i18n = englishI18n,
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <Harness hosted={hosted} />
    </I18nextProvider>,
  );
}

describe('host-owned collaborative comments pane', () => {
  let hosted: HostedCollaborationComments;
  let capabilities: { read: boolean; comment: boolean };
  /** The extension's canvas. Deleting a pin is how a thread becomes orphaned. */
  let livePins: Set<string>;
  let focusCalls: string[];
  let threadId: string;

  const adapter = (): MountedCommentAnchorAdapter => ({
    handles: (anchor) =>
      anchor.kind === 'entity' && anchor.entityType === 'mockup-pin',
    getState: (anchor) =>
      anchor.kind === 'entity' && livePins.has(anchor.entityId)
        ? 'attached'
        : 'orphaned',
    describe: (anchor) =>
      anchor.kind === 'entity' ? anchor.labelSnapshot ?? anchor.entityId : '',
    focus: (anchor) => {
      if (anchor.kind !== 'entity') return false;
      focusCalls.push(anchor.entityId);
      return livePins.has(anchor.entityId);
    },
  });

  const cards = (container: HTMLElement): HTMLElement[] =>
    Array.from(container.querySelectorAll<HTMLElement>('.nim-comment-thread'));

  beforeEach(async () => {
    resetCommentPanelRequests();
    collabCommentAnchorAdapterRegistry.clear();
    collabCommentControllerRegistry.clear();
    livePins = new Set(['pin-1']);
    focusCalls = [];
    capabilities = { read: true, comment: true };

    hosted = createHostedCollaborationComments({
      yDoc: new Doc(),
      host: {
        currentUser: { id: 'user-1', name: 'Ada' },
        documentId: 'mockup-1',
        documentTitle: 'Checkout review',
        documentUri: DOCUMENT_URI,
        instanceId: 'instance-1',
        getMembers: () => [],
        isActive: () => true,
        isVisible: () => true,
        isHydrated: () => true,
        resolveCapabilities: async () => capabilities,
        onOpenPanel: createCommentPanelOpener(DOCUMENT_URI),
      },
    });
    hosted.service.registerAnchorAdapter(adapter());
    // Capabilities resolve asynchronously, and creation is refused until they do.
    await waitFor(() =>
      expect(hosted.service.getCapabilities().comment).toBe(true),
    );
    const created = await hosted.service.createThread({
      anchor: PIN_ANCHOR,
      content: 'Tighten this label',
      clientMutationId: 'mutation-1',
    });
    threadId = created.thread.id;
  });

  afterEach(() => {
    cleanup();
    hosted.destroy();
    collabCommentAnchorAdapterRegistry.clear();
    collabCommentControllerRegistry.clear();
    resetCommentPanelRequests();
  });

  it('opens on openPanel with that thread selected and its anchor focused', async () => {
    const { container } = renderHarness(hosted);

    await act(async () => {
      hosted.service.openPanel({ threadId });
    });

    const [card] = cards(container);
    expect(card.dataset.threadId).toBe(threadId);
    expect(card.getAttribute('aria-current')).toBe('true');
    await waitFor(() => expect(focusCalls).toEqual(['pin-1']));
    expect(
      container.querySelector('[data-testid="collab-comments-focus-notice"]'),
    ).toBeNull();
  });

  it('localizes the comments landmark label in Japanese', async () => {
    renderHarness(hosted, japaneseI18n);
    await act(async () => {
      hosted.service.openPanel({});
    });

    expect(screen.getByRole('complementary', { name: 'ドキュメントのコメント' })).toBeDefined();
  });

  it.each([
    ['en', 'No comments yet. Add one from the editor to start a thread.', 'No comments yet.'],
    ['ja', 'コメントはまだありません。エディターから追加するとスレッドを開始できます。', 'コメントはまだありません。'],
  ] as const)('localizes %s empty states after a capability downgrade', async (language, writable, readOnly) => {
    await hosted.panelSource.deleteThread(threadId);
    const { container } = renderHarness(hosted, language === 'ja' ? japaneseI18n : englishI18n);
    await act(async () => { hosted.service.openPanel({}); });
    expect(container.querySelector('.nim-comments-empty')?.textContent).toBe(writable);
    capabilities = { read: true, comment: false };
    // Refresh through the same refused operation used by the existing downgrade test.
    await act(async () => { await hosted.service.setResolved(threadId, true).catch(() => undefined); });
    await waitFor(() => expect(container.querySelector('.nim-comments-empty')?.textContent).toBe(readOnly));
    expect(container.querySelector('.nim-comment-composer-input')).toBeNull();
    expect(cards(container)).toHaveLength(0);
  });

  it('localizes a refused comment resolution and preserves the server error detail', async () => {
    vi.clearAllMocks();
    vi.spyOn(hosted.service, 'setResolved').mockRejectedValue(new Error('server refused'));
    renderHarness(hosted, japaneseI18n);
    await act(async () => {
      hosted.service.openPanel({});
    });

    fireEvent.click(await screen.findByRole('button', { name: '解決済みにする' }));

    await waitFor(() =>
      expect(errorNotificationService.showError).toHaveBeenCalledWith(
        'コメントを解決済みにできませんでした',
        'server refused',
      ),
    );
  });

  it('drains a deep-link request queued before the pane mounted', async () => {
    // The notification is clicked while the document is still opening, so the
    // request has to outlive the click and be picked up when the tab mounts.
    requestCommentPanel(DOCUMENT_URI, { threadId, source: 'deep-link' });

    const { container } = renderHarness(hosted);

    await waitFor(() => expect(focusCalls).toEqual(['pin-1']));
    expect(cards(container)[0].getAttribute('aria-current')).toBe('true');
  });

  it('keeps an orphaned thread visible and explains why focus is unavailable', async () => {
    const { container } = renderHarness(hosted);
    // A teammate deletes the element the thread hangs off. Losing the target
    // must not lose the conversation.
    livePins.delete('pin-1');

    await act(async () => {
      requestCommentPanel(DOCUMENT_URI, { threadId, source: 'deep-link' });
    });

    await waitFor(() =>
      expect(
        container.querySelector('[data-testid="collab-comments-focus-notice"]')
          ?.textContent,
      ).toMatch(/no longer in the document/i),
    );
    const [card] = cards(container);
    expect(card.dataset.threadId).toBe(threadId);
    expect(card.dataset.anchorState).toBe('orphaned');
    expect(card.textContent).toContain('Tighten this label');
  });

  it.each([
    ['missing', 'That comment is no longer in this document. It may have been deleted.', 'このコメントはドキュメント内にありません。削除された可能性があります。'],
    ['orphaned', 'What this comment pointed at is no longer in the document, so there is nothing to jump to. The conversation is kept.', 'このコメントの参照先はドキュメント内にないため、移動できません。会話は保持されています。'],
    ['unsupported', 'This comment points at something this editor does not understand, so it cannot be shown in place. The conversation is kept.', 'このコメントの参照先はこのエディターで対応していないため、その位置を表示できません。会話は保持されています。'],
    ['unavailable', 'This editor could not bring that comment into view.', 'このエディターでコメントの位置を表示できませんでした。'],
    ['rejected', 'This editor could not bring that comment into view.', 'このエディターでコメントの位置を表示できませんでした。'],
  ] as const)('updates an existing %s focus notice across language changes without refocusing', async (reason, english, japanese) => {
    const i18n = await createI18nInstance('en');
    const focus = vi.spyOn(hosted.panelSource, 'focusThread');
    if (reason === 'rejected') focus.mockRejectedValue(new Error('focus failed'));
    else focus.mockResolvedValue(false);
    if (reason === 'orphaned' || reason === 'unsupported') {
      vi.spyOn(hosted.panelSource, 'getAnchorState').mockReturnValue(reason);
    }
    const requestedThread = reason === 'missing' ? 'deleted-thread' : threadId;
    const { container } = renderHarness(hosted, i18n);
    await act(async () => { requestCommentPanel(DOCUMENT_URI, { threadId: requestedThread, source: 'deep-link' }); });
    expect(screen.getByTestId('collab-comments-focus-notice').textContent).toBe(english);
    await act(async () => { await i18n.changeLanguage('ja'); });
    expect(screen.getByTestId('collab-comments-focus-notice').textContent).toBe(japanese);
    expect(cards(container)[0].textContent).toContain('Tighten this label');
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByTestId('collab-comments-focus-notice').textContent).toBe(english);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale focus failure after a newer successful request and language change', async () => {
    const i18n = await createI18nInstance('en');
    let finishOld!: (focused: boolean) => void;
    vi.spyOn(hosted.panelSource, 'focusThread')
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce(true);
    renderHarness(hosted, i18n);
    await act(async () => { requestCommentPanel(DOCUMENT_URI, { threadId: 'deleted-thread', source: 'deep-link' }); });
    await act(async () => { requestCommentPanel(DOCUMENT_URI, { threadId, source: 'deep-link' }); });
    await act(async () => { await i18n.changeLanguage('ja'); finishOld(false); });
    expect(screen.queryByTestId('collab-comments-focus-notice')).toBeNull();
    expect(screen.getByText('Tighten this label')).toBeDefined();
  });

  it('drops the composer on a capability downgrade without losing threads', async () => {
    const { container } = renderHarness(hosted);
    await act(async () => {
      hosted.service.openPanel({});
    });
    expect(container.querySelector('.nim-comment-composer-input')).not.toBeNull();

    capabilities = { read: true, comment: false };
    // The downgrade applies to the next operation, with no remount: the service
    // re-reads access, the panel re-renders read-only, the thread stays.
    await act(async () => {
      await hosted.service.setResolved(threadId, true).catch(() => undefined);
    });

    await waitFor(() =>
      expect(container.querySelector('.nim-comment-composer-input')).toBeNull(),
    );
    expect(cards(container)).toHaveLength(1);
    expect(
      container.querySelector('.nim-comments-panel-notice')?.textContent,
    ).toMatch(/read-only/i);
  });
});
