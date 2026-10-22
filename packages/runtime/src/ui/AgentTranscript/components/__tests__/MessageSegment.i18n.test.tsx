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
