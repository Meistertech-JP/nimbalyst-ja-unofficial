// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionData } from '@nimbalyst/runtime/ai/server/types';
import { sessionStoreAtom } from '../../../store/atoms/sessions';
import { scrollToTeammateAtom } from '../../../store/atoms/agentMode';
import { TeammatePanel } from '../TeammatePanel';
import { TaskListPanel } from '../TaskListPanel';
import { MetaAgentMode } from '../../MetaAgentMode/MetaAgentMode';

vi.mock('../../UnifiedAI/SessionTranscript', () => ({ SessionTranscript: () => null }));

beforeEach(async () => { await i18next.changeLanguage('ja'); });
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await i18next.changeLanguage('en'); });

describe('agent side panel localization', () => {
  it('translates teammate telemetry and task dependencies without translating agent content or IDs', () => {
    const now = 1_800_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const store = createStore();
    store.set(sessionStoreAtom('parent'), { id: 'parent', provider: 'claude-code', messages: [], createdAt: now, updatedAt: now, metadata: {
      currentTeammates: [{ name: 'Research agent', agentId: 'agent-original', teamName: 'team-original', agentType: 'Explore', status: 'idle', startedAt: now - 75000, lastActiveAt: now - 15000, toolCallCount: 2 }],
      currentTasks: [{ taskId: 'sub-original', description: 'User subtask', status: 'completed', startedAt: now - 65000, toolCount: 1, tokenCount: 0, durationMs: 65000 }],
      currentTaskList: [{ id: '1', subject: 'First user task', status: 'pending' }, { id: '2', subject: 'Second user task', status: 'pending', blockedBy: ['1'] }],
    } } as SessionData);
    render(<Provider store={store}><TeammatePanel sessionId="parent" /><TaskListPanel sessionId="parent" /></Provider>);
    expect(screen.getByText('チームメンバー')).toBeTruthy();
    expect(screen.getByText('サブエージェント')).toBeTruthy();
    expect(screen.getByText('1分15秒 · 15秒前 · ツール2件')).toBeTruthy();
    expect(screen.getByText('1分5秒 · ツール1件')).toBeTruthy();
    expect(screen.getByText('Explore (待機中)')).toBeTruthy();
    expect(screen.getByText('#1の完了待ち')).toBeTruthy();
    expect(screen.getByText('Second user task')).toBeTruthy();
    fireEvent.click(screen.getByText('Research agent'));
    expect(store.get(scrollToTeammateAtom)).toEqual({ sessionId: 'parent', agentId: 'agent-original' });
  });

  it('translates delegated session status and timeline while preserving model, task and navigation data', async () => {
    const now = Date.now();
    const invoke = vi.fn(async () => ({ success: true, sessions: [{
      sessionId: 'child-original', title: 'User child title', provider: 'claude-code', model: 'claude-code:opus', status: 'running',
      lastActivity: null, originalPrompt: 'User prompt in English', lastResponse: 'Agent response in English', editedFiles: ['src/app.ts'],
      pendingPrompt: null, createdAt: now - 90000, updatedAt: now,
    }] }));
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke } });
    const openSession = vi.fn();
    render(<Provider store={createStore()}><MetaAgentMode workspacePath="/workspace" sessionId="meta-original" onOpenSessionInAgent={openSession} /></Provider>);
    expect(await screen.findByText('User child title')).toBeTruthy();
    expect(screen.getByText('合計1件')).toBeTruthy();
    expect(screen.getByText('実行中1件')).toBeTruthy();
    expect(screen.getByText('実行中')).toBeTruthy();
    expect(screen.getByText('User prompt in English')).toBeTruthy();
    expect(screen.getByText('claude-code:opus')).toBeTruthy();
    fireEvent.click(screen.getByTestId('meta-agent-open-session'));
    expect(openSession).toHaveBeenCalledWith('child-original');
    fireEvent.click(screen.getByTestId('meta-agent-open-timeline'));
    expect(screen.getByText('1件のセッション')).toBeTruthy();
    expect(screen.getAllByText('2分')).toHaveLength(2);
    const before = invoke.mock.calls.length;
    await act(async () => { await i18next.changeLanguage('en'); });
    expect(screen.getByText('Delegated Sessions')).toBeTruthy();
    expect(invoke).toHaveBeenCalledTimes(before);
  });
});
