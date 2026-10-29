// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { globalRegistry } from '@nimbalyst/tracker-schema';
import { parseBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models/ModelLoader';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { item, fakeDataSource, fakeSchema } from './referenceFixtures';
import { createTrackerReferenceResolver } from '../trackerReferenceResolver';
import { TrackerStateMenu } from '../TrackerStateMenu';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});
afterEach(cleanup);

describe('TrackerStateMenu localization', () => {
  it('switches prompt UI JA/EN/JA without translating entered text or lifecycle callback data', async () => {
    const i18n = await createI18nInstance('en');
    // Test-owned resources isolate display wiring; the full catalog audit is separate.
    for (const language of ['en', 'ja']) i18n.addResourceBundle(language, 'tracker', {
      state_menu: {
        transition_descriptions: { rejected_prompt: language === 'ja' ? '却下する理由を入力します' : 'Asks why not' },
        transition_prompts: { rejected: {
          label: language === 'ja' ? '却下する理由は？' : 'Why not?',
          placeholder: language === 'ja' ? '実施しない理由' : 'What rules it out',
          confirm: language === 'ja' ? '却下' : 'Reject',
        } },
      },
    }, true, true);
    const data = fakeDataSource();
    const command = vi.spyOn(data.source, 'command');
    const resolver = createTrackerReferenceResolver(data.source, { schema: fakeSchema() });
    const changed = vi.fn();
    const trackerItem = item({ id: 'decision-prompt', type: 'wiki-decision', title: 'User decision', status: 'proposed' });
    render(<UiLanguageProvider i18n={i18n} preference="en" systemLocale="en"><TrackerStateMenu resolver={resolver} item={trackerItem} onChanged={changed} request={{ transitionId: 'status:rejected', input: '' }} /></UiLanguageProvider>);
    for (const language of ['ja', 'en', 'ja']) {
      await act(() => i18n.changeLanguage(language));
      const textarea = screen.getByRole('textbox');
      expect(textarea.getAttribute('placeholder')).toBe(language === 'ja' ? '実施しない理由' : 'What rules it out');
      expect(screen.getByLabelText(language === 'ja' ? '却下する理由は？' : 'Why not?')).toBe(textarea);
      expect(screen.getByRole('button', { name: language === 'ja' ? '却下' : 'Reject' })).toBeTruthy();
    }
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'User reason remains literal' } });
    fireEvent.click(screen.getByRole('button', { name: '却下' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith({ type: 'update-item', input: { itemId: 'decision-prompt', sharing: 'team', updates: { status: 'rejected', whyNot: 'User reason remains literal' } } }));
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ verb: 'rejected', updates: { status: 'rejected', whyNot: 'User reason remains literal' } }));
    resolver.dispose();
  });

  it('switches builtin state words and transition options without changing the written status or lifecycle verb', async () => {
    const seed = parseBuiltinTrackers().find(model => model.type === 'task')!;
    globalRegistry.register(seed, true);
    const i18n = await createI18nInstance('en');
    const data = fakeDataSource();
    const command = vi.spyOn(data.source, 'command');
    const changed = vi.fn();
    const resolver = createTrackerReferenceResolver(data.source, { schema: { ...fakeSchema(), get: type => globalRegistry.get(type) } });
    const trackerItem = item({ id: 'task-state', type: 'task', title: 'User task', status: 'to-do' });
    const { container } = render(<UiLanguageProvider i18n={i18n} preference="en" systemLocale="en"><TrackerStateMenu resolver={resolver} item={trackerItem} onChanged={changed} /></UiLanguageProvider>);
    const word = () => container.querySelector('button[data-status="to-do"]')!;
    for (const language of ['ja', 'en', 'ja']) {
      await act(() => i18n.changeLanguage(language));
      expect(word().textContent).toBe(language === 'ja' ? '未着手' : 'To Do');
    }
    fireEvent.click(word());
    fireEvent.click(screen.getByText('進行中'));
    await waitFor(() => expect(command).toHaveBeenCalledWith({ type: 'update-item', input: { itemId: 'task-state', sharing: 'team', updates: { status: 'in-progress' } } }));
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'task-state', verb: 'moved this to In Progress', updates: { status: 'in-progress' } }));
    expect(trackerItem.status).toBe('to-do');
    resolver.dispose();
  });

  it('renders the shared-change footer in Japanese with the issue key', () => {
    const data = fakeDataSource();
    const resolver = createTrackerReferenceResolver(data.source, {
      schema: fakeSchema(),
      onOpenItem: () => {},
    });
    const trackerItem = item({ id: 'd-ja', issueKey: 'KW-26', type: 'wiki-decision', title: 'Keep files?', status: 'proposed' });

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <TrackerStateMenu resolver={resolver} item={trackerItem} />
      </UiLanguageProvider>,
    );

    const trigger = document.querySelector('[data-status="proposed"]');
    expect(trigger).not.toBeNull();
    fireEvent.click(trigger!);
    expect(screen.getByText('KW-26の変更は全員に反映されます。')).toBeTruthy();
  });
});
