// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { CollaborativeEmbedEditor } from '../CollaborativeEmbedEditor';
import type { CollaborativeEmbedProviderRequest } from '../../../services/CollaborativeEmbedProviderCache';

const acquire = vi.hoisted(() => vi.fn());
vi.mock('../../../services/CollaborativeEmbedProviderCache', () => ({
  collaborativeEmbedProviderCache: { acquire },
  collaborativeEmbedResourceKey: (request: CollaborativeEmbedProviderRequest) => JSON.stringify([request.orgId, request.documentId, request.metadata]),
}));
vi.mock('../../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('../../TabEditor/collabExtensionHost', () => ({ createCollabExtensionHost: () => ({}) }));

const request: CollaborativeEmbedProviderRequest = {
  workspacePath: '/fixture/workspace', orgId: 'org-a', documentId: 'doc-a', title: 'User diagram',
  documentType: 'drawing', metadata: { metadataVersion: 2, fileExtension: '.drawing', editorId: 'fixture.editor' },
};
const registration = { extensions: ['.drawing'], component: () => <div>Fixture editor</div> };

describe('collaborative embed localization', () => {
  afterEach(async () => { cleanup(); acquire.mockReset(); await i18next.changeLanguage('en'); });

  it('updates loading text without reacquiring or disconnecting the live document', async () => {
    let resolve: (value: unknown) => void = () => {};
    acquire.mockImplementation(() => new Promise(done => { resolve = done; }));
    const release = vi.fn();
    render(<CollaborativeEmbedEditor request={request} registration={registration} />);
    expect(screen.getByText('Loading shared embed...')).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('共有埋め込みを読み込み中…')).toBeTruthy();
    expect(acquire).toHaveBeenCalledOnce();
    await act(async () => { resolve({ resource: { config: {}, collaboration: {} }, release }); });
    expect(screen.getByText('Fixture editor')).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('en'); });
    expect(acquire).toHaveBeenCalledOnce();
    expect(release).not.toHaveBeenCalled();
    cleanup();
    expect(release).toHaveBeenCalledOnce();
  });

  it('translates error guidance while retaining the provider diagnostic', async () => {
    acquire.mockRejectedValue(new Error('E_ROOM_UNAVAILABLE'));
    await i18next.changeLanguage('ja');
    render(<CollaborativeEmbedEditor request={request} registration={registration} />);
    expect(await screen.findByText('共有埋め込みを読み込めませんでした')).toBeTruthy();
    expect(screen.getByText('E_ROOM_UNAVAILABLE').tagName).toBe('CODE');
  });
});
