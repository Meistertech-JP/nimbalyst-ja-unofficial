import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {I18nextProvider} from 'react-i18next';
import {createI18nInstance} from '@nimbalyst/i18n/core';

import {ImageContextMenu} from '../ImageComponent';
import {InsertImageUploadedDialogBody, InsertImageUriDialogBody} from '../index';

describe('ImageContextMenu', () => {
  it('renders a Copy image action and fires onCopy when clicked', async () => {
    const i18n = await createI18nInstance('en');
    const onCopy = vi.fn();
    const onClose = vi.fn();

    render(
      <I18nextProvider i18n={i18n}>
        <ImageContextMenu
          pos={{x: 10, y: 20}}
          onCopy={onCopy}
          onClose={onClose}
        />
      </I18nextProvider>,
    );

    const item = screen.getByRole('menuitem', {name: 'Copy image'});
    fireEvent.click(item);

    expect(onCopy).toHaveBeenCalledTimes(1);
  });
});

describe('image insertion dialogs localization', () => {
  it('renders Japanese labels and placeholders for a URL image', async () => {
    const i18n = await createI18nInstance('ja');

    render(
      <I18nextProvider i18n={i18n}>
        <InsertImageUriDialogBody onClick={vi.fn()} />
      </I18nextProvider>,
    );

    expect(screen.getByText('画像のURL')).toBeTruthy();
    expect(screen.getByPlaceholderText('例: https://source.unsplash.com/random')).toBeTruthy();
    expect(screen.getByText('代替テキスト')).toBeTruthy();
    expect(screen.getByRole('button', {name: '確定'})).toBeTruthy();
  });

  it('renders Japanese labels for an uploaded image', async () => {
    const i18n = await createI18nInstance('ja');

    render(
      <I18nextProvider i18n={i18n}>
        <InsertImageUploadedDialogBody onClick={vi.fn()} />
      </I18nextProvider>,
    );

    expect(screen.getByText('画像のアップロード')).toBeTruthy();
    expect(screen.getByText('代替テキスト')).toBeTruthy();
    expect(screen.getByPlaceholderText('画像の内容を説明する代替テキスト')).toBeTruthy();
  });
});
