// @vitest-environment jsdom
/**
 * Transcript rows and tool cards are memoized so a streamed text frame only
 * re-renders the row whose message changed. virtua wraps each item in a memo
 * keyed on the element, which never matches, so without this every visible
 * row and tool widget repaints once per frame. Nothing on screen shows the
 * waste, hence a test.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TranscriptViewMessage } from '../../../../ai/server/types';
import { setTranscriptToolWidgets, clearTranscriptToolWidgets } from '../../contributions/TranscriptToolWidgetContributions';
import type { CustomToolWidgetProps } from '../CustomToolWidgets';
import { TranscriptToolCard, type SubagentChildContext, type TranscriptToolShared } from '../TranscriptToolCard';
import { TranscriptMessageRow, computeTranscriptRowInfos, type TranscriptRowInfo } from '../TranscriptMessageRow';

const segmentRenders = vi.hoisted(() => ({ byText: new Map<string, number>() }));

// Counts row renders: a message row renders exactly one MessageSegment.
vi.mock('../MessageSegment', () => ({
  MessageSegment: ({ message }: { message: TranscriptViewMessage }) => {
    const key = message.text ?? '';
    segmentRenders.byText.set(key, (segmentRenders.byText.get(key) ?? 0) + 1);
    return <div>{key}</div>;
  },
}));

let widgetRenders = 0;
const CountingWidget: React.FC<CustomToolWidgetProps> = ({ isExpanded }) => {
  widgetRenders++;
  return <div data-expanded={String(isExpanded)} />;
};

const shared: TranscriptToolShared = { sessionId: 's1', onToggleTool: () => {} };
const subagentContext: SubagentChildContext = { expandedTools: new Set(), skippedQuestionIds: new Set() };
const noop = () => {};
let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;

function renderWithI18n(node: React.ReactNode) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>
  );
  return render(node, { wrapper: Wrapper });
}

function msg(index: number, overrides: Partial<TranscriptViewMessage>): TranscriptViewMessage {
  return {
    id: index + 1,
    sequence: index + 1,
    createdAt: new Date(1_784_648_445_000 + index * 1000),
    type: 'assistant_message',
    subagentId: null,
    ...overrides,
  } as TranscriptViewMessage;
}

const toolMsg = msg(1, {
  type: 'tool_call',
  toolCall: {
    toolName: 'CountTool',
    toolDisplayName: 'CountTool',
    status: 'completed',
    description: null,
    arguments: {},
    targetFilePath: null,
    mcpServer: null,
    mcpTool: null,
    providerToolCallId: 'call-1',
    progress: [],
  } as unknown as TranscriptViewMessage['toolCall'],
});

function infosFor(messages: TranscriptViewMessage[], previous: TranscriptRowInfo[] | null) {
  return computeTranscriptRowInfos(messages, {
    showToolCalls: true,
    expandedTools: new Set(),
    supersededToolIndices: new Set(),
    skippedQuestionIds: subagentContext.skippedQuestionIds,
    subagentContext,
    isWaitingForResponse: true,
    restartAfterIndex: -1,
  }, previous);
}

function Rows({ messages, infos }: { messages: TranscriptViewMessage[]; infos: TranscriptRowInfo[]; tick: number }) {
  return (
    <>
      {messages.map((message, index) => (
        <TranscriptMessageRow
          key={message.id}
          message={message}
          index={index}
          info={infos[index]}
          isCollapsed={false}
          isCopied={false}
          showThinking
          compactMode={false}
          toolShared={shared}
          onToggleCollapse={noop}
          onCopy={noop}
          registerMessageRef={noop}
        />
      ))}
    </>
  );
}

describe('transcript row memoization', () => {
  it('keeps progress-only assistant turns after a teammate notification while hiding empty processing turns', () => {
    const teammate = msg(0, { type: 'user_message', text: 'Teammate status', metadata: { isTeammateMessage: true } });
    const progress = msg(1, { thinking: 'Checking the files.', progressUpdate: true });

    expect(infosFor([teammate, progress], null)[1].kind).toBe('message');
    expect(infosFor([teammate, { ...progress, progressUpdate: false }], null)[1].kind).toBe('hidden');
  });

  beforeAll(async () => {
    testI18n = await createI18nInstance('en');
  });

  beforeEach(() => {
    widgetRenders = 0;
    segmentRenders.byText.clear();
    setTranscriptToolWidgets('render-cost-test', { CountTool: CountingWidget });
  });
  afterEach(() => clearTranscriptToolWidgets('render-cost-test'));

  it('a tool card re-renders its widget only when its own props change', () => {
    const card = (tick: number, isExpanded: boolean) => (
      <div data-tick={tick}>
        <TranscriptToolCard toolMsg={toolMsg} toolIndex={1} depth={0} isExpanded={isExpanded} superseded={false} shared={shared} />
      </div>
    );
    const { rerender } = renderWithI18n(card(0, false));
    rerender(card(1, false));
    expect(widgetRenders).toBe(1);
    rerender(card(2, true));
    expect(widgetRenders).toBe(2);
  });

  it('renders tool argument and result labels in Japanese', async () => {
    testI18n = await createI18nInstance('ja');
    const translatedToolMsg = {
      ...toolMsg,
      toolCall: {
        ...toolMsg.toolCall!,
        toolName: 'Read',
        toolDisplayName: 'Read',
        arguments: { path: 'notes.md' },
        result: 'completed',
      },
    } as TranscriptViewMessage;

    renderWithI18n(
      <TranscriptToolCard
        toolMsg={translatedToolMsg}
        toolIndex={1}
        depth={0}
        isExpanded
        superseded={false}
        shared={shared}
      />,
    );

    expect(screen.getByText('引数:')).toBeTruthy();
    expect(screen.getByText('結果')).toBeTruthy();
  });

  it('a streamed text patch re-renders only the changed row', () => {
    const messages = [
      msg(0, { type: 'user_message', text: 'first prompt' }),
      toolMsg,
      msg(2, { text: 'first answer' }),
      msg(3, { type: 'user_message', text: 'second prompt' }),
      msg(4, { text: 'streaming' }),
    ];
    const infos = infosFor(messages, null);
    expect(infos[1].kind).toBe('hidden'); // grouped under the assistant row
    expect(infos[2].toolEntries?.map(e => e.index)).toEqual([1]);

    const { rerender } = renderWithI18n(<Rows messages={messages} infos={infos} tick={0} />);
    // Parent re-render with nothing changed: no row renders.
    rerender(<Rows messages={messages} infos={infos} tick={1} />);
    expect(Object.fromEntries(segmentRenders.byText)).toEqual({
      'first prompt': 1, 'first answer': 1, 'second prompt': 1, streaming: 1,
    });

    // Accumulator publishes a new object for the streaming message and a new array.
    const patched = [...messages.slice(0, 4), { ...messages[4], text: 'streaming more' }];
    const patchedInfos = infosFor(patched, infos);
    expect(patchedInfos.slice(0, 4)).toEqual(infos.slice(0, 4));
    patchedInfos.slice(0, 4).forEach((info, i) => expect(info).toBe(infos[i]));

    rerender(<Rows messages={patched} infos={patchedInfos} tick={2} />);
    expect(Object.fromEntries(segmentRenders.byText)).toEqual({
      'first prompt': 1, 'first answer': 1, 'second prompt': 1, streaming: 1, 'streaming more': 1,
    });
    expect(widgetRenders).toBe(1);
  });

  it('localizes fixed labels while preserving provider names and message payloads', async () => {
    await testI18n.changeLanguage('ja');
    const denied = msg(0, {
      type: 'system_message',
      systemMessage: {
        systemType: 'permission_denied',
        deniedToolName: 'Bash',
        deniedReason: 'Permission was denied by policy.',
        deniedReasonType: 'mode',
      } as any,
    });
    const deniedInfo: TranscriptRowInfo = {
      kind: 'permissionDenied', isNewGroup: true, toolEntries: null, priorUserMessage: null,
      turn: null, isLastMessage: false, showLoginWidget: false, showRestartLine: false,
    };

    renderWithI18n(
      <TranscriptMessageRow
        message={denied}
        index={0}
        info={deniedInfo}
        isCollapsed={false}
        isCopied={false}
        showThinking={false}
        compactMode={false}
        toolShared={shared}
        onToggleCollapse={noop}
        onCopy={noop}
        registerMessageRef={noop}
      />,
    );
    expect(screen.getByText('ツールの実行が拒否されました')).toBeTruthy();
    expect(screen.getByText('拒否元: 権限モード')).toBeTruthy();
    expect(screen.getByText('Permission was denied by policy.')).toBeTruthy();
  });

  it('updates a real completed turn timestamp when the display language changes without recomputing rows', async () => {
    await testI18n.changeLanguage('ja');
    const endedAt = new Date();
    endedAt.setHours(22, 18, 0, 0);
    const messages = [
      msg(0, { type: 'user_message', text: 'Synthetic request', createdAt: new Date(endedAt.getTime() - 2000) }),
      msg(1, { text: 'Synthetic reply', createdAt: endedAt }),
    ];
    const infos = computeTranscriptRowInfos(messages, {
      showToolCalls: true, expandedTools: new Set(), supersededToolIndices: new Set(),
      skippedQuestionIds: subagentContext.skippedQuestionIds, subagentContext,
      isWaitingForResponse: false, restartAfterIndex: -1,
    }, null);
    renderWithI18n(<Rows messages={messages} infos={infos} tick={0} />);
    expect(screen.getByText(/（22:18に完了）/).textContent).not.toContain('at ');
    await act(async () => { await testI18n.changeLanguage('en'); });
    expect(screen.getByText(/^at 10:18 pm$/).textContent?.trim()).toBe('at 10:18 pm');
    await act(async () => { await testI18n.changeLanguage('ja'); });
    expect(screen.getByText(/（22:18に完了）/).textContent).not.toMatch(/am|pm/);
  });

  it('localizes reminder, sender, action titles, restart marker, and turn summary', async () => {
    await testI18n.changeLanguage('ja');
    const reminder = msg(0, {
      type: 'system_message',
      text: '<SYSTEM_REMINDER>Keep `SESSION_ID` unchanged.</SYSTEM_REMINDER>',
      systemMessage: { systemType: 'reminder', reminderKind: 'session_naming' } as any,
    });
    const reminderInfo: TranscriptRowInfo = {
      kind: 'system', isNewGroup: true, toolEntries: null, priorUserMessage: null,
      turn: null, isLastMessage: false, showLoginWidget: false, showRestartLine: false,
    };
    const { rerender } = renderWithI18n(
      <TranscriptMessageRow
        message={reminder}
        index={0}
        info={reminderInfo}
        isCollapsed={false}
        isCopied={false}
        showThinking={false}
        compactMode={false}
        toolShared={shared}
        onToggleCollapse={noop}
        onCopy={noop}
        registerMessageRef={noop}
      />,
    );
    const reminderToggle = screen.getByRole('button', { name: /セッション情報のリマインダー/ });
    expect(reminderToggle).toBeTruthy();
    fireEvent.click(reminderToggle);
    expect(screen.getByText('Keep SESSION_ID unchanged.')).toBeTruthy();

    const userMessage = msg(1, { type: 'user_message', mode: 'planning', text: 'A'.repeat(220) });
    const turnInfo: TranscriptRowInfo = {
      kind: 'message', isNewGroup: true, toolEntries: null, priorUserMessage: null,
      turn: { duration: '2m', finishedAt: '10:30', fileStats: { filesModified: 2, linesAdded: 3, linesRemoved: 1 } },
      isLastMessage: true, showLoginWidget: false, showRestartLine: true,
    };
    rerender(
      <I18nextProvider i18n={testI18n}>
        <TranscriptMessageRow
          message={userMessage}
          index={1}
          info={turnInfo}
          isCollapsed={false}
          isCopied={false}
          showThinking={false}
          compactMode={false}
          appStartTime={Date.now()}
          toolShared={shared}
          onToggleCollapse={noop}
          onCopy={noop}
          registerMessageRef={noop}
        />
      </I18nextProvider>,
    );
    expect(screen.getByText('あなた')).toBeTruthy();
    expect(screen.getByText('プラン')).toBeTruthy();
    expect(screen.getByTitle('Markdownとしてコピー')).toBeTruthy();
    expect(screen.getByTitle('メッセージを折りたたむ')).toBeTruthy();
    expect(screen.getByText(/Nimbalystを再起動しました/)).toBeTruthy();
    expect(screen.getByText(/2mで完了/)).toBeTruthy();
    expect(screen.getByText(/（10:30に完了）/)).toBeTruthy();
    expect(screen.getByText(/ファイル2件/)).toBeTruthy();

    rerender(
      <TranscriptMessageRow
        message={userMessage}
        index={1}
        info={turnInfo}
        isCollapsed
        isCopied={false}
        showThinking={false}
        compactMode={false}
        toolShared={shared}
        onToggleCollapse={noop}
        onCopy={noop}
        registerMessageRef={noop}
      />,
    );
    expect(screen.getByTitle('メッセージ全文を表示')).toBeTruthy();

    const teammate = msg(2, {
      type: 'user_message',
      text: 'Deployment finished.',
      metadata: { isTeammateMessage: true, teammateName: 'Reviewer' } as any,
    });
    const teammateInfo: TranscriptRowInfo = {
      kind: 'teammate', isNewGroup: true, toolEntries: null, priorUserMessage: null,
      turn: null, isLastMessage: false, showLoginWidget: false, showRestartLine: false,
    };
    rerender(
      <TranscriptMessageRow
        message={teammate}
        index={2}
        info={teammateInfo}
        isCollapsed={false}
        isCopied={false}
        showThinking={false}
        compactMode={false}
        toolShared={shared}
        onToggleCollapse={noop}
        onCopy={noop}
        registerMessageRef={noop}
      />,
    );
    expect(screen.getByText('Reviewerからメッセージを受信: Deployment finished.')).toBeTruthy();
  });
});
