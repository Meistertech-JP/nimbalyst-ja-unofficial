// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { CollabSidebarCreateMenu } from '@nimbalyst/collab-bundle/docs-ui';
import { initializeWikiI18n } from '../../i18n';
import { WikiCreateMenu } from '../WikiCreateMenu';

afterEach(cleanup);

it('localizes the page creation controls and accessible name while preserving dynamic item labels', async () => {
  const i18n = await initializeWikiI18n('ja', 'en-US');
  const onPrimary = vi.fn();
  const onSelect = vi.fn();
  const menu = {
    onPrimary,
    items: [{ id: 'markdown', label: 'Markdown', icon: 'description', onSelect }],
  } as unknown as CollabSidebarCreateMenu;
  const node = (preference: 'en' | 'ja') => <UiLanguageProvider i18n={i18n} preference={preference} systemLocale="en-US"><WikiCreateMenu menu={menu} /></UiLanguageProvider>;
  const view = render(node('ja'));

  expect(screen.getByRole('button', { name: '新規ページ' })).toBeTruthy();
  const toggle = screen.getByRole('button', { name: '別の種類のページを新規作成' });
  fireEvent.click(toggle);
  expect(screen.getByRole('menuitem', { name: /Markdown/ }).textContent).toContain('Markdown');
  fireEvent.click(screen.getByRole('menuitem', { name: /Markdown/ }));
  expect(onSelect).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: '新規ページ' }));
  expect(onPrimary).toHaveBeenCalledTimes(1);

  view.rerender(node('en'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'New page' })).toBeTruthy());
  expect(screen.getByRole('button', { name: 'New page of another kind' })).toBeTruthy();
});
