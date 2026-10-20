import React from 'react';
import i18next from 'i18next';
import { createStore, Provider } from 'jotai';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { ExitPlanModeWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/ExitPlanModeWidget';
import { AskUserQuestionWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/AskUserQuestionWidget';
import type { CustomToolWidgetProps } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets';
import type { InteractiveWidgetHost } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/InteractiveWidgetHost';
import { interactiveWidgetHostAtom } from '../../../../../runtime/src/store/atoms/interactiveWidgetHost';

const locale = i18next.createInstance();
let testStore: ReturnType<typeof createStore>;
const host = {
  exitPlanModeApprove: vi.fn(), exitPlanModeDeny: vi.fn(), exitPlanModeCancel: vi.fn(),
  exitPlanModeStartNewSession: vi.fn(), openFile: vi.fn(), askUserQuestionSubmit: vi.fn(), askUserQuestionCancel: vi.fn(),
};
let nextId = 0;
function message(toolName: string, args: object, result?: string): CustomToolWidgetProps['message'] {
  return { id: ++nextId, sequence: nextId, type: 'tool_call', subagentId: null, createdAt: new Date(), toolCall: { toolName, arguments: args, result, providerToolCallId: `raw-call-${nextId}`, status: result ? 'completed' : 'running' } } as CustomToolWidgetProps['message'];
}
function localized(children: React.ReactNode, language = 'ja') {
  const translate = locale.getFixedT(language);
  return <Provider store={testStore}><RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => translate(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider></Provider>;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  testStore = createStore();
  for (const method of Object.values(host)) method.mockReset().mockResolvedValue(undefined);
  testStore.set(interactiveWidgetHostAtom('session'), host as unknown as InteractiveWidgetHost);
});
afterEach(cleanup);

describe('plan approval localization', () => {
  it.each([
    ['exit-plan-mode-approve', 'exitPlanModeApprove', 'approved'],
    ['exit-plan-mode-new-session', 'exitPlanModeStartNewSession', 'denied'],
    ['exit-plan-mode-cancel', 'exitPlanModeCancel', 'denied'],
  ] as const)('preserves %s routing and state', async (button, method, state) => {
    const data = message('ExitPlanMode', { planFilePath: 'plans/My Plan.md' });
    render(localized(<ExitPlanModeWidget message={data} sessionId="session" workspacePath="/project" isExpanded onToggle={() => {}} />));
    expect(screen.getByText('計画モードを終了しますか？')).toBeTruthy();
    fireEvent.click(screen.getByText('plans/My Plan.md'));
    expect(host.openFile).toHaveBeenCalledWith('/project/plans/My Plan.md');
    await act(async () => { fireEvent.click(screen.getByTestId(button)); });
    expect(host[method]).toHaveBeenCalledTimes(1);
    expect(host[method].mock.calls[0]).toEqual(method === 'exitPlanModeStartNewSession' ? [data.toolCall!.providerToolCallId, 'plans/My Plan.md'] : [data.toolCall!.providerToolCallId]);
    expect(screen.getByTestId('exit-plan-mode-widget').getAttribute('data-state')).toBe(state);
  });

  it('preserves feedback draft on language switch and sends raw trimmed feedback', async () => {
    const data = message('ExitPlanMode', {});
    const widget = <ExitPlanModeWidget message={data} sessionId="session" isExpanded onToggle={() => {}} />;
    const view = render(localized(widget));
    fireEvent.click(screen.getByTestId('exit-plan-mode-deny'));
    const input = screen.getByPlaceholderText('計画の変更内容をClaudeに伝えてください...') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '  Keep my literal /command  ' } });
    view.rerender(localized(widget, 'en'));
    expect(screen.getByPlaceholderText('Tell Claude what to change in the plan...')).toBe(input);
    expect(input.value).toBe('  Keep my literal /command  ');
    await act(async () => { fireEvent.keyDown(input, { key: 'Enter' }); });
    expect(host.exitPlanModeDeny).toHaveBeenCalledWith(data.toolCall!.providerToolCallId, 'Keep my literal /command');
  });

  it('retains host-unavailable and persisted-result branches', () => {
    testStore.set(interactiveWidgetHostAtom('session'), null);
    const data = message('ExitPlanMode', {});
    const view = render(localized(<ExitPlanModeWidget message={data} sessionId="session" isExpanded onToggle={() => {}} />));
    expect(screen.getByText('待機中...')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    view.rerender(localized(<ExitPlanModeWidget message={{ ...data, toolCall: { ...data.toolCall!, result: 'approved' } }} sessionId="session" isExpanded onToggle={() => {}} />));
    expect(screen.getByText('計画モードを終了しました')).toBeTruthy();
    expect(host.exitPlanModeApprove).not.toHaveBeenCalled();
  });
});

describe('question localization', () => {
  const question = { question: 'Original question?', header: 'Custom header', options: [{ label: 'Keep literal A', description: 'Original description' }], multiSelect: true };
  it('retains multi-select and free-text drafts and sends original question/answer strings', async () => {
    const data = message('AskUserQuestion', { questions: [question] });
    const widget = <AskUserQuestionWidget message={data} sessionId="session" isExpanded onToggle={() => {}} />;
    const view = render(localized(widget));
    expect(screen.getByText('Claudeからの質問')).toBeTruthy();
    expect((screen.getByRole('button', { name: '送信' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Keep literal A'));
    fireEvent.click(screen.getByRole('button', { name: 'その他' }));
    const input = screen.getByPlaceholderText('回答を入力...') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'My answer /literal' } });
    view.rerender(localized(widget, 'en'));
    expect(screen.getByPlaceholderText('Type your answer...')).toBe(input);
    expect(input.value).toBe('My answer /literal');
    expect(screen.getByTestId('ask-user-question-option').getAttribute('data-selected')).toBe('true');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Submit' })); });
    expect(host.askUserQuestionSubmit).toHaveBeenCalledWith(data.toolCall!.providerToolCallId, { 'Original question?': 'Keep literal A, My answer /literal' });
    view.rerender(localized(widget));
    expect(screen.getByText('質問に回答しました')).toBeTruthy();
    expect(screen.getByText('選択した回答: Keep literal A, My answer /literal')).toBeTruthy();
  });

  it('retains cancellation and disables actions without the host', async () => {
    const data = message('AskUserQuestion', { questions: [question] });
    const widget = <AskUserQuestionWidget message={data} sessionId="session" isExpanded onToggle={() => {}} />;
    testStore.set(interactiveWidgetHostAtom('session'), null);
    render(localized(widget));
    expect(screen.getByText(question.question)).toBeTruthy();
    expect(screen.getByText('待機中...')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'キャンセル' }) as HTMLButtonElement).disabled).toBe(true);
    act(() => { testStore.set(interactiveWidgetHostAtom('session'), host as unknown as InteractiveWidgetHost); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'キャンセル' })); });
    expect(host.askUserQuestionCancel).toHaveBeenCalledWith(data.toolCall!.providerToolCallId);
    expect(screen.getByText('質問はキャンセルされました')).toBeTruthy();
  });
});
