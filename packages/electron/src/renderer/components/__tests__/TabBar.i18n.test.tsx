// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';
import { TabBar } from '../TabManager/TabBar';

vi.mock('../../hooks/useTabState', () => ({ useTabDirty: () => false, useTabHasCollabUnsyncedChanges: () => false, useTabHasUnacceptedChanges: () => false }));
vi.mock('../CommonFileActions', () => ({ CommonFileActions: () => null }));
vi.mock('../../store', async () => ({ historyDialogFileAtom: (await import('jotai')).atom(null) }));
vi.mock('@nimbalyst/runtime', () => ({ MaterialSymbol: () => null }));
vi.mock('@nimbalyst/runtime/plugins/TrackerPlugin/trackerDataAtoms', () => ({ trackerItemByIdAtom: vi.fn() }));
vi.mock('@nimbalyst/runtime/plugins/TrackerPlugin/components/trackerColumns', () => ({ getTypeIcon: () => 'flag' }));

describe('tab label localization', () => {
  afterEach(async () => { cleanup(); vi.restoreAllMocks(); await i18next.changeLanguage('en'); });

  it('localizes the shared home by URI while preserving an identically named user file', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const select = vi.fn();
    const toggleAI = vi.fn();
    const tabs = [
      { id: 'home', filePath: 'virtual://shared-home', fileName: 'Shared Home', content: '', isDirty: false, isPinned: false },
      { id: 'user', filePath: '/fixture/Shared Home', fileName: 'Shared Home', content: '', isDirty: false, isPinned: false },
    ];
    render(<TabBar tabs={tabs} activeTabId="home" onTabSelect={select} onTabClose={vi.fn()} onNewTab={vi.fn()} onTogglePin={vi.fn()} onTabReorder={vi.fn()} onToggleAIChat={toggleAI} isAIChatCollapsed />);
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('共有ホーム')).toBeTruthy();
    expect(screen.getByText('Shared Home')).toBeTruthy();
    expect(tabs[0].fileName).toBe('Shared Home');
    fireEvent.click(screen.getByRole('button', { name: 'AIアシスタントを開く' }));
    expect(toggleAI).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByTitle(i18next.t('common:tab.menu')));
    expect(screen.getAllByText('共有ホーム')).toHaveLength(2);
    expect(screen.getAllByText('Shared Home')).toHaveLength(2);
    fireEvent.click(screen.getAllByText('Shared Home')[1]);
    expect(select).toHaveBeenCalledWith('user');
  });
});
