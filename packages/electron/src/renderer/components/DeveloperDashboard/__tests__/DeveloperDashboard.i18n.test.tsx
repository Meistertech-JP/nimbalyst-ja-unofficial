// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeveloperDashboard } from '../DeveloperDashboard';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="diagnostic-chart" data-samples={JSON.stringify(data)}>{children}</div>
  ),
  Line: ({ name, dataKey }: { name: string; dataKey: string }) => <span data-series={dataKey}>{name}</span>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const sample = { count: 3, p50: 4, p95: 9, p99: 10, max: 12, totalMs: 25, blockedP50: 0, blockedP95: 2, blockedMax: 3, blockedTotalMs: 5 };
const rawParam = 'workspace:/Users/test/very-long-untranslated-workspace-path';
const atomStats = [
  { name: 'sessionAtomFamily', count: 2, file: 'sessionAtoms.ts', params: [rawParam, 'session-123'] },
  { name: 'emptyAtomFamily', count: 0, file: 'emptyAtoms.ts', params: [] },
];

function systemStats(queryStats: unknown = { ai_sessions: { reads: sample, writes: { ...sample, count: 1 } } }) {
  return {
    fileWatchers: { type: 'WorkspaceEventBus (native)', activeWorkspaces: 1, totalSubscribers: 2, workspaces: [
      { workspacePath: '/workspace/project', subscriberCount: 2, subscriberIds: ['file-tree', 'git-status'] },
    ] },
    process: { memoryRssMB: 123, heapUsedMB: 45, heapTotalMB: 67, activeHandles: 8, platform: 'win32', nodeVersion: '22.0.0', electronVersion: '39.0.0' },
    ipc: { registeredHandlers: 5, channelStats: [
      { channel: 'workspace:list', callCount: 9, errorCount: 1, slowCount: 2, totalMs: 30, avgMs: 3, p50Ms: 2, p95Ms: 8, maxMs: 11, lastMs: 2, inFlight: 1, maxInFlight: 3 },
    ] },
    database: { queryStats },
    windows: [
      { id: 7, mode: 'editor', workspacePath: '/workspace/project', filePath: null, documentEdited: true },
      { id: 8, mode: 'developer', workspacePath: null, filePath: null, documentEdited: false },
    ],
  };
}

const invoke = vi.fn();

describe('DeveloperDashboard localization', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('ja');
    invoke.mockReset().mockImplementation(async (channel: string) => {
      if (channel === 'dev:get-system-stats') return systemStats();
      if (channel === 'dev:get-atomfamily-stats') return atomStats;
      throw new Error(`Unexpected channel: ${channel}`);
    });
    window.electronAPI = { invoke } as unknown as typeof window.electronAPI;
  });

  afterEach(async () => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    await i18next.changeLanguage('en');
  });

  it('localizes loading and disabled refresh without changing the IPC channels', async () => {
    invoke.mockImplementation(() => new Promise(() => {}));
    render(<DeveloperDashboard />);
    expect(screen.getByText('更新中...')).toBeTruthy();
    expect(screen.getByText('読み込み中…')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Atomファミリー' }));
    expect(screen.getByRole('button', { name: '読み込み中…' }).hasAttribute('disabled')).toBe(true);
    expect(invoke.mock.calls.map(([channel]) => channel)).toEqual(['dev:get-system-stats', 'dev:get-atomfamily-stats']);
  });

  it('localizes overview labels while preserving raw legacy statistics and identifiers', async () => {
    render(<DeveloperDashboard />);
    await screen.findByText('メインプロセスのメモリ（RSS）');
    expect(screen.getByText('123 MB')).toBeTruthy();
    expect(screen.getByText('45 / 67 MB')).toBeTruthy();
    expect(screen.getByText('3 R / 1 W')).toBeTruthy();
    expect(screen.getByText('アクティブ 1 / 合計 2')).toBeTruthy();
    expect(screen.getByText('native')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'データベースクエリの性能（直近5分間）' })).toBeTruthy();
    expect(screen.getAllByText('ai_sessions')).toHaveLength(2);
    expect(screen.getAllByText('workspace:list')).toHaveLength(2);
    expect(screen.getByText('購読者（2）: file-tree, git-status')).toBeTruthy();
    expect(screen.getByText('editor')).toBeTruthy();
    expect(screen.getByText('（なし）')).toBeTruthy();
    expect(screen.getByText('編集済み')).toBeTruthy();
    expect(screen.getByText('15秒ごとに自動更新')).toBeTruthy();
    expect(screen.getByText(/win32 \| Node 22.0.0 \| Electron 39.0.0/)).toBeTruthy();
    const queryTable = screen.getByRole('columnheader', { name: '操作' }).closest('table')!;
    expect(within(queryTable).getByText('R')).toBeTruthy();
    expect(within(queryTable).getByText('W')).toBeTruthy();
    expect(within(queryTable).getAllByText('9ms')).toHaveLength(2);
  });

  it('keeps atom filtering, expansion, raw parameter tooltips and manual refresh functional', async () => {
    render(<DeveloperDashboard />);
    await screen.findByText('123 MB');
    fireEvent.click(screen.getByRole('button', { name: 'Atomファミリー' }));
    expect(screen.getByText('2個のファミリーを登録済み')).toBeTruthy();
    const summary = screen.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent === '1個のファミリーで2個のインスタンスが稼働中');
    expect(Array.from(summary.querySelectorAll('strong')).map(el => el.textContent)).toEqual(['1', '2']);
    expect(screen.queryByText('emptyAtomFamily')).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: '空のファミリーを非表示' }));
    expect(screen.getByText('emptyAtomFamily')).toBeTruthy();
    fireEvent.click(screen.getByText('sessionAtomFamily'));
    expect(screen.getByText('使用中のパラメーター（2）:')).toBeTruthy();
    expect(screen.getByTitle(rawParam).textContent).toBe(rawParam.slice(0, 37) + '...');
    expect(screen.getByText('session-123')).toBeTruthy();
    expect(screen.getByText('sessionAtoms.ts')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '更新' }));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(4));
    await waitFor(() => expect(screen.getByRole('button', { name: '更新' }).hasAttribute('disabled')).toBe(false));
  });

  it('preserves timed chart samples and data keys when switching display language', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T06:04:05Z'));
    render(<DeveloperDashboard />);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    const charts = screen.getAllByTestId('diagnostic-chart');
    expect(charts).toHaveLength(4);
    expect(screen.getByText('メインプロセスのRSS').getAttribute('data-series')).toBe('memoryRssMB');
    expect(screen.getByText('読み取り（5分間）').getAttribute('data-series')).toBe('dbReads');
    const before = JSON.parse(charts[0].getAttribute('data-samples')!);
    expect(before).toHaveLength(2);
    expect(before[0].dbReads).toBe(3);
    expect(before[0].memoryRssMB).toBe(123);
    expect(before[0].time).toBe(new Date(before[0].timestamp).toLocaleTimeString('ja', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const callCount = invoke.mock.calls.length;
    await act(async () => { await i18next.changeLanguage('en'); });
    const after = JSON.parse(screen.getAllByTestId('diagnostic-chart')[0].getAttribute('data-samples')!);
    expect(after.map(({ time: _time, ...point }: { time: string }) => point)).toEqual(before.map(({ time: _time, ...point }: { time: string }) => point));
    expect(after[0].time).toBe(new Date(after[0].timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    expect(screen.getByText('Main RSS').getAttribute('data-series')).toBe('memoryRssMB');
    expect(screen.getByText('Auto-refresh 15s')).toBeTruthy();
    expect(invoke).toHaveBeenCalledTimes(callCount);
    cleanup();
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(invoke).toHaveBeenCalledTimes(callCount);
  });

  it('localizes SQLite activity without changing totals or table names', async () => {
    invoke.mockImplementation(async (channel: string) => channel === 'dev:get-system-stats'
      ? systemStats({ windowMs: 300000, byTable: { ai_sessions: { reads: 5, writes: 2, totalMs: 31, p99: 12 } } })
      : atomStats);
    render(<DeveloperDashboard />);
    await screen.findByRole('heading', { name: 'データベースクエリのアクティビティ（直近5分間）' });
    expect(screen.getByText('5 R / 2 W')).toBeTruthy();
    const row = screen.getByText('ai_sessions').closest('tr')!;
    expect(Array.from(row.querySelectorAll('td')).map(cell => cell.textContent)).toEqual(['ai_sessions', '5', '2', '31ms', '12ms']);
    expect(screen.getByRole('columnheader', { name: '読み取り' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '書き込み' })).toBeTruthy();
  });

  it('localizes empty atom states after failed fetches without exposing raw errors', async () => {
    invoke.mockRejectedValue(new Error('raw diagnostics unavailable'));
    render(<DeveloperDashboard />);
    await waitFor(() => expect(screen.queryByText('更新中...')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Atomファミリー' }));
    expect(screen.getByText('稼働中のインスタンスを持つファミリーはありません')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: '空のファミリーを非表示' }));
    expect(screen.getByText('登録されたファミリーはありません')).toBeTruthy();
    expect(screen.queryByText('raw diagnostics unavailable')).toBeNull();
    expect(screen.getByRole('button', { name: '更新' }).hasAttribute('disabled')).toBe(false);
  });
});
