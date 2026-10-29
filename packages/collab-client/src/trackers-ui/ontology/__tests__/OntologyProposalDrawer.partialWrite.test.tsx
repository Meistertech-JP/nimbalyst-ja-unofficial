// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { OntologyProposalDrawer } from '../OntologyProposalDrawer';
import { buildKnowledgeGraph } from '../ontologyKnowledge';
import { appendPartialWriteNotice } from '../partialWriteNotice';
import { knowledgeFixture, rec } from './ontologyFixture';
import { parseProposalChanges, planOntologyChange } from '../ontologyProposals';

afterEach(cleanup);

it('localizes planned copy and validation errors without translating custom fields or mutating plans', async () => {
  const i18n = await createI18nInstance('ja');
  const changes = [
    { id: 'r', type: 'reclassify-pages', toKind: 'custom-kind', pageIds: ['Pricing'], decision: 'accepted' },
    { id: 'm', type: 'move-field-to-claims', field: 'Kind', predicate: 'custom-predicate', pageIds: ['Pricing'] },
    { id: 'l', type: 'apply-label', labelId: 'Labels', pageIds: ['Pricing'], decision: 'accepted' },
    { id: 'bad', type: 'add-market-node' },
  ];
  const records = [...knowledgeFixture().filter(record => record.id !== 'Pricing'), rec('Pricing', 'entity', { kind: 'concept', Kind: 'Kind' })];
  const graph = buildKnowledgeGraph(records);
  const env = { kindOptions: new Set<string>(), predicateLabel: (id: string) => id, newId: () => 'new' };
  const plans = parseProposalChanges(changes).changes.map(change => planOntologyChange(change, graph, env));
  const before = JSON.stringify(plans);
  const proposal = rec('P1', 'ontology-proposal', { title: 'User title', changes: JSON.stringify(changes) });
  const view = render(<I18nextProvider i18n={i18n}><OntologyProposalDrawer
    target={{ kind: 'proposal', id: 'P1' }} onClose={vi.fn()} onOpenProposal={vi.fn()}
    proposals={new Map([['P1', proposal]])} graph={graph} env={env} context={null}
  /></I18nextProvider>);
  const dialog = await screen.findByRole('dialog');
  expect(dialog.textContent).toContain('1件のページをcustom-kindに再分類');
  expect(dialog.textContent).toContain('種類「custom-kind」がスキーマに追加されるのを待っています。');
  expect(dialog.textContent).toContain('変更4: titleが必要です');
  expect(dialog.textContent).toContain('変更前: 種類: concept');
  expect(dialog.textContent).toContain('変更前: Kind: Kind');
  expect(dialog.textContent).toContain('ラベル「Labels」がレジストリに追加されるのを待っています。');
  await act(async () => { await i18n.changeLanguage('en'); });
  expect([...dialog.querySelectorAll('.ontology-change-title')].map(node => node.textContent)).toEqual(plans.map(plan => plan.summary));
  expect(dialog.textContent).toContain('change 4: needs title');
  expect(JSON.stringify(plans)).toBe(before);
  expect(view.baseElement.textContent).toContain('User title');
});

it('renders only the annotated generated notice in the chosen language', async () => {
  const i18n = await createI18nInstance('ja');
  const change = { id: 'r', type: 'reclassify-pages', toKind: 'topic', pageIds: ['Pricing'], decision: 'accepted', reason: 'User reason' };
  appendPartialWriteNotice(change, 1, 2);
  const proposal = rec('P1', 'ontology-proposal', { title: 'Proposal', changes: JSON.stringify([change]) });
  render(<I18nextProvider i18n={i18n}><OntologyProposalDrawer
    target={{ kind: 'proposal', id: 'P1' }} onClose={vi.fn()} onOpenProposal={vi.fn()}
    proposals={new Map([['P1', proposal]])} graph={buildKnowledgeGraph(knowledgeFixture())}
    env={{ kindOptions: new Set(['topic']), predicateLabel: (id) => id, newId: () => 'new' }} context={null}
  /></I18nextProvider>);
  expect((await screen.findByText(/User reason/)).textContent).toContain('エラー発生前に2件中1件を適用しました。');
  await act(async () => { await i18n.changeLanguage('en'); });
  expect(screen.getByText(/User reason/).textContent).toContain('Partly applied (1 of 2 writes) before an error; undo reverses what ran.');
});

it('renders every schema/data plan heading and keeps unknown type values and custom label names', async () => {
  const i18n = await createI18nInstance('ja');
  const specs = [
    { type: 'add-label', label: { id: 'new', label: 'Kind', broader: ['parent'] } },
    { type: 'add-property', storage: 'field', property: { id: 'custom', label: 'Labels', type: 'string' }, labelIds: ['parent'] },
    { type: 'add-property', storage: 'claim', property: { id: 'custom', label: 'Labels', valueShape: 'text' } },
    { type: 'add-label-property', labelId: 'parent', propertyId: 'custom' },
    { type: 'add-broader', labelId: 'parent', broaderId: 'new' },
    { type: 'extend-range', propertyId: 'custom', labelIds: ['new'] },
    { type: 'split-label', labelId: 'parent', into: [{ id: 'new', label: 'New claim' }], pageIds: { new: ['Pricing'] } },
    { type: 'add-kind-option', value: 'custom', label: 'Kind' },
    { type: 'add-predicate', predicate: { id: 'custom', label: 'Labels', direction: 'directed', valueShape: 'text' } },
    { type: 'add-market-node', title: 'User market' },
    { type: 'merge-duplicates', keepId: 'Notion', mergeIds: ['NIM-1374'] },
    { type: 'Custom TYPE <keep>' },
  ].map((spec, index) => ({ ...spec, id: String(index), decision: 'accepted' }));
  const graph = buildKnowledgeGraph(knowledgeFixture());
  const env = { kindOptions: new Set<string>(), predicateLabel: (id: string) => id, newId: () => 'new', labels: {
    labels: [{ id: 'parent', label: 'Labels', properties: [] }], properties: [], claimProperties: {},
  } };
  const parsed = parseProposalChanges(specs);
  const plans = parsed.changes.map(change => planOntologyChange(change, graph, env));
  expect(plans).toHaveLength(11);
  expect(plans.every(plan => plan.displaySummary && (!plan.blocked || plan.displayBlocked))).toBe(true);
  const proposal = rec('P1', 'ontology-proposal', { title: 'User title', changes: JSON.stringify(specs) });
  render(<I18nextProvider i18n={i18n}><OntologyProposalDrawer target={{ kind: 'proposal', id: 'P1' }}
    onClose={vi.fn()} onOpenProposal={vi.fn()} proposals={new Map([['P1', proposal]])} graph={graph} env={env} context={null}
  /></I18nextProvider>);
  const dialog = await screen.findByRole('dialog');
  const japanese = [...dialog.querySelectorAll('.ontology-change-title')].map(node => node.textContent);
  expect(japanese).toEqual([
    'Labelsの下にラベル「Kind」（new）を追加', 'Labelsにフィールドプロパティ「Labels」（custom）を追加',
    'ステートメントプロパティ「Labels」（custom）を追加', 'Labelsにプロパティcustomを追加',
    'Labelsをnewの下に配置', 'customの参照先にnewを追加', 'LabelsをNew claimに分割',
    '種類「Kind」（custom）を追加', '述語「Labels」（custom）を追加', 'Marketsの下に市場「User market」を追加',
    'notion aiをNotionに統合',
  ]);
  expect(dialog.textContent).toContain('変更12: 不明なタイプ"Custom TYPE <keep>"');
  // This preview label comes from the user's label registry, not the fixed Labels caption.
  expect(dialog.textContent).toContain('変更前: Labels: （プロパティなし）');
  await act(async () => { await i18n.changeLanguage('en'); });
  expect([...dialog.querySelectorAll('.ontology-change-title')].map(node => node.textContent)).toEqual(plans.map(plan => plan.summary));
  expect([...dialog.querySelectorAll('.ontology-change-blocked')].map(node => node.textContent)).toEqual(plans.filter(plan => plan.blocked).map(plan => plan.blocked));
  await act(async () => { await i18n.changeLanguage('ja'); });
  expect([...dialog.querySelectorAll('.ontology-change-title')].map(node => node.textContent)).toEqual(japanese);
});

it('localizes generated preview values but preserves identical user strings and raw writes', async () => {
  const i18n = await createI18nInstance('ja');
  const records = [
    rec('empty', 'entity', {}), rec('literal', 'entity', { kind: '(empty)', labels: ['(none)'], value: '(empty)' }),
    rec('array', 'entity', { value: ['(empty)', null] }),
  ];
  const specs = [
    { type: 'reclassify-pages', toKind: 'custom', pageIds: ['empty'] },
    { type: 'reclassify-pages', toKind: 'custom', pageIds: ['literal'] },
    { type: 'apply-label', labelId: 'custom', pageIds: ['empty'] },
    { type: 'apply-label', labelId: 'custom', pageIds: ['literal'] },
    { type: 'add-label-property', labelId: 'literal', propertyId: 'value', expects: { min: 1, max: 3 } },
    { type: 'add-label-property', labelId: 'empty', propertyId: 'value', expects: { min: 2 } },
    { type: 'add-label-property', labelId: 'empty', propertyId: 'value', expects: { max: 4 } },
    { type: 'add-label', label: { id: 'new', label: '(none)', properties: ['value'] } },
    { type: 'add-property', storage: 'field', property: { id: 'value', label: 'Value', type: 'string', range: ['literal'] } },
    { type: 'add-broader', labelId: 'empty', broaderId: 'literal' },
    { type: 'extend-range', propertyId: 'unknown', labelIds: ['literal'] },
    { type: 'add-kind-option', value: 'custom', label: '(none)' },
    { type: 'add-predicate', predicate: { id: 'p', label: '(empty)', direction: 'directed', valueShape: 'text', inverseLabel: '(none)' } },
    { type: 'add-market-node', title: '(missing)', parentId: 'absent' },
    { type: 'move-field-to-claims', field: 'value', predicate: 'p', pageIds: ['literal'] },
    { type: 'move-field-to-claims', field: 'value', predicate: 'p', pageIds: ['array'] },
  ].map((spec, index) => ({ ...spec, id: String(index) }));
  const graph = buildKnowledgeGraph(records);
  const env = { kindOptions: new Set(['custom']), predicateLabel: (id: string) => id, newId: () => 'new', labels: {
    labels: [{ id: 'literal', label: 'Literal', properties: ['(no properties)'] }, { id: 'empty', label: 'Empty' }],
    properties: [{ id: 'value', label: 'Value', type: 'string' as const }], claimProperties: {},
  } };
  const plans = parseProposalChanges(specs).changes.map(change => planOntologyChange(change, graph, env));
  const rawPlans = JSON.stringify(plans);
  const proposal = rec('P', 'ontology-proposal', { title: 'User title', changes: JSON.stringify(specs) });
  render(<I18nextProvider i18n={i18n}><OntologyProposalDrawer target={{ kind: 'proposal', id: 'P' }}
    onClose={vi.fn()} onOpenProposal={vi.fn()} proposals={new Map([['P', proposal]])} graph={graph} env={env} context={null}
  /></I18nextProvider>);
  const dialog = await screen.findByRole('dialog');
  for (const expected of ['種類: （空欄）', '種類: (empty)', 'ラベル: （なし）', 'ラベル: (none)',
    'Literal: (no properties)', 'Empty: （プロパティなし）', '期待値: 最小1件、最大3件', '期待値: 最小2件', '期待値: 最大4件',
    'newはありません', '+ new（プロパティ: value）', 'valueを含みます', '参照範囲 literal', '（最上位）', '（任意）',
    'customを含みます', '未定義', '逆方向「(none)」', '親: （見つかりません）', '(empty)（保持・非推奨）', '(empty), （空欄）']) {
    expect(dialog.textContent).toContain(expected);
  }
  await act(async () => { await i18n.changeLanguage('en'); });
  const previews = [...dialog.querySelectorAll('.ontology-change-before, .ontology-change-after')].map(node => node.textContent);
  expect(previews).toEqual(plans.flatMap(plan => plan.example ? [
    ...plan.example.before.map(line => `Before: ${line.label}: ${line.value}`),
    ...plan.example.after.map(line => `After: ${line.label}: ${line.value}`),
  ] : []));
  expect(JSON.stringify(plans)).toBe(rawPlans);
  expect(plans[14]!.ops).toMatchObject([{ op: 'create', item: { customFields: { valueText: '(empty)' } } }]);
});
