// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';

import { buildSplashView } from '../migrationProgressView';
import type { MigrationProgress, MigrationPhase } from '../../database/sqlite/PGLiteToSQLiteMigrator';

function progress(over: Partial<MigrationProgress> & { phase: MigrationPhase }): MigrationProgress {
  return {
    rowsCopied: 0,
    rowsExpected: 0,
    tableRowsCopied: 0,
    tableRowsExpected: 0,
    tablesCompleted: 0,
    tablesTotal: 1,
    percentOfTotal: 0,
    elapsedMs: 0,
    ...over,
  };
}

describe('buildSplashView', () => {
  it('localizes progress and ETA without changing counts, table IDs or percentages', async () => {
    const i18n = await createI18nInstance('ja');
    const translate = (key: string, fallback: string, values?: Record<string, string | number>) =>
      String(i18n.t(key, { ns: 'dialogs', defaultValue: fallback, ...values }));
    const input = progress({ phase: 'copying', rowsCopied: 100_000, rowsExpected: 900_000,
      currentTable: 'ai_agent_messages', percentOfTotal: 11, elapsedMs: 60_000 });
    const english = buildSplashView(input);
    const japanese = buildSplashView(input, 0, translate);
    expect(japanese).toMatchObject({ primary: '900,000行中100,000行', phase: 'ai_agent_messagesをコピー中', eta: '残り約10分以上', percent: english.percent });
    expect(buildSplashView(progress({ phase: 'verifying-integrity' }), 0, translate).primary).toBe('整合性を確認中');
    await i18n.changeLanguage('en');
    expect(buildSplashView(input, 0, translate)).toEqual(english);
  });
  it('never moves the bar backwards when a phase restarts its own percentage', () => {
    // The migrator reports percentOfTotal per phase, so every phase boundary
    // looks like a reset. A user watching a 10-minute migration must not see
    // the bar jump back to zero seven times.
    const phases: MigrationPhase[] = [
      'preparing',
      'copying',
      'rebuilding-fts',
      'verifying-counts',
      'verifying-integrity',
      'verifying-foreign-keys',
      'verifying-spot-check',
      'finalizing',
    ];
    let last = 0;
    for (const phase of phases) {
      for (const percentOfTotal of [0, 50, 100]) {
        const view = buildSplashView(progress({ phase, percentOfTotal }), last);
        expect(view.percent).toBeGreaterThanOrEqual(last);
        last = view.percent;
      }
    }
    expect(last).toBe(100);
  });

  it('withholds the ETA until there is a throughput sample worth trusting', () => {
    const tooEarly = buildSplashView(progress({
      phase: 'copying',
      rowsCopied: 12,
      rowsExpected: 900_000,
      elapsedMs: 300,
      percentOfTotal: 0,
    }));
    expect(tooEarly.eta).toBe('');

    const settled = buildSplashView(progress({
      phase: 'copying',
      rowsCopied: 100_000,
      rowsExpected: 900_000,
      elapsedMs: 60_000,
      percentOfTotal: 11,
    }));
    // 100k rows in 60s -> 800k remaining is ~8min of copying, plus the
    // verification tail. Coarse by design, so assert the shape not the number.
    expect(settled.eta).toMatch(/min left$/);
  });

  it('reports row counts while copying and the phase name otherwise', () => {
    expect(buildSplashView(progress({
      phase: 'copying',
      rowsCopied: 384_120,
      rowsExpected: 936_540,
      currentTable: 'ai_agent_messages',
      percentOfTotal: 41,
    }))).toMatchObject({
      primary: '384,120 of 936,540 rows',
      phase: 'Copying ai_agent_messages',
    });

    expect(buildSplashView(progress({ phase: 'verifying-integrity', percentOfTotal: 50 })))
      .toMatchObject({ primary: 'Checking integrity', eta: '' });
  });
});
