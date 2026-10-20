// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { DatabasePanel } from '../DatabasePanel';

vi.mock('@nimbalyst/runtime', () => ({ MaterialSymbol: () => null }));

describe('database migration UI localization', () => {
  const originalAPI = Object.getOwnPropertyDescriptor(window, 'electronAPI');
  const status = { success: true, activeBackend: 'pglite', pgliteDirExists: true, sqliteDirExists: false, migratedDirs: [], running: false, runningDryRun: false };
  afterEach(async () => {
    cleanup(); vi.restoreAllMocks();
    if (originalAPI) Object.defineProperty(window, 'electronAPI', originalAPI);
    else delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    await i18next.changeLanguage('en');
  });

  it('localizes dry-run results while preserving table names and raw integrity results', async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === 'db:migration:get-status') return status;
      if (channel === 'db:migration:dry-run-status') return { success: true, available: false };
      if (channel === 'db:migration:dry-run') return { success: true, result: {
        summary: { tablesCopied: [{ name: 'ai_sessions', rows: 7 }], totalRowsCopied: 7, durationMs: 65000, foreignKeyViolations: 0, integrityCheck: 'ok', spotCheckCount: 1 },
        dryRunDir: '/fixture/sqlite', sqliteFileBytes: 1024, pgliteDirBytes: 2048,
      } };
      throw new Error(`Unexpected IPC ${channel}`);
    });
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke } });
    render(<DatabasePanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Run dry-run migration' }));
    await screen.findByText('ai_sessions');
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getAllByText('コピーした行数').length).toBeGreaterThan(0);
    expect(screen.getByText('外部キー違反')).toBeTruthy();
    expect(screen.getByText('テーブル別の内訳（1件）')).toBeTruthy();
    expect(screen.getByText('1分5秒')).toBeTruthy();
    expect(screen.getByText('ai_sessions')).toBeTruthy();
    expect(screen.getByText('ok')).toBeTruthy();
    expect(invoke.mock.calls.filter(([channel]) => channel === 'db:migration:dry-run')).toHaveLength(1);
  });

  it('keeps adoption and rollback confirmation gates intact in Japanese', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const invoke = vi.fn(async (channel: string) => {
      if (channel === 'db:migration:get-status') return { ...status, migratedDirs: ['/fixture/pglite-db.migrated'] };
      if (channel === 'db:migration:dry-run-status') return { success: true, available: true, completedAt: new Date(Date.now() - 2 * 3600000).toISOString(), totalRows: 7 };
      throw new Error(`Unexpected IPC ${channel}`);
    });
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke } });
    render(<DatabasePanel />);
    await screen.findByRole('button', { name: 'Switch to this SQLite copy' });
    await act(async () => { await i18next.changeLanguage('ja'); });
    fireEvent.click(screen.getByRole('button', { name: 'このSQLiteコピーへ切り替え' }));
    expect(confirm.mock.calls[0][0]).toContain('ロールバック用に保存');
    expect(confirm.mock.calls[0][0]).toContain('再起動が必要');
    fireEvent.click(screen.getByRole('button', { name: '保存済みのPGLiteから復元' }));
    expect(confirm.mock.calls[1][0]).toContain('移行後に作成したデータは失われます');
    expect(invoke).not.toHaveBeenCalledWith('db:migration:adopt-dry-run');
    expect(invoke).not.toHaveBeenCalledWith('db:migration:rollback');
  });
});
