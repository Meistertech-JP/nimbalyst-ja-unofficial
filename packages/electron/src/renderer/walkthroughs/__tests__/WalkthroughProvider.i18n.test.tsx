// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { act, cleanup, render } from '@testing-library/react';
import { Provider } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../store';
import { WalkthroughProvider } from '../components/WalkthroughProvider';
import { activeWalkthroughIdAtom, currentStepIndexAtom, walkthroughStateAtom } from '../atoms';
import { walkthroughTriggerCommandAtom, walkthroughResetCommandAtom } from '../../store/atoms/walkthroughCommands';
import { hasActiveDialogsAtom } from '../../contexts/DialogContext';

const mocks = vi.hoisted(() => ({ showInfo: vi.fn(), resolveTarget: vi.fn(), condition: vi.fn(), capture: vi.fn() }));
vi.mock('posthog-js/react', () => ({ usePostHog: () => ({ capture: mocks.capture }) }));
vi.mock('../../services/ErrorNotificationService', () => ({ errorNotificationService: { showInfo: mocks.showInfo } }));
vi.mock('../components/WalkthroughCallout', () => ({ WalkthroughCallout: () => null }));
vi.mock('../WalkthroughService', async (importOriginal) => ({
  ...await importOriginal<typeof import('../WalkthroughService')>(),
  resolveTarget: mocks.resolveTarget,
}));
vi.mock('../definitions', () => ({ walkthroughs: [{
  id: 'agent-mode-intro', name: 'Agent Mode Introduction', version: 1,
  trigger: { screen: 'agent', condition: mocks.condition },
  steps: [{ id: 'agent-mode', target: { testId: 'agent-mode-button' }, title: 'Agent Mode', body: 'Original body' }],
}] }));

const state = { enabled: true, completed: [], dismissed: [], history: {} };

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal('electronAPI', { invoke: vi.fn(async () => state) });
  mocks.resolveTarget.mockReturnValue(document.body);
  mocks.condition.mockReturnValue(true);
  store.set(walkthroughStateAtom, state);
  store.set(activeWalkthroughIdAtom, null);
  store.set(currentStepIndexAtom, 0);
  store.set(hasActiveDialogsAtom, false);
  store.set(walkthroughTriggerCommandAtom, null);
  store.set(walkthroughResetCommandAtom, 0);
  await i18next.changeLanguage('en');
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await i18next.changeLanguage('en');
});

async function mountAndTrigger(walkthroughId: string) {
  render(<Provider store={store as any}><WalkthroughProvider currentMode="files" autoTrigger={false}><div /></WalkthroughProvider></Provider>);
  await act(async () => {
    await i18next.changeLanguage('ja');
    store.set(walkthroughTriggerCommandAtom, { walkthroughId, timestamp: 1 });
  });
}

describe('walkthrough command presentation', () => {
  it('preserves an unknown ID in the translated notification and does not replay it', async () => {
    await mountAndTrigger('custom-guide-id');
    expect(mocks.showInfo).toHaveBeenCalledWith('操作ガイドが見つかりません', '不明な操作ガイド: custom-guide-id', { duration: 3000 });
    await act(() => i18next.changeLanguage('en'));
    expect(mocks.showInfo).toHaveBeenCalledTimes(1);
    expect(store.get(activeWalkthroughIdAtom)).toBeNull();
  });

  it.each(['target', 'condition'])('translates a missing %s without starting or recording the walkthrough', async (reason) => {
    if (reason === 'target') mocks.resolveTarget.mockReturnValue(null);
    else mocks.condition.mockReturnValue(false);
    await mountAndTrigger('agent-mode-intro');
    expect(mocks.showInfo).toHaveBeenCalledWith('操作ガイドを表示できません', expect.stringContaining('「エージェントモードの紹介」'), { duration: 5000 });
    expect(mocks.showInfo.mock.calls[0][1]).toContain('エージェントモードに切り替えてください');
    expect(store.get(activeWalkthroughIdAtom)).toBeNull();
    expect(window.electronAPI.invoke).not.toHaveBeenCalledWith('walkthroughs:record-shown', expect.anything(), expect.anything(), expect.anything());
  });

  it('preserves stored IDs and analytics names when a guide starts in Japanese', async () => {
    await mountAndTrigger('agent-mode-intro');
    expect(store.get(activeWalkthroughIdAtom)).toBe('agent-mode-intro');
    expect(window.electronAPI.invoke).toHaveBeenCalledWith('walkthroughs:record-shown', 'agent-mode-intro', 1, undefined);
    expect(mocks.capture).toHaveBeenCalledWith('walkthrough_started', expect.objectContaining({ walkthrough_id: 'agent-mode-intro', walkthrough_name: 'Agent Mode Introduction' }));
    expect(mocks.showInfo).not.toHaveBeenCalled();
  });

  it('resets guides only once and translates the resulting notification', async () => {
    render(<Provider store={store as any}><WalkthroughProvider currentMode="files" autoTrigger={false}><div /></WalkthroughProvider></Provider>);
    await act(async () => {
      await i18next.changeLanguage('ja');
      store.set(walkthroughResetCommandAtom, 1);
    });
    expect(mocks.showInfo).toHaveBeenCalledWith('操作ガイドをリセットしました', 'すべての操作ガイドが再び表示されます。', { duration: 3000 });
    await act(() => i18next.changeLanguage('en'));
    expect(vi.mocked(window.electronAPI.invoke).mock.calls.filter(([channel]) => channel === 'walkthroughs:reset')).toHaveLength(1);
    expect(mocks.showInfo).toHaveBeenCalledTimes(1);
  });
});
