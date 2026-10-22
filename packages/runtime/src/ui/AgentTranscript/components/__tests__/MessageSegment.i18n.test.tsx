import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { TranscriptViewMessage } from '../../../../ai/server/transcript/TranscriptProjector';
import { MessageSegment } from '../MessageSegment';

afterEach(cleanup);

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
