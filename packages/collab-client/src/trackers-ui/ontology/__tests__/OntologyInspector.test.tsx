// @vitest-environment jsdom
/**
 * The inspector is read-only; the only writes it makes go through a proposal.
 * These cover the two a reader cannot check by looking: a gap's Fix writes a
 * proposal request through the writer (and then points at it instead of
 * writing a second), and applying an accepted change runs the planned writes
 * and records the proposal as applied.
 */
import React from 'react';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { TrackerDataModel } from '@nimbalyst/tracker-schema';
import type { TrackerDataCommand } from '../../../trackers/dataSource';
import { OntologyInspector } from '../OntologyInspector';
import { TypeMapRelationshipPanel } from '../typeMap/TypeMapRelationshipPanel';
import type { TypeMapModel, TypeMapRelationship, TypeMapType } from '../ontologyLabelMap';
import { domainFixture, NOW, rec } from './ontologyFixture';

afterEach(cleanup);

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
});

const ENTITY = {
  type: 'entity', displayName: 'Entity', displayNamePlural: 'Entities', icon: '', color: '', modes: { inline: true, fullDocument: true }, idPrefix: 'ent', idFormat: 'ulid',
  fields: [{ name: 'kind', type: 'select', options: ['product', 'market', 'topic', 'concept', 'organization'].map((value) => ({ value, label: value })) }],
} as unknown as TrackerDataModel;

function setup(records = domainFixture()) {
  const commands: TrackerDataCommand[] = [];
  const command = vi.fn(async (input: TrackerDataCommand) => {
    commands.push(input);
    return { ok: true as const };
  });
  const view = render(
    <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en">
      <OntologyInspector types={[ENTITY]} records={records} writer={{ command, workspace: 'project-1', actor: 'me@example.test' }} now={NOW} />
    </UiLanguageProvider>,
  );
  return { commands, view };
}

test('the What we track cards localize their fixed labels in Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  const view = render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja">
      <OntologyInspector types={[ENTITY]} records={domainFixture()} writer={null} now={NOW} onOpenTypes={() => {}} />
    </UiLanguageProvider>,
  );

  expect(screen.getByText('読み取り専用です。変更は提案を通じて行います。')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Wikiの「タイプ」でラベルを見る' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'エージェントに改善案を依頼' })).toBeDefined();
  expect(screen.getByText('未追跡')).toBeDefined();
  expect(screen.getByText(/の追跡を提案/)).toBeDefined();
  expect(screen.getByText('ほかにも追跡')).toBeDefined();
  expect(screen.getByText('修正候補')).toBeDefined();
  expect(screen.getByText(/Wikiページ\d+件/)).toBeDefined();

  fireEvent.click(view.container.querySelector('.ontology-card:not(.ontology-card-ghost)') as HTMLElement);
  expect(screen.getByText('項目間のつながり')).toBeDefined();
  expect(screen.getByText('スキーマ：保存方法')).toBeDefined();
  expect(screen.getByText('構成要素')).toBeDefined();
  expect(screen.getByText('このカテゴリで修正する点')).toBeDefined();
});

test('the type-map relationship panel localizes its status and missing-page controls', async () => {
  const i18n = await createI18nInstance('ja');
  const from: TypeMapType = {
    id: 'project', name: 'Project', plural: 'Projects', description: '', role: 'page', count: 1,
    declared: true, broader: [], properties: [], zone: 'work',
  };
  const to: TypeMapType = {
    id: 'person', name: 'Person', plural: 'People', description: '', role: 'page', count: 1,
    declared: true, broader: [], properties: [], zone: 'work',
  };
  const relationship: TypeMapRelationship = {
    id: 'project.owner.person', predicate: 'owner', verb: 'owned by', inverse: null, symmetric: false,
    from: from.id, to: to.id, status: 'declared-unused', statements: 0, subjects: 0, objects: 0,
    range: [to.id], topTargets: [], expectation: { min: 1, met: 0, total: 1, missing: [{ id: 'project-1', title: '未割り当てのプロジェクト' }] }, list: [],
  };
  const model: TypeMapModel = { types: [from, to], relationships: [relationship], zones: [], structure: [], unlabeled: 0, openRequests: [] };
  const onCenter = vi.fn();
  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja">
      <TypeMapRelationshipPanel
        model={model}
        relationship={relationship}
        typeById={new Map([[from.id, from], [to.id, to]])}
        zoneTone={new Map()}
        onCenter={onCenter}
      />
    </UiLanguageProvider>,
  );

  expect(screen.getByText('定義済みですが、まだ使用されていません')).toBeDefined();
  expect(screen.getByRole('heading', { name: '期待値' })).toBeDefined();
  expect(screen.getByText('不足は1件です。', { exact: false })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: '表示する' }));
  expect(screen.getByText('未割り当てのプロジェクト')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: '中央に表示' }));
  expect(onCenter).toHaveBeenCalledWith({ kind: 'relationship', id: relationship.id });
});

test("a gap's Fix writes one proposal request, and once it exists the gap opens it instead", async () => {
  const { commands, view } = setup();
  const gap = () => view.container.querySelector('[data-gap="line:competitors:made-by"] button') as HTMLButtonElement;
  expect(gap().textContent).toBe('Fix');
  fireEvent.click(gap());
  fireEvent.click(await screen.findByRole('button', { name: 'Ask the agent to draft this' }));
  await waitFor(() => expect(commands).toHaveLength(1));
  expect(commands[0]).toMatchObject({
    type: 'create-item',
    item: { type: 'ontology-proposal', status: 'proposed', workspace: 'project-1', sharing: 'team', customFields: { healthCheck: 'line:competitors:made-by', changes: '[]' } },
  });
  // The drawer now waits on the request it wrote; the room echoes it back.
  expect(await screen.findByText('Waiting for the proposal')).toBeDefined();
  const id = (commands[0] as Extract<TrackerDataCommand, { type: 'create-item' }>).item.id;
  view.rerender(
    <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en">
      <OntologyInspector types={[ENTITY]} records={[...domainFixture(), rec(id, 'ontology-proposal', { title: 'Improve: 1 competitor has no known maker', status: 'proposed', healthCheck: 'line:competitors:made-by', changes: '[]' })]} writer={null} now={NOW} />
    </UiLanguageProvider>,
  );
  expect(await screen.findByText('Waiting for an agent to draft changes.')).toBeDefined();
  fireEvent.click(view.container.ownerDocument.querySelector('.ontology-drawer-close') as HTMLButtonElement);
  expect(gap().textContent).toBe('View proposal');
});

test('applying an accepted change runs its writes, then records the proposal as applied with an undo', async () => {
  const proposal = rec('P1', 'ontology-proposal', {
    title: 'Retire the concept kind',
    status: 'accepted',
    changes: JSON.stringify([{ id: 'a', type: 'reclassify-pages', toKind: 'topic', pageIds: ['Pricing'], decision: 'accepted' }]),
  });
  const { commands } = setup([...domainFixture(), proposal]);
  fireEvent.click(screen.getByRole('button', { name: /Retire the concept kind/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Apply 1 change' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  await waitFor(() => expect(commands).toHaveLength(2));
  expect(commands[0]).toMatchObject({ type: 'update-item', input: { itemId: 'Pricing', updates: { kind: 'topic' } } });
  const saved = (commands[1] as Extract<TrackerDataCommand, { type: 'update-item' }>).input;
  expect(saved.itemId).toBe('P1');
  expect(saved.updates.status).toBe('applied');
  expect(JSON.parse(String(saved.updates.undo)).entries[0].ops).toEqual([{ op: 'restore-fields', itemId: 'Pricing', fields: { kind: 'concept' } }]);
});
