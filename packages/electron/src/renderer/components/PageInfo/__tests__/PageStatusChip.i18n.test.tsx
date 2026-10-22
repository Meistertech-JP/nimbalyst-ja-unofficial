// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@nimbalyst/runtime/plugins/TrackerPlugin/documentHeader/DocumentHeaderRegistry', () => ({
  DocumentHeaderRegistry: { register: vi.fn() },
}));
vi.mock('@nimbalyst/runtime/plugins/FrontmatterPlugin/frontmatterPresence', () => ({
  frontmatterStatusBadge: () => ({ kind: 'invalid', status: 'invalid' }),
}));

import { PageStatusChip } from '../PageStatusChip';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(cleanup);

describe('PageStatusChip localization', () => {
  it('localizes the invalid-frontmatter status and Page info tooltip', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <PageStatusChip filePath="/workspace/page.md" fileName="page.md" getContent={() => 'invalid'} contentVersion={0} />
      </I18nextProvider>,
    );

    const button = screen.getByRole('button', { name: '無効なFrontmatter' });
    expect(button.getAttribute('title')).toBe('ページ情報');
  });
});
