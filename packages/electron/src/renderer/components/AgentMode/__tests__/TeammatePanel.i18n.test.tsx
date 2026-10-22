// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TeammatePanel } from '../TeammatePanel';

const state = vi.hoisted(() => ({
  teammates: [{
    name: 'Reviewer', agentId: 'reviewer', teamName: 'default', agentType: 'general-purpose',
    status: 'idle' as const, toolCallCount: 3,
  }],
  tasks: [{
    taskId: 'task-1', taskType: 'local_bash', description: 'Run the checks', status: 'failed' as const,
    startedAt: 0, durationMs: 65_000, toolCount: 2, tokenCount: 0,
  }],
}));

vi.mock('jotai', async (importOriginal) => ({
  ...await importOriginal<typeof import('jotai')>(),
  useAtomValue: (atom: string) => {
    if (atom === 'teammate-collapsed' || atom === 'agent-collapsed') return false;
    if (atom === 'teammates:session-1') return state.teammates;
    if (atom === 'tasks:session-1') return state.tasks;
    throw new Error(`Unexpected atom: ${atom}`);
  },
  useSetAtom: () => vi.fn(),
}));

vi.mock('../../../store/atoms/agentMode', () => ({
  teammatePanelCollapsedAtom: 'teammate-collapsed',
  toggleTeammatePanelCollapsedAtom: 'toggle-teammate-collapsed',
  agentPanelCollapsedAtom: 'agent-collapsed',
  toggleAgentPanelCollapsedAtom: 'toggle-agent-collapsed',
  sessionTeammatesAtom: (sessionId: string) => `teammates:${sessionId}`,
  sessionTasksAtom: (sessionId: string) => `tasks:${sessionId}`,
  scrollToTeammateAtom: 'scroll-to-teammate',
}));

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});
afterEach(cleanup);

describe('TeammatePanel Japanese localization', () => {
  it('renders localized section labels, status, elapsed time, and task metadata', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <TeammatePanel sessionId="session-1" />
      </I18nextProvider>,
    );

    expect(document.body.textContent).toContain('チームメンバー');
    expect(document.body.textContent).toContain('エージェントとコマンド');
    expect(document.body.textContent).toContain('待機中');
    expect(document.body.textContent).toContain('ツール3件');
    expect(document.body.textContent).toMatch(/コマンド · 1分5秒 · ツール2件 · 失敗/);
    expect(screen.getByRole('button', { name: /チームメンバー/ }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: /エージェントとコマンド/ }).getAttribute('aria-expanded')).toBe('true');
  });
});
