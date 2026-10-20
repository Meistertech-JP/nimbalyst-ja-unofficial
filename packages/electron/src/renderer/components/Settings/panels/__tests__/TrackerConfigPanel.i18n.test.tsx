// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackerConfigPanel } from '../TrackerConfigPanel';

const { confirm, trackerState } = vi.hoisted(() => ({ confirm: vi.fn(), trackerState: { count: 0, builtin: true } }));

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
  globalRegistry: {
    getAll: () => [{ type: 'custom-bug', displayNamePlural: 'My Bugs', color: '#ff0000', icon: 'bug_report', sync: { mode: 'local' } }],
    isBuiltin: () => trackerState.builtin,
    onChange: () => () => {},
  },
  parseTrackerYAML: vi.fn(),
}));
vi.mock('@nimbalyst/runtime/plugins/TrackerPlugin', () => ({ trackerItemCountByTypeAtom: () => 'count' }));
vi.mock('jotai', () => ({ useAtomValue: () => trackerState.count }));
vi.mock('../../../../store/atoms/trackerSync', () => ({ trackerSyncConfigChangeAtom: 'sync-change' }));
vi.mock('../../../../contexts/DialogContext', () => ({ useDialog: () => ({ confirm }) }));
vi.mock('../../../common/AlphaBadge', () => ({ AlphaBadge: () => null, SETTINGS_ALPHA_TOOLTIP: '' }));

describe('tracker settings in Japanese', () => {
  beforeEach(async () => {
    trackerState.count = 0;
    trackerState.builtin = true;
    await i18next.changeLanguage('ja');
    confirm.mockReset().mockResolvedValue(true);
    window.electronAPI = {
      invoke: vi.fn().mockImplementation(async (channel: string) => {
        if (channel === 'workspace:get-state') return { issueKeyPrefix: 'NIM' };
        if (channel === 'tracker-schema:get-drift') return { hasDrift: false, entries: [] };
        if (channel === 'tracker-schema:get-override') return { overridden: false };
        if (channel === 'tracker-sync:get-status') return { active: false };
        return { success: true };
      }),
      team: { findForWorkspace: vi.fn().mockResolvedValue({ success: true, team: { role: 'admin' } }) },
    } as unknown as typeof window.electronAPI;
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    await i18next.changeLanguage('en');
  });

  it.each([false, true])('keeps sync values unchanged after a Japanese upgrade confirmation (%s)', async (approved) => {
    confirm.mockResolvedValue(approved);
    render(<TrackerConfigPanel workspacePath="/workspace" />);
    fireEvent.click(await screen.findByRole('button', { name: '共有' }));

    await waitFor(() => expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'My Bugsを共有にアップグレードしますか？',
      message: expect.stringContaining('.nimbalyst/trackers/*.yaml'),
      confirmLabel: '続行',
      cancelLabel: 'キャンセル',
    })));
    expect(confirm.mock.calls[0][0].message).toContain('すべてのトラッカー項目が保持されます');
    if (approved) {
      await waitFor(() => expect(window.electronAPI.invoke).toHaveBeenCalledWith('workspace:update-state', '/workspace', {
        trackerSyncPolicies: { 'custom-bug': 'shared' },
      }));
    } else {
      expect(vi.mocked(window.electronAPI.invoke).mock.calls.filter(([channel]) => channel === 'workspace:update-state')).toHaveLength(0);
    }
  });

  it('localizes prefix validation without accepting non-ASCII issue-key input', async () => {
    render(<TrackerConfigPanel workspacePath="/workspace" />);
    await screen.findByRole('button', { name: '共有' });
    const input = screen.getByPlaceholderText('NIM');
    fireEvent.change(input, { target: { value: '日本語' } });
    fireEvent.blur(input);
    expect(screen.getByText('2～5文字の大文字英字を指定してください')).toBeTruthy();
    expect(vi.mocked(window.electronAPI.invoke).mock.calls.filter(([channel]) => channel === 'workspace:update-state')).toHaveLength(0);
    expect(screen.getByText('My Bugs')).toBeTruthy();
  });

  it.each([1, 2])('uses plural-aware deletion warnings without an English suffix (%s)', async count => {
    trackerState.count = count;
    trackerState.builtin = false;
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<TrackerConfigPanel workspacePath="/workspace" />);
    fireEvent.click(await screen.findByTitle('トラッカータイプ「My Bugs」を削除'));
    expect(alert).toHaveBeenCalledWith(`「My Bugs」は削除できません。この種類の項目が${count}件残っています。先に項目を削除してください。`);
    const english = i18next.getFixedT('en')('tracker:config.delete_blocked', { name: 'My Bugs', count });
    expect(english).toBe(count === 1
      ? 'Cannot delete "My Bugs": 1 item of this type still exists. Delete that item first.'
      : 'Cannot delete "My Bugs": 2 items of this type still exist. Delete those items first.');
    expect(window.electronAPI.invoke).not.toHaveBeenCalledWith('workspace:update-state', expect.anything(), expect.anything());
  });
});
