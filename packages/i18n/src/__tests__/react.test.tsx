import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '../core';
import { Trans, UiLanguageProvider, useTranslation } from '../react';

function LanguageLabel() {
  const { t } = useTranslation('settings');
  return <span>{t('ui_language.label')}</span>;
}

function WorktreeDescription() {
  const { t } = useTranslation('onboarding');
  return (
    <>
      <h2>{t('worktree_title')}</h2>
      <p>
        <Trans
          ns="onboarding"
          i18nKey="worktree_description"
          components={{ strong: <strong /> }}
        />
      </p>
    </>
  );
}

describe('UiLanguageProvider', () => {
  it('switches the shared React locale and document language when preference changes', async () => {
    const i18n = await createI18nInstance('en');
    const view = render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="ja-JP">
        <LanguageLabel />
      </UiLanguageProvider>,
    );

    await waitFor(() => expect(screen.getByText('Interface language').textContent).toBe('Interface language'));
    expect(document.documentElement.lang).toBe('en');

    await act(async () => {
      view.rerender(
        <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
          <LanguageLabel />
        </UiLanguageProvider>,
      );
    });

    await waitFor(() => expect(screen.getByText('表示言語').textContent).toBe('表示言語'));
    expect(document.documentElement.lang).toBe('ja');

    await act(async () => {
      view.rerender(
        <UiLanguageProvider i18n={i18n} preference="en" systemLocale="ja-JP">
          <LanguageLabel />
        </UiLanguageProvider>,
      );
    });

    await waitFor(() => expect(screen.getByText('Interface language').textContent).toBe('Interface language'));
    expect(document.documentElement.lang).toBe('en');
  });

  it('renders rich localized markup without inserting translated HTML', async () => {
    const i18n = await createI18nInstance('en');
    const view = render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <WorktreeDescription />
      </UiLanguageProvider>,
    );

    await waitFor(() => expect(screen.getByText('isolated directory').tagName).toBe('STRONG'));

    await act(async () => {
      view.rerender(
        <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
          <WorktreeDescription />
        </UiLanguageProvider>,
      );
    });

    await waitFor(() => expect(screen.getByText('Worktreeとは？')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('分離したディレクトリ').tagName).toBe('STRONG'));
  });
});
