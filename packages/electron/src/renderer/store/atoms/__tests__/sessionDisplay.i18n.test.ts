import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import i18next from 'i18next';
import { createStore } from 'jotai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionRegistryAtom } from '../sessions';
import { searchSessionMentionAtom, sessionMentionOptionsAtom } from '../sessionMention';
import { getSuperStatusInfo } from '../superLoop';
import type { SuperLoopStatus } from '../../../../shared/types/superLoop';

vi.mock('@nimbalyst/runtime', () => ({ ProviderIcon: () => null }));

afterEach(async () => {
  vi.restoreAllMocks();
  await i18next.changeLanguage('en');
});

describe('session display helpers in Japanese', () => {
  it.each([
    ['backlog', 0, 'バックログ', 'たった今'],
    ['planning', 2 * 60_000, '計画中', '2分前'],
    ['implementing', 2 * 3_600_000, '実装中', '2時間前'],
    ['validating', 2 * 86_400_000, '検証中', '2日前'],
    ['complete', 62 * 86_400_000, '完了', '2か月前'],
  ])('translates the %s badge and relative date without changing mention data', async (phase, age, phaseLabel, dateLabel) => {
    const testStore = createStore();
    const now = 10_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    testStore.set(sessionRegistryAtom, new Map([['abcde-session', {
      id: 'abcde-session', title: '', sessionType: 'session', updatedAt: now - Number(age), phase,
    } as any]]));
    await i18next.changeLanguage('ja');
    testStore.set(searchSessionMentionAtom, { workspacePath: '/workspace', query: '' });
    const [option] = testStore.get(sessionMentionOptionsAtom('/workspace'));
    expect(option.label).toBe('無題');
    expect(option.data).toEqual({ id: 'abcde-session', title: 'Untitled', shortId: 'abcde' });
    const description = renderToStaticMarkup(option.description as React.ReactElement);
    expect(description).toContain(String(phaseLabel));
    expect(description).toContain(String(dateLabel));
    await i18next.changeLanguage('en');
    testStore.set(searchSessionMentionAtom, { workspacePath: '/workspace', query: '' });
    expect(testStore.get(sessionMentionOptionsAtom('/workspace'))[0].label).toBe('Untitled');
  });

  it('preserves user titles and excludes the current session and non-session rows', async () => {
    await i18next.changeLanguage('ja');
    const testStore = createStore();
    testStore.set(sessionRegistryAtom, new Map([
      ['user-session', { id: 'user-session', title: 'Untitled', sessionType: 'session', updatedAt: 1 } as any],
      ['current', { id: 'current', title: 'Current', sessionType: 'session', updatedAt: 3 } as any],
      ['workstream', { id: 'workstream', title: 'Group', sessionType: 'workstream', updatedAt: 2 } as any],
    ]));
    testStore.set(searchSessionMentionAtom, { workspacePath: '/workspace', query: '', excludeSessionId: 'current' });
    expect(testStore.get(sessionMentionOptionsAtom('/workspace')).map(option => option.label)).toEqual(['Untitled']);
  });

  it.each([
    ['running', '実行中'], ['paused', '一時停止'], ['completed', '完了'],
    ['failed', '失敗'], ['blocked', 'ブロック中'], ['pending', '保留中'],
  ])('translates super-loop %s while retaining the status color', async (status, label) => {
    await i18next.changeLanguage('ja');
    expect(getSuperStatusInfo(status as SuperLoopStatus)).toEqual({ label, color: status });
  });

  it('uses a translated pending fallback for an unknown super-loop state', async () => {
    await i18next.changeLanguage('ja');
    expect(getSuperStatusInfo('future-state' as SuperLoopStatus)).toEqual({ label: '保留中', color: 'pending' });
  });
});
