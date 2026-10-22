import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { AIInput } from '../AIInput';

afterEach(cleanup);

it('localizes the input controls and preserves send, cancel, and attachment actions', async () => {
  const i18n = await createI18nInstance('ja');
  const onSend = vi.fn();
  const onCancel = vi.fn();
  const onAttachmentRemove = vi.fn();
  const attachment = {
    id: 'attachment-1',
    filename: 'notes.pdf',
    filepath: '/workspace/notes.pdf',
    mimeType: 'application/pdf',
    size: 12,
    type: 'pdf' as const,
    addedAt: 0,
  };

  const view = render(
    <I18nextProvider i18n={i18n}>
      <AIInput
        value="日本語の依頼"
        onChange={vi.fn()}
        onSend={onSend}
        attachments={[attachment]}
        onAttachmentRemove={onAttachmentRemove}
      />
    </I18nextProvider>,
  );

  expect(screen.getByRole('textbox').getAttribute('placeholder'))
    .toBe('メッセージを入力…（Enterで送信、Shift+Enterで改行、@でファイル、@@でセッション、/でコマンド）');
  const removeButton = screen.getByRole('button', { name: '添付ファイルを削除' });
  fireEvent.click(removeButton);
  expect(onAttachmentRemove).toHaveBeenCalledWith('attachment-1');

  const sendButton = screen.getByRole('button', { name: 'メッセージを送信' });
  expect(sendButton.getAttribute('title')).toBe('メッセージを送信（Enter）');
  fireEvent.click(sendButton);
  expect(onSend).toHaveBeenCalledWith('日本語の依頼');

  view.rerender(
    <I18nextProvider i18n={i18n}>
      <AIInput value="日本語の依頼" onChange={vi.fn()} onSend={onSend} isLoading onCancel={onCancel} />
    </I18nextProvider>,
  );
  const cancelButton = screen.getByRole('button', { name: 'リクエストをキャンセル' });
  expect(cancelButton.getAttribute('title')).toBe('リクエストをキャンセル（Esc）');
  fireEvent.click(cancelButton);
  expect(onCancel).toHaveBeenCalledTimes(1);
});
