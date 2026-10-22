// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { LayoutControls } from '../LayoutControls';

afterEach(cleanup);

describe('LayoutControls', () => {
  it.each([
    {
      language: 'en' as const,
      labels: ['Maximize editor', 'Split view', 'Maximize transcript'],
      visible: ['Files', 'Agent'],
    },
    {
      language: 'ja' as const,
      labels: ['エディターを最大化', '分割表示', 'トランスクリプトを最大化'],
      visible: ['ファイル', 'エージェント'],
    },
  ])('renders accessible labels and visible text in $language', async ({ language, labels, visible }) => {
    const i18n = await createI18nInstance(language);

    render(
      <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
        <LayoutControls mode="split" hasTabs onModeChange={() => undefined} />
      </UiLanguageProvider>,
    );

    expect(screen.getByRole('button', { name: labels[0] }).getAttribute('aria-label')).toBe(labels[0]);
    expect(screen.getByRole('button', { name: labels[1] }).getAttribute('aria-label')).toBe(labels[1]);
    expect(screen.getByRole('button', { name: labels[2] }).getAttribute('aria-label')).toBe(labels[2]);
    expect(screen.getByText(visible[0]).textContent).toBe(visible[0]);
    expect(screen.getByText(visible[1]).textContent).toBe(visible[1]);
  });
});
