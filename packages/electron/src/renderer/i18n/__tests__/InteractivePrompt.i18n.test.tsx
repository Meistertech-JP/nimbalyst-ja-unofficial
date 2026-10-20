import React from 'react';
import i18next from 'i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { InteractivePromptWidget, type InteractivePromptWidgetProps } from '../../../../../runtime/src/ui/AgentTranscript/components/InteractivePromptWidget';
import type { PermissionRequestContent, AskUserQuestionRequestContent } from '../../../../../runtime/src/ai/server/types';

const locale = i18next.createInstance();
const submit = vi.fn();
const cancel = vi.fn();
const permission: PermissionRequestContent = {
  type: 'permission_request', requestId: 'raw-request', toolName: 'Bash', rawCommand: 'git status --short',
  pattern: 'Bash(git status:*)', patternDisplayName: 'git status commands', isDestructive: false,
  warnings: ['This is part of a compound command - each part is checked separately', 'Custom warning /literal'], timestamp: 1000, status: 'pending',
};
const question: AskUserQuestionRequestContent = {
  type: 'ask_user_question_request', questionId: 'raw-question', timestamp: 1000, status: 'pending',
  questions: [{ question: 'Original question?', header: 'Original header', options: [{ label: 'Original option', description: 'Original description' }], multiSelect: true }],
};
function localized(props: Partial<InteractivePromptWidgetProps> = {}, language = 'ja') {
  const translate = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => translate(key, { ...params, defaultValue }) }}>
    <InteractivePromptWidget promptType="permission_request" content={permission} onSubmitResponse={submit} {...props} />
  </RuntimeTranslationProvider>;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  submit.mockReset(); cancel.mockReset();
  vi.spyOn(Date, 'now').mockReturnValue(2000);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('interactive permission and question localization', () => {
  it.each([
    ['拒否', 'deny', 'once'], ['今回のみ許可', 'allow', 'once'], ['セッション中', 'allow', 'session'], ['常に許可', 'allow', 'always'],
  ])('preserves permission response for %s', (label, decision, scope) => {
    const view = render(localized({}, 'en'));
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    view.rerender(localized());
    expect(screen.getByText('ツール:')).toBeTruthy();
    expect(screen.getByText('Bash')).toBeTruthy();
    expect(screen.getByText('git status --short')).toBeTruthy();
    expect(screen.getAllByText('git statusコマンド')).toHaveLength(2);
    expect(screen.getByText('複合コマンドの一部です。各部分を個別に確認します')).toBeTruthy();
    expect(screen.getByText('Custom warning /literal')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'セッション中' }).getAttribute('title')).toBe('このセッション中はgit statusコマンドを許可');
    expect(screen.getByRole('button', { name: '常に許可' }).getAttribute('title')).toBe('git statusコマンドを設定に保存');
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(submit).toHaveBeenCalledExactlyOnceWith({ type: 'permission_response', requestId: 'raw-request', decision, scope, respondedAt: 2000, respondedBy: 'desktop' });
  });

  it('preserves custom permission captions, disabled controls and mobile routing', () => {
    const props = { content: { ...permission, patternDisplayName: 'Custom caption' }, isMobile: true, isSubmitting: true };
    const view = render(localized(props));
    expect(screen.getByText('Custom caption')).toBeTruthy();
    const button = screen.getByRole('button', { name: '今回のみ許可' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(submit).not.toHaveBeenCalled();
    view.rerender(localized({ ...props, isSubmitting: false }));
    fireEvent.click(button);
    expect(submit.mock.calls[0][0]).toMatchObject({ respondedBy: 'mobile', decision: 'allow', scope: 'once' });
  });

  it.each(['resolved', 'cancelled'] as const)('localizes settled permissions (%s) without new controls', status => {
    render(localized({ content: { ...permission, status } }));
    expect(screen.getByText('権限の確認は完了しました')).toBeTruthy();
    expect(screen.getByText('git status --short')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each([false, true])('keeps selected answers and free text during locale changes (mobile=%s)', isMobile => {
    const props = { promptType: 'ask_user_question_request' as const, content: question, isMobile };
    const view = render(localized(props, 'en'));
    expect((screen.getByRole('button', { name: 'Submit Answers' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Original option'));
    fireEvent.click(screen.getByRole('button', { name: 'Other' }));
    const input = screen.getByPlaceholderText('Type your answer...') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '  Original free text  ' } });
    view.rerender(localized(props));
    expect(screen.getByText('Claudeから質問があります')).toBeTruthy();
    expect(screen.getByText('複数選択可')).toBeTruthy();
    expect(screen.getByPlaceholderText('回答を入力...')).toBe(input);
    expect(input.value).toBe('  Original free text  ');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(submit).toHaveBeenCalledExactlyOnceWith({ type: 'ask_user_question_response', questionId: 'raw-question', answers: { 'Original question?': 'Original option, Original free text' }, respondedAt: 2000, respondedBy: isMobile ? 'mobile' : 'desktop' });
  });

  it.each([false, true])('keeps cancellation routing (dedicated callback=%s)', dedicated => {
    render(localized({ promptType: 'ask_user_question_request', content: question, onCancelQuestion: dedicated ? cancel : undefined }));
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(dedicated ? cancel : submit).toHaveBeenCalledExactlyOnceWith({ type: 'ask_user_question_response', questionId: 'raw-question', answers: {}, cancelled: true, respondedAt: 2000, respondedBy: 'desktop' });
    expect(dedicated ? submit : cancel).not.toHaveBeenCalled();
  });

  it('localizes submitting and resolved questions without changing protocol status', () => {
    const props = { promptType: 'ask_user_question_request' as const, content: question, isSubmitting: true };
    const view = render(localized(props));
    expect((screen.getByRole('button', { name: '送信中...' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'キャンセル' }) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(localized({ ...props, content: { ...question, status: 'resolved' } }));
    expect(screen.getByText('質問に回答しました')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
