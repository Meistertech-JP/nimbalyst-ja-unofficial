// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';

vi.mock('@excalidraw/excalidraw', () => ({
  CaptureUpdateAction: { NEVER: 'NEVER' },
  restoreElements: (elements: any[]) => elements,
}));

import * as Y from 'yjs';
import { createExtensionAwarenessBridge } from '../extensionAwarenessBridge';

describe('Excalidraw presence through extension awareness', () => {
  it('refreshes the built-in collaborator label without changing the received wire name', async () => {
    const { ExcalidrawBinding } = await vi.importActual<{
      ExcalidrawBinding: new (...args: any[]) => { destroy(): void };
    }>(new URL(
      '../../../../extensions/excalidraw/src/collab/excalidrawBindings.ts',
      import.meta.url,
    ).href);
    const doc = new Y.Doc();
    let receiveAwareness: ((states: Map<string, any>) => void) | undefined;
    const sentLocalStates: any[] = [];
    const updateSceneCalls: Array<{ collaborators?: Map<string, { username?: string }> }> = [];
    let unnamedLabel = 'Teammate';
    const bridge = createExtensionAwarenessBridge({
      syncProvider: {
        setLocalAwareness: (state) => sentLocalStates.push(state),
        onAwarenessChange: (listener) => {
          receiveAwareness = listener;
          return () => { receiveAwareness = undefined; };
        },
      },
      yDoc: doc,
      user: { id: 'local-user', name: 'Local user', color: '#3A8FD6' },
      getUnnamedCollaboratorLabel: () => unnamedLabel,
      heartbeatIntervalMs: 0,
    });
    const api = {
      onChange: vi.fn(() => () => undefined),
      getSceneElements: () => [],
      addFiles: vi.fn(),
      updateScene: vi.fn((payload: { collaborators?: Map<string, { username?: string }> }) => {
        updateSceneCalls.push(payload);
      }),
      scrollToContent: vi.fn(),
    } as any;
    const binding = new ExcalidrawBinding(
      doc.getArray('elements'),
      doc.getMap('assets'),
      api,
      bridge.awareness,
    );

    const receivedWireState = {
      user: {
        name: 'Teammate',
        color: '#E06B8F',
        nimbalystNameSource: 'system-default' as const,
      },
    };
    receiveAwareness?.(new Map([['member-dana', receivedWireState]]));
    const latestCollaboratorNames = () => {
      const collaborators = updateSceneCalls
        .map(({ collaborators }) => collaborators)
        .filter((value): value is Map<string, { username?: string }> => value instanceof Map)
        .at(-1);
      return [...(collaborators?.values() ?? [])].map(({ username }) => username);
    };
    expect(latestCollaboratorNames()).toEqual(['Teammate']);

    unnamedLabel = 'チームメンバー';
    bridge.refreshRemoteDisplayNames();
    expect(latestCollaboratorNames()).toEqual(['チームメンバー']);
    expect(receivedWireState.user.name).toBe('Teammate');
    expect(sentLocalStates.every((state) => state.user.name !== 'チームメンバー')).toBe(true);

    binding.destroy();
    bridge.destroy();
    doc.destroy();
  });
});
