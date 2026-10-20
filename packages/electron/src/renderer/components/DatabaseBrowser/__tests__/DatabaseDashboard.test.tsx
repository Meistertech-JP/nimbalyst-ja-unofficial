// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { DatabaseDashboard } from '../DatabaseDashboard';

function mockDashboardStats(backup: { size?: number; sizeBytes?: number } | null, walStats: Record<string, unknown> | null = null) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      invoke: vi.fn().mockImplementation(async (channel: string) => {
        if (channel !== 'database:getDashboardStats') {
          throw new Error(`Unexpected invoke channel: ${channel}`);
        }
        return {
          success: true,
          tableStats: [],
          totalSize: '1 MB',
          totalSizeBytes: 1024 * 1024,
          basicStats: {
            ai_sessions_count: '0',
            history_count: '0',
            database_size: '1 MB',
          },
          backupStatus: {
            currentBackup: backup ? {
              timestamp: '2026-06-02T16:00:00.000Z',
              verified: true,
              ...backup,
            } : null,
            previousBackup: null,
            oldestBackup: null,
            lastBackupAttempt: '2026-06-02T16:00:00.000Z',
            lastSuccessfulBackup: '2026-06-02T16:00:00.000Z',
          },
          walStats,
        };
      }),
    },
  });
}

describe('DatabaseDashboard backup size rendering', () => {
  afterEach(async () => {
    cleanup();
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    await i18next.changeLanguage('en');
  });

  it('renders SQLite backup metadata that uses sizeBytes', async () => {
    mockDashboardStats({ sizeBytes: 3 * 1024 });

    render(<DatabaseDashboard onTableSelect={vi.fn()} />);

    expect(await screen.findByText('3 KB')).toBeTruthy();
  });

  it('renders legacy backup metadata that uses size', async () => {
    mockDashboardStats({ size: 2 * 1024 });

    render(<DatabaseDashboard onTableSelect={vi.fn()} />);

    expect(await screen.findByText('2 KB')).toBeTruthy();
  });

  it('localizes structured SQLite checkpoint details and backup counts', async () => {
    mockDashboardStats({ sizeBytes: 2048 }, {
      backend: 'sqlite', fileCount: 1, totalBytes: 1024, totalSize: '1 KB',
      minWalSize: '0 B', maxWalSize: '4 MB', checkpointTimeout: 'auto at 1,000 pages',
      description: 'SQLite checkpoint details', autoCheckpointPages: 1000, pageSizeBytes: 4096,
    });
    render(<DatabaseDashboard onTableSelect={vi.fn()} />);
    await screen.findByText('1 of 3');
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('3件中1件')).toBeTruthy();
    expect(screen.getByText('1,000ページで自動実行')).toBeTruthy();
    expect(screen.getByText(/SQLiteはWALが1,000ページ/)).toBeTruthy();
  });

  it('localizes PGLite guidance but preserves unknown backend descriptions', async () => {
    const wal = {
      backend: 'pglite', fileCount: 1, totalBytes: 1024, totalSize: '1 KB',
      minWalSize: '80 MB', maxWalSize: '1 GB', checkpointTimeout: '5min',
      description: 'Legacy PGLite guidance',
    };
    await i18next.changeLanguage('ja');
    mockDashboardStats(null, wal);
    render(<DatabaseDashboard onTableSelect={vi.fn()} />);
    expect(await screen.findByText(/PGLiteにはバックグラウンド/)).toBeTruthy();
    expect(screen.getByText('5min')).toBeTruthy();
    cleanup();
    mockDashboardStats(null, { ...wal, backend: undefined, description: 'Future backend details' });
    render(<DatabaseDashboard onTableSelect={vi.fn()} />);
    expect(await screen.findByText('Future backend details')).toBeTruthy();
  });
});
