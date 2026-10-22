import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { CrewAlphaBadge, CrewModal } from '../CrewBits';

vi.mock('@nimbalyst/extension-sdk', () => ({
  MaterialSymbol: () => null,
  navigateToTrackerReference: vi.fn(),
}));

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('CrewModal', () => {
  it('localizes the alpha badge', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <CrewAlphaBadge />
      </UiLanguageProvider>,
    );

    expect(screen.getByText('アルファ')).toBeTruthy();
  });

  it('keeps focus in a field when the parent re-renders with a new onClose', () => {
    // The roster poll re-renders the panel every few seconds, passing a fresh
    // onClose arrow each time. That must not pull focus back to the dialog.
    const modal = (onClose: () => void) => (
      <CrewModal title="Hire" onClose={onClose}>
        <textarea data-testid="field" />
      </CrewModal>
    );
    const { getByTestId, rerender } = render(modal(() => {}));
    const field = getByTestId('field');
    field.focus();

    rerender(modal(() => {}));

    expect(document.activeElement).toBe(field);
  });
});
