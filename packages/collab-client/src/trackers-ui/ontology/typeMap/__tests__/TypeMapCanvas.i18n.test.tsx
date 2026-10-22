// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { TypeMapType } from '../../ontologyLabelMap';
import { TypeMapCanvas } from '../TypeMapCanvas';
import { layoutTypeMap } from '../typeMapLayout';

afterEach(cleanup);

test('the type-map canvas localizes the additional-property count', async () => {
  const i18n = await createI18nInstance('ja');
  const type: TypeMapType = {
    id: 'project',
    name: 'Project',
    plural: 'Projects',
    description: '',
    role: 'page',
    count: 1,
    declared: false,
    broader: [],
    properties: Array.from({ length: 7 }, (_, index) => ({ id: `field-${index}`, name: `Field ${index}`, filled: 1 })),
    zone: 'work',
  };
  const types = new Map([[type.id, type]]);
  const layout = layoutTypeMap({
    types: [type],
    zones: [{ id: 'work', name: 'Work', hub: type.id, typeIds: [type.id] }],
    pairs: [],
  });

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja">
      <svg>
        <TypeMapCanvas
          layout={layout}
          types={types}
          pairs={new Map()}
          relationships={new Map()}
          zoneTone={new Map()}
          maxCount={type.count}
          lit={new Set()}
          selection={null}
          onSelect={() => {}}
          onHover={() => {}}
        />
      </svg>
    </UiLanguageProvider>,
  );

  expect(screen.getByText('パネルにほか1件')).toBeDefined();
  expect(document.querySelector('.type-map-node title')?.textContent).toBe('Projects：1ページ (レジストリに未登録)');
});
