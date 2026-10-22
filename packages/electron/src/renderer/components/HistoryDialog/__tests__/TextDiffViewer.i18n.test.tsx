// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { TextDiffViewer } from '../TextDiffViewer';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(cleanup);

describe('TextDiffViewer localization', () => {
  it('localizes version headers while keeping diff content intact', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <TextDiffViewer oldText="before" newText="after" />
      </I18nextProvider>,
    );

    expect(screen.getByText('旧バージョン')).toBeDefined();
    expect(screen.getByText('新バージョン')).toBeDefined();
    expect(screen.getByText('before')).toBeDefined();
    expect(screen.getByText('after')).toBeDefined();
  });
});
