/**
 * SessionReferenceChip icon + navigation contract.
 */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as rtl from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { SessionReferenceChip } from '../SessionReferenceChip';
import { sessionRefMapAtom, type SessionRefMeta } from '../sessionRefAtoms';

const { render, screen, fireEvent, cleanup } = rtl;

const SESSION_ID = '9b1f2a44-1c22-4f0e-9a10-1234567890ab';

function renderChip(meta?: SessionRefMeta, onOpen?: (id: string) => void) {
  const store = createStore();
  if (meta) store.set(sessionRefMapAtom, new Map([[meta.id, meta]]));
  return render(
    <JotaiProvider store={store}>
      <SessionReferenceChip sessionId={SESSION_ID} onOpen={onOpen} />
    </JotaiProvider>,
  );
}

afterEach(cleanup);

describe('SessionReferenceChip', () => {
  it('updates the tooltip and phase across language changes without changing navigation', async () => {
    const i18n = await createI18nInstance('ja');
    const store = createStore();
    const onOpen = vi.fn();
    store.set(sessionRefMapAtom, new Map([[SESSION_ID, { id: SESSION_ID, title: 'My feature', phase: 'planning' }]]));
    render(<I18nextProvider i18n={i18n}><JotaiProvider store={store}>
      <SessionReferenceChip sessionId={SESSION_ID} onOpen={onOpen} />
    </JotaiProvider></I18nextProvider>);
    const button = screen.getByRole('button', { name: 'My feature 計画中' });
    expect(button.getAttribute('title')).toBe('My feature · 計画中 — セッションを開く');
    button.focus();
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(SESSION_ID);
    await rtl.act(async () => { await i18n.changeLanguage('en'); });
    expect(button.getAttribute('title')).toBe('My feature · Planning — open session');
    expect(button.textContent).toContain('Planning');
    await rtl.act(async () => { await i18n.changeLanguage('ja'); });
    expect(button.getAttribute('title')).toBe('My feature · 計画中 — セッションを開く');
  });

  it('localizes unresolved and empty-title fallbacks without translating session IDs', async () => {
    const i18n = await createI18nInstance('ja');
    const store = createStore();
    render(<I18nextProvider i18n={i18n}><JotaiProvider store={store}>
      <SessionReferenceChip sessionId={SESSION_ID} />
    </JotaiProvider></I18nextProvider>);
    const button = screen.getByRole('button', { name: '9b1f2a44' });
    expect(button.getAttribute('title')).toBe('セッション9b1f2a44 — セッションを開く');
    await rtl.act(async () => { await i18n.changeLanguage('en'); });
    expect(button.getAttribute('title')).toBe('Session 9b1f2a44 — open session');
    await rtl.act(async () => { await i18n.changeLanguage('ja'); });
    await rtl.act(async () => { store.set(sessionRefMapAtom, new Map([[SESSION_ID, { id: SESSION_ID, title: '', phase: 'custom-phase' }]])); });
    expect(button.getAttribute('title')).toBe('セッション — セッションを開く');
    expect(button.textContent).toContain('9b1f2a44');
    expect(document.querySelector('.session-reference-chip-phase')).toBeNull();
  });

  it.each([
    ['backlog', 'バックログ'], ['planning', '計画中'], ['implementing', '実装中'],
    ['validating', '検証中'], ['complete', '完了'],
  ])('localizes the known %s phase', async (phase, label) => {
    const i18n = await createI18nInstance('ja');
    render(<I18nextProvider i18n={i18n}>
      <SessionReferenceChip sessionId={SESSION_ID} fallbackMeta={{ title: 'Feature', phase }} />
    </I18nextProvider>);
    expect(screen.getByRole('button', { name: `Feature ${label}` }).getAttribute('title'))
      .toBe(`Feature · ${label} — セッションを開く`);
  });

  it('renders the session provider glyph instead of the generic icon', () => {
    renderChip({ id: SESSION_ID, title: 'PR 978 contribution review', provider: 'claude-code' });

    const icon = document.querySelector('.session-reference-chip-icon');
    expect(icon?.getAttribute('data-provider')).toBe('claude-code');
    // `claude-code` is a custom brand SVG, not a material-symbols ligature.
    expect(icon?.querySelector('svg')).toBeTruthy();
    expect(icon?.textContent).not.toContain('forum');
    screen.getByText('PR 978 contribution review');
  });

  it('falls back to the generic forum glyph when the provider is unknown', () => {
    renderChip({ id: SESSION_ID, title: 'Untitled session' });

    const icon = document.querySelector('.session-reference-chip-icon');
    expect(icon?.textContent).toBe('forum');
  });

  it('uses the host-supplied open handler instead of the window event', () => {
    const onOpen = vi.fn();
    const dispatch = vi.spyOn(window, 'dispatchEvent');
    renderChip({ id: SESSION_ID, title: 'PR 978 contribution review' }, onOpen);

    fireEvent.click(screen.getByText('PR 978 contribution review'));

    expect(onOpen).toHaveBeenCalledWith(SESSION_ID);
    expect(
      dispatch.mock.calls.some(([event]) => (event as CustomEvent).type === 'open-ai-session'),
    ).toBe(false);
    dispatch.mockRestore();
  });

  it('dispatches open-ai-session when no handler is supplied', () => {
    const dispatch = vi.spyOn(window, 'dispatchEvent');
    renderChip({ id: SESSION_ID, title: 'PR 978 contribution review' });

    fireEvent.click(screen.getByText('PR 978 contribution review'));

    expect(
      dispatch.mock.calls.some(([event]) => (event as CustomEvent).type === 'open-ai-session'),
    ).toBe(true);
    dispatch.mockRestore();
  });
});
