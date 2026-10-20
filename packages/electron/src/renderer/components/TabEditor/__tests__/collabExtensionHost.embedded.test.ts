import { afterEach, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';

const mocks = vi.hoisted(() => ({
  storeSet: vi.fn(),
  setEditorContext: vi.fn(),
  setEditorContextItems: vi.fn(),
  showWarning: vi.fn(),
}));

vi.mock('@nimbalyst/runtime/store', () => ({
  store: { set: mocks.storeSet },
  editorDirtyAtom: vi.fn(),
  makeEditorKey: vi.fn(() => 'editor-key'),
}));
vi.mock('../../../stores/editorContextStore', () => ({
  setEditorContext: mocks.setEditorContext,
  setEditorContextItems: mocks.setEditorContextItems,
}));
vi.mock('../../../services/ErrorNotificationService', () => ({
  errorNotificationService: { showWarning: mocks.showWarning },
}));

import { createCollaborationContext, createCollabExtensionHost } from '../collabExtensionHost';

describe('createCollabExtensionHost embedded mode', () => {
  afterEach(async () => { mocks.showWarning.mockClear(); await i18next.changeLanguage('en'); });

  it('translates seed warnings at report time while preserving source content and diagnostics', async () => {
    const context = createCollaborationContext({
      syncProvider: { getYDoc: () => ({}) } as never,
      awareness: {} as never,
      activeConfig: {
        workspacePath: '/fixture', orgId: 'team-a', documentId: 'doc-a', title: 'User title',
        serverUrl: 'ws://unused', getJwt: async () => 'fixture', userId: 'user-a', accountId: 'account-a', initialContent: 'User content',
      },
    });
    await i18next.changeLanguage('ja');
    context.reportSeedOutcome?.({ ok: true });
    expect(mocks.showWarning).not.toHaveBeenCalled();
    context.reportSeedOutcome?.({ ok: false, error: new Error('E_SEED_UNACKNOWLEDGED') });
    expect(mocks.showWarning).toHaveBeenCalledWith('共有ドキュメントの初期内容を確認できませんでした', expect.any(String), { details: 'E_SEED_UNACKNOWLEDGED', duration: 10000 });
    expect(await context.loadInitialContent?.()).toBe('User content');
  });

  it('enforces read-only embedded semantics without polluting tab state', () => {
    const onDirtyChange = vi.fn();
    const collaboration = { yDoc: {} } as never;
    const host = createCollabExtensionHost({
      filePath: 'collab://org:team-1:doc:mockup-1',
      fileName: 'Wireframe',
      isActive: true,
      workspaceId: '/workspace',
      activeConfig: {
        workspacePath: '/workspace',
        orgId: 'team-1',
        documentId: 'mockup-1',
        title: 'Wireframe',
        serverUrl: 'ws://sync',
        getJwt: async () => 'token',
        userId: 'user-1',
        accountId: 'account-1',
      },
      collaboration,
      onDirtyChange,
      embedded: true,
      readOnly: true,
    });

    expect(host.embedded).toBe(true);
    expect(host.readOnly).toBe(true);
    expect(host.collaboration).toBe(collaboration);

    host.setDirty(true);
    host.setEditorContext?.({ kind: 'selection', content: 'ignored' } as never);
    host.setEditorContextItems?.([]);
    expect(onDirtyChange).not.toHaveBeenCalled();
    expect(mocks.storeSet).not.toHaveBeenCalled();
    expect(mocks.setEditorContext).not.toHaveBeenCalled();
    expect(mocks.setEditorContextItems).not.toHaveBeenCalled();
  });
});
