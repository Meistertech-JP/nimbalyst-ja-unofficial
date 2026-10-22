// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AgenticInput } from '../AgenticInput';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

afterAll(() => cleanup());

function renderInput(
  i18n: typeof englishI18n,
  props: Partial<React.ComponentProps<typeof AgenticInput>> = {},
) {
  const onChange = props.onChange ?? vi.fn();
  const onSend = props.onSend ?? vi.fn();
  const onCancel = props.onCancel ?? vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <AgenticInput value={props.value ?? 'Hello'} onChange={onChange} onSend={onSend} onCancel={onCancel} {...props} />
    </I18nextProvider>,
  );
  return { onSend, onCancel };
}

describe('AgenticInput localization', () => {
  it('localizes the default placeholder and send action while preserving send behavior', () => {
    const english = renderInput(englishI18n);
    expect(screen.getByPlaceholderText(/Type your message/)).toBeDefined();
    const sendButton = screen.getByRole('button', { name: 'Send message' });
    expect(sendButton.getAttribute('title')).toBe('Send message (Enter)');
    fireEvent.click(sendButton);
    expect(english.onSend).toHaveBeenCalledOnce();

    cleanup();
    const japanese = renderInput(japaneseI18n);
    expect(screen.getByPlaceholderText(/メッセージを入力/)).toBeDefined();
    const japaneseSendButton = screen.getByRole('button', { name: 'メッセージを送信' });
    expect(japaneseSendButton.getAttribute('title')).toBe('メッセージを送信（Enter）');
    fireEvent.click(japaneseSendButton);
    expect(japanese.onSend).toHaveBeenCalledOnce();
  });

  it('localizes cancel title and accessible name while preserving cancellation', () => {
    const english = renderInput(englishI18n, { isLoading: true });
    const cancelButton = screen.getByRole('button', { name: 'Cancel request' });
    expect(cancelButton.getAttribute('title')).toBe('Cancel request (Esc)');
    fireEvent.click(cancelButton);
    expect(english.onCancel).toHaveBeenCalledOnce();

    cleanup();
    const japanese = renderInput(japaneseI18n, { isLoading: true });
    const japaneseCancelButton = screen.getByRole('button', { name: 'リクエストをキャンセル' });
    expect(japaneseCancelButton.getAttribute('title')).toBe('リクエストをキャンセル（Esc）');
    fireEvent.click(japaneseCancelButton);
    expect(japanese.onCancel).toHaveBeenCalledOnce();
  });

  it('keeps an explicitly supplied placeholder unchanged', () => {
    renderInput(japaneseI18n, { placeholder: 'Custom prompt' });
    expect(screen.getByPlaceholderText('Custom prompt')).toBeDefined();
  });
});
