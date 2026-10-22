// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import * as Y from 'yjs';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { createExtensionAwarenessBridge } from '../extensionAwarenessBridge';
import { EntityNode } from '../../../../extensions/datamodellm/src/components/EntityNode';
import { extractRemotePresences, indexPresences } from '../../../../extensions/datamodellm/src/collab/presence';

afterEach(cleanup);

describe('Datamodel entity presence through extension awareness', () => {
  it('renders a localized generated name while preserving an explicit matching name', async () => {
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
    receiveAwareness?.(new Map([
      ['member-dana', {
        user: { name: 'Teammate', color: '#E05555', nimbalystNameSource: 'system-default' },
        selectedEntityId: 'entity-orders',
      }],
      ['member-ada', {
        user: { name: 'Teammate', color: '#4287F5' },
        selectedEntityId: 'entity-orders',
      }],
    ]));

    const entity = {
      id: 'entity-orders',
      name: 'Orders',
      fields: [],
      position: { x: 0, y: 0 },
    };
    const store = {
      getState: () => ({ entities: [entity], relationships: [] }),
    } as any;
    const getPresences = () => indexPresences(
      extractRemotePresences(
        bridge.awareness.getStates() as Map<number, any>,
        bridge.awareness.clientID,
      ),
    ).entities.get('entity-orders') ?? [];
    const renderEntity = (preference: 'en' | 'ja') => {
      const data = {
        entity,
        isSelected: false,
        isHovered: false,
        viewMode: 'compact' as const,
        database: 'postgres' as const,
        store,
        presences: getPresences(),
      };
      return render(
        <UiLanguageProvider i18n={i18n} preference={preference} systemLocale={`${preference}-US`}>
          <ReactFlowProvider>
            <EntityNode {...({ id: entity.id, type: 'entity', data, selected: false } as any)} />
          </ReactFlowProvider>
        </UiLanguageProvider>,
      );
    };

    const rendered = renderEntity('en');
    expect(screen.getAllByText('Teammate')).toHaveLength(2);

    await act(async () => {
      await i18n.changeLanguage('ja');
      bridge.refreshRemoteDisplayNames();
      rendered.rerender(
        <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
          <ReactFlowProvider>
            <EntityNode {...({ id: entity.id, type: 'entity', data: {
              entity,
              isSelected: false,
              isHovered: false,
              viewMode: 'compact',
              database: 'postgres',
              store,
              presences: getPresences(),
            }, selected: false } as any)} />
          </ReactFlowProvider>
        </UiLanguageProvider>,
      );
    });
    expect(screen.getByText('チームメンバー')).toBeTruthy();
    expect(screen.getByText('Teammate')).toBeTruthy();

    bridge.destroy();
    yDoc.destroy();
  });
});
