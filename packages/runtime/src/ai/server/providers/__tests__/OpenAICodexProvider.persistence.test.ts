import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAICodexProvider } from '../OpenAICodexProvider';
import { configureMcpServers } from '../../services/mcpServerConfig';
import { AgentMessagesRepository } from '../../../../storage/repositories/AgentMessagesRepository';
import type { CreateAgentMessageInput } from '../../types';

describe('OpenAICodexProvider persistence', () => {
  const createdMessages: CreateAgentMessageInput[] = [];

  beforeEach(() => {
    createdMessages.length = 0;

    OpenAICodexProvider.setTrustChecker(() => ({
      trusted: true,
      mode: 'allow-all',
    }));

    AgentMessagesRepository.setStore({
      async create(message: CreateAgentMessageInput) {
        createdMessages.push(message);
      },
      async list() {
        return [];
      },
      async getMessageCounts() {
        return new Map();
      },
    });
  });

  afterEach(() => {
    configureMcpServers({ mcpServerPort: null });
    AgentMessagesRepository.clearStore();
  });

  it('persists each raw_event output as an agent message row', async () => {
    const rawEvents = [
      { type: 'unknown.output', payload: { step: 1 } },
      { type: 'item.completed', item: { type: 'command_execution', command: 'apply_patch' } },
    ];

    const protocol = {
      platform: 'codex-sdk',
      async createSession() {
        return {
          id: 'thread-1',
          platform: 'codex-sdk',
          raw: {},
        };
      },
      async resumeSession() {
        throw new Error('not used');
      },
      async forkSession() {
        throw new Error('not used');
      },
      async *sendMessage() {
        for (const rawEvent of rawEvents) {
          yield {
            type: 'raw_event',
            metadata: { rawEvent },
          };
        }

        yield {
          type: 'text',
          content: 'done',
        };

        yield {
          type: 'complete',
          content: 'done',
          usage: {
            input_tokens: 1,
            output_tokens: 1,
            total_tokens: 2,
          },
        };
      },
      abortSession: vi.fn(),
      cleanupSession: vi.fn(),
    } as any;

    const permissionService = {
      resolvePermission: vi.fn(),
      rejectAllPending: vi.fn(),
      clearSessionCache: vi.fn(),
    } as any;

    const provider = new OpenAICodexProvider(
      { apiKey: 'test-key' },
      { protocol, permissionService }
    );

    await provider.initialize({
      apiKey: 'test-key',
      model: 'openai-codex:gpt-5',
    });

    const chunks: any[] = [];
    for await (const chunk of provider.sendMessage('test', undefined, 'session-1', [], process.cwd())) {
      chunks.push(chunk);
    }

    const outputRows = createdMessages.filter((message) => message.direction === 'output');
    expect(outputRows).toHaveLength(rawEvents.length);
    expect(outputRows.map((row) => (row.metadata as any)?.eventType)).toEqual([
      'unknown.output',
      'item.completed',
    ]);
    // Text chunks are also yielded alongside canonical events so AIService
    // can populate fullResponse for OS notification bodies.
    expect(chunks.some((chunk) => chunk.type === 'text')).toBe(true);
  });

  it('dedupes repeated app-server item and turn notifications before persistence', async () => {
    const repeatedEvents = [
      {
        type: 'raw_event',
        metadata: {
          transport: 'app-server',
          method: 'item/started',
          params: {
            threadId: 'thread-1',
            turnId: 'turn-1',
            item: {
              type: 'mcpToolCall',
              id: 'call_commit',
              server: 'nimbalyst-mcp',
              tool: 'developer_git_commit_proposal',
              status: 'inProgress',
              arguments: {
                commitMessage: 'fix: example',
                filesToStage: ['CHANGELOG.md'],
              },
            },
          },
        },
      },
      {
        type: 'raw_event',
        metadata: {
          transport: 'app-server',
          method: 'item/started',
          params: {
            threadId: 'thread-1',
            turnId: 'turn-1',
            item: {
              type: 'mcpToolCall',
              id: 'call_commit',
              server: 'nimbalyst-mcp',
              tool: 'developer_git_commit_proposal',
              status: 'inProgress',
              arguments: {
                commitMessage: 'fix: example',
                filesToStage: ['CHANGELOG.md'],
              },
            },
          },
        },
      },
      {
        type: 'raw_event',
        metadata: {
          transport: 'app-server',
          method: 'item/completed',
          params: {
            threadId: 'thread-1',
            turnId: 'turn-1',
            item: {
              type: 'agentMessage',
              id: 'msg_final',
              text: 'Commit created via the proposal tool.',
            },
          },
        },
      },
      {
        type: 'raw_event',
        metadata: {
          transport: 'app-server',
          method: 'item/completed',
          params: {
            threadId: 'thread-1',
            turnId: 'turn-1',
            item: {
              type: 'agentMessage',
              id: 'msg_final',
              text: 'Commit created via the proposal tool.',
            },
          },
        },
      },
      {
        type: 'raw_event',
        metadata: {
          transport: 'app-server',
          method: 'turn/completed',
          params: {
            threadId: 'thread-1',
            turn: {
              id: 'turn-1',
              status: 'completed',
            },
          },
        },
      },
      {
        type: 'raw_event',
        metadata: {
          transport: 'app-server',
          method: 'turn/completed',
          params: {
            threadId: 'thread-1',
            turn: {
              id: 'turn-1',
              status: 'completed',
            },
          },
        },
      },
    ];

    const protocol = {
      platform: 'codex-app-server',
      async createSession() {
        return {
          id: 'thread-1',
          platform: 'codex-app-server',
          raw: {},
        };
      },
      async resumeSession() {
        throw new Error('not used');
      },
      async forkSession() {
        throw new Error('not used');
      },
      async *sendMessage() {
        for (const event of repeatedEvents) {
          yield event;
        }

        yield {
          type: 'complete',
          content: '',
          usage: {
            input_tokens: 1,
            output_tokens: 1,
            total_tokens: 2,
          },
        };
      },
      abortSession: vi.fn(),
      cleanupSession: vi.fn(),
    } as any;

    const permissionService = {
      resolvePermission: vi.fn(),
      rejectAllPending: vi.fn(),
      clearSessionCache: vi.fn(),
    } as any;

    const provider = new OpenAICodexProvider(
      { apiKey: 'test-key' },
      { protocol, permissionService }
    );

    await provider.initialize({
      apiKey: 'test-key',
      model: 'openai-codex:gpt-5',
    });

    for await (const _chunk of provider.sendMessage('test', undefined, 'session-app-dedupe', [], process.cwd())) {
      // drain
    }

    const outputRows = createdMessages.filter((message) => message.direction === 'output');
    expect(outputRows).toHaveLength(3);
    expect(outputRows.map((row) => (row.metadata as any)?.eventType)).toEqual([
      'item/started',
      'item/completed',
      'turn/completed',
    ]);
  });

  it('does not persist transient app-server delta and status notifications', async () => {
    const transientEvents = [
      {
        type: 'raw_event',
        metadata: {
          transport: 'app-server',
          method: 'thread/started',
          params: { threadId: 'thread-1' },
        },
      },
      {
        type: 'raw_event',
        metadata: {
          transport: 'app-server',
          method: 'item/agentMessage/delta',
          params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'msg-1', delta: 'hello' },
        },
      },
      {
        type: 'raw_event',
        metadata: {
          transport: 'app-server',
          method: 'item/reasoning/textDelta',
          params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'reason-1', delta: 'thinking' },
        },
      },
      {
        type: 'raw_event',
        metadata: {
          transport: 'app-server',
          method: 'thread/tokenUsage/updated',
          params: { threadId: 'thread-1', usage: { inputTokens: 7, outputTokens: 3, totalTokens: 10 } },
        },
      },
      {
        type: 'raw_event',
        metadata: {
          transport: 'app-server',
          method: 'mcpServer/startupStatus/updated',
          params: { server: 'nimbalyst-mcp', status: 'ready' },
        },
      },
    ];

    const protocol = {
      platform: 'codex-app-server',
      async createSession() {
        return {
          id: 'thread-1',
          platform: 'codex-app-server',
          raw: {},
        };
      },
      async resumeSession() {
        throw new Error('not used');
      },
      async forkSession() {
        throw new Error('not used');
      },
      async *sendMessage() {
        for (const event of transientEvents) {
          yield event;
        }

        yield {
          type: 'complete',
          content: '',
          usage: {
            input_tokens: 1,
            output_tokens: 1,
            total_tokens: 2,
          },
        };
      },
      abortSession: vi.fn(),
      cleanupSession: vi.fn(),
    } as any;

    const permissionService = {
      resolvePermission: vi.fn(),
      rejectAllPending: vi.fn(),
      clearSessionCache: vi.fn(),
    } as any;

    const provider = new OpenAICodexProvider(
      { apiKey: 'test-key' },
      { protocol, permissionService }
    );

    await provider.initialize({
      apiKey: 'test-key',
      model: 'openai-codex:gpt-5',
    });

    for await (const _chunk of provider.sendMessage('test', undefined, 'session-app-transient', [], process.cwd())) {
      // drain
    }

    const outputRows = createdMessages.filter((message) => message.direction === 'output');
    expect(outputRows).toHaveLength(0);
  });


  // Synthetic in-memory peer drives the real protocol; no provider child or external request.
  it.each(['error_event', 'failed_turn_completed', 'rpc_throw', 'protocol_throw', 'willRetry_recovery'] as const)(
    'preserves a successful primary turn and reports auxiliary reminder outcome separately: %s',
    async (scenario) => {
      const { CodexAppServerProtocol } = await import('../../protocols/CodexAppServerProtocol');
      configureMcpServers({ mcpServerPort: 41001 });
      const capacity = 'Selected model is at capacity. Please try a different model.';
      const threadId = 'r16-synthetic-thread';
      const sessionId = 'r16-synthetic-session';
      const listeners = new Set<(method: string, params: unknown) => void>();
      const sentContents: string[] = [];
      const protocolEvents: Array<{ turn: number; type: string; error?: string }> = [];
      let turn = 0;
      const emit = (method: string, params: unknown) => {
        for (const listener of [...listeners]) listener(method, params);
      };
      const client = {
        onNotification(listener: (method: string, params: unknown) => void) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        async request(method: string, params: any) {
          if (method !== 'turn/start') throw new Error('Unexpected synthetic RPC: ' + method);
          turn += 1;
          sentContents.push(params.input[0].text);
          const turnId = 'r16-turn-' + turn;
          if (turn === 2 && scenario === 'rpc_throw') throw new Error(capacity);
          if (turn === 2 && scenario === 'error_event') {
            emit('error', { threadId, turnId, error: { message: capacity }, willRetry: false });
          } else if (turn === 2 && scenario === 'failed_turn_completed') {
            emit('turn/completed', { threadId, turn: { id: turnId, status: 'failed', error: { message: capacity } } });
          } else {
            if (turn === 2) {
              emit('error', { threadId, turnId, error: { message: 'Synthetic reconnecting' }, willRetry: true });
            }
            emit('item/agentMessage/delta', {
              threadId, turnId, itemId: 'message-' + turn,
              delta: turn === 1 ? 'R16 MAIN RESPONSE OK' : 'R16 RECOVERED',
            });
            emit('turn/completed', { threadId, turn: { id: turnId, status: 'completed' } });
          }
          return { turn: { id: turnId } };
        },
      };
      const session = {
        id: threadId, platform: 'codex-app-server',
        raw: { child: {}, client, threadId, options: {}, dynamicTools: [], activeTurnId: null, stderrTail: [] },
      };
      const realProtocol = new CodexAppServerProtocol();
      const createSession = vi.fn(async () => session);
      const resumeSession = vi.fn(async () => session);
      const protocol = {
        platform: 'codex-app-server', createSession, resumeSession,
        forkSession: vi.fn(), abortSession: vi.fn(), cleanupSession: vi.fn(),
        async *sendMessage(currentSession: any, message: any) {
          const currentTurn = turn + 1;
          if (currentTurn === 2 && scenario === 'protocol_throw') {
            turn += 1;
            sentContents.push(message.content);
            throw new Error(capacity);
          }
          for await (const event of realProtocol.sendMessage(currentSession, message)) {
            protocolEvents.push({ turn: currentTurn, type: event.type, ...(event.type === 'error' ? { error: event.error } : {}) });
            yield event;
          }
        },
      };
      const provider = new OpenAICodexProvider({ apiKey: 'test-key' }, {
        protocol, transport: 'app-server', idleProtocolSessionTimeoutMs: -1,
        permissionService: { resolvePermission: vi.fn(), rejectAllPending: vi.fn(), clearSessionCache: vi.fn() },
      } as any);
      await provider.initialize({ apiKey: 'test-key', model: 'openai-codex:gpt-5' });
      const chunks: any[] = [];
      try {
        for await (const chunk of provider.sendMessage('R16 synthetic primary', undefined, sessionId, [], process.cwd())) chunks.push(chunk);
        const retainedThread = provider.getProviderSessionData(sessionId)?.providerSessionId;
        const initialSent = [...sentContents];
        const nextChunks: any[] = [];
        for await (const chunk of provider.sendMessage('R16 synthetic next', undefined, sessionId, [], process.cwd())) nextChunks.push(chunk);
        const expectedFailure = scenario !== 'willRetry_recovery';
        const outcome = {
          scenario, firstRequestSends: initialSent.length, totalSendsAfterNextRequest: sentContents.length,
          reminderSends: sentContents.filter(text => text.includes('<SYSTEM_REMINDER>')).length,
          protocolReminderErrors: protocolEvents.filter(event => event.turn === 2 && event.type === 'error'),
          auxiliaryErrors: chunks.filter(chunk => chunk.type === 'auxiliary_error').map(chunk => ({ kind: chunk.auxiliaryKind, error: chunk.error })),
          upperErrors: chunks.filter(chunk => chunk.type === 'error').map(chunk => chunk.error),
          mainCompleteCount: chunks.filter(chunk => chunk.type === 'complete').length,
          mainTextPreserved: chunks.some(chunk => chunk.type === 'text' && chunk.content === 'R16 MAIN RESPONSE OK'),
          retainedThread, nextComplete: nextChunks.some(chunk => chunk.type === 'complete'),
          nextThread: provider.getProviderSessionData(sessionId)?.providerSessionId,
          notificationSubscribersAfterNextTurn: listeners.size,
          persistedReminderOutputs: createdMessages.filter(row => row.direction === 'output' && row.metadata?.reminderKind === 'session_naming').length,
        };
        console.log('R16_REMINDER_QUALIFICATION ' + JSON.stringify(outcome));
        expect.soft(initialSent).toHaveLength(2);
        expect.soft(outcome.reminderSends).toBe(1);
        expect.soft(outcome.totalSendsAfterNextRequest).toBe(3);
        expect.soft(outcome.mainTextPreserved).toBe(true);
        expect.soft(outcome.mainCompleteCount).toBe(1);
        expect.soft(outcome.retainedThread).toBe(threadId);
        expect.soft(outcome.nextThread).toBe(threadId);
        expect.soft(outcome.nextComplete).toBe(true);
        expect.soft(outcome.notificationSubscribersAfterNextTurn).toBe(0);
        expect.soft(outcome.protocolReminderErrors).toHaveLength(expectedFailure && scenario !== 'protocol_throw' ? 1 : 0);
        // Auxiliary failures are surfaced without relabeling the successful primary turn.
        expect.soft(outcome.upperErrors).toEqual([]);
        expect.soft(outcome.auxiliaryErrors).toEqual(expectedFailure ? [{ kind: 'session_naming', error: capacity }] : []);
        const summaries = createdMessages.filter(row => row.direction === 'output' && row.metadata?.eventType === 'nimbalyst/auxiliaryError');
        expect.soft(summaries).toHaveLength(expectedFailure ? 1 : 0);
        if (expectedFailure) {
          expect.soft(JSON.parse(summaries[0]?.content as string)).toEqual({
            method: 'nimbalyst/auxiliaryError', params: { kind: 'session_naming', message: capacity },
          });
          expect.soft(summaries[0]?.metadata?.promptType).toBeUndefined();
          expect.soft(summaries[0]?.metadata?.transport).toBe('app-server');
        }
        const reminderRows = createdMessages.filter(row => row.direction === 'output' && row.metadata?.reminderKind === 'session_naming');
        expect.soft(reminderRows.every(row => row.metadata?.auxiliaryErrorHandled === true)).toBe(true);
      } finally {
        provider.destroy();
      }
    },
  );

  it('persists the session naming reminder as a tagged non-searchable input row', async () => {
    // update_session_meta now rides on the eager core `nimbalyst` server (MCP
    // consolidation Phase 5); registering it triggers the naming-reminder gate.
    configureMcpServers({ mcpServerPort: 41001 });

    const sentContents: string[] = [];
    const protocol = {
      platform: 'codex-sdk',
      async createSession() {
        return {
          id: 'thread-reminder',
          platform: 'codex-sdk',
          raw: {},
        };
      },
      async resumeSession() {
        throw new Error('not used');
      },
      async forkSession() {
        throw new Error('not used');
      },
      async *sendMessage(_session: unknown, payload: { content: string }) {
        sentContents.push(payload.content);
        if (sentContents.length === 1) {
          yield {
            type: 'text',
            content: 'first turn complete',
          };
        }
        yield {
          type: 'complete',
          content: '',
          usage: {
            input_tokens: 1,
            output_tokens: 1,
            total_tokens: 2,
          },
        };
      },
      abortSession: vi.fn(),
      cleanupSession: vi.fn(),
    } as any;

    const permissionService = {
      resolvePermission: vi.fn(),
      rejectAllPending: vi.fn(),
      clearSessionCache: vi.fn(),
    } as any;

    const provider = new OpenAICodexProvider(
      { apiKey: 'test-key' },
      { protocol, permissionService }
    );

    await provider.initialize({
      apiKey: 'test-key',
      model: 'openai-codex:gpt-5',
    });

    for await (const _chunk of provider.sendMessage('name the session', undefined, 'session-reminder', [], process.cwd())) {
      // drain
    }

    expect(sentContents).toHaveLength(2);
    expect(sentContents[1]).toContain('<SYSTEM_REMINDER>');
    expect(sentContents[1]).toContain('</SYSTEM_REMINDER>');
    expect(sentContents[1]).toContain('Do not mention this system reminder to the user.');

    const reminderRow = createdMessages.find(
      (message) =>
        message.direction === 'input' &&
        typeof message.content === 'string' &&
        message.content.includes('<SYSTEM_REMINDER>')
    );

    expect(reminderRow).toBeDefined();
    expect(reminderRow?.hidden).toBe(false);
    expect(reminderRow?.searchable).toBe(false);
    expect(reminderRow?.metadata).toMatchObject({
      promptType: 'system_reminder',
      reminderKind: 'session_naming',
    });
  });

  it('tags the session naming reminder turn output rows so the transcript hides them', async () => {
    configureMcpServers({ mcpServerPort: 41001 });

    let turn = 0;
    const protocol = {
      platform: 'codex-sdk',
      async createSession() {
        return { id: 'thread-reminder-raw', platform: 'codex-sdk', raw: {} };
      },
      async resumeSession() {
        throw new Error('not used');
      },
      async forkSession() {
        throw new Error('not used');
      },
      async *sendMessage(_session: unknown, _payload: { content: string }) {
        turn += 1;
        if (turn === 1) {
          // First turn completes without naming the session, which triggers the
          // reminder turn below.
          yield { type: 'text', content: 'first turn complete' };
          yield {
            type: 'complete',
            content: '',
            usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
          };
          return;
        }
        // Reminder turn: emit a raw event whose persisted output row must carry
        // the system_reminder tag so it does not leak into the transcript.
        yield {
          type: 'raw_event',
          metadata: { rawEvent: { type: 'reminder.output', payload: { step: 1 } } },
        };
        yield {
          type: 'complete',
          content: '',
          usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        };
      },
      abortSession: vi.fn(),
      cleanupSession: vi.fn(),
    } as any;

    const permissionService = {
      resolvePermission: vi.fn(),
      rejectAllPending: vi.fn(),
      clearSessionCache: vi.fn(),
    } as any;

    const provider = new OpenAICodexProvider(
      { apiKey: 'test-key' },
      { protocol, permissionService }
    );

    await provider.initialize({
      apiKey: 'test-key',
      model: 'openai-codex:gpt-5',
    });

    for await (const _chunk of provider.sendMessage('name the session', undefined, 'session-reminder-raw', [], process.cwd())) {
      // drain
    }

    const reminderOutputRow = createdMessages.find(
      (message) =>
        message.direction === 'output' &&
        (message.metadata as any)?.eventType === 'reminder.output'
    );

    expect(reminderOutputRow).toBeDefined();
    expect(reminderOutputRow?.metadata).toMatchObject({
      promptType: 'system_reminder',
      reminderKind: 'session_naming',
    });
  });

  it('stamps a synthetic edit-group ID onto raw event metadata and tool_call chunks for codex tool items', async () => {
    const itemStarted = {
      type: 'item.started',
      item: {
        id: 'item_0',
        type: 'file_change',
        changes: [{ path: 'foo.ts', kind: 'edit' }],
      },
    };
    const itemCompleted = {
      type: 'item.completed',
      item: {
        id: 'item_0',
        type: 'file_change',
        changes: [{ path: 'foo.ts', kind: 'edit' }],
        status: 'succeeded',
      },
    };

    const protocol = {
      platform: 'codex-sdk',
      async createSession() {
        return { id: 'thread-eg', platform: 'codex-sdk', raw: {} };
      },
      async resumeSession() { throw new Error('not used'); },
      async forkSession() { throw new Error('not used'); },
      async *sendMessage() {
        // Mirror CodexSDKProtocol's emit order: raw_event first, then parsed
        // tool_call from the same SDK event. Both raw events log to the
        // message store; the tool_call yield carries through to the
        // streaming handler (and SessionFileTracker).
        yield { type: 'raw_event', metadata: { rawEvent: itemStarted } };
        yield {
          type: 'tool_call',
          toolCall: {
            id: 'item_0',
            name: 'file_change',
            arguments: { changes: itemStarted.item.changes },
          },
          metadata: { rawEvent: itemStarted },
        };
        yield { type: 'raw_event', metadata: { rawEvent: itemCompleted } };
        yield {
          type: 'tool_call',
          toolCall: {
            id: 'item_0',
            name: 'file_change',
            arguments: { changes: itemCompleted.item.changes },
            result: { success: true, status: 'succeeded' },
          },
          metadata: { rawEvent: itemCompleted },
        };
        yield {
          type: 'complete',
          content: '',
          usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        };
      },
      abortSession: vi.fn(),
      cleanupSession: vi.fn(),
    } as any;

    const permissionService = {
      resolvePermission: vi.fn(),
      rejectAllPending: vi.fn(),
      clearSessionCache: vi.fn(),
    } as any;

    const provider = new OpenAICodexProvider(
      { apiKey: 'test-key' },
      { protocol, permissionService }
    );

    await provider.initialize({
      apiKey: 'test-key',
      model: 'openai-codex:gpt-5',
    });

    const toolCallChunks: any[] = [];
    for await (const chunk of provider.sendMessage('go', undefined, 'session-eg', [], process.cwd())) {
      if (chunk.type === 'tool_call') {
        toolCallChunks.push(chunk);
      }
    }

    // Both raw events (started + completed) should carry the same synthetic
    // editGroupId in metadata, so the parser produces a stable
    // providerToolCallId on later reparse.
    const rawRows = createdMessages.filter((m) => m.direction === 'output');
    const startedRow = rawRows.find((m) => (m.metadata as any)?.eventType === 'item.started');
    const completedRow = rawRows.find((m) => (m.metadata as any)?.eventType === 'item.completed');
    expect(startedRow).toBeDefined();
    expect(completedRow).toBeDefined();
    const startedEgid = (startedRow!.metadata as any).editGroupId as string;
    const completedEgid = (completedRow!.metadata as any).editGroupId as string;
    expect(typeof startedEgid).toBe('string');
    expect(startedEgid.startsWith('nimtc|item_0|')).toBe(true);
    expect(completedEgid).toBe(startedEgid);

    // The streaming chunks must carry the same synthetic ID via toolUseId so
    // SessionFileTracker dedupes against the canonical edit group.
    expect(toolCallChunks).toHaveLength(2);
    expect(toolCallChunks[0].toolCall.toolUseId).toBe(startedEgid);
    expect(toolCallChunks[1].toolCall.toolUseId).toBe(startedEgid);
  });

  it('mints a fresh edit-group ID when item_0 is reused after a completed call', async () => {
    const firstStart = { type: 'item.started', item: { id: 'item_0', type: 'file_change', changes: [{ path: 'a.ts' }] } };
    const firstDone = { type: 'item.completed', item: { id: 'item_0', type: 'file_change', changes: [{ path: 'a.ts' }], status: 'succeeded' } };
    const secondStart = { type: 'item.started', item: { id: 'item_0', type: 'file_change', changes: [{ path: 'b.ts' }] } };
    const secondDone = { type: 'item.completed', item: { id: 'item_0', type: 'file_change', changes: [{ path: 'b.ts' }], status: 'succeeded' } };

    const protocol = {
      platform: 'codex-sdk',
      async createSession() {
        return { id: 'thread-reuse', platform: 'codex-sdk', raw: {} };
      },
      async resumeSession() { throw new Error('not used'); },
      async forkSession() { throw new Error('not used'); },
      async *sendMessage() {
        for (const ev of [firstStart, firstDone, secondStart, secondDone]) {
          yield { type: 'raw_event', metadata: { rawEvent: ev } };
          const toolCall: any = {
            id: 'item_0',
            name: 'file_change',
            arguments: { changes: ev.item.changes },
          };
          if (ev.type === 'item.completed') {
            toolCall.result = { success: true, status: 'succeeded' };
          }
          yield { type: 'tool_call', toolCall, metadata: { rawEvent: ev } };
        }
        yield {
          type: 'complete',
          content: '',
          usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        };
      },
      abortSession: vi.fn(),
      cleanupSession: vi.fn(),
    } as any;

    const permissionService = {
      resolvePermission: vi.fn(),
      rejectAllPending: vi.fn(),
      clearSessionCache: vi.fn(),
    } as any;

    const provider = new OpenAICodexProvider(
      { apiKey: 'test-key' },
      { protocol, permissionService }
    );

    await provider.initialize({
      apiKey: 'test-key',
      model: 'openai-codex:gpt-5',
    });

    const toolCallChunks: any[] = [];
    for await (const chunk of provider.sendMessage('go', undefined, 'session-reuse', [], process.cwd())) {
      if (chunk.type === 'tool_call') {
        toolCallChunks.push(chunk);
      }
    }

    expect(toolCallChunks).toHaveLength(4);
    const id1 = toolCallChunks[0].toolCall.toolUseId;
    const id2 = toolCallChunks[1].toolCall.toolUseId;
    const id3 = toolCallChunks[2].toolCall.toolUseId;
    const id4 = toolCallChunks[3].toolCall.toolUseId;
    expect(id1).toBe(id2); // first started == first completed
    expect(id3).toBe(id4); // second started == second completed
    expect(id1).not.toBe(id3); // reused item_0 mints a fresh edit-group ID
  });
});
