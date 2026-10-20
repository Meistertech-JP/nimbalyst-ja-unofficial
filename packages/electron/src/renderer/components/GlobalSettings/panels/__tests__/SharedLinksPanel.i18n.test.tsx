// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { SharedLinksPanel } from '../SharedLinksPanel';

vi.mock('@nimbalyst/runtime', () => ({ MaterialSymbol: () => null, copyToClipboard: vi.fn() }));
vi.mock('../../../../store/atoms/settingsDomains', async () => ({
  personalAccountsAtom: (await import('jotai')).atom([{ personalOrgId: 'owner-a', email: 'a@example.test' }]),
}));

describe('shared links localization', () => {
  const originalAPI = Object.getOwnPropertyDescriptor(window, 'electronAPI');
  afterEach(async () => {
    cleanup();
    if (originalAPI) Object.defineProperty(window, 'electronAPI', originalAPI);
    else delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    await i18next.changeLanguage('en');
  });

  it('preserves expired styling and user content across a language switch without refetching', async () => {
    const base = { sizeBytes: 1024, createdAt: '2026-01-01T00:00:00Z', owningPersonalOrgId: 'owner-a' };
    const listShares = vi.fn(async () => ({ success: true, shares: [
      { ...base, shareId: 'share-a', sessionId: 'file:notes.md', title: '', expiresAt: '2020-01-01T00:00:00Z', viewCount: 1 },
      { ...base, shareId: 'share-b', sessionId: 'session-b', title: 'User title', expiresAt: null, viewCount: 2 },
    ] }));
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: { listShares, getShareKeys: vi.fn(async () => ({})) } });
    render(<SharedLinksPanel />);
    await screen.findByText('1 view');
    expect(screen.getByText('2 views')).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('期限切れ').className).toContain('text-[var(--nim-error)]');
    expect(screen.getByText('無題')).toBeTruthy();
    expect(screen.getByText('有効期限なし')).toBeTruthy();
    expect(screen.getByText('1件の閲覧')).toBeTruthy();
    expect(screen.getAllByText('作成者: a@example.test')).toHaveLength(2);
    expect(screen.getByText('User title')).toBeTruthy();
    expect(listShares).toHaveBeenCalledOnce();
  });

  it('translates a generic load failure without refetching', async () => {
    const listShares = vi.fn(async () => ({ success: false }));
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: { listShares, getShareKeys: vi.fn(async () => ({})) } });
    render(<SharedLinksPanel />);
    await screen.findByText('Failed to load shares');
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('共有リンクを読み込めませんでした')).toBeTruthy();
    expect(listShares).toHaveBeenCalledOnce();
  });
});
