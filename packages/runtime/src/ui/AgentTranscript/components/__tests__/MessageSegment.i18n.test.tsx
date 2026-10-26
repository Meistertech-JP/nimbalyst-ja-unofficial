import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { TranscriptViewMessage } from '../../../../ai/server/transcript/TranscriptProjector';
import { MessageSegment } from '../MessageSegment';
import { TranscriptMessageRow, computeTranscriptRowInfos } from '../TranscriptMessageRow';

afterEach(cleanup);

it('distinguishes a session metadata failure from the successful response in both languages', async () => {
  const i18n = await createI18nInstance('ja');
  const detail = 'Selected model is at capacity. Please try a different model.';
  const message = {
    id: 99, sequence: 99, createdAt: new Date(), type: 'system_message', subagentId: null,
    text: detail, systemMessage: { systemType: 'status', reminderKind: 'session_naming_failed' },
  } as unknown as TranscriptViewMessage;
  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <MessageSegment message={message} isUser={false} showToolCalls={false} showThinking={false}
        expandedTools={new Set()} onToggleToolExpand={() => {}} />
    </I18nextProvider>,
  );
  expect(screen.getByRole('status').textContent).toContain('応答は完了しましたが、セッション情報を更新できませんでした。');
  expect(container.querySelector('details')?.open).toBe(false);
  expect(container.querySelector('details pre')?.textContent).toBe(detail);
  expect(container.querySelectorAll('pre')).toHaveLength(1);
  await act(async () => { await i18n.changeLanguage('en'); });
  await screen.findByText('The response is complete, but session information could not be updated.');
  expect(screen.queryByRole('alert')).toBeNull();
});

it('keeps the auxiliary warning visible through the real transcript row after replay', async () => {
  const i18n = await createI18nInstance('ja');
  const messages = [{
    id: 100, sequence: 100, createdAt: new Date(), type: 'system_message', subagentId: null,
    text: 'Selected model is at capacity.',
    systemMessage: { systemType: 'status', reminderKind: 'session_naming_failed' },
  }] as unknown as TranscriptViewMessage[];
  const subagentContext = { expandedTools: new Set<string>(), skippedQuestionIds: new Set<string>() };
  const infos = computeTranscriptRowInfos(messages, {
    showToolCalls: true, expandedTools: new Set(), supersededToolIndices: new Set(),
    skippedQuestionIds: subagentContext.skippedQuestionIds, subagentContext,
    isWaitingForResponse: false, restartAfterIndex: -1,
  }, null);
  render(<I18nextProvider i18n={i18n}>
    <TranscriptMessageRow message={messages[0]} index={0} info={infos[0]} isCollapsed={false}
      isCopied={false} showThinking={false} compactMode={false}
      toolShared={{ sessionId: 'replayed-session', onToggleTool: () => {} }}
      onToggleCollapse={() => {}} onCopy={() => {}} registerMessageRef={() => {}} />
  </I18nextProvider>);
  expect(screen.getAllByRole('status')).toHaveLength(1);
  expect(screen.getByRole('status').textContent).toContain('応答は完了しましたが、セッション情報を更新できませんでした。');
  await act(async () => { await i18n.changeLanguage('en'); });
  expect(screen.getByRole('status').textContent).toContain('The response is complete, but session information could not be updated.');
});

it('localizes fixed transcript tool labels and thinking disclosure', async () => {
  const i18n = await createI18nInstance('ja');
  const message = {
    id: 1,
    sequence: 1,
    createdAt: new Date(),
    type: 'tool_call',
    subagentId: null,
    thinking: 'internal thoughts',
    toolCall: {
      toolName: 'ExampleTool',
      status: 'completed',
      arguments: { path: 'example.txt' },
      result: 'done',
      providerToolCallId: 'tool-1',
    },
  } as unknown as TranscriptViewMessage;

  render(
    <I18nextProvider i18n={i18n}>
      <MessageSegment
        message={message}
        isUser={false}
        showToolCalls
        showThinking
        expandedTools={new Set(['tool-1'])}
        onToggleToolExpand={() => {}}
      />
    </I18nextProvider>,
  );

  expect(screen.getByText('思考内容')).toBeTruthy();
  expect(screen.getByText('成功')).toBeTruthy();
  expect(screen.getByText('パラメーター:')).toBeTruthy();
  expect(screen.getByText('結果:')).toBeTruthy();
});

it('keeps API progress visible without translating model text when thinking is hidden', async () => {
  const i18n = await createI18nInstance('ja');
  const message = {
    id: 2,
    sequence: 2,
    createdAt: new Date(),
    type: 'assistant_message',
    subagentId: null,
    thinking: '  I am checking the requested files.  ',
    progressUpdate: true,
  } as TranscriptViewMessage;
  const node = (progressUpdate: boolean) => (
    <I18nextProvider i18n={i18n}>
      <MessageSegment message={{ ...message, progressUpdate }} isUser={false} showToolCalls showThinking={false} expandedTools={new Set()} onToggleToolExpand={() => {}} />
    </I18nextProvider>
  );
  const { rerender } = render(node(true));

  const progress = screen.getByText('I am checking the requested files.');
  expect(progress.closest('details')).toBeNull();
  expect(screen.queryByText('思考内容')).toBeNull();

  rerender(node(false));
  expect(screen.queryByText('I am checking the requested files.')).toBeNull();
});

it.each([
  { provider: 'grok-build', error: 'Grok is not signed in. Run `grok login` in your terminal, then try again.', command: 'grok login' },
  { provider: 'cursor-agent', error: 'Cursor is not logged in. Run `cursor-agent login` in your terminal, then try again.', command: 'cursor-agent login' },
  { provider: 'copilot-cli', error: 'GitHub Copilot is not logged in. Run `copilot` in your terminal and use the /login command to authenticate.', command: 'copilot' },
  { provider: 'antigravity-gemini-agent', error: 'Gemini authentication required: unauthorized', command: null },
  { provider: 'opencode', error: 'OpenCode authentication required: unauthorized', command: 'opencode auth login' },
])('shows Japanese sign-in guidance for $provider without exposing the English provider error', async ({ provider, error, command }) => {
  const i18n = await createI18nInstance('ja');
  const message = {
    id: 3,
    sequence: 3,
    createdAt: new Date(),
    type: 'assistant_message',
    subagentId: null,
    text: error,
    isError: true,
    isAuthError: true,
  } as unknown as TranscriptViewMessage;

  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <MessageSegment
        message={message}
        provider={provider}
        isUser={false}
        showToolCalls
        showThinking={false}
        expandedTools={new Set()}
        onToggleToolExpand={() => {}}
      />
    </I18nextProvider>,
  );

  expect(screen.getByRole('alert').textContent).toContain('認証が必要です');
  expect(container.textContent).not.toContain(error);
  if (command) expect(screen.getByText(command, { selector: 'code' })).toBeTruthy();
  expect(container.textContent).not.toContain('Login');
});

it('localizes structured auth errors for providers without a dedicated instruction entry', async () => {
  const i18n = await createI18nInstance('ja');
  const error = 'Provider session expired: AUTH_REQUIRED';
  const message = {
    id: 5,
    sequence: 5,
    createdAt: new Date(),
    type: 'assistant_message',
    subagentId: null,
    text: error,
    isError: true,
    isAuthError: true,
  } as unknown as TranscriptViewMessage;

  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <MessageSegment
        message={message}
        provider="future-provider-id"
        isUser={false}
        showToolCalls
        showThinking={false}
        expandedTools={new Set()}
        onToggleToolExpand={() => {}}
      />
    </I18nextProvider>,
  );

  expect(screen.getByRole('alert').textContent).toContain('AIプロバイダーの認証が必要です');
  expect(container.textContent).not.toContain(error);
  expect(container.textContent).not.toContain('future-provider-id');
});

it('preserves the Claude Code login widget for structured Claude auth errors', async () => {
  const i18n = await createI18nInstance('ja');
  const message = {
    id: 7,
    sequence: 7,
    createdAt: new Date(),
    type: 'assistant_message',
    subagentId: null,
    text: 'Authentication required',
    isError: true,
    isAuthError: true,
  } as unknown as TranscriptViewMessage;

  render(
    <I18nextProvider i18n={i18n}>
      <MessageSegment
        message={message}
        provider="claude-code"
        isUser={false}
        showToolCalls
        showThinking={false}
        expandedTools={new Set()}
        onToggleToolExpand={() => {}}
      />
    </I18nextProvider>,
  );

  expect(screen.getByText('/login')).toBeTruthy();
  expect(screen.queryByText('AIプロバイダーの認証が必要です')).toBeNull();
});

it('shows an untranslated backend error only as optional technical detail', async () => {
  const i18n = await createI18nInstance('ja');
  const error = 'OAuth exchange failed: invalid_grant';
  const message = {
    id: 6,
    sequence: 6,
    createdAt: new Date(),
    type: 'assistant_message',
    subagentId: null,
    text: error,
    isError: true,
  } as unknown as TranscriptViewMessage;

  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <MessageSegment
        message={message}
        provider="future-provider-id"
        isUser={false}
        showToolCalls
        showThinking={false}
        expandedTools={new Set()}
        onToggleToolExpand={() => {}}
      />
    </I18nextProvider>,
  );

  expect(screen.getByRole('alert').textContent).toContain('メッセージの処理中にエラーが発生しました。');
  expect(screen.getByText('技術的な詳細を表示').closest('details')?.open).toBe(false);
  expect(container.textContent).toContain(error);
});

it.each([
  { provider: 'grok-build', error: 'Grok is not signed in. Run `grok login` in your terminal, then try again.', command: 'grok login' },
  { provider: 'cursor-agent', error: 'Cursor is not logged in. Run `cursor-agent login` in your terminal, then try again.', command: 'cursor-agent login' },
  { provider: 'copilot-cli', error: 'GitHub Copilot is not logged in. Run `copilot` in your terminal and use the /login command to authenticate.', command: 'copilot' },
  { provider: 'antigravity-gemini-agent', error: 'Gemini authentication required: unauthorized', command: null },
  { provider: 'opencode', error: 'OpenCode authentication required: unauthorized', command: 'opencode auth login' },
])('localizes recognized $provider auth text when the structured auth flag is absent', async ({ provider, error, command }) => {
  const i18n = await createI18nInstance('ja');
  const message = {
    id: 4,
    sequence: 4,
    createdAt: new Date(),
    type: 'assistant_message',
    subagentId: null,
    text: error,
    isError: true,
  } as unknown as TranscriptViewMessage;

  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <MessageSegment
        message={message}
        provider={provider}
        isUser={false}
        showToolCalls
        showThinking={false}
        expandedTools={new Set()}
        onToggleToolExpand={() => {}}
      />
    </I18nextProvider>,
  );

  expect(screen.getByRole('alert').textContent).toContain('認証が必要です');
  expect(container.textContent).not.toContain(error);
  if (command) expect(screen.getByText(command, { selector: 'code' })).toBeTruthy();
});
