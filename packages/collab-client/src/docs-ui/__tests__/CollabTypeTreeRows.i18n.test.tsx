// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { CollabPlaceTypeMenu, CollabTypeNodeRow } from '../CollabTypeTreeRows';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('CollabPlaceTypeMenu localization', () => {
  it('renders Japanese title and empty state', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <CollabPlaceTypeMenu x={0} y={0} types={[]} onPlace={() => {}} onClose={() => {}} />
      </UiLanguageProvider>,
    );

    expect(screen.getByText('タイプを配置...')).toBeTruthy();
    expect(screen.getByText('すべてのタイプが配置済みです')).toBeTruthy();
  });

  it('localizes the broken type tooltip and row accessibility label', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <CollabTypeNodeRow
          node={{
            id: 'type:scratch',
            type: 'type',
            typeId: 'scratch',
            path: 'Personal/scratch',
            name: 'scratch',
            count: 0,
            placement: {
              typeId: 'scratch',
              projectId: null,
              sortOrder: 0,
              createdBy: 'user',
              createdAt: 0,
              updatedAt: 0,
            },
            error: 'Missing required field: modes',
            children: [],
          }}
          indent={0}
          expanded={false}
          onToggle={() => {}}
          onOpen={() => {}}
          onContextMenu={() => {}}
          onDragStart={() => {}}
          onDragEnd={() => {}}
        />
      </UiLanguageProvider>,
    );

    expect(screen.getByTestId('collab-tree-type-row').getAttribute('title'))
      .toBe('タイプ「scratch」を読み込めませんでした: Missing required field: modes');
    expect(screen.getByLabelText('展開')).toBeTruthy();
  });
});
