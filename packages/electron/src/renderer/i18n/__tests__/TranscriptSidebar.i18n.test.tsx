import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { TranscriptSidebar } from '../../../../../runtime/src/ui/AgentTranscript/components/TranscriptSidebar';
import { TodosSidebar } from '../../../../../runtime/src/ui/AgentTranscript/components/TodosSidebar';
import { FloatingTranscriptActions, PromptsMenuButton } from '../../../../../runtime/src/ui/AgentTranscript/components/FloatingTranscriptActions';
import { formatTimeAgo, formatShortTime, formatDuration } from '../../../../../runtime/src/utils/dateUtils';
import type { PromptMarker, TodoItem } from '../../../../../runtime/src/ui/AgentTranscript/types';

const locale = i18next.createInstance();
const now = Date.parse('2026-09-21T12:00:00Z');
const prompt: PromptMarker = { id: 17, sessionId: 's1', promptText: 'Original prompt <unchanged>', outputIndex: 4, timestamp: new Date(now - 300000).toISOString() };
const translate = (key: string, defaultValue: string, params?: Record<string, string | number | boolean>) => locale.getFixedT('ja')(key, { ...params, defaultValue });
function localized(children: React.ReactNode, language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider>;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.spyOn(Date, 'now').mockReturnValue(now);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('shared transcript sidebar presentation', () => {
  it('preserves selected prompts across language switches', () => {
    const navigate = vi.fn();
    const props = { sessionId: 's1', prompts: [prompt], onNavigateToPrompt: navigate, isCollapsed: false, onToggleCollapse: vi.fn() };
    const view = render(localized(<TranscriptSidebar {...props} />));
    expect(screen.getByText('プロンプト履歴')).toBeTruthy();
    expect(screen.getByText('5分前')).toBeTruthy();
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(navigate).toHaveBeenCalledWith(prompt);
    const selectedStyle = button.getAttribute('style');
    view.rerender(localized(<TranscriptSidebar {...props} />, 'en'));
    expect(screen.getByText('Prompt History')).toBeTruthy();
    expect(screen.getByRole('button')).toBe(button);
    expect(button.getAttribute('style')).toBe(selectedStyle);
    expect(screen.getByText(prompt.promptText)).toBeTruthy();
    view.rerender(localized(<TranscriptSidebar {...props} prompts={[]} />));
    expect(screen.getByText('プロンプトはまだありません。プロンプトを入力して開始してください。')).toBeTruthy();
  });

  it('preserves task content, statuses, counts and click payloads', () => {
    const todos: TodoItem[] = ['in_progress', 'pending', 'completed'].map((status, i) => ({ id: String(i), status: status as TodoItem['status'], content: `Original task ${i}`, activeForm: `Working task ${i}` }));
    const onTodoClick = vi.fn();
    const view = render(localized(<TodosSidebar todos={todos} onTodoClick={onTodoClick} />));
    for (const label of ['進行中 (1)', '未着手 (1)', '完了 (1)', '3件中1件完了', '33%']) expect(screen.getByText(label)).toBeTruthy();
    fireEvent.click(screen.getByText('Working task 0'));
    expect(onTodoClick).toHaveBeenCalledWith(todos[0]);
    expect(screen.getByText('Original task 2')).toBeTruthy();
    view.rerender(localized(<TodosSidebar todos={todos} />, 'en'));
    expect(screen.getByText('1 of 3 completed')).toBeTruthy();
    expect(todos.map(todo => todo.status)).toEqual(['in_progress', 'pending', 'completed']);
    view.rerender(localized(<TodosSidebar todos={[]} />));
    expect(screen.getByText('タスクはまだありません')).toBeTruthy();
  });

  it('updates an open portal without closing it, preserving custom phase IDs and labels', async () => {
    const onSetPhase = vi.fn();
    const onToggleSidebar = vi.fn();
    const props = { prompts: [], onNavigateToPrompt: vi.fn(), currentPhase: 'custom_phase', phaseColumns: [{ value: 'custom_phase', label: 'My phase', color: '#123456' }], onSetPhase, onToggleSidebar, isSidebarCollapsed: true };
    const view = render(localized(<FloatingTranscriptActions {...props} />));
    expect(screen.getByTitle('フェーズ: My phase')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'ファイル履歴を表示' }));
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'フェーズを設定' })); });
    const menu = screen.getByRole('menu');
    expect(screen.getByText('ボードから削除')).toBeTruthy();
    view.rerender(localized(<FloatingTranscriptActions {...props} />, 'en'));
    expect(screen.getByRole('menu')).toBe(menu);
    fireEvent.click(screen.getByText('Remove from board'));
    expect(onSetPhase).toHaveBeenCalledWith(null);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Set phase' })); });
    fireEvent.click(screen.getAllByText('My phase')[1]);
    expect(onSetPhase).toHaveBeenLastCalledWith('custom_phase');
  });

  it('preserves prompt tooltip and navigation through the portal', async () => {
    const navigate = vi.fn();
    const view = render(localized(<PromptsMenuButton prompts={[prompt]} onNavigateToPrompt={navigate} />));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'プロンプトメニュー' })); });
    fireEvent.click(screen.getByTitle(prompt.promptText));
    expect(navigate).toHaveBeenCalledWith(prompt);
    expect(screen.queryByRole('menu')).toBeNull();
    view.rerender(localized(<PromptsMenuButton prompts={[]} onNavigateToPrompt={navigate} />));
    await act(async () => { fireEvent.click(screen.getByTitle('このセッションのプロンプトを表示')); });
    expect(screen.getByText('このセッションにはプロンプトがありません')).toBeTruthy();
  });

  it.each([[0, 'just now', 'たった今'], [5, '5m ago', '5分前'], [120, '2h ago', '2時間前'], [2880, '2d ago', '2日前'], [10080, '1w ago', '1週前'], [86400, '2mo ago', '2か月前'], [525600, '1y ago', '1年前']])('keeps relative-date boundaries at %s minutes', (minutes, english, japanese) => {
    const timestamp = now - minutes * 60000;
    expect(formatTimeAgo(timestamp)).toBe(english);
    expect(formatTimeAgo(timestamp, translate)).toBe(japanese);
  });

  it('retains invalid timestamp behavior and uses the selected locale for clock time', () => {
    expect(formatTimeAgo('invalid', translate)).toBe('');
    expect(formatShortTime('invalid', 'ja')).toBe('');
    expect(formatShortTime(prompt.timestamp, 'ja')).toBe(new Date(prompt.timestamp).toLocaleTimeString('ja', { hour: '2-digit', minute: '2-digit' }));
  });

  it.each([[-1, '0ms', '0ミリ秒'], [50, '50ms', '50ミリ秒'], [1200, '1.2s', '1.2秒'], [65000, '1m 5s', '1分5秒'], [3660000, '1h 1m', '1時間1分']])('preserves duration rounding for %s milliseconds', (duration, english, japanese) => {
    expect(formatDuration(now, now + duration)).toBe(english);
    expect(formatDuration(now, now + duration, translate)).toBe(japanese);
  });
});
