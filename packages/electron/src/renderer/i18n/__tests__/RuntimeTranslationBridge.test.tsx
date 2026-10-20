import React, { useEffect, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { SearchReplaceBar } from '../../../../../runtime/src/plugins/SearchReplace/SearchReplaceBar';
import { SearchReplaceStateManager } from '../../../../../runtime/src/plugins/SearchReplace/SearchReplaceStateManager';
import { TranscriptSearchBar } from '../../../../../runtime/src/ui/AgentTranscript/components/TranscriptSearchBar';
import { runtimeEnglishTranslation, useRuntimeTranslation } from '../../../../../runtime/src/ui/RuntimeTranslation';
import type { TranscriptViewMessage } from '../../../../../runtime/src/ai/server/transcript/TranscriptProjector';

vi.mock('../index', async () => ({ rendererI18n: (await import('i18next')).createInstance() }));
// Keep this bridge test focused on shared context, not the unrelated transcript barrel.
vi.mock('@nimbalyst/runtime/ui', async () => import('../../../../../runtime/src/ui/RuntimeTranslation'));
import { rendererI18n } from '../index';
import { withRuntimeTranslations } from '../RuntimeTranslationBridge';

beforeEach(async () => {
  await rendererI18n.init({ lng: 'en', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.stubGlobal('CSS', { highlights: new Map() });
});
afterEach(() => {
  cleanup();
  SearchReplaceStateManager.clearState('/test/search.md');
  vi.unstubAllGlobals();
});

describe('shared runtime translations', () => {
  it('keeps uninitialized capture roots untouched without loading resources', () => {
    const loadNamespaces = vi.spyOn(rendererI18n, 'loadNamespaces');
    const child = <span>Capture editor</span>;
    rendererI18n.isInitialized = false;
    try {
      expect(withRuntimeTranslations(child)).toBe(child);
      render(withRuntimeTranslations(child));
      expect(screen.getByText('Capture editor')).toBeTruthy();
      expect(loadNamespaces).not.toHaveBeenCalled();
    } finally {
      rendererI18n.isInitialized = true;
      loadNamespaces.mockRestore();
    }
  });

  it('keeps provider-less English and interpolates values without interpreting them as templates', () => {
    expect(runtimeEnglishTranslation('unused', '{{current}} of {{total}}', { current: 0, total: 2 })).toBe('0 of 2');
    expect(runtimeEnglishTranslation('unused', '{{text}}', { text: '$& <User> {{other}}' })).toBe('$& <User> {{other}}');
    function Probe() {
      const { t, locale } = useRuntimeTranslation();
      return <p>{locale}: {t('menu:find', 'Find...')}</p>;
    }
    render(<Probe />);
    expect(screen.getByText('en: Find...')).toBeTruthy();
  });

  it('updates independent roots without remounting editors or losing their local state', async () => {
    const mounts = vi.fn();
    const unmounts = vi.fn();
    function StatefulEditor({ id }: { id: string }) {
      const { t } = useRuntimeTranslation();
      const [draft, setDraft] = useState('');
      useEffect(() => { mounts(); return () => { unmounts(); }; }, []);
      return <input aria-label={id} value={draft} placeholder={t('menu:find', 'Find...')} onChange={e => setDraft(e.target.value)} />;
    }
    render(withRuntimeTranslations(<StatefulEditor id="visible" />));
    render(withRuntimeTranslations(<StatefulEditor id="hidden" />));
    const visible = screen.getByLabelText<HTMLInputElement>('visible');
    fireEvent.change(visible, { target: { value: 'Untranslated user draft' } });
    await act(async () => { await rendererI18n.changeLanguage('ja'); });
    expect(visible.placeholder).toBe('検索...');
    expect(screen.getByLabelText<HTMLInputElement>('hidden').placeholder).toBe('検索...');
    expect(screen.getByLabelText('visible')).toBe(visible);
    expect(visible.value).toBe('Untranslated user draft');
    expect(mounts).toHaveBeenCalledTimes(2);
    expect(unmounts).not.toHaveBeenCalled();
  });

  it('uses an English fallback for missing translations', () => {
    function Probe() {
      const { t } = useRuntimeTranslation();
      return <p>{t('editor:missing_test_key', 'Hello {{name}}', { name: '<A> & B' })}</p>;
    }
    render(withRuntimeTranslations(<Probe />));
    expect(screen.getByText('Hello <A> & B')).toBeTruthy();
  });

  it('translates find/replace labels and keeps typed strings and Escape handling', async () => {
    SearchReplaceStateManager.open('/test/search.md');
    render(withRuntimeTranslations(<SearchReplaceBar filePath="/test/search.md" fileName="search.md" />));
    const find = screen.getByPlaceholderText<HTMLInputElement>('Find...');
    fireEvent.change(find, { target: { value: 'User Search' } });
    fireEvent.change(screen.getByPlaceholderText('Replace...'), { target: { value: 'User Replacement' } });
    await act(async () => { await rendererI18n.changeLanguage('ja'); });
    expect(screen.getByPlaceholderText('検索...')).toBe(find);
    expect(find.value).toBe('User Search');
    expect(screen.getByPlaceholderText<HTMLInputElement>('置換...').value).toBe('User Replacement');
    expect(screen.getByTitle('正規表現を使用')).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '前の一致箇所' }).disabled).toBe(true);
    expect(screen.getByText('結果なし')).toBeTruthy();
    fireEvent.keyDown(find, { key: 'Escape' });
    expect(screen.queryByTestId('search-replace-bar')).toBeNull();
  });

  it('localizes transcript counts and controls without changing search/navigation semantics', async () => {
    const onClose = vi.fn();
    const onScrollToMessage = vi.fn();
    const messages: TranscriptViewMessage[] = [{
      id: 1, sequence: 1, createdAt: new Date(0), type: 'user_message', subagentId: null, text: 'needle NEEDLE',
    }];
    render(withRuntimeTranslations(<TranscriptSearchBar isVisible messages={messages} containerRef={{ current: null }} onClose={onClose} onScrollToMessage={onScrollToMessage} />));
    const input = screen.getByPlaceholderText('Find in transcript...');
    fireEvent.change(input, { target: { value: 'needle' } });
    await screen.findByText('1 of 2');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('2 of 2')).toBeTruthy();
    await act(async () => { await rendererI18n.changeLanguage('ja'); });
    expect(screen.getByText('2件中2件目')).toBeTruthy();
    expect(screen.getByPlaceholderText('会話履歴を検索...')).toBe(input);
    fireEvent.click(screen.getByTitle('大文字と小文字を区別しない'));
    await waitFor(() => expect(screen.getByText('1件中1件目')).toBeTruthy());
    expect(onScrollToMessage).toHaveBeenCalledWith(0);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    expect(messages[0].text).toBe('needle NEEDLE');
  });
});
