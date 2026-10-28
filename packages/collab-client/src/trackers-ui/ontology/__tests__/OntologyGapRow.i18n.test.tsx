// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { OntologyGapRow } from '../OntologyParts';
import { buildDomainModel } from '../ontologyDomain';
import { STALE_FACT_DAYS } from '../ontologyKnowledge';
import { knowledgeFixture, NOW } from './ontologyFixture';

afterEach(cleanup);

test('generated gap headings follow language without changing model text, records or actions', async () => {
  const model = buildDomainModel({ types: [], predicates: null, records: knowledgeFixture(), now: NOW });
  const stale = model.gaps.find(gap => gap.id === 'stale-facts')!;
  const duplicate = model.gaps.find(gap => gap.id === 'duplicates')!;
  const category = model.gaps.find(gap => gap.check === 'catch-all-kind')!;
  expect(stale).toBeTruthy();
  expect(duplicate).toBeTruthy();
  expect(category).toBeTruthy();
  const before = JSON.stringify(model);
  const open = vi.fn();
  const i18n = await createI18nInstance('ja');
  const content = (preference: 'ja' | 'en') => (
    <UiLanguageProvider i18n={i18n} preference={preference} systemLocale="ja">
      {[stale, duplicate, category].map(gap => <OntologyGapRow key={gap.id} gap={gap} action={{ label: 'Open', open }} />)}
    </UiLanguageProvider>
  );
  const view = render(content('ja'));
  expect(screen.getByText(`${STALE_FACT_DAYS}日を超える古い事実が${stale.count}件あります`)).toBeTruthy();
  expect(screen.getByText(`${duplicate.count}件の重複があります`)).toBeTruthy();
  expect(screen.getByText(`分類が不明確なナレッジページが${category.count}件あります`)).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[0]);
  expect(open).toHaveBeenCalledTimes(1);
  view.rerender(content('en'));
  expect(await screen.findByText(stale.title)).toBeTruthy();
  expect(screen.getByText(duplicate.title)).toBeTruthy();
  expect(screen.getByText(category.title)).toBeTruthy();
  expect(JSON.stringify(model)).toBe(before);
});
