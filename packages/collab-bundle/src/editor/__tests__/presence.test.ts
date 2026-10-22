// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';

import type { AwarenessState } from '@nimbalyst/runtime/sync/documentSyncTypes';
import {
  CollabPresenceSurface,
  resolveCollabEditorUser,
} from '../presence';
import { asTeamMemberId } from '@nimbalyst/runtime/auth/jwtScopes';
import { createExtensionAwarenessBridge } from '@nimbalyst/runtime/sync/extensionAwarenessBridge';
import type { Awareness } from 'y-protocols/awareness';

class FakeAwarenessSurface {
  readonly document = new Y.Doc();
  readonly localStates: AwarenessState[] = [];
  readonly sentStates: AwarenessState[] = [];
  readonly departures: AwarenessState['user'][] = [];
  private listener: ((states: Map<string, AwarenessState>) => void) | null = null;

  getYDoc(): Y.Doc {
    return this.document;
  }

  getStatus() {
    return 'connected' as const;
  }

  async connect(): Promise<void> {}

  setLocalAwareness(state: AwarenessState): void {
    this.localStates.push(state);
  }

  async sendAwareness(state: AwarenessState): Promise<void> {
    this.sentStates.push(state);
  }

  sendAwarenessDeparture(user: AwarenessState['user']): boolean {
    this.departures.push(user);
    return true;
  }

  onAwarenessChange(listener: (states: Map<string, AwarenessState>) => void): () => void {
    this.listener = listener;
    return () => { this.listener = null; };
  }

  emit(states: Map<string, AwarenessState>): void {
    this.listener?.(states);
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe('collaboration presence surface', () => {
  it('uses the desktop roster precedence for a stable participant identity', () => {
    const memberId = asTeamMemberId('member-1');
    expect(resolveCollabEditorUser({
      memberId,
      name: '  Rowan Petrie  ',
      email: 'rowan@example.com',
      role: 'member',
    })).toMatchObject({ memberId, displayName: 'Rowan Petrie', role: 'member' });
    expect(resolveCollabEditorUser({
      memberId,
      name: ' ',
      email: 'rowan@example.com',
    }).displayName).toBe('rowan@example.com');
    // The member id is never a label: a host that has not resolved the name
    // yet, or passed the id as the name, gets the generic one.
    expect(resolveCollabEditorUser({ memberId }).displayName).toBe('Teammate');
    expect(resolveCollabEditorUser({ memberId, name: 'member-1' }).displayName).toBe('Teammate');
    expect(resolveCollabEditorUser({ memberId, name: 'member-1', email: 'rowan@example.com' }).displayName)
      .toBe('rowan@example.com');
  });

  it('relabels the local participant after mount and keeps the label on later editor states', () => {
    const delegate = new FakeAwarenessSurface();
    const surface = new CollabPresenceSurface(delegate);
    // The editor mounted before the roster answered.
    surface.setLocalAwareness({ user: { name: 'Teammate', color: '#3366ff' } });

    surface.setDisplayName('Rowan Petrie');
    expect(delegate.sentStates.at(-1)?.user.name).toBe('Rowan Petrie');

    // Lexical keeps publishing the name it mounted with on every selection change.
    surface.setLocalAwareness({ user: { name: 'Teammate', color: '#3366ff' }, cursor: { anchor: '{}', head: '{}' } });
    expect(delegate.localStates.at(-1)?.user.name).toBe('Rowan Petrie');
    surface.destroy();
  });

  it('never shows a peer by the member id it broadcast as its name', () => {
    const delegate = new FakeAwarenessSurface();
    const surface = new CollabPresenceSurface(delegate);
    delegate.emit(new Map([['member-live-abc', { user: { name: 'member-live-abc', color: '#16A34A' } }]]));
    expect(surface.getPresence().participants.map((participant) => participant.displayName)).toEqual(['Teammate']);
    surface.destroy();
  });

  it('localizes legacy peers without a resolved name but preserves an explicit Teammate name', () => {
    const delegate = new FakeAwarenessSurface();
    const surface = new CollabPresenceSurface(delegate, {
      getUnnamedCollaboratorLabel: () => 'チームメンバー',
    });
    delegate.emit(new Map<string, AwarenessState>([
      ['member-no-name', { user: { color: '#16A34A' } } as unknown as AwarenessState],
      ['member-id-only', { user: { name: 'member-id-only', color: '#E05555' } }],
      ['member-named-teammate', { user: { name: 'Teammate', color: '#3366FF' } }],
    ]));

    const displayNames = new Map<string, string>(surface.getPresence().participants.map((participant) => (
      [participant.memberId, participant.displayName]
    )));
    expect(displayNames.get('member-no-name')).toBe('チームメンバー');
    expect(displayNames.get('member-id-only')).toBe('チームメンバー');
    expect(displayNames.get('member-named-teammate')).toBe('Teammate');
    surface.destroy();
  });

  it('localizes marked fallback labels without rewriting legacy peer state', () => {
    let label = 'Teammate';
    const delegate = new FakeAwarenessSurface();
    const surface = new CollabPresenceSurface(delegate, {
      getUnnamedCollaboratorLabel: () => label,
    });
    const marked = {
      user: {
        name: 'Teammate',
        color: '#16A34A',
        nimbalystNameSource: 'system-default' as const,
      },
    };
    const wireStates = new Map([['member-generated', marked]]);
    delegate.emit(wireStates);

    expect(surface.getPresence().participants[0].displayName).toBe('Teammate');
    label = 'チームメンバー';
    surface.setUnnamedCollaboratorLabel(label);
    expect(surface.getPresence().participants[0].displayName).toBe('チームメンバー');
    expect(wireStates.get('member-generated')?.user.name).toBe('Teammate');

    delegate.emit(new Map<string, AwarenessState>([
      ['member-generated', marked],
      ['member-legacy', { user: { name: 'Teammate', color: '#E05555' } }],
    ]));
    expect(surface.getPresence().participants.map((participant) => participant.displayName))
      .toContain('Teammate');
    expect(surface.getPresence().participants.map((participant) => participant.displayName))
      .toContain('チームメンバー');
    surface.destroy();
  });

  it('keeps active clients alive and removes a disconnected bundle participant', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const delegate = new FakeAwarenessSurface();
    const surface = new CollabPresenceSurface(delegate, {
      heartbeatIntervalMs: 1_000,
      staleAfterMs: 2_500,
      sweepIntervalMs: 250,
    });
    const presenceSnapshots: string[][] = [];
    const lexicalSnapshots: number[] = [];
    surface.onPresenceChange((presence) => {
      presenceSnapshots.push(presence.participants.map((participant) => participant.displayName));
    });
    surface.onAwarenessChange((states) => lexicalSnapshots.push(states.size));

    surface.setLocalAwareness({
      user: { name: 'Local Member', color: '#3366ff' },
    });
    expect(delegate.localStates[0].user.nimbalystPresence).toMatchObject({
      version: 1,
      updatedAt: 10_000,
    });

    delegate.emit(new Map([[
      'member-remote',
      {
        user: {
          name: 'Remote Member',
          color: '#16A34A',
          nimbalystPresence: { version: 1, updatedAt: 10_000 },
        },
        cursor: { anchor: '{}', head: '{}' },
      },
    ]]));
    expect(surface.getPresence().participants).toEqual([{
      memberId: 'member-remote',
      displayName: 'Remote Member',
      cursorColor: '#16A34A',
      hasSelection: true,
    }]);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(delegate.sentStates).toHaveLength(1);
    expect(delegate.sentStates[0].user.nimbalystPresence).toMatchObject({
      version: 1,
      updatedAt: 11_000,
    });

    await vi.advanceTimersByTimeAsync(1_750);
    expect(surface.getPresence().participants).toEqual([]);
    expect(presenceSnapshots.at(-1)).toEqual([]);
    expect(lexicalSnapshots.at(-1)).toBe(0);
    surface.destroy();
  });

  it('leaves immediately when inactive, suppresses heartbeats, and rejoins when active', async () => {
    vi.useFakeTimers();
    const delegate = new FakeAwarenessSurface();
    const surface = new CollabPresenceSurface(delegate, { heartbeatIntervalMs: 1_000 });
    const localState: AwarenessState = {
      user: { name: 'Local Member', color: '#3366ff' },
    };
    surface.setLocalAwareness(localState);

    expect(surface.setActive(false)).toBe(true);
    expect(delegate.departures).toEqual([localState.user]);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(delegate.sentStates).toEqual([]);

    surface.setLocalAwareness({
      ...localState,
      cursor: { anchor: '{}', head: '{}' },
    });
    expect(delegate.localStates).toHaveLength(1);

    surface.setActive(true);
    expect(delegate.sentStates).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(delegate.sentStates).toHaveLength(2);
    surface.destroy();
  });

  it('does not expire an idle legacy desktop peer without heartbeat metadata', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const delegate = new FakeAwarenessSurface();
    const surface = new CollabPresenceSurface(delegate, {
      staleAfterMs: 2_500,
      sweepIntervalMs: 250,
    });
    delegate.emit(new Map([['desktop-member', {
      user: { name: 'Desktop Member', color: '#E05555' },
    }]]));

    await vi.advanceTimersByTimeAsync(30_000);

    expect(surface.getPresence().participants).toMatchObject([{
      memberId: 'desktop-member',
      displayName: 'Desktop Member',
    }]);
    surface.destroy();
  });
});

/**
 * The browser host stacks `CollabPresenceSurface` on top of the shared
 * extension awareness bridge; the desktop host uses the bridge alone. This
 * covers the claim in `extensionAwarenessBridge.ts`'s header -- that the full
 * y-protocols local state travels as-is -- across that asymmetry, in both
 * directions, for keys neither host knows about.
 */
describe('cross-host extension awareness', () => {
  /** Relays a whole-roster broadcast the way DocumentRoom does, JSON and all. */
  class FakeRoom {
    private readonly members = new Map<string, FakeRoomMember>();

    join(userId: string, member: FakeRoomMember): void {
      this.members.set(userId, member);
    }

    publish(fromUserId: string, state: AwarenessState): void {
      const wire = JSON.parse(JSON.stringify(state)) as AwarenessState;
      for (const [userId, member] of this.members) {
        if (userId !== fromUserId) member.receive(fromUserId, wire);
      }
    }
  }

  class FakeRoomMember {
    readonly doc = new Y.Doc();
    private readonly remote = new Map<string, AwarenessState>();
    private readonly listeners = new Set<(states: Map<string, AwarenessState>) => void>();
    readonly published: AwarenessState[] = [];

    constructor(private readonly room: FakeRoom, private readonly userId: string) {
      room.join(userId, this);
    }

    getYDoc(): Y.Doc { return this.doc; }
    getStatus() { return 'connected' as const; }
    async connect(): Promise<void> {}
    setLocalAwareness(state: AwarenessState): void {
      this.published.push(state);
      this.room.publish(this.userId, state);
    }
    async sendAwareness(state: AwarenessState): Promise<void> {
      this.published.push(state);
      this.room.publish(this.userId, state);
    }

    sendAwarenessDeparture(user: AwarenessState['user']): boolean {
      this.room.publish(this.userId, { user, nimbalystDeparture: { version: 1 } });
      return true;
    }

    onAwarenessChange(listener: (states: Map<string, AwarenessState>) => void): () => void {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    receive(fromUserId: string, state: AwarenessState): void {
      if (state.nimbalystDeparture?.version === 1) this.remote.delete(fromUserId);
      else this.remote.set(fromUserId, state);
      for (const listener of this.listeners) listener(new Map(this.remote));
    }

    getRemoteState(userId: string): AwarenessState | undefined {
      return this.remote.get(userId);
    }
  }

  function remoteStates(bridge: { awareness: Awareness }): Array<Record<string, unknown>> {
    const { awareness } = bridge;
    return [...awareness.getStates()]
      .filter(([clientId]) => clientId !== awareness.clientID)
      .map(([, state]) => state as Record<string, unknown>);
  }

  it('carries editor-private awareness keys in both directions', () => {
    const room = new FakeRoom();

    const desktopTransport = new FakeRoomMember(room, 'desktop-user');
    const desktop = createExtensionAwarenessBridge({
      syncProvider: desktopTransport,
      yDoc: desktopTransport.getYDoc(),
      user: { id: 'desktop-user', name: 'Desktop User', color: '#3A8FD6' },
    });

    const browserTransport = new FakeRoomMember(room, 'browser-user');
    const browserPresence = new CollabPresenceSurface(browserTransport);
    const browser = createExtensionAwarenessBridge({
      syncProvider: browserPresence,
      yDoc: browserTransport.getYDoc(),
      user: { id: 'browser-user', name: 'Browser User', color: '#E05555' },
    });

    browser.awareness.setLocalStateField('selectedCell', { row: 2, col: 1 });
    browser.awareness.setLocalStateField('editingCell', { row: 2, col: 1 });
    desktop.awareness.setLocalStateField('tool', 'lasso');

    expect(remoteStates(desktop)[0]).toMatchObject({
      user: { id: 'browser-user', name: 'Browser User' },
      selectedCell: { row: 2, col: 1 },
      editingCell: { row: 2, col: 1 },
    });
    expect(remoteStates(browser)[0]).toMatchObject({
      user: { id: 'desktop-user' },
      tool: 'lasso',
    });

    browserPresence.destroy();
    browser.destroy();
    desktop.destroy();
  });

  it('localizes generated embedded peer labels on language changes without changing wire names', () => {
    const room = new FakeRoom();
    let browserLabel = 'Teammate';
    const desktopTransport = new FakeRoomMember(room, 'desktop-default');
    const desktop = createExtensionAwarenessBridge({
      syncProvider: desktopTransport,
      yDoc: desktopTransport.getYDoc(),
      user: {
        id: 'desktop-default',
        name: 'Teammate',
        nimbalystNameSource: 'system-default',
        color: '#3A8FD6',
      },
      getUnnamedCollaboratorLabel: () => 'Teammate',
      heartbeatIntervalMs: 0,
    });
    const browserTransport = new FakeRoomMember(room, 'browser-user');
    const browserPresence = new CollabPresenceSurface(browserTransport, {
      getUnnamedCollaboratorLabel: () => browserLabel,
    });
    const browser = createExtensionAwarenessBridge({
      syncProvider: browserPresence,
      yDoc: browserTransport.getYDoc(),
      user: { id: 'browser-user', name: 'Browser User', color: '#E05555' },
      getUnnamedCollaboratorLabel: () => browserLabel,
      heartbeatIntervalMs: 0,
    });
    // A second broadcast reaches the browser after it has joined the room.
    desktop.awareness.setLocalStateField('cursor', { x: 1, y: 2 });

    expect(browserPresence.getPresence().participants.find(
      (participant) => participant.memberId === 'desktop-default',
    )?.displayName).toBe('Teammate');
    expect(remoteStates(browser).find((state) => (
      (state.user as Record<string, unknown>).id === 'desktop-default'
    ))?.user).toMatchObject({ name: 'Teammate', nimbalystNameSource: 'system-default' });

    browserLabel = 'チームメンバー';
    browserPresence.setUnnamedCollaboratorLabel(browserLabel);
    browser.refreshRemoteDisplayNames();
    expect(browserPresence.getPresence().participants.find(
      (participant) => participant.memberId === 'desktop-default',
    )?.displayName).toBe('チームメンバー');
    expect(remoteStates(browser).find((state) => (
      (state.user as Record<string, unknown>).id === 'desktop-default'
    ))?.user).toMatchObject({ name: 'チームメンバー' });
    expect(browserTransport.getRemoteState('desktop-default')?.user).toMatchObject({
      name: 'Teammate',
      nimbalystNameSource: 'system-default',
    });
    expect(desktopTransport.published.at(-1)?.user).toMatchObject({
      name: 'Teammate',
      nimbalystNameSource: 'system-default',
    });

    // Markerless legacy names, including a genuine user named Teammate, remain untouched.
    browserTransport.receive('legacy-teammate', {
      user: { id: 'legacy-teammate', name: 'Teammate', color: '#E06B8F' },
    });
    expect(browserPresence.getPresence().participants.find(
      (participant) => participant.memberId === 'legacy-teammate',
    )?.displayName).toBe('Teammate');

    browserLabel = 'Teammate';
    browserPresence.setUnnamedCollaboratorLabel(browserLabel);
    browser.refreshRemoteDisplayNames();
    expect(browserPresence.getPresence().participants.find(
      (participant) => participant.memberId === 'desktop-default',
    )?.displayName).toBe('Teammate');

    browserPresence.destroy();
    browser.destroy();
    desktop.destroy();
  });
});
