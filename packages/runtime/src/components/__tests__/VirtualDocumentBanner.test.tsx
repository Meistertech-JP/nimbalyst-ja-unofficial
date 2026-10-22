import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { VirtualDocumentBanner } from '../VirtualDocumentBanner';

afterEach(cleanup);

async function renderWithJapanese(element: ReactNode) {
  const i18n = await createI18nInstance('ja');
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      {children}
    </UiLanguageProvider>
  );
  return render(element, { wrapper: Wrapper });
}

describe('VirtualDocumentBanner', () => {
  it('shows the Japanese read-only notice and exposes a localized dismiss action', async () => {
    const onDismiss = vi.fn();
    await renderWithJapanese(<VirtualDocumentBanner onDismiss={onDismiss} />);

    expect(screen.getByText('これは読み取り専用のウェルカムドキュメントです。変更は保存されません。').textContent).toBe(
      'これは読み取り専用のウェルカムドキュメントです。変更は保存されません。',
    );
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('omits the dismiss action when no callback is provided', async () => {
    await renderWithJapanese(<VirtualDocumentBanner />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
