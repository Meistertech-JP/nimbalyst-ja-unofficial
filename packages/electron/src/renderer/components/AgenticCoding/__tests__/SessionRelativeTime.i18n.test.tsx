// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionRelativeTime } from '../SessionRelativeTime';
import { sessionLastActivityAtom } from '../../../store';

afterEach(async () => { cleanup(); vi.restoreAllMocks(); await i18next.changeLanguage('en'); });

describe('SessionRelativeTime localization', () => {
  it('reacts to language and live-activity changes while retaining the registry fallback', async () => {
    const now = 1_800_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const store = createStore();
    render(<Provider store={store}><SessionRelativeTime sessionId="relative-spec" fallbackTimestamp={now - 120_000} /></Provider>);
    expect(screen.getByText('2 mins ago')).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('2分前')).toBeTruthy();
    act(() => { store.set(sessionLastActivityAtom('relative-spec'), now - 3_600_000); });
    expect(screen.getByText('1時間前')).toBeTruthy();
    act(() => { store.set(sessionLastActivityAtom('relative-spec'), 0); });
    expect(screen.getByText('2分前')).toBeTruthy();
  });
});
