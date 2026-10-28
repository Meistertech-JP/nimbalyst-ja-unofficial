// @vitest-environment jsdom
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { OntologyProposalDrawer } from '../OntologyProposalDrawer';
import { buildKnowledgeGraph } from '../ontologyKnowledge';
import { appendPartialWriteNotice } from '../partialWriteNotice';
import { knowledgeFixture, rec } from './ontologyFixture';

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
