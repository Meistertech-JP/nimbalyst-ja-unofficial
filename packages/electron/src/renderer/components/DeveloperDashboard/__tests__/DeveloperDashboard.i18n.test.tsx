// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DeveloperDashboard } from '../DeveloperDashboard';

const systemStats = {
  fileWatchers: {
    type: 'WorkspaceEventBus (chokidar)',
    activeWorkspaces: 0,
    workspaces: [],
    totalSubscribers: 0,
  },
  process: {
    memoryRssMB: 120,
    heapUsedMB: 60,
    heapTotalMB: 200,
    activeHandles: 3,
    platform: 'win32',
    nodeVersion: '20.0.0',
    electronVersion: '30.0.0',
  },
  ipc: { registeredHandlers: 4, channelStats: [] },
  database: { queryStats: {} },
  windows: [],
};

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  (window as any).electronAPI = {
    invoke: vi.fn(async (command: string) =>
      command === 'dev:get-system-stats' ? systemStats : []),
  };
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => cleanup());

function renderDashboard(i18n: typeof englishI18n): void {
  render(
    <I18nextProvider i18n={i18n}>
      <DeveloperDashboard />
    </I18nextProvider>
  );
}

describe('DeveloperDashboard localization', () => {
  it('localizes tabs, stat labels, and the refresh status', async () => {
    renderDashboard(englishI18n);
    expect(screen.getByRole('button', { name: 'Overview' })).toBeDefined();
    await screen.findByText('Main Memory (RSS)');
    expect(screen.getByText('Auto-refresh 15s')).toBeDefined();

    cleanup();
    renderDashboard(japaneseI18n);
    expect(screen.getByRole('button', { name: '概要' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Atomファミリー' })).toBeDefined();
    expect(screen.getByRole('button', { name: '描画' })).toBeDefined();
    await screen.findByText('メインプロセスのメモリ（RSS）');
    expect(screen.getByText('監視の種類')).toBeDefined();
    expect(screen.getByText('15秒ごとに自動更新')).toBeDefined();
  });
});
