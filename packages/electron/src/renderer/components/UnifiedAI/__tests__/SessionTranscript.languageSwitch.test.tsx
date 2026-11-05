// @vitest-environment jsdom
import React from 'react';
import { Provider } from 'jotai';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

const mocks = vi.hoisted(() => ({ input: null as any }));
vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));
vi.mock('../../../contexts/DialogContext', () => ({ useDialog: () => ({ confirm: vi.fn() }) }));
vi.mock('../SessionAIInput', () => ({
  SessionAIInput: React.forwardRef((props: any, _ref) => {
    mocks.input = props;
    return <div data-testid="synthetic-composer" />;
  }),
}));
vi.mock('@nimbalyst/runtime/ui/AgentTranscript/components/AgentTranscriptPanel', () => ({
  AgentTranscriptPanel: React.forwardRef(() => null),
}));
vi.mock('../../../store/sessionViewRetention', () => ({
  sessionViewRetention: { acquire: () => () => {} },
}));
vi.mock('../../../store/listeners/fileStateListeners', () => ({
  registerSessionWorkspace: vi.fn(), loadInitialSessionFileState: async () => {},
}));
vi.mock('../../../store', async importOriginal => {
  const original = await importOriginal<typeof import('../../../store')>();
  const { atom } = await import('jotai');
  return { ...original, loadSessionDataAtom: atom(null, () => {}), reloadSessionDataAtom: atom(null, () => {}) };
});

import { store } from '@nimbalyst/runtime/store';
import { sessionDraftInputAtom, sessionStoreAtom } from '../../../store/atoms/sessions';
import { SessionTranscript } from '../SessionTranscript';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it.each([['en', 'ja'], ['ja', 'en']] as const)('uses %s → %s for a rejected submission without losing the draft or sending it', async (initialLanguage, targetLanguage) => {
  const id = `r22-language-switch-synthetic-${initialLanguage}-${targetLanguage}`;
  const invoke = vi.fn(async (channel: string) => {
    if (channel === 'ai:recordPendingSubmission') throw new Error('synthetic persistence failure');
    return [];
  });
  (window as any).electronAPI = {
    invoke, send: vi.fn(), on: () => () => {},
    extensionDevTools: { getProcessInfo: async () => ({ startTime: 0 }) },
  };
  store.set(sessionStoreAtom(id), {
    id, workspaceId: '/synthetic-only', workspacePath: '/synthetic-only',
    title: 'Synthetic', provider: 'claude-code', model: 'claude-code:sonnet',
    messages: [], metadata: {}, createdAt: Date.now(), updatedAt: Date.now(),
  } as any);
  store.set(sessionDraftInputAtom(id), 'Keep this synthetic draft');
  const i18n = await createI18nInstance(initialLanguage);
  const tree = (preference: 'en' | 'ja') => (
    <Provider store={store}>
      <UiLanguageProvider i18n={i18n} preference={preference} systemLocale="en-US">
        <SessionTranscript sessionId={id} workspacePath="/synthetic-only" mode="agent" />
      </UiLanguageProvider>
    </Provider>
  );
  const view = render(tree(initialLanguage));
  await waitFor(() => expect(typeof mocks.input?.onSend).toBe('function'));
  await act(async () => { view.rerender(tree(targetLanguage)); });
  await waitFor(() => expect(document.documentElement.lang).toBe(targetLanguage));
  await act(async () => { await mocks.input.onSend(); });
  expect(invoke).toHaveBeenCalledWith('ai:recordPendingSubmission', id, 'Keep this synthetic draft');
  expect(invoke.mock.calls.some(([channel]) => channel === 'ai:sendMessage')).toBe(false);
  expect(store.get(sessionDraftInputAtom(id))).toBe('Keep this synthetic draft');
  expect(store.get(sessionStoreAtom(id))?.messages.at(-1)?.text).toBe(
    i18n.t('transcript.submission_record_failed', { ns: 'aichat' }),
  );
});
