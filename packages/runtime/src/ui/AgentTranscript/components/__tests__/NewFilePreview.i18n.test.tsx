import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { NewFilePreview } from '../NewFilePreview';

it('localizes file title, line count, and collapse control', async () => {
  const i18n = await createI18nInstance('ja');
  const content = Array.from({ length: 31 }, (_, index) => `line ${index + 1}`).join('\n');
  const onOpenFile = vi.fn();

  render(
    <I18nextProvider i18n={i18n}>
      <NewFilePreview
        content={content}
        filePath="src/example.ts"
        absoluteFilePath="C:/workspace/src/example.ts"
        onOpenFile={onOpenFile}
      />
    </I18nextProvider>,
  );

  expect(screen.getByTitle('C:/workspace/src/example.tsを開く')).toBeTruthy();
  expect(screen.getByText('31行')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '全31行を表示' }));
  expect(screen.getByRole('button', { name: '折りたたむ' })).toBeTruthy();
});
