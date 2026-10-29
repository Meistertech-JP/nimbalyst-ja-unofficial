// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { stateTransitions, transitionUpdates } from '../trackerReferenceLifecycle';
import { transitionDisplayCopy } from '../transitionDisplayCopy';
import { createI18nInstance } from '@nimbalyst/i18n/core';

describe('transition display-only projection', () => {
  it('uses the actual catalogs for live Japanese and English prompt copy', async () => {
    const i18n = await createI18nInstance('ja');
    const raw = stateTransitions({
      type: 'wiki-decision', status: 'open',
      statusOptions: ['open', 'rejected'].map(value => ({ value, label: value })),
    }).find(row => row.id === 'status:rejected')!;
    const t = (key: string, values?: Record<string, string>) => i18n.t(key, { ns: 'tracker', ...values });
    for (const [language, confirm, placeholder] of [
      ['ja', '却下', '実施しない理由'], ['en', 'Reject', 'What rules it out'], ['ja', '却下', '実施しない理由'],
    ] as const) {
      await i18n.changeLanguage(language);
      const display = transitionDisplayCopy(raw, t, { type: 'wiki-decision' });
      expect(display.prompt?.confirmLabel).toBe(confirm);
      expect(display.prompt?.placeholder).toBe(placeholder);
      expect(display.prompt?.field).toBe('whyNot');
    }
  });
  const statuses = ['open', 'accepted', 'rejected', 'deferred', 'superseded'].map(value => ({ value, label: value }));
  it('projects fixed prompts live while preserving fields, technical examples, transitions and writes', () => {
    const transitions = stateTransitions({ type: 'wiki-decision', status: 'open', statusOptions: statuses });
    const original = JSON.stringify(transitions);
    for (const language of ['ja', 'en', 'ja']) {
      const t = (key: string) => `${language}:${key}`;
      for (const status of ['rejected', 'deferred', 'superseded']) {
        const raw = transitions.find(row => row.id === `status:${status}`)!;
        const display = transitionDisplayCopy(raw, t, { type: 'wiki-decision' });
        expect(display.prompt?.label).toBe(`${language}:state_menu.transition_prompts.${status}.label`);
        expect(display.prompt?.confirmLabel).toBe(`${language}:state_menu.transition_prompts.${status}.confirm`);
        expect(display.description).toBe(`${language}:state_menu.transition_descriptions.${status}_prompt`);
        expect(display.prompt?.placeholder).toBe(status === 'superseded' ? 'SEC-57' : `${language}:state_menu.transition_prompts.${status}.placeholder`);
        expect(display.prompt?.field).toBe(raw.prompt?.field);
        expect(transitionUpdates(raw, { actor: null, today: '2026-10-29', input: 'user input' })).toEqual({ status, [raw.prompt!.field]: status === 'superseded' ? { itemId: 'user input' } : 'user input' });
      }
    }
    expect(JSON.stringify(transitions)).toBe(original);
  });

  it('localizes generated question copy without translating user positions or owner names', () => {
    for (const owner of [null, 'Custom Owner']) {
      const rows = stateTransitions({ type: 'question', status: 'open', statusOptions: [{ value: 'answered', label: 'Answered' }], position: 'Custom position', positionState: 'proposed', positionOwnerName: owner, canOpenItem: true });
      const before = JSON.stringify(rows);
      for (const language of ['ja', 'en', 'ja']) {
        const t = (key: string, values?: Record<string, string>) => `${language}:${key}:${JSON.stringify(values)}`;
        const accept = transitionDisplayCopy(rows[0], t, { type: 'question', position: 'Custom position', owner });
        expect(accept.label).toContain(`state_menu.question.accept_${owner ? 'owner' : 'proposed'}_position`);
        if (owner) expect(accept.label).toContain('Custom Owner');
        expect(accept.description).toContain('Custom position');
        expect(transitionDisplayCopy(rows[1], t, { type: 'question' }).label).toContain('question.write_different_position');
      }
      expect(JSON.stringify(rows)).toBe(before);
    }
  });

  it('preserves custom labels, prompt fields and unrecognized transition IDs', () => {
    const raw = stateTransitions({ type: 'wiki-decision', status: 'open', statusOptions: statuses }).find(row => row.id === 'status:rejected')!;
    const t = (key: string) => `translated:${key}`;
    const custom = { ...raw, id: 'external:rejected' };
    expect(transitionDisplayCopy(custom, t, { type: 'wiki-decision' })).toEqual({ label: custom.label, description: custom.description, prompt: custom.prompt });
    const edited = { ...raw, label: 'User Reject', description: 'User description', prompt: { ...raw.prompt!, label: 'User label', placeholder: 'User hint', confirmLabel: 'User action' } };
    expect(transitionDisplayCopy(edited, t, { type: 'wiki-decision' })).toEqual({ label: edited.label, description: edited.description, prompt: edited.prompt });
    expect(transitionDisplayCopy(raw, key => key, { type: 'wiki-decision' }).prompt).toEqual(raw.prompt);
  });
});
