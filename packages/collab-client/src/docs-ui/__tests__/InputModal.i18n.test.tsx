// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { InputModal } from '../primitives/InputModal';

describe('InputModal localization', () => {
  afterEach(() => cleanup());

  it('updates the cancel label when the UI language changes and keeps cancel behavior', async () => {
    const i18n = await createI18nInstance('en');
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const view = render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <InputModal
          isOpen
          title="Rename"
          placeholder="Name"
          confirmLabel="Rename"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </UiLanguageProvider>,
    );

    expect(screen.getByRole('button', { name: 'Cancel' }).textContent).toBe('Cancel');

    view.rerender(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <InputModal
          isOpen
          title="名前の変更"
          placeholder="名前"
          confirmLabel="名前を変更"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </UiLanguageProvider>,
    );

    const cancelButton = await screen.findByRole('button', { name: 'キャンセル' });
    await waitFor(() => expect(cancelButton.textContent).toBe('キャンセル'));
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
