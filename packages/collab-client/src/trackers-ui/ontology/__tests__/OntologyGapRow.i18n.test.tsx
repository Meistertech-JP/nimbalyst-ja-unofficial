// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { TrackerDataModel } from '@nimbalyst/tracker-schema';
import { OntologyGapRow } from '../OntologyParts';
import { buildDomainModel } from '../ontologyDomain';
import { OntologyWhatWeTrack } from '../OntologyWhatWeTrack';
import { STALE_FACT_DAYS } from '../ontologyKnowledge';
import { displayDomainModel } from '../ontologyDomainVocabulary';
import { claim, domainFixture, knowledgeFixture, rec, ref, NOW } from './ontologyFixture';

afterEach(cleanup);

test('domain display switches language without rewriting names, links, schema data or raw requests', async () => {
  const model = buildDomainModel({ types: [], predicates: null, records: domainFixture(), now: NOW });
  const before = JSON.stringify(model);
  const onSelect = vi.fn();
  const onOpenItem = vi.fn();
  const i18n = await createI18nInstance('ja');
  const content = (preference: 'ja' | 'en', selected: string | null = null) => (
    <UiLanguageProvider i18n={i18n} preference={preference} systemLocale="ja">
      <OntologyWhatWeTrack model={model} selected={selected} onSelect={onSelect} now={NOW}
        gapAction={() => ({ label: 'Custom action', open: vi.fn() })} proposals={[]}
        onOpenProposal={vi.fn()} onOpenItem={onOpenItem} />
    </UiLanguageProvider>
  );
  const view = render(content('ja'));
  expect(view.container.querySelector('[data-group="market"] h3')?.textContent).toBe('市場');
  expect(view.container.querySelector('[data-category="competitors"] .ontology-card-name')?.textContent).toBe('競合製品');
  expect(view.container.querySelector('[data-category="competitors"] .ontology-card-gap')?.textContent).toContain('メーカーが不明な競合製品が1件あります');
  expect(view.container.textContent).toContain('Cursor');
  const summaryLink = view.container.querySelector<HTMLButtonElement>('.ontology-hero-count')!;
  expect(summaryLink.textContent).toContain('競合製品');
  fireEvent.click(summaryLink);
  expect(onSelect).toHaveBeenCalledWith('competitors');
  view.rerender(content('ja', 'us'));
  expect(view.container.querySelector('.ontology-members th')?.textContent).toBe('記録内容');
  expect(view.container.querySelectorAll('.ontology-members tbody button')).toHaveLength(0);
  expect(view.container.querySelector('.ontology-schema-stored')?.textContent).toContain('ナレッジページ');
  expect(view.container.querySelector('.ontology-schema-stored code')?.textContent).toBe('entity');
  view.rerender(content('ja', 'competitors'));
  fireEvent.click(view.container.querySelector<HTMLButtonElement>('.ontology-members tbody button')!);
  expect(onOpenItem).toHaveBeenCalledWith('Cursor');
  view.rerender(content('en'));
  await screen.findByText('The market');
  expect(view.container.querySelector('.ontology-hero')?.textContent).toBe(model.summary.map(part => part.text).join(''));
  expect(JSON.stringify(model)).toBe(before);
  expect(onOpenItem).toHaveBeenCalledTimes(1);
});

test('domain metadata localizes built-in statuses and precise dates without guessing custom data', async () => {
  const types = [{ type: 'bug', fields: [{ name: 'status', type: 'select', options: [
    { value: 'to-do', label: 'To Do', category: 'unstarted' },
    { value: 'done', label: 'Done', category: 'done' },
    { value: 'in-progress', label: 'Custom Active', category: 'started' },
    { value: 'custom', label: 'To Do', category: 'started' },
  ] }] }] as TrackerDataModel[];
  const records = [...domainFixture(), rec('Custom value', 'bug', { status: 'in-progress' }), rec('Custom option', 'bug', { status: 'custom' }),
    ...['year', 'month', 'day', 'undated'].flatMap(precision => [
      rec(`Company ${precision}`, 'entity', { kind: 'organization' }),
      claim(`Revenue ${precision}`, `Company ${precision}`, 'annual-revenue', undefined, {
        valueText: 'unknown', qualifiers: precision === 'undated' ? {} : { asOf: '2026-09-04', asOfPrecision: precision },
      }),
    ]),
  ];
  const model = buildDomainModel({ types, records, predicates: null, now: NOW });
  const before = JSON.stringify(model);
  const i18n = await createI18nInstance('ja');
  const display = displayDomainModel(model, 'ja', (key, options) => i18n.t(key, { ns: 'tracker', ...options }));
  const bugs = display.categories.find(category => category.id === 'bugs')!;
  expect(bugs.role).toBe('全6件、未完了5件');
  expect(bugs.example).toContain('3 未着手');
  expect(bugs.example).toContain('Custom Active');
  expect(bugs.table.rows.find(row => row.id === 'B1')?.cells[1]?.text).toBe('未着手');
  expect(bugs.table.rows.find(row => row.id === 'Custom value')?.cells[1]?.text).toBe('Custom Active');
  expect(bugs.table.rows.find(row => row.id === 'Custom option')?.cells[1]?.text).toBe('To Do');
  const companies = display.categories.find(category => category.id === 'organizations')!;
  const revenue = (precision: string) => companies.table.rows.find(row => row.id === `Company ${precision}`)?.cells[2]?.text;
  expect(revenue('year')).toBe('unknown · 2026年');
  expect(revenue('month')).toBe('unknown · 2026年9月');
  expect(revenue('day')).toBe('unknown · 2026年9月4日');
  expect(revenue('undated')).toBe('unknown · 日付なし (日付なし)');
  expect(companies.table.rows.find(row => row.id === 'Anysphere')?.cells[2]?.text).toBe('$500M ARR · 2026年3月1日 (古い情報)');
  expect(companies.table.columns).toEqual(['企業', '提供製品', '売上', 'その他の事実']);
  expect(companies.schema?.stored.filter(part => part.code).map(part => part.text)).toEqual(['organization']);
  expect(displayDomainModel(model, 'en', (key, options) => i18n.t(key, options))).toBe(model);
  expect(JSON.stringify(model)).toBe(before);
});

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
