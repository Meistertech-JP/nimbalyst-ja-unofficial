// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import EmojiPickerPlugin from '../plugins/EmojiPickerPlugin';

afterEach(cleanup);

describe('Lexical typeahead accessible language', () => {
  it('provides Japanese labels before the completion menu is opened', async () => {
    const i18n = await createI18nInstance('ja');
    render(
      <I18nextProvider i18n={i18n}>
        <LexicalComposer initialConfig={{ namespace: 'a11y', onError: error => { throw error; } }}>
          <EmojiPickerPlugin />
        </LexicalComposer>
      </I18nextProvider>,
    );
    const anchor = document.querySelector('[role="listbox"]');
    expect(anchor?.getAttribute('aria-label')).toBe('入力候補');
    await act(async () => { anchor?.setAttribute('aria-label', 'Typeahead menu'); });
    await waitFor(() => expect(anchor?.getAttribute('aria-label')).toBe('入力候補'));
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(anchor?.getAttribute('aria-label')).toBe('Typeahead menu');
    await act(async () => { await i18n.changeLanguage('ja'); });
    expect(anchor?.getAttribute('aria-label')).toBe('入力候補');
  });

  it('isolates labels between editors and leaves unrelated listboxes untouched', async () => {
    const japanese = await createI18nInstance('ja');
    const english = await createI18nInstance('en');
    const view = render(<>
      <div role="listbox" aria-label="External suggestions" />
      {[japanese, english].map((i18n, index) => (
        <I18nextProvider i18n={i18n} key={index}>
          <LexicalComposer initialConfig={{ namespace: `isolated-${index}`, onError: error => { throw error; } }}>
            <EmojiPickerPlugin />
          </LexicalComposer>
        </I18nextProvider>
      ))}
    </>);
    const labels = () => Array.from(document.querySelectorAll('[role="listbox"]'), node => node.getAttribute('aria-label'));
    expect(labels()).toEqual(['External suggestions', '入力候補', 'Typeahead menu']);
    await act(async () => { await japanese.changeLanguage('en'); });
    expect(labels()).toEqual(['External suggestions', 'Typeahead menu', 'Typeahead menu']);
    view.unmount();
    expect(document.querySelectorAll('[role="listbox"]').length).toBe(0);
  });
});
