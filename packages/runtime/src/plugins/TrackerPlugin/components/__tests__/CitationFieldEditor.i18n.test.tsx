// @vitest-environment jsdom
import React, { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { FieldDefinition } from '@nimbalyst/tracker-schema';
import { CitationFieldEditor } from '../CitationFieldEditor';

let i18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeEach(async () => {
  i18n = await createI18nInstance('ja');
});

function EditorHarness() {
  const [value, setValue] = useState<unknown>([]);
  return (
    <I18nextProvider i18n={i18n}>
      <CitationFieldEditor
        field={{ name: 'evidence', type: 'citation' } as FieldDefinition}
        value={value}
        onChange={setValue}
        host={{ lookupItem: () => null }}
        candidates={[{ itemId: 'citation-1', title: 'A source' }]}
      />
    </I18nextProvider>
  );
}

describe('CitationFieldEditor Japanese localization', () => {
  it('localizes the empty state, picker, citation chip title, and removal label', () => {
    render(<EditorHarness />);

    expect(screen.getByText('引用はありません')).toBeTruthy();
    fireEvent.click(screen.getByText('引用を追加').closest('button')!);

    const search = screen.getByPlaceholderText('引用を検索…');
    fireEvent.change(search, { target: { value: 'missing' } });
    expect(screen.getByText('一致する引用項目がありません。先に作成してください。')).toBeTruthy();

    fireEvent.change(search, { target: { value: 'A source' } });
    fireEvent.click(screen.getByText('A source').closest('button')!);

    expect(screen.getByTitle('この引用を確認')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '引用「A source」を削除' }));
    expect(screen.getByText('引用はありません')).toBeTruthy();
  });
});
