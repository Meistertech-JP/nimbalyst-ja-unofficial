// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../store';
import { hasActiveDialogsAtom } from '../../contexts/DialogContext';
import { developerFeatureSettingsAtom, syncConfigAtom } from '../../store/atoms/appSettings';
import { activeWalkthroughIdAtom, walkthroughStateAtom } from '../../walkthroughs/atoms';
import { activeTipIdAtom, emptyTranscriptVisibleCountAtom } from '../atoms';
import { TipProvider } from '../TipProvider';
import { InlineTipDisplay } from '../InlineTipDisplay';
import { FEATURE_USAGE_KEYS } from '../../../shared/featureUsage';
import i18next from 'i18next';
import { tipTriggerCommandAtom, tipResetCommandAtom } from '../../store/atoms/walkthroughCommands';
import { errorNotificationService } from '../../services/ErrorNotificationService';

vi.mock('../../services/ErrorNotificationService', () => ({
  errorNotificationService: { showInfo: vi.fn() },
}));

vi.mock('posthog-js/react', () => ({
  usePostHog: () => ({
    capture: vi.fn(),
  }),
}));

describe('TipProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    delete (window as any).PLAYWRIGHT;

    const invoke = vi.fn(async (channel: string) => {
      if (channel === 'git:is-repo') {
        return { success: false, isRepo: false };
      }
      return undefined;
    });

    (window as any).electronAPI = {
      invoke,
      featureUsage: {
        getAll: vi.fn(async () => ({})),
      },
    };

    store.set(walkthroughStateAtom, {
      enabled: true,
      completed: [],
      dismissed: [],
      history: {},
    });
    store.set(activeWalkthroughIdAtom, null);
    store.set(hasActiveDialogsAtom, false);
    store.set(activeTipIdAtom, null);
    store.set(emptyTranscriptVisibleCountAtom, 0);
    store.set(tipTriggerCommandAtom, null);
    store.set(tipResetCommandAtom, 0);
    vi.mocked(errorNotificationService.showInfo).mockClear();
    store.set(syncConfigAtom, {
      ...store.get(syncConfigAtom),
      enabled: true,
      preventSleepMode: 'off',
    });
    store.set(developerFeatureSettingsAtom, {
      ...store.get(developerFeatureSettingsAtom),
      developerMode: false,
    });
  });

  afterEach(async () => {
    cleanup();
    vi.useRealTimers();
    delete (window as any).electronAPI;
    await i18next.changeLanguage('en');
  });

  it('translates unknown-tip commands at event time without repeating them on language change', async () => {
    render(<JotaiProvider store={store as any}><TipProvider currentMode="files"><div /></TipProvider></JotaiProvider>);
    await act(async () => {
      await i18next.changeLanguage('ja');
      store.set(tipTriggerCommandAtom, { tipId: 'custom-tip-id', timestamp: 1 });
    });
    expect(errorNotificationService.showInfo).toHaveBeenCalledWith('ヒントが見つかりません', 'ヒント「custom-tip-id」が見つかりません。', { duration: 3000 });
    await act(() => i18next.changeLanguage('en'));
    expect(errorNotificationService.showInfo).toHaveBeenCalledTimes(1);
    expect(store.get(activeTipIdAtom)).toBeNull();
  });

  it('resets tips once and keeps the persistence channel unchanged in Japanese', async () => {
    render(<JotaiProvider store={store as any}><TipProvider currentMode="files"><div /></TipProvider></JotaiProvider>);
    await act(async () => {
      await i18next.changeLanguage('ja');
      store.set(tipResetCommandAtom, 1);
    });
    expect(errorNotificationService.showInfo).toHaveBeenCalledWith('ヒントをリセットしました', 'すべてのヒントが再び表示されます。', { duration: 3000 });
    await act(() => i18next.changeLanguage('en'));
    expect((window as any).electronAPI.invoke.mock.calls.filter(([channel]: [string]) => channel === 'tips:reset')).toHaveLength(1);
    expect(errorNotificationService.showInfo).toHaveBeenCalledTimes(1);
  });

  it('shows the mobile keep-awake tip inline when an empty transcript is visible', async () => {
    render(
      <JotaiProvider store={store as any}>
        <TipProvider currentMode="files">
          <InlineTipDisplay />
        </TipProvider>
      </JotaiProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(23_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('Keep your computer awake for mobile prompts')).toBeTruthy();
    expect((window as any).electronAPI.invoke).toHaveBeenCalledWith(
      'walkthroughs:record-shown',
      'tip-mobile-keep-awake',
      1,
    );
  });

  it('does not show the mobile keep-awake tip when sync is disabled', async () => {
    store.set(syncConfigAtom, {
      ...store.get(syncConfigAtom),
      enabled: false,
      preventSleepMode: 'off',
    });

    render(
      <JotaiProvider store={store as any}>
        <TipProvider currentMode="files">
          <InlineTipDisplay />
        </TipProvider>
      </JotaiProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(23_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText('Keep your computer awake for mobile prompts')).toBeNull();
    expect((window as any).electronAPI.invoke).not.toHaveBeenCalledWith(
      'walkthroughs:record-shown',
      'tip-mobile-keep-awake',
      1,
    );
  });

  it('does not show the mobile keep-awake tip when legacy keep-awake is already enabled', async () => {
    store.set(syncConfigAtom, {
      ...store.get(syncConfigAtom),
      enabled: true,
      preventSleepMode: undefined,
      preventSleepWhenSyncing: true,
    });

    render(
      <JotaiProvider store={store as any}>
        <TipProvider currentMode="files">
          <InlineTipDisplay />
        </TipProvider>
      </JotaiProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(23_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText('Keep your computer awake for mobile prompts')).toBeNull();
    expect((window as any).electronAPI.invoke).not.toHaveBeenCalledWith(
      'walkthroughs:record-shown',
      'tip-mobile-keep-awake',
      1,
    );
  });

  it('re-activates an eligible tip after the slot is cleared (no one-per-launch cooldown)', async () => {
    render(
      <JotaiProvider store={store as any}>
        <TipProvider currentMode="files">
          <InlineTipDisplay />
        </TipProvider>
      </JotaiProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(23_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(store.get(activeTipIdAtom)).toBe('tip-mobile-keep-awake');

    // Simulate the slot being cleared without dismissing/completing (e.g. the
    // surface unmounted/remounted). The condition is still met, so under the
    // old per-launch cooldown the tip would stay null. It should re-activate.
    // Flush the cleared-state render first so the eval loop's ref sees null
    // before timers advance.
    await act(async () => {
      store.set(activeTipIdAtom, null);
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(15_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(store.get(activeTipIdAtom)).toBe('tip-mobile-keep-awake');
  });

  it('does not activate tips when no empty transcript surface is mounted', async () => {
    render(
      <JotaiProvider store={store as any}>
        <TipProvider currentMode="files">
          <div>App</div>
        </TipProvider>
      </JotaiProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(23_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(store.get(activeTipIdAtom)).toBeNull();
    expect((window as any).electronAPI.invoke).not.toHaveBeenCalledWith(
      'walkthroughs:record-shown',
      'tip-mobile-keep-awake',
      1,
    );
  });

  it('loads feature usage and git workspace context when a workspace path is provided', async () => {
    (window as any).electronAPI.invoke = vi.fn(async (channel: string) => {
      if (channel === 'git:is-repo') {
        return { success: true, isRepo: true };
      }
      return undefined;
    });
    (window as any).electronAPI.featureUsage.getAll = vi.fn(async () => ({
      [FEATURE_USAGE_KEYS.SESSION_CREATED]: {
        count: 12,
        firstUsed: '2026-05-22T00:00:00.000Z',
        lastUsed: '2026-05-22T00:00:00.000Z',
      },
      [FEATURE_USAGE_KEYS.TRACKER_USED]: {
        count: 1,
        firstUsed: '2026-05-22T00:00:00.000Z',
        lastUsed: '2026-05-22T00:00:00.000Z',
      },
    }));

    store.set(syncConfigAtom, {
      ...store.get(syncConfigAtom),
      enabled: false,
      preventSleepMode: 'pluggedIn',
    });
    store.set(developerFeatureSettingsAtom, {
      ...store.get(developerFeatureSettingsAtom),
      developerMode: true,
      developerFeatures: {
        ...store.get(developerFeatureSettingsAtom).developerFeatures,
        worktrees: true,
      },
    });

    render(
      <JotaiProvider store={store as any}>
        <TipProvider currentMode="agent" workspacePath="/repo">
          <div>App</div>
        </TipProvider>
      </JotaiProvider>
    );

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect((window as any).electronAPI.featureUsage.getAll).toHaveBeenCalled();
    expect((window as any).electronAPI.invoke).toHaveBeenCalledWith('git:is-repo', '/repo');
  });
});
