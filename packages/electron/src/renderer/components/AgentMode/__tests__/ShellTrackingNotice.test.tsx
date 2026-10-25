import React from 'react';
import { it, expect, vi } from 'vitest';
import { Provider } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { store } from '@nimbalyst/runtime/store/store';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import { ShellTrackingNotice } from '../ShellTrackingNotice';
import { initFileStateListeners } from '../../../store/listeners/fileStateListeners';

it('localizes withheld-edit reasons and updates them after changing language', async () => {
  const original = window.electronAPI;
  const i18n = await createI18nInstance('ja');
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke: vi.fn().mockResolvedValue([
    { sessionId: 'fixture', state: 'no-detected-fault', reasons: { competingOwners: 1, unreportedSession: 1 }, turns: [] },
  ]) } });
  try {
    render(<I18nextProvider i18n={i18n}><Provider store={store}><ShellTrackingNotice sessionIds={['fixture']} /></Provider></I18nextProvider>);
    expect((await screen.findByText('別のセッションでコマンドを実行していた間の編集は関連付けられませんでした。')).textContent).toContain('関連付けられませんでした');
    expect(screen.getByText('ツール追跡に対応していないエージェントのセッションが動作していた間の編集は関連付けられませんでした。').textContent).toContain('ツール追跡');
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByText('Edits made while another session was running a command were not linked.').textContent).toContain('were not linked');
  } finally {
    cleanup();
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: original });
  }
});

it('refreshes coverage through the central listener, isolates scopes, and rejects stale responses', async () => {
  const original = window.electronAPI;
  let finishOld!: (value: any) => void;
  const handlers = new Map<string, (...args: any[]) => void>();
  const coverage = vi.fn()
    .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockResolvedValue([{ sessionId: 'b', state: 'no-detected-fault', reasons: {}, turns: [] }]);
  const invoke = vi.fn((channel: string, ...args: any[]) => {
    if (channel === 'session-files:coverage') return coverage(...args);
    return Promise.resolve({ success: true, files: [] });
  });
  const on = vi.fn((channel: string, handler: (...args: any[]) => void) => {
    handlers.set(channel, handler);
    return () => { handlers.delete(channel); };
  });
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: { invoke, on } });
  const stop = initFileStateListeners('/workspace');
  const i18n = await createI18nInstance('en');
  const view = (ids: string[]) => (
    <I18nextProvider i18n={i18n}>
      <Provider store={store}><ShellTrackingNotice sessionIds={ids} /></Provider>
    </I18nextProvider>
  );
  try {
    const { rerender, unmount } = render(view(['a']));
    rerender(view(['b']));
    await waitFor(() => expect(coverage).toHaveBeenCalledTimes(2));
    await act(async () => { finishOld([{ sessionId: 'a', state: 'degraded', reasons: { quota: 1 }, turns: [] }]); });
    expect(screen.queryByTestId('shell-tracking-notice')).toBeNull();

    // The existing listener coalesces bursts and updates coverage even with no file links.
    coverage.mockResolvedValue([{ sessionId: 'b', state: 'degraded', reasons: { persistence: 1 }, turns: [] }]);
    act(() => {
      for (let i = 0; i < 3; i++) handlers.get('session-files:updated')!('b');
      handlers.get('session-files:updated')!('unrelated');
    });
    await screen.findByText('File tracking incomplete');
    expect(coverage).toHaveBeenCalledTimes(3);
    expect(coverage).toHaveBeenLastCalledWith(['b']);
    expect(screen.getByText('File links could not be saved.')).toBeDefined();
    expect(screen.queryByText('The session reached its file tracking limit.')).toBeNull();

    coverage.mockResolvedValue([{ sessionId: 'b', state: 'degraded', observation: 'watching', reasons: { watcherLoss: 1, suspiciousWindow: 3 }, turns: [] }]);
    act(() => handlers.get('session-files:updated')!('b'));
    await screen.findByText('Earlier file tracking gaps');
    expect(screen.queryByText('A tool tracking window could not be reconciled.')).toBeNull();
    coverage.mockRejectedValueOnce(new Error('unavailable'));
    act(() => handlers.get('session-files:updated')!('b'));
    await screen.findByText('File tracking status unavailable');
    coverage.mockResolvedValue([]);
    act(() => handlers.get('session-files:updated')!('b'));
    await waitFor(() => expect(screen.queryByTestId('shell-tracking-notice')).toBeNull());

    unmount();
    render(view(['b']));
    await waitFor(() => expect(coverage).toHaveBeenCalledTimes(7));
    expect(on.mock.calls.filter(([channel]) => channel === 'session-files:updated')).toHaveLength(1);
  } finally {
    cleanup();
    stop();
    expect(handlers.size).toBe(0);
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: original });
  }
});

it('renders Japanese coverage-unavailable guidance', async () => {
  const original = window.electronAPI;
  const i18n = await createI18nInstance('ja');
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { invoke: vi.fn().mockRejectedValue(new Error('unavailable')) },
  });

  try {
    render(
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>
          <ShellTrackingNotice sessionIds={[]} />
        </Provider>
      </I18nextProvider>,
    );

    expect(await screen.findByText('ファイル追跡の状態を確認できません')).toBeTruthy();
    expect(screen.getByText(/コミットする前に変更内容を確認してください。/)).toBeTruthy();
  } finally {
    cleanup();
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: original });
  }
});
