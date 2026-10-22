// @vitest-environment jsdom
import React from 'react';
import { Provider, createStore } from 'jotai';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
const mocks = vi.hoisted(() => ({ acquire: vi.fn(), release: vi.fn(), snapshot: null as any }));
vi.mock('../../../store/listeners/remoteSessionViews', async () => {
  const { atom } = await import('jotai');
  const snapshot = atom({ session: { id: 'remote', messages: [], provider: 'claude-code', metadata: {remoteHostDeviceId: 'sandbox-1'} }, hostOnline: true, connected: false, syncing: false, executing: false, queuedPrompts: [] });
  mocks.snapshot = snapshot;
  const error = atom(null);
  return { acquireRemoteSession: mocks.acquire, remoteSessionSnapshotAtom: () => snapshot, remoteSessionErrorAtom: () => error };
});
vi.mock('../../../store/atoms/sessions', async () => {
  const {atom} = await import('jotai');
  const text = atom(''), attachments = atom([]), hydrated = atom(false), modified = atom(0);
  return {sessionDraftInputAtom: () => text, sessionDraftAttachmentsAtom: () => attachments, sessionDraftHydratedAtom: () => hydrated, sessionDraftLocalModifiedAtAtom: () => modified, canPersistSessionDraft: (ready: boolean, timestamp: number) => ready && timestamp > 0};
});
vi.mock('../AIInput', async () => {
  const React = await import('react');
  return {AIInput: React.forwardRef((_props: any, _ref) => {
    const props = _props;
    return <div><textarea aria-label="Message" value={props.value} onChange={event => props.onChange(event.target.value)} />
      <span>{props.attachments.length} attachments</span>
      <button onClick={() => props.onAttachmentAdd({id: 'file', filename: 'diagram.png', filepath: '/staged/image.png', mimeType: 'image/png', size: 5, type: 'image', addedAt: 1})}>Attach</button>
      <button disabled={props.disabled} onClick={() => props.onSend()}>Send</button>
      <button onClick={() => props.onLaunchActionInNewSession({id: 'review', label: 'Review', body: 'Review these changes', config: {launch: 'new-session', autoSubmit: false, foreground: false, worktree: false}})}>Action</button></div>;
  })};
});
vi.mock('@nimbalyst/runtime/ui/AgentTranscript/components/RichTranscriptView', () => ({ RichTranscriptView: () => <div /> }));
import { RemoteSessionTranscript } from '../RemoteSessionTranscript';
import {sessionDraftInputAtom, sessionDraftHydratedAtom} from '../../../store/atoms/sessions';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function renderRemoteTranscript(language: 'en' | 'ja' = 'en') {
  const i18n = await createI18nInstance(language);
  const store = createStore();
  const view = render(
    <Provider store={store}>
      <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
        <RemoteSessionTranscript sessionId="remote" workspacePath="/repo" mode="agent" />
      </UiLanguageProvider>
    </Provider>,
  );
  return { ...view, store };
}

describe('remote session composer commands', () => {
  it('restores the saved draft again if session initialization clears hydration after mount', async () => {
    mocks.acquire.mockReturnValue(mocks.release);
    const invoke = vi.fn(async (channel: string) => channel === 'ai:loadRemoteDraft' ? {text: 'Saved remote draft', attachments: []} : channel === 'ai:remoteWorkspaceContext' ? {files: [], commands: []} : undefined);
    (window as any).electronAPI = {invoke};
    const state = (await renderRemoteTranscript()).store;
    await waitFor(() => expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('Saved remote draft'));
    act(() => {state.set(sessionDraftInputAtom('remote'), ''); state.set(sessionDraftHydratedAtom('remote'), false);});
    await waitFor(() => expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('Saved remote draft'));
    expect((screen.getByText('Send') as HTMLButtonElement).disabled).toBe(false);
  });

  it('keeps text and attachments on failure, retries explicitly, and routes draft Actions to the same host', async () => {
    mocks.acquire.mockReturnValue(mocks.release);
    const queue = vi.fn().mockRejectedValueOnce(new Error('Sandbox offline')).mockResolvedValue({promptId: 'accepted'});
    const invoke = vi.fn(async (channel, ...args) => {
      if (channel === 'ai:loadRemoteDraft') return {text: '', attachments: []};
      if (channel === 'ai:saveRemoteDraft') return;
      if (channel === 'ai:remoteWorkspaceContext') return {files: ['remote-file.ts'], commands: []};
      if (channel === 'ai:createRemoteSession') return 'new-remote';
      if (channel === 'ai:queueRemotePrompt') return queue(...args);
      throw new Error(`Unexpected local execution: ${channel}`);
    });
    (window as any).electronAPI = {invoke};
    const view = await renderRemoteTranscript();
    await waitFor(() => expect((screen.getByText('Send') as HTMLButtonElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('Message'), {target: {value: 'Read this image'}});
    fireEvent.click(screen.getByText('Attach'));
    fireEvent.click(screen.getByText('Send'));
    await screen.findByText('Sandbox offline');
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('Read this image');
    screen.getByText('1 attachments');
    expect(queue).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Send'));
    await waitFor(() => expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe(''));
    expect(queue).toHaveBeenLastCalledWith('remote', '/repo', 'Read this image', [expect.objectContaining({id: 'file'})], expect.objectContaining({mode: 'agent'}));
    fireEvent.click(screen.getByText('Action'));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('ai:saveRemoteDraft', 'new-remote', '/repo', {text: 'Review these changes', attachments: []}));
    expect(invoke).toHaveBeenCalledWith('ai:createRemoteSession', '/repo', 'sandbox-1', expect.objectContaining({prompt: undefined}));
    view.unmount(); expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it('localizes fixed remote-send errors while preserving backend error text', async () => {
    mocks.acquire.mockReturnValue(mocks.release);
    const invoke = vi.fn(async (channel: string) => {
      if (channel === 'ai:loadRemoteDraft') return { text: '', attachments: [] };
      if (channel === 'ai:saveRemoteDraft') return;
      if (channel === 'ai:remoteWorkspaceContext') return { files: [], commands: [] };
      if (channel === 'ai:queueRemotePrompt') throw 'offline';
      return undefined;
    });
    (window as any).electronAPI = { invoke };
    await renderRemoteTranscript('ja');
    await waitFor(() => expect((screen.getByText('Send') as HTMLButtonElement).disabled).toBe(false));

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: '確認' } });
    fireEvent.click(screen.getByText('Send'));

    expect(await screen.findByText('プロンプトを送信できませんでした。')).toBeDefined();
  });

  it('shows Japanese labels for remote connection, transcript, execution, and queue states', async () => {
    mocks.acquire.mockReturnValue(mocks.release);
    const { store } = await renderRemoteTranscript('ja');
    const status = screen.getByTestId('remote-session-status');
    const snapshotAtom = mocks.snapshot;
    const base = {
      session: { id: 'remote', messages: [], provider: 'claude-code', metadata: { remoteHostDeviceId: 'sandbox-1' } },
      hostOnline: true,
      connected: false,
      syncing: false,
      executing: false,
      queuedPrompts: [],
    };

    act(() => store.set(snapshotAtom, null));
    expect(status.textContent).toBe('接続中…');

    act(() => store.set(snapshotAtom, { ...base, readOnlyReason: 'Read-only history' }));
    expect(status.textContent).toBe('履歴のみ');

    act(() => store.set(snapshotAtom, { ...base, hostOnline: false }));
    expect(status.textContent).toBe('オフライン');

    act(() => store.set(snapshotAtom, { ...base, syncing: true }));
    expect(status.textContent).toBe('履歴を読み込み中…');

    act(() => store.set(snapshotAtom, { ...base, executing: true }));
    expect(status.textContent).toBe('作業中');

    act(() => store.set(snapshotAtom, { ...base, queuedPrompts: [{}, {}] }));
    expect(status.textContent).toContain('準備完了');
    expect(status.textContent).toContain('2件をキューに追加済み');
  });
});
