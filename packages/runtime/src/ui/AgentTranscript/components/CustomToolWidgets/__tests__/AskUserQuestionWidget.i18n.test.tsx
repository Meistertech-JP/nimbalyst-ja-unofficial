import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { store } from '../../../../../store/store';
import { setInteractiveWidgetHost } from '../../../../../store/atoms/interactiveWidgetHost';
import { clearAskUserQuestionDraft } from '../../../../../store/atoms/askUserQuestionDraft';
import type { InteractiveWidgetHost } from '../InteractiveWidgetHost';
import { AskUserQuestionWidget } from '../AskUserQuestionWidget';

const SESSION_ID = 'ask-user-question-i18n';
let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;

function makeMessage(result: unknown = null) {
  return {
    toolCall: {
      providerToolCallId: 'ask-user-question-i18n-call',
      arguments: {
        questions: [{
          question: 'Which route should we take?',
          header: 'Route',
          options: [{ label: 'A', description: 'First option' }, { label: 'B', description: 'Second option' }],
          multiSelect: true,
        }],
      },
      result,
    },
  } as any;
}

function renderWidget(result?: unknown) {
  return render(
    <I18nextProvider i18n={testI18n}>
      <JotaiProvider store={store}>
        <AskUserQuestionWidget
          message={makeMessage(result)}
          sessionId={SESSION_ID}
          isExpanded={false}
          onToggle={() => {}}
        />
      </JotaiProvider>
    </I18nextProvider>
  );
}

describe('AskUserQuestionWidget localization', () => {
  beforeEach(async () => {
    testI18n = await createI18nInstance('ja');
    clearAskUserQuestionDraft('ask-user-question-i18n-call');
    setInteractiveWidgetHost(SESSION_ID, null);
  });

  afterEach(() => {
    cleanup();
    setInteractiveWidgetHost(SESSION_ID, null);
    clearAskUserQuestionDraft('ask-user-question-i18n-call');
  });

  it('localizes pending-question labels and placeholders while keeping question data unchanged', () => {
    renderWidget();

    expect(screen.getByText('Claudeからの質問')).toBeTruthy();
    expect(screen.getByText('待機中...')).toBeTruthy();
    expect(screen.getByText('Route')).toBeTruthy();
    expect(screen.getByText('Which route should we take?')).toBeTruthy();
    expect(screen.getByText('複数選択可')).toBeTruthy();
    expect(screen.getByText('その他')).toBeTruthy();
    fireEvent.click(screen.getByTestId('ask-user-question-other').querySelector('button')!);
    expect(screen.getByPlaceholderText('回答を入力...')).toBeTruthy();
    expect(screen.getByText('キャンセル')).toBeTruthy();
    expect(screen.getByText('送信')).toBeTruthy();
  });

  it('localizes completed and selected-answer labels while preserving the answer', () => {
    const host = {
      askUserQuestionSubmit: async () => undefined,
      askUserQuestionCancel: async () => undefined,
    } as unknown as InteractiveWidgetHost;
    setInteractiveWidgetHost(SESSION_ID, host);
    renderWidget({ answers: { 'Which route should we take?': 'A' } });

    expect(screen.getByText('質問に回答しました')).toBeTruthy();
    expect(screen.getByText('送信済み')).toBeTruthy();
    expect(screen.getByText('選択した回答: A')).toBeTruthy();
    expect(screen.getByText('複数選択')).toBeTruthy();
  });
});
