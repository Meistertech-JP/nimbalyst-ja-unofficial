// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { TrackerDataModel } from '@nimbalyst/tracker-schema';
import { OntologyGapRow } from '../OntologyParts';
import { buildDomainModel } from '../ontologyDomain';
import { STALE_FACT_DAYS } from '../ontologyKnowledge';
import { domainFixture, knowledgeFixture, rec, ref, NOW } from './ontologyFixture';

afterEach(cleanup);

test('sparse links localize built-in relations while unknown schema fields stay literal', async () => {
  const types = [{ type: 'decision', fields: [
    { name: 'area', type: 'relationship', targetTrackerTypes: ['feature-module'] },
    { name: 'customLink', type: 'relationship', targetTrackerTypes: ['feature-module'] },
  ] }] as TrackerDataModel[];
  const records = [rec('A', 'feature-module', {}), ...Array.from({ length: 4 }, (_, i) => rec(`D${i}`, 'decision', i === 0 ? { area: ref('A') } : {}))];
  const model = buildDomainModel({ types, records, predicates: null, now: NOW });
  const gaps = model.gaps.filter(gap => gap.check === 'domain-line');
  expect(gaps).toHaveLength(2);
  const i18n = await createI18nInstance('ja');
  const content = (preference: 'ja' | 'en') => <UiLanguageProvider i18n={i18n} preference={preference} systemLocale="ja">
    {gaps.map(gap => <OntologyGapRow key={gap.id} gap={gap} action={{ label: 'Open', open: vi.fn() }} />)}
  </UiLanguageProvider>;
  const view = render(content('ja'));
  expect(view.container.textContent).toContain('決定と製品領域の関係（対象）の記録が少なくなっています');
  expect(view.container.textContent).toContain('全4件中、記録があるのは1件です。');
  expect(view.container.textContent).toContain('決定と製品領域の関係（custom link）が記録されていません');
  expect(view.container.textContent).toContain('全4件で一度も使われていません。');
  view.rerender(content('en'));
  await screen.findByText(gaps[0]!.title);
  expect([...view.container.querySelectorAll('.ontology-gap-detail')].map(node => node.textContent)).toEqual(gaps.map(gap => gap.detail));
});

test('domain gap copy localizes generated phrases, preserves names and switches back to exact English', async () => {
  const model = buildDomainModel({ types: [], predicates: null, records: domainFixture(), now: NOW });
  const before = JSON.stringify(model);
  const i18n = await createI18nInstance('ja');
  const content = (preference: 'ja' | 'en') => <UiLanguageProvider i18n={i18n} preference={preference} systemLocale="ja">
    {model.gaps.map(gap => <OntologyGapRow key={gap.id} gap={gap} action={{ label: 'Open', open: vi.fn() }} />)}
  </UiLanguageProvider>;
  const view = render(content('ja'));
  expect(view.container.textContent).toContain('メーカーが不明な競合製品が1件あります');
  expect(view.container.textContent).toContain('Zed。');
  expect(view.container.textContent).toContain('競合製品と機能の対応が記録されていません');
  expect(view.container.textContent).toContain('機能と製品領域が関連付けられていません');
  expect(view.container.textContent).toContain('ペルソナをまだ管理していません');
  expect(view.container.textContent).toContain('年間売上: 1件');
  expect(view.container.textContent).toContain('Notion = notion ai');
  expect(view.container.textContent).toContain('Blog strategy');
  expect(view.container.textContent).not.toContain('Filed as');
  view.rerender(content('en'));
  await screen.findByText(model.gaps.find(gap => gap.id === 'competitor-capabilities')!.title);
  expect([...view.container.querySelectorAll('.ontology-gap-title')].map(node => node.textContent)).toEqual(model.gaps.map(gap => gap.title));
  expect([...view.container.querySelectorAll('.ontology-gap-detail')].map(node => node.textContent)).toEqual(model.gaps.map(gap => gap.detail));
  expect(JSON.stringify(model)).toBe(before);
});

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
