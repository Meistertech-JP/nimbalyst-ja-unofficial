// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import type { CreateActionMode } from '../../../shared/createActions';
import { useLocalizedCreateAction } from '../useLocalizedCreateAction';

afterEach(cleanup);

describe('localized title-bar create action', () => {
  it('reacts to language changes without changing create dispatch or destination', async () => {
    const i18n = await createI18nInstance('en');
    const wrapper = ({ children }: { children: React.ReactNode }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
    const { result, rerender } = renderHook(({ mode }: { mode: CreateActionMode }) => useLocalizedCreateAction(mode), { initialProps: { mode: 'files' as CreateActionMode }, wrapper });
    expect(result.current).toEqual({ kind: 'file', label: 'New file', destination: null });
    await act(async () => { await i18n.changeLanguage('ja'); });
    expect(result.current).toEqual({ kind: 'file', label: '新しいファイル', destination: null });
    rerender({ mode: 'agent' });
    expect(result.current).toEqual({ kind: 'session', label: '新しいセッション', destination: null });
    rerender({ mode: 'collab' });
    expect(result.current).toEqual({ kind: 'sharedDoc', label: '新しい共有ドキュメント', destination: null });
    rerender({ mode: 'tracker' });
    expect(result.current).toEqual({ kind: 'trackerItem', label: '新しい項目', destination: null });
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(result.current?.label).toBe('New item');
    rerender({ mode: 'collab' });
    expect(result.current?.label).toBe('New shared doc');
  });

  it('keeps modes without a create target absent in either language', async () => {
    const i18n = await createI18nInstance('ja');
    const wrapper = ({ children }: { children: React.ReactNode }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
    const { result, rerender } = renderHook(({ mode }: { mode: CreateActionMode }) => useLocalizedCreateAction(mode), { initialProps: { mode: 'settings' as CreateActionMode }, wrapper });
    expect(result.current).toBeNull();
    rerender({ mode: 'org' });
    expect(result.current).toBeNull();
    rerender({ mode: 'pr-review' });
    expect(result.current).toBeNull();
  });
});
