// @vitest-environment jsdom
/**
 * TrackerSyncRejectionBanner rendering: `custodyUnavailable` (the current
 * server-managed rejection) gets its own copy and wins over the legacy
 * codes; legacy `rotationLocked`/`staleKeyEpoch` copy is unchanged.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { store } from '@nimbalyst/runtime/store';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

import {
  trackerSyncDrainHoldAtom,
  trackerSyncRejectionAtom,
  type TrackerSyncRejection,
} from '../../../store/atoms/trackerSync';
import { TrackerSyncRejectionBanner } from '../TrackerSyncRejectionBanner';

const WS = '/ws/banner-test';

function rejection(code: TrackerSyncRejection['code']): TrackerSyncRejection {
  return { workspacePath: WS, code, itemId: 'item-1', timestamp: Date.now() };
}

function setState(partial: Partial<Record<TrackerSyncRejection['code'], TrackerSyncRejection | null>>) {
  store.set(trackerSyncRejectionAtom, {
    staleKeyEpoch: null,
    rotationLocked: null,
    custodyUnavailable: null,
    recoveryConflict: null,
    ...partial,
  });
}

async function renderBanner(language: 'en' | 'ja' = 'en') {
  const i18n = await createI18nInstance(language);
  return render(
    <Provider store={store}>
      <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
        <TrackerSyncRejectionBanner workspacePath={WS} />
      </UiLanguageProvider>
    </Provider>,
  );
}

describe('TrackerSyncRejectionBanner', () => {
  afterEach(() => {
    cleanup();
    setState({});
    store.set(trackerSyncDrainHoldAtom, null);
  });

  it('renders the custody-unavailable copy for custodyUnavailable', async () => {
    setState({ custodyUnavailable: rejection('custodyUnavailable') });
    await renderBanner();

    const banner = screen.getByTestId('tracker-sync-rejection-banner');
    expect(banner.getAttribute('data-rejection-code')).toBe('custodyUnavailable');
    expect(banner.textContent).toContain("encryption isn't migrated");
    expect(banner.textContent).toContain("can't sync");
  });

  it('prefers custodyUnavailable over the legacy codes', async () => {
    setState({
      custodyUnavailable: rejection('custodyUnavailable'),
      staleKeyEpoch: rejection('staleKeyEpoch'),
      rotationLocked: rejection('rotationLocked'),
    });
    await renderBanner();

    expect(
      screen.getByTestId('tracker-sync-rejection-banner').getAttribute('data-rejection-code'),
    ).toBe('custodyUnavailable');
  });

  it('still renders the legacy rotationLocked copy', async () => {
    setState({ rotationLocked: rejection('rotationLocked') });
    await renderBanner();

    const banner = screen.getByTestId('tracker-sync-rejection-banner');
    expect(banner.getAttribute('data-rejection-code')).toBe('rotationLocked');
    expect(banner.textContent).toContain('rotation in progress');
  });

  it('renders nothing when there is no rejection', async () => {
    setState({});
    await renderBanner();

    expect(screen.queryByTestId('tracker-sync-rejection-banner')).toBeNull();
  });

  it('renders the drain-hold banner in Japanese', async () => {
    store.set(trackerSyncDrainHoldAtom, {
      workspacePath: WS,
      reason: 'unresolved-policy-would-delete',
      rowsHeldBack: 2,
    });
    await renderBanner('ja');

    const banner = screen.getByTestId('tracker-sync-drain-hold-banner');
    expect(banner.textContent).toContain('トラッカー項目2件をまだチームに同期できていません。');
    expect(banner.textContent).toContain('共有対象のトラッカーを確認できなかったため');
    expect(screen.getByRole('button', { name: '再試行' })).toBeDefined();
  });

  it('localizes rejection copy and its dismiss accessibility label in Japanese', async () => {
    setState({ custodyUnavailable: rejection('custodyUnavailable') });
    await renderBanner('ja');

    const banner = screen.getByTestId('tracker-sync-rejection-banner');
    expect(banner.textContent).toContain('この組織の暗号化設定は移行されていないため');
    expect(screen.getByTestId('tracker-sync-rejection-dismiss').getAttribute('aria-label')).toBe('閉じる');
  });
});
