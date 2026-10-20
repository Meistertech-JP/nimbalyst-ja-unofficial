// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { Provider, createStore } from 'jotai';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TipCard } from '../TipCard';
import { AllTipsDialog } from '../AllTipsDialog';
import { InlineTipDisplay } from '../InlineTipDisplay';
import { activeTipIdAtom } from '../atoms';
import { tips } from '../definitions';
import { filesVisualEditorsTip } from '../definitions/files-visual-editors';

vi.mock('../TipService', () => ({ markTipCompleted: vi.fn(), recordTipShown: vi.fn() }));

afterEach(async () => {
  cleanup();
  await i18next.changeLanguage('en');
});

describe('Japanese contextual tips', () => {
  it.each(tips)('covers the dynamic menu name for $id without changing its identifier', (tip) => {
    expect(i18next.getResource('en', 'menu', `tip_names.${tip.id}`)).toBe(tip.name);
    expect(i18next.getResource('ja', 'menu', `tip_names.${tip.id}`)).toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  });
  it.each(tips)('covers current title, body, and actions for $id without English fallback', (tip) => {
    const key = `tip_content.${tip.id.replace(/^tip-/, '').replace(/-/g, '_')}`;
    for (const [part, value] of Object.entries({ title: tip.content.title, body: tip.content.body, action: tip.content.action?.label, secondary: tip.content.secondaryAction?.label })) {
      if (!value) continue;
      expect(i18next.getResource('en', 'common', `${key}.${part}`)).toBe(value);
      const japanese = i18next.getResource('ja', 'common', `${key}.${part}`);
      expect(japanese).toBeTruthy();
      expect(japanese).not.toBe(value);
    }
  });

  it('renders translated markdown while retaining extensions and updating on locale changes', async () => {
    await i18next.changeLanguage('ja');
    const onAction = vi.fn();
    render(<TipCard tip={filesVisualEditorsTip} onAction={onAction} variant="inline" />);
    expect(screen.getByText('モックアップや図をすぐにプレビュー')).toBeTruthy();
    expect(screen.getByText('.mockup.html').tagName).toBe('STRONG');
    fireEvent.click(screen.getByRole('button', { name: '試してみる' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    await act(() => i18next.changeLanguage('en'));
    expect(screen.getByText(filesVisualEditorsTip.content.title)).toBeTruthy();
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('keeps custom tip content and callbacks intact in the translated catalog', async () => {
    await i18next.changeLanguage('ja');
    const custom = { ...filesVisualEditorsTip, id: 'external-tip', content: { title: 'User title', body: '**User body**' } };
    const onShowTip = vi.fn();
    render(<AllTipsDialog isOpen onClose={vi.fn()} tipDefinitions={[custom]} onShowTip={onShowTip} />);
    expect(screen.getByRole('heading', { name: 'すべてのヒント' })).toBeTruthy();
    expect(screen.getByText('User title')).toBeTruthy();
    expect(screen.getByText('User body')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '表示' }));
    expect(onShowTip).toHaveBeenCalledWith(custom);
  });

  it('localizes the action label without translating the inserted slash command', async () => {
    await i18next.changeLanguage('ja');
    const store = createStore();
    store.set(activeTipIdAtom, 'tip-session-cleanup');
    const onInsertPrompt = vi.fn();
    render(<Provider store={store}><InlineTipDisplay onInsertPrompt={onInsertPrompt} /></Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'セッションを整理' }));
    expect(onInsertPrompt).toHaveBeenCalledWith('/session-cleanup ');
    expect(store.get(activeTipIdAtom)).toBeNull();
  });
});
