// @vitest-environment jsdom
import React from 'react';
import { beforeAll, describe, it, expect, afterEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { DatabaseDashboard } from '../DatabaseDashboard';
import { StorageRetentionCard } from '../StorageRetentionCard';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

function withLanguage(ui: React.ReactNode, language: 'en' | 'ja') {
  const i18n = language === 'ja' ? japaneseI18n : englishI18n;
  return (
    <UiLanguageProvider
      i18n={i18n}
      preference={language}
      systemLocale={language === 'ja' ? 'ja-JP' : 'en-US'}
    >
      {ui}
    </UiLanguageProvider>
  );
}

function mockDashboardStats(backup: { size?: number; sizeBytes?: number } | null) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      invoke: vi.fn().mockImplementation(async (channel: string) => {
        // The storage-retention card reads its settings on mount.
        if (channel === 'database:maintenance:get') {
          return {
            success: true,
            settings: {
              backupCopiesKept: 2,
              backupIntervalHours: 12,
              toolOutputRetentionDays: 0,
            },
          };
        }
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
          walStats: null,
        };
      }),
    },
  });
}

describe('DatabaseDashboard backup size rendering', () => {
  afterEach(() => {
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
  });

  it('renders SQLite backup metadata that uses sizeBytes', async () => {
    mockDashboardStats({ sizeBytes: 3 * 1024 });

    render(withLanguage(<DatabaseDashboard onTableSelect={vi.fn()} />, 'en'));

    await screen.findByText('3 KB');
  });

  it('renders legacy backup metadata that uses size', async () => {
    mockDashboardStats({ size: 2 * 1024 });

    render(withLanguage(<DatabaseDashboard onTableSelect={vi.fn()} />, 'en'));

    await screen.findByText('2 KB');
  });

  it('shows a Japanese estimate caveat in the retention card', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        invoke: vi.fn().mockImplementation(async (channel: string) => {
          if (channel === 'database:maintenance:get') {
            return {
              success: true,
              settings: { backupCopiesKept: 2, backupIntervalHours: 12, toolOutputRetentionDays: 30 },
            };
          }
          if (channel === 'database:toolRetention:estimate') {
            return {
              success: true,
              estimate: {
                candidateRows: 100,
                estimatedBytesSaved: 0,
                sampledRows: 20,
                sampleCoverage: 0.2,
                probesTaken: 3,
                lowConfidence: true,
                note: { kind: 'sample_floor', sampledRows: 20, coveragePct: '20.000', candidateRows: 100, probesTaken: 3 },
              },
            };
          }
          throw new Error(`Unexpected invoke channel: ${channel}`);
        }),
      },
    });

    render(withLanguage(<StorageRetentionCard />, 'ja'));
    fireEvent.click(await screen.findByRole('button', { name: '回収容量を見積もる' }));

    expect(await screen.findByText(/サンプル20件/)).toBeDefined();
    expect(screen.queryByText(/sampled rows/)).toBeNull();
  });
});
