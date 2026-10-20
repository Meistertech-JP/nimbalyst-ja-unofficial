// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { GenericFrontmatterHeader } from '../../../../../runtime/src/plugins/FrontmatterPlugin/GenericFrontmatterHeader';

const locale = i18next.createInstance();

function translated(language: string, children: React.ReactNode) {
  const t = locale.getFixedT(language);
  return (
    <RuntimeTranslationProvider
      value={{
        locale: language,
        t: (key, defaultValue, params) => t(key, { ...params, defaultValue }),
      }}
    >
      {children}
    </RuntimeTranslationProvider>
  );
}

function header(content: string, onContentChange = vi.fn()) {
  return (
    <GenericFrontmatterHeader
      filePath="notes/example.md"
      fileName="example.md"
      getContent={() => content}
      contentVersion={1}
      onContentChange={onContentChange}
    />
  );
}

beforeEach(async () => {
  await locale.init({ lng: 'en', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('generic frontmatter header localization', () => {
  it('localizes tag, link and array controls while preserving field data', () => {
    const content = '---\ntags:\n  - alpha\nsource: https://example.com\nvalues:\n  - 1\n  - 2\n---\nBody';
    const view = render(translated('en', header(content)));
    expect(screen.getAllByPlaceholderText('Add tag...')).toHaveLength(1);
    expect(screen.getByLabelText('Remove alpha')).toBeTruthy();
    expect(screen.getByLabelText('Open link')).toBeTruthy();
    expect(screen.getByPlaceholderText('Comma-separated values')).toBeTruthy();

    view.rerender(translated('ja', header(content)));
    expect(screen.getAllByPlaceholderText('タグを追加…')).toHaveLength(1);
    expect(screen.getByLabelText('alphaを削除')).toBeTruthy();
    expect(screen.getByLabelText('リンクを開く')).toBeTruthy();
    expect(screen.getByPlaceholderText('カンマ区切りの値')).toBeTruthy();

    fireEvent.click(screen.getByText('ドキュメントのメタデータ'));
    expect(screen.getByLabelText('メタデータを展開')).toBeTruthy();
    expect(screen.getByText(/フィールド/)).toBeTruthy();
  });

  it('localizes parse errors without changing the raw error detail', () => {
    const view = render(translated('en', header('---\ninvalid: [\n---\nBody')));
    expect(screen.getByText('Invalid Frontmatter')).toBeTruthy();
    view.rerender(translated('ja', header('---\ninvalid: [\n---\nBody')));
    expect(screen.getByText('無効なFrontmatter')).toBeTruthy();
  });
});
