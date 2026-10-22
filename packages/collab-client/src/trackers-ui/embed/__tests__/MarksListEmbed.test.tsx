/**
 * A marks list follows its source: it loads again when the source says marks
 * changed, never lets an older answer replace a newer one, and keeps what it
 * showed when a reload fails.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { MarksListEmbed } from '../MarksListEmbed';
import { setPageMarksSource, type PageMarkRecord } from '../../../pages';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

function renderMarks(kind: 'decided' | 'open' | 'all', language: 'en' | 'ja' = 'en') {
  const i18n = language === 'ja' ? japaneseI18n : englishI18n;
  return render(
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale={language === 'ja' ? 'ja-JP' : 'en-US'}>
      <MarksListEmbed kind={kind} label="" attrs={{}} />
    </UiLanguageProvider>,
  );
}

function record(text: string): PageMarkRecord {
  return {
    id: text, kind: 'decided', text, plainText: text, by: null, on: null, over: null, line: 1,
    page: { kind: 'page', scope: 'team', id: 'p', title: 'Specs', uri: 'collab://org:o:doc:p', typeId: null, issueKey: null },
  };
}

afterEach(() => setPageMarksSource(null));

describe('MarksListEmbed', () => {
  it('never claims there are no decisions while the result is partial', async () => {
    setPageMarksSource({ listMarks: async () => [], listMarksResult: async () => ({ marks: [], status: 'partial' }) });
    renderMarks('decided');
    expect((await screen.findByRole('status')).textContent).toContain('incomplete');
    expect(screen.queryByText('No sentences are marked decided yet.')).toBeNull();
  });

  it('reloads on change, ignores a slower older answer, and keeps its rows when a reload fails', async () => {
    const answers: Array<{ resolve: (marks: PageMarkRecord[]) => void; reject: (error: Error) => void }> = [];
    let changed = () => {};
    setPageMarksSource({
      listMarks: () => new Promise((resolve, reject) => answers.push({ resolve, reject })),
      subscribe: (listener) => { changed = listener; return () => {}; },
    });
    renderMarks('decided');
    await waitFor(() => expect(answers).toHaveLength(1));

    act(() => changed());
    expect(answers).toHaveLength(2);
    await act(async () => answers[1].resolve([record('Newer')]));
    await act(async () => answers[0].resolve([record('Older')]));
    expect(screen.getByText('Newer')).toBeTruthy();
    expect(screen.queryByText('Older')).toBeNull();

    act(() => changed());
    await act(async () => answers[2].reject(new Error('Marks are unavailable')));
    expect(screen.getByText('Newer')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Marks are unavailable');
  });

  it('drops the rows it showed when the query changes and the new load fails', async () => {
    const answers: Array<{ resolve: (marks: PageMarkRecord[]) => void; reject: (error: Error) => void }> = [];
    setPageMarksSource({
      listMarks: () => new Promise((resolve, reject) => answers.push({ resolve, reject })),
    });
    const { rerender } = renderMarks('decided');
    await waitFor(() => expect(answers).toHaveLength(1));
    await act(async () => answers[0].resolve([record('Ship it')]));
    expect(screen.getByText('Ship it')).toBeTruthy();

    rerender(
      <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
        <MarksListEmbed kind="open" label="" attrs={{}} />
      </UiLanguageProvider>,
    );
    await waitFor(() => expect(answers).toHaveLength(2));
    expect(screen.queryByText('Ship it')).toBeNull();
    await act(async () => answers[1].reject(new Error('Marks are unavailable')));
    expect(screen.queryByText('Ship it')).toBeNull();
    screen.getByRole('alert');
  });

  it('shows Japanese labels for empty and partial results', async () => {
    setPageMarksSource({
      listMarks: async () => [],
      listMarksResult: async () => ({ marks: [], status: 'ready' }),
    });
    renderMarks('decided', 'ja');
    expect(await screen.findByText('決定事項')).toBeTruthy();
    expect(await screen.findByText('決定済みとしてマークされた文はありません。')).toBeTruthy();
  });
});
