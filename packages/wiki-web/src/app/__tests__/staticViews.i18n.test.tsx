// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { LocalPage } from '@nimbalyst/local-wiki';
import { initializeWikiI18n } from '../../i18n';
import { setTheme } from '../../theme';
import { StaticBacklinks, StaticSidebar } from '../staticViews';

const pages = vi.hoisted(() => new Map<string, LocalPage>([
  ['parent', { id: 'parent', title: 'Customer plan', parentId: null, type: null } as LocalPage],
  ['child', { id: 'child', title: 'Teammate', parentId: 'parent', type: null } as LocalPage],
]));
vi.mock('../../api/staticSite', () => ({
  staticPages: () => pages,
  staticSiteTitle: () => 'Customer wiki',
  staticRoutePath: (route: { kind: string; id?: string; query?: string }) => route.kind === 'home' ? '/' : route.kind === 'page' ? `/pages/${route.id}/` : route.kind === 'search' ? `/search/?q=${route.query}` : '/types/',
  staticLinks: async () => [{ direction: 'in', otherItemId: 'child', otherTitle: 'Teammate', sentence: 'Keep the original sentence.' }],
}));

afterEach(cleanup);

describe('static wiki language and navigation', () => {
  it('keeps page names while translating controls, search navigation and live language changes', async () => {
    const i18n = await initializeWikiI18n('ja', 'en-US');
    setTheme('light');
    const navigate = vi.fn();
    const node = (preference: 'en' | 'ja') => <UiLanguageProvider i18n={i18n} preference={preference} systemLocale="en-US"><StaticSidebar activeId="parent" navigate={navigate} /></UiLanguageProvider>;
    const { rerender } = render(node('ja'));

    expect(screen.getByRole('navigation', { name: 'ページ' }).getAttribute('aria-label')).toBe('ページ');
    expect(screen.getByRole('link', { name: 'Teammate' }).getAttribute('href')).toBe('/pages/child/');
    fireEvent.click(screen.getByRole('button', { name: '折りたたむ' }));
    expect(screen.queryByRole('link', { name: 'Teammate' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '展開' }));
    fireEvent.click(screen.getByRole('link', { name: 'Teammate' }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: 'page', id: 'child' });

    fireEvent.change(screen.getByRole('textbox', { name: 'このWikiを検索' }), { target: { value: 'Customer' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(navigate).toHaveBeenLastCalledWith({ kind: 'search', query: 'Customer' });
    fireEvent.click(screen.getByRole('button', { name: 'ダークテーマに切り替え' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'ライトテーマに切り替え' }).getAttribute('title')).toBe('ライトテーマに切り替え');

    await act(async () => rerender(node('en')));
    expect(screen.getByRole('navigation', { name: 'Pages' }).getAttribute('aria-label')).toBe('Pages');
    expect(screen.getByRole('link', { name: 'Teammate' }).textContent).toBe('Teammate');
    expect(document.documentElement.lang).toBe('en');
  });

  it('localizes backlink controls without changing page titles or excerpts', async () => {
    const i18n = await initializeWikiI18n('ja', 'en-US');
    const navigate = vi.fn();
    render(<UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US"><StaticBacklinks pageId="parent" navigate={navigate} /></UiLanguageProvider>);

    const link = await screen.findByRole('link', { name: 'Teammate' });
    expect(screen.getByRole('region', { name: 'リンク元' }).getAttribute('aria-label')).toBe('リンク元');
    expect(screen.getByText('Keep the original sentence.').textContent).toBe('Keep the original sentence.');
    fireEvent.click(link);
    expect(navigate).toHaveBeenCalledWith({ kind: 'page', id: 'child' });
  });
});
