import React from 'react';
import i18next from 'i18next';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import MermaidComponent from '../../../../../runtime/src/editor/plugins/MermaidPlugin/MermaidComponent';

// Isolate the module-load cache so this failure cannot affect other Mermaid tests.
vi.mock('mermaid', () => ({ default: {} }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it('translates an internally generated Mermaid module-load failure without a locale retry', async () => {
  const locale = i18next.createInstance();
  await locale.init({ lng: 'en', fallbackLng: 'en', resources });
  vi.useFakeTimers(); const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const config = { namespace: 'mermaid-load-failure', onError: (error: Error) => { throw error; } };
  const current = (language: string) => {
    const t = locale.getFixedT(language);
    return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
      <LexicalComposer initialConfig={config}><MermaidComponent content="graph TD\n A --> B" nodeKey="raw-node-key" /></LexicalComposer>
    </RuntimeTranslationProvider>;
  };
  const view = render(current('en'));
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });
  expect(screen.getByText('Failed to load mermaid module')).toBeTruthy();
  const errorCount = log.mock.calls.length;
  view.rerender(current('ja'));
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(screen.getByText('Mermaidモジュールの読み込みに失敗しました')).toBeTruthy();
  expect(log).toHaveBeenCalledTimes(errorCount);
});
