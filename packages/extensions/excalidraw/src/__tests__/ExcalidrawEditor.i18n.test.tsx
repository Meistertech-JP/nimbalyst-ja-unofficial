import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

vi.mock('@excalidraw/excalidraw', async () => {
  const ReactModule = await import('react');
  return {
    Excalidraw: ({ langCode }: { langCode: string }) =>
      ReactModule.createElement('div', {
        'data-testid': 'excalidraw-canvas',
        'data-lang-code': langCode,
      }),
    exportToBlob: vi.fn(),
  };
});

vi.mock('@nimbalyst/extension-sdk', () => ({
  useEditorLifecycle: () => ({
    markDirty: vi.fn(),
    isLoading: false,
    error: null,
    theme: 'light',
  }),
  useCollaborativeEditor: () => ({
    isCollaborative: false,
    status: undefined,
    binding: null,
  }),
}));

import { ExcalidrawEditor } from '../components/ExcalidrawEditor';

const host = {
  filePath: '/workspace/diagram.excalidraw',
  readOnly: false,
} as never;

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

describe('Excalidraw editor locale', () => {
  it.each([
    { preference: 'en' as const, locale: 'en', i18n: () => englishI18n },
    { preference: 'ja' as const, locale: 'ja-JP', i18n: () => japaneseI18n },
  ])('passes $locale to the Excalidraw canvas for $preference UI', ({ preference, locale, i18n }) => {
    render(
      <UiLanguageProvider i18n={i18n()} preference={preference} systemLocale={preference === 'ja' ? 'ja-JP' : 'en-US'}>
        <ExcalidrawEditor host={host} />
      </UiLanguageProvider>,
    );

    expect(screen.getByTestId('excalidraw-canvas').getAttribute('data-lang-code')).toBe(locale);
  });
});
