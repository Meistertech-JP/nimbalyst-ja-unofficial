// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

import { ReleaseNotesDialog } from '../ReleaseNotesDialog';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

afterEach(() => cleanup());

const renderDialog = (
  language: 'en' | 'ja',
  onClose = vi.fn(),
  onUpdate = vi.fn(),
  releaseNotes = '',
) => {
  const i18n = language === 'ja' ? japaneseI18n : englishI18n;
  return render(
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
      <ReleaseNotesDialog
        currentVersion="1.2.2"
        newVersion="1.2.3"
        releaseNotes={releaseNotes}
        onClose={onClose}
        onUpdate={onUpdate}
      />
    </UiLanguageProvider>,
  );
};

describe('ReleaseNotesDialog', () => {
  it('renders translated update labels in English and keeps version identifiers intact', () => {
    renderDialog('en', vi.fn(), vi.fn(), 'New feature');

    screen.getByText('A new version of Nimbalyst is available!');
    screen.getByText('You are currently on:');
    screen.getByText('The latest version is:');
    screen.getByRole('heading', { name: '1.2.3 - Release Notes' });
    screen.getByRole('button', { name: 'Later' });
    screen.getByRole('button', { name: 'Update to Nimbalyst 1.2.3' });
    screen.getByText('New feature');
  });

  it('renders Japanese labels, translated empty state, and invokes actions', () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn();
    renderDialog('ja', onClose, onUpdate);

    screen.getByText('Nimbalystの新しいバージョンがあります');
    screen.getByText('現在のバージョン：');
    screen.getByText('最新バージョン：');
    screen.getByRole('heading', { name: '1.2.3 - リリースノート' });
    screen.getByText('リリースノートはありません。');

    fireEvent.click(screen.getByRole('button', { name: '後で' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Nimbalyst 1.2.3に更新' }));
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});
