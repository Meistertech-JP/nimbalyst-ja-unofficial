// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { DatabaseBrowser } from '../DatabaseBrowser';

vi.mock('@nimbalyst/runtime', () => ({ copyToClipboard: vi.fn() }));
vi.mock('../DatabaseDashboard', () => ({ DatabaseDashboard: () => null }));

describe('DatabaseBrowser language changes', () => {
  const originalAPI = Object.getOwnPropertyDescriptor(window, 'electronAPI');
  afterEach(async () => {
    cleanup();
    if (originalAPI) Object.defineProperty(window, 'electronAPI', originalAPI);
    else delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    await i18next.changeLanguage('en');
  });

  it('uses the current language for table selection errors without changing query arguments', async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === 'database:getTables') return { success: true, tables: ['ai_sessions'] };
      if (channel === 'database:getTableSchema') return { success: true, columns: [] };
      if (channel === 'database:getPrimaryKeys') return { success: true, primaryKeys: ['id'] };
      return { success: false };
    });
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke } });
    render(<DatabaseBrowser />);
    await screen.findByText('ai_sessions');
    await act(async () => { await i18next.changeLanguage('ja'); });
    fireEvent.click(screen.getByText('ai_sessions'));
    expect(await screen.findByText('テーブルデータの読み込みに失敗しました')).toBeTruthy();
    expect(invoke).toHaveBeenCalledWith('database:getTableData', 'ai_sessions', 100, 0, undefined, undefined);
  });
});
