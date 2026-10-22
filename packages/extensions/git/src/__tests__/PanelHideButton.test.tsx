import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { PanelHideButton } from '../components/PanelHideButton';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

describe('PanelHideButton', () => {
  it('asks the panel host to hide the panel with English accessible labels', () => {
    const onHide = vi.fn();
    render(
      <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
        <PanelHideButton onHide={onHide} />
      </UiLanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hide Git panel' }));

    expect(onHide).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Hide Git panel' }).getAttribute('title')).toBe('Hide panel');
  });

  it('renders Japanese accessible labels', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <PanelHideButton onHide={vi.fn()} />
      </UiLanguageProvider>,
    );

    const button = screen.getByRole('button', { name: 'Gitパネルを非表示' });
    expect(button.getAttribute('title')).toBe('パネルを非表示');
  });
});
