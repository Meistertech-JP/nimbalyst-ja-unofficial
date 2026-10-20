// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIUsageReport } from '../AIUsageReport';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: ({ name }: { name: string }) => <span>{name}</span>,
  Area: ({ name }: { name: string }) => <span>{name}</span>,
  Bar: ({ name }: { name: string }) => <span>{name}</span>,
  XAxis: () => null, YAxis: () => null, CartesianGrid: () => null,
  Tooltip: () => null, Legend: () => null,
}));

describe('AI usage report localization', () => {
  let originalAPI: typeof window.electronAPI;
  const invoke = vi.fn(async (channel: string) => {
    switch (channel) {
      case 'usage-analytics:get-overall-stats': return { totalInputTokens: 100, totalOutputTokens: 20, totalTokens: 120, sessionCount: 2, messageCount: 3 };
      case 'usage-analytics:get-all-session-count': return 3;
      case 'usage-analytics:get-usage-by-provider': return [{ provider: 'claude-code', model: null, sessionCount: 2, totalTokens: 120 }];
      case 'usage-analytics:get-activity-heatmap': return [{ dayOfWeek: 1, hourOfDay: 10, activityCount: 2 }];
      case 'usage-analytics:get-time-series': return [{ timestamp: 0, inputTokens: 100, outputTokens: 20, totalTokens: 120, sessionCount: 2 }];
      case 'usage-analytics:get-usage-by-project': return [];
      default: return [];
    }
  });
  const backfill = vi.fn(async () => undefined);
  const getReport = vi.fn(async () => ({
    topTools: [{ toolName: 'mcp__test_server__technical_tool', mcpServer: 'test_server', count: 4, errorCount: 1 }],
    byKind: { builtin: 2, mcp: 4 },
    byProvider: [{ provider: 'claude-code', count: 3 }, { provider: 'codex', count: 3 }],
    overTime: [{ day: '2026-09-01', count: 2 }, { day: '2026-09-02', count: 4 }],
    byProject: [{ projectPath: '(none)', count: 6 }],
  }));

  beforeEach(async () => {
    vi.clearAllMocks();
    originalAPI = window.electronAPI;
    window.electronAPI = { invoke, toolUsage: { getReport, backfill } } as unknown as typeof window.electronAPI;
    await i18next.changeLanguage('en');
  });
  afterEach(async () => {
    cleanup();
    window.electronAPI = originalAPI;
    await i18next.changeLanguage('en');
  });

  it('updates overview, chart labels and heatmap tooltip while preserving metric IDs', async () => {
    const { container } = render(<AIUsageReport />);
    await screen.findByText('Total Sessions');
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByRole('tablist', { name: 'AI使用量レポートのセクション' })).toBeTruthy();
    expect(screen.getByText('総セッション数')).toBeTruthy();
    expect(screen.getByText('入力 100 / 出力 20')).toBeTruthy();
    expect(screen.getByText('入力トークン')).toBeTruthy();
    expect(screen.getAllByText('claude-code')).toHaveLength(2);
    expect(container.querySelector('[data-tooltip="月 10:00 - 2件のメッセージを送信"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('usage-analytics:get-activity-heatmap', undefined, 'edits', expect.any(Number)));
  });

  it('translates tool history controls and counts without changing tool names or requests', async () => {
    await i18next.changeLanguage('ja');
    render(<AIUsageReport />);
    fireEvent.click(screen.getByRole('tab', { name: 'ツール' }));
    await screen.findByText('test_server / technical_tool');
    expect(screen.getByText('組み込みツール')).toBeTruthy();
    expect(screen.getByText('MCP / 拡張機能のツール')).toBeTruthy();
    expect(screen.getByText('4 (エラー1件)')).toBeTruthy();
    expect(screen.getByText('（なし）')).toBeTruthy();
    expect(screen.getByText('呼び出し数')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '履歴を取り込む' }));
    await waitFor(() => expect(backfill).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getReport).toHaveBeenCalledTimes(2));
  });
});
