import React from 'react';
import {I18nextProvider} from 'react-i18next';
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {createI18nInstance} from '@nimbalyst/i18n/core';

vi.mock('../pageMarkActions', () => ({
  removePageMark: vi.fn(),
  updatePageMark: vi.fn(),
}));

import PageMarkEditorPopover from '../PageMarkEditorPopover';

afterEach(cleanup);

it('shows Japanese labels and placeholders for page-mark editing', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <I18nextProvider i18n={i18n}>
      <PageMarkEditorPopover
        editor={{} as never}
        nodeKey="mark-1"
        initial={{kind: 'decided', by: '', email: '', on: '', over: ''}}
        reference={document.createElement('button')}
        onClose={vi.fn()}
      />
    </I18nextProvider>,
  );

  expect(screen.getByRole('radiogroup', {name: 'マーク'})).toBeTruthy();
  expect(screen.getByRole('radio', {name: '決定済み'})).toBeTruthy();
  expect(screen.getByText('決定者')).toBeTruthy();
  expect(screen.getByText('メールアドレス')).toBeTruthy();
  expect(screen.getByPlaceholderText('名前')).toBeTruthy();
  expect(screen.getByPlaceholderText('name@example.com')).toBeTruthy();
  expect(screen.getByPlaceholderText('見送った内容')).toBeTruthy();
  expect(screen.getByRole('button', {name: 'マークを削除'})).toBeTruthy();
  expect(screen.getByRole('button', {name: '完了'})).toBeTruthy();
});
