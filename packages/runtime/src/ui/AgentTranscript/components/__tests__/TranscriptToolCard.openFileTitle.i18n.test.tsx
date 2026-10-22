import React from 'react';
import { render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { expect, it } from 'vitest';
import type { TranscriptViewMessage } from '../../../../ai/server/types';
import { TranscriptToolCard } from '../TranscriptToolCard';

it('localizes the open-file tooltip in Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  const message = {
    id: 1,
    sequence: 1,
    createdAt: new Date(),
    type: 'tool_call',
    subagentId: null,
    toolCall: {
      toolName: 'Read',
      toolDisplayName: 'Read',
      status: 'completed',
      description: null,
      arguments: { path: 'notes.md' },
      targetFilePath: null,
      mcpServer: null,
      mcpTool: null,
      providerToolCallId: 'call-open-file-title',
      progress: [],
    },
  } as unknown as TranscriptViewMessage;
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      {children}
    </UiLanguageProvider>
  );

  render(
    <TranscriptToolCard
      toolMsg={message}
      toolIndex={0}
      depth={0}
      isExpanded={false}
      superseded={false}
      shared={{ sessionId: 's1', onToggleTool: () => {}, onOpenFile: () => {} }}
    />,
    { wrapper: Wrapper },
  );

  expect(screen.getByRole('link').getAttribute('title')).toBe('notes.mdを開く');
});

it('localizes sub-agent labels and live status in Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  const message = {
    id: 2,
    sequence: 2,
    createdAt: new Date(),
    type: 'subagent',
    subagentId: 'agent-1',
    subagent: { agentType: null, teammateName: null, teamName: null, childEvents: [], model: 'gpt-test', reasoningEffort: 'high' },
    toolCall: {
      toolName: 'Task',
      toolDisplayName: 'Task',
      status: 'running',
      description: null,
      arguments: { run_in_background: true },
      targetFilePath: null,
      mcpServer: null,
      mcpTool: null,
      providerToolCallId: 'call-subagent-i18n',
      progress: [],
    },
  } as unknown as TranscriptViewMessage;
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      {children}
    </UiLanguageProvider>
  );
  const props = {
    toolMsg: message,
    toolIndex: 0,
    depth: 0,
    isExpanded: false,
    superseded: false,
    shared: { sessionId: 's1', onToggleTool: () => {} },
  };

  const { rerender } = render(
    <TranscriptToolCard {...props} subagentContext={{ expandedTools: new Set(), skippedQuestionIds: new Set(), currentTeammates: [{ agentId: 'agent-1', status: 'running' }] }} />,
    { wrapper: Wrapper },
  );

  expect(screen.getByText('バックグラウンドエージェント').textContent).toBe('バックグラウンドエージェント');
  expect(screen.getByText('実行中').textContent).toBe('実行中');
  expect(document.querySelector('.rich-transcript-subagent-audit')?.getAttribute('title')).toBe('モデル: gpt-test; 推論の深さ: high');

  rerender(
    <Wrapper>
      <TranscriptToolCard {...props} subagentContext={{ expandedTools: new Set(), skippedQuestionIds: new Set(), currentTeammates: [{ agentId: 'agent-1', status: 'completed' }] }} />
    </Wrapper>,
  );
  expect(screen.getByText('完了').textContent).toBe('完了');

  const unnamedToolMessage = {
    ...message,
    type: 'tool_call',
    toolCall: { ...message.toolCall, toolName: '', arguments: {} },
  } as unknown as TranscriptViewMessage;
  rerender(
    <Wrapper>
      <TranscriptToolCard {...props} toolMsg={unnamedToolMessage} />
    </Wrapper>,
  );
  expect(screen.getByText('ツール').textContent).toBe('ツール');
});
