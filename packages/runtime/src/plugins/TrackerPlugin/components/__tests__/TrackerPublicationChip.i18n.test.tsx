import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { TrackerPublicationChip, trackerPublicationDescription, trackerPublicationLabel } from '../TrackerPublicationChip';

afterEach(cleanup);

describe('TrackerPublicationChip localization', () => {
  it('preserves the existing one-argument helper API', () => {
    expect(trackerPublicationLabel('published')).toBe('Published');
    expect(trackerPublicationLabel('draft')).toBe('Draft');
    expect(trackerPublicationDescription('published')).toBe('Your team can see this item.');
    expect(trackerPublicationDescription('draft')).toBe('Only you can see this. Publish it when it is ready.');
  });

  it('localizes the fixed publication state label and title while retaining state semantics', async () => {
    const i18n = await createI18nInstance('ja');
    const { rerender } = render(
      <I18nextProvider i18n={i18n}>
        <TrackerPublicationChip state="published" />
      </I18nextProvider>,
    );

    const published = screen.getByTestId('tracker-publication-chip');
    expect(published.textContent).toContain('公開済み');
    expect(published.getAttribute('title')).toBe('この項目はチームに公開されています。');
    expect(published.getAttribute('data-publication')).toBe('published');

    rerender(
      <I18nextProvider i18n={i18n}>
        <TrackerPublicationChip state="draft" />
      </I18nextProvider>,
    );

    const draft = screen.getByTestId('tracker-publication-chip');
    expect(draft.textContent).toContain('下書き');
    expect(draft.getAttribute('title')).toBe('この項目は自分だけに表示されます。準備ができたら公開してください。');
    expect(draft.getAttribute('data-publication')).toBe('draft');

    await act(async () => { await i18n.changeLanguage('en'); });
    expect(draft.textContent).toContain('Draft');
    expect(draft.getAttribute('title')).toBe('Only you can see this. Publish it when it is ready.');

    rerender(
      <I18nextProvider i18n={i18n}>
        <TrackerPublicationChip state="published" />
      </I18nextProvider>,
    );
    const publishedInEnglish = screen.getByTestId('tracker-publication-chip');
    expect(publishedInEnglish.textContent).toContain('Published');
    expect(publishedInEnglish.getAttribute('title')).toBe('Your team can see this item.');
  });
});
