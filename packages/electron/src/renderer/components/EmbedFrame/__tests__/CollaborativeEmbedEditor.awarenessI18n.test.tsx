import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { EditorHost } from '@nimbalyst/extension-sdk/types/editor';

const cacheMocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  resourceKey: vi.fn(() => 'embedded-room'),
}));

vi.mock('../../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('../../../services/CollaborativeEmbedProviderCache', () => ({
  collaborativeEmbedProviderCache: { acquire: cacheMocks.acquire },
  collaborativeEmbedResourceKey: cacheMocks.resourceKey,
}));
vi.mock('../../TabEditor/collabExtensionHost', () => ({
  createCollabExtensionHost: () => ({ readOnly: true }),
}));

import { CollaborativeEmbedEditor } from '../CollaborativeEmbedEditor';

const request = {
  workspacePath: '/workspace',
  orgId: 'org-1',
  documentId: 'document-1',
  title: 'Shared document',
  documentType: 'spreadsheet',
  metadata: {
    metadataVersion: 2 as const,
    fileExtension: '.csv',
    editorId: 'com.example.spreadsheet',
  },
};

const Editor = ({ host: _host }: { host: EditorHost }) => <div data-testid="embedded-editor" />;

describe('CollaborativeEmbedEditor awareness localization', () => {
  let i18n: Awaited<ReturnType<typeof createI18nInstance>>;
  const setUnnamedCollaboratorLabel = vi.fn();
  const release = vi.fn();

  beforeAll(async () => {
    i18n = await createI18nInstance('ja');
  });

  beforeEach(() => {
    setUnnamedCollaboratorLabel.mockReset();
    release.mockReset();
    cacheMocks.acquire.mockReset().mockResolvedValue({
      resource: {
        config: {},
        collaboration: {},
        setUnnamedCollaboratorLabel,
      },
      release,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function languageTree(preference: 'ja' | 'en') {
    return (
      <UiLanguageProvider i18n={i18n} preference={preference} systemLocale={preference === 'ja' ? 'ja-JP' : 'en-US'}>
        <CollaborativeEmbedEditor
          editor={{ kind: 'extension', registration: { component: Editor } as never }}
          request={request}
        />
      </UiLanguageProvider>
    );
  }

  it('passes the active localized label to the resource and refreshes it on language changes', async () => {
    const view = render(languageTree('ja'));

    await waitFor(() => expect(setUnnamedCollaboratorLabel).toHaveBeenLastCalledWith('チームメンバー'));
    expect(cacheMocks.acquire).toHaveBeenCalledWith(request, expect.any(Function));
    expect(screen.getByTestId('embedded-editor').tagName).toBe('DIV');

    view.rerender(languageTree('en'));
    await waitFor(() => expect(setUnnamedCollaboratorLabel).toHaveBeenLastCalledWith('Teammate'));

    view.unmount();
    expect(release).toHaveBeenCalledOnce();
  });
});
