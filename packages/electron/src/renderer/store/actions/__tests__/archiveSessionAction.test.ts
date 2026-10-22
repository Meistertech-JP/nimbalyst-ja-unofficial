// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createStore } from 'jotai';
import { activeWorkspacePathAtom } from '../../atoms/openProjects';
import { sessionRegistryAtom } from '../../atoms/sessions';
import { errorNotificationService } from '../../../services/ErrorNotificationService';
import { archiveSessionActionAtom, deleteSessionActionAtom } from '../sessionHistoryActions';

vi.mock('../../../services/ErrorNotificationService', () => ({
  errorNotificationService: {
    showError: vi.fn(),
    getLocalizedText: vi.fn((_namespace: string, _key: string, fallback: string) => fallback),
  },
}));

describe('archiveSessionActionAtom', () => {
  it('marks the whole subtree archived in the registry after the backend cascade succeeds', async () => {
    const invoke = vi.fn().mockResolvedValue({ success: true });
    vi.stubGlobal('window', { electronAPI: { invoke } });
    const store = createStore();
    store.set(activeWorkspacePathAtom, '/ws');
    const row = (id: string, parentSessionId?: string) => [id, { id, parentSessionId, isArchived: false }] as const;
    store.set(sessionRegistryAtom, new Map([row('root'), row('child', 'root'), row('grandchild', 'child'), row('other')]) as any);

    const archived = await store.set(archiveSessionActionAtom, 'root');

    const registry = store.get(sessionRegistryAtom);
    expect(invoke).toHaveBeenCalledWith('sessions:update-metadata', 'root', { isArchived: true });
    expect(archived).toHaveLength(3);
    expect(archived).toEqual(expect.arrayContaining(['root', 'child', 'grandchild']));
    expect(['root', 'child', 'grandchild'].map(id => registry.get(id)?.isArchived)).toEqual([true, true, true]);
    expect(registry.get('other')?.isArchived).toBe(false);
  });

  it('shows an error and changes nothing when the backend rejects the archive', async () => {
    const invoke = vi.fn().mockResolvedValue({ success: false, error: 'Session not found' });
    vi.stubGlobal('window', { electronAPI: { invoke } });
    const store = createStore();
    store.set(activeWorkspacePathAtom, '/ws');
    const row = (id: string, parentSessionId?: string) => [id, { id, parentSessionId, isArchived: false }] as const;
    store.set(sessionRegistryAtom, new Map([row('root'), row('child', 'root')]) as any);

    const archived = await store.set(archiveSessionActionAtom, 'root');

    expect(archived).toEqual([]);
    expect(['root', 'child'].map(id => store.get(sessionRegistryAtom).get(id)?.isArchived)).toEqual([false, false]);
    expect(errorNotificationService.showError).toHaveBeenCalledWith('Failed to archive session', 'Session not found');
  });
});

describe('deleteSessionActionAtom notifications', () => {
  it('uses localized fixed copy and keeps backend details intact', async () => {
    const invoke = vi.fn().mockResolvedValue({ success: false, error: 'Session not found' });
    vi.stubGlobal('window', { electronAPI: { invoke } });
    const store = createStore();
    store.set(activeWorkspacePathAtom, '/ws');

    await store.set(deleteSessionActionAtom, 'session-1');

    expect(errorNotificationService.getLocalizedText).toHaveBeenCalledWith(
      'sessions', 'notifications.delete_failed', 'Failed to delete session',
    );
    expect(errorNotificationService.showError).toHaveBeenCalledWith('Failed to delete session', 'Session not found');
  });
});
