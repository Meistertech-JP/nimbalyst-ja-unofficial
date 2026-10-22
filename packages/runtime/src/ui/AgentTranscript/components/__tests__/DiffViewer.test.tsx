import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';

import { DiffViewer } from '../DiffViewer';

const withI18n = (
  i18n: Awaited<ReturnType<typeof createI18nInstance>>,
  children: React.ReactNode,
) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;

describe('DiffViewer', () => {
  // Regression for NIM-1672: rendering diff lines via a helper that called
  // React.useState broke the Rules of Hooks. When a re-render produced a
  // different number of diff lines than the previous render, React threw
  // "Rendered more hooks than during the previous render." This exercises that
  // exact transition and must not throw.
  it('survives a re-render that changes the diff-line count', async () => {
    const i18n = await createI18nInstance('en');
    const twoLineEdit = {
      replacements: [
        { oldText: 'line one\nline two', newText: 'line one changed\nline two changed' },
      ],
    };
    const oneLineEdit = {
      replacements: [
        { oldText: 'single', newText: 'single changed' },
      ],
    };

    const { rerender } = render(withI18n(i18n, <DiffViewer edit={twoLineEdit} />));
    // Re-render with fewer diff lines — previously this changed DiffViewer's
    // hook count and crashed.
    expect(() => rerender(withI18n(i18n, <DiffViewer edit={oneLineEdit} />))).not.toThrow();
    // And back up again.
    expect(() => rerender(withI18n(i18n, <DiffViewer edit={twoLineEdit} />))).not.toThrow();
  });

  it('renders multiple replacements without a hooks mismatch', async () => {
    const i18n = await createI18nInstance('en');
    const edit = {
      replacements: [
        { oldText: 'a\nb\nc', newText: 'a2\nb2\nc2' },
        { oldText: 'x', newText: 'y' },
      ],
    };
    const single = { old_string: 'hello', new_string: 'goodbye' };

    const { rerender, container } = render(withI18n(i18n, <DiffViewer edit={edit} />));
    expect(container.querySelectorAll('.diff-line').length).toBeGreaterThan(0);
    // Switch to the single old_string/new_string path (different hook count).
    expect(() => rerender(withI18n(i18n, <DiffViewer edit={single} />))).not.toThrow();
  });

  it('localizes the file-open title while preserving the file path', async () => {
    const i18n = await createI18nInstance('ja');
    render(
      withI18n(i18n,
        <DiffViewer
          edit={{ filePath: 'src/example.ts', content: 'const value = 1;' }}
          onOpenFile={() => {}}
        />,
      ),
    );

    expect(await screen.findByTitle('src/example.tsを開く')).toBeTruthy();
  });
});
