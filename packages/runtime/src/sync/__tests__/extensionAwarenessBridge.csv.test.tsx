// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import * as Y from 'yjs';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { createExtensionAwarenessBridge } from '../extensionAwarenessBridge';
import { extractRemotePresences } from '../../../../extensions/csv-spreadsheet/src/collab/presence';
import { CollabPresenceOverlay } from '../../../../extensions/csv-spreadsheet/src/components/CollabPresenceOverlay';

afterEach(cleanup);

function setRect(element: HTMLElement, rect: DOMRect): void {
  element.getBoundingClientRect = () => rect;
}

describe('CSV presence display through extension awareness', () => {
  it('renders the host-localized generated name and refreshes it when the UI language changes', async () => {
    const i18n = await createI18nInstance('en');
    let receiveAwareness: ((states: Map<string, any>) => void) | undefined;
    const yDoc = new Y.Doc();
    const bridge = createExtensionAwarenessBridge({
      syncProvider: {
        setLocalAwareness: vi.fn(),
        onAwarenessChange: (listener) => {
          receiveAwareness = listener;
          return () => { receiveAwareness = undefined; };
        },
      },
      yDoc,
      user: { id: 'local-user', name: 'Local user', color: '#3A8FD6' },
      getUnnamedCollaboratorLabel: () => i18n.getFixedT(i18n.language, 'editor')('collab.unnamed_collaborator'),
      heartbeatIntervalMs: 0,
    });

    const generatedWireState = {
      user: {
        name: 'Teammate',
        color: '#E05555',
        nimbalystNameSource: 'system-default' as const,
      },
      editingCell: { row: 0, col: 0 },
    };
    const explicitWireState = {
      user: { name: 'Teammate', color: '#4287F5' },
      editingCell: { row: 0, col: 0 },
    };
    receiveAwareness?.(new Map([
      ['member-dana', generatedWireState],
      ['member-ada', explicitWireState],
    ]));

    const container = document.createElement('div');
    const section = document.createElement('revogr-data');
    section.setAttribute('type', 'rgRow');
    const cell = document.createElement('div');
    cell.setAttribute('data-rgrow', '0');
    cell.setAttribute('data-rgcol', '0');
    section.appendChild(cell);
    container.appendChild(section);
    document.body.appendChild(container);
    setRect(container, new DOMRect(0, 0, 200, 100));
    setRect(section, new DOMRect(0, 0, 200, 100));
    setRect(cell, new DOMRect(0, 0, 40, 20));

    const containerRef = { current: container };
    const renderOverlay = (repaintKey: number) => {
      const presences = extractRemotePresences(
        bridge.awareness.getStates() as Map<number, { user?: { id?: unknown; name?: unknown; color?: unknown }; editingCell?: unknown; selectedCell?: unknown }>,
        bridge.awareness.clientID,
      );
      const rendered = render(
        <CollabPresenceOverlay
          presences={presences}
          containerRef={containerRef}
          headerRowCount={0}
          repaintKey={repaintKey}
        />,
      );
      return { presences, ...rendered };
    };

    const firstPresences = renderOverlay(0);
    expect(screen.getAllByText('Teammate')).toHaveLength(2);

    await act(async () => {
      await i18n.changeLanguage('ja');
      bridge.refreshRemoteDisplayNames();
    });
    const japanesePresences = extractRemotePresences(
      bridge.awareness.getStates() as Map<number, { user?: { id?: unknown; name?: unknown; color?: unknown }; editingCell?: unknown; selectedCell?: unknown }>,
      bridge.awareness.clientID,
    );
    expect(firstPresences.presences.map(({ name }) => name)).toEqual(['Teammate', 'Teammate']);
    expect(japanesePresences.map(({ name }) => name)).toEqual(['チームメンバー', 'Teammate']);
    firstPresences.rerender(
      <CollabPresenceOverlay
        presences={japanesePresences}
        containerRef={containerRef}
        headerRowCount={0}
        repaintKey={1}
      />,
    );
    expect(screen.getByText('チームメンバー')).toBeTruthy();
    expect(screen.getByText('Teammate')).toBeTruthy();
    expect(generatedWireState.user.name).toBe('Teammate');
    expect(explicitWireState.user.name).toBe('Teammate');

    bridge.destroy();
    yDoc.destroy();
    container.remove();
  });
});
