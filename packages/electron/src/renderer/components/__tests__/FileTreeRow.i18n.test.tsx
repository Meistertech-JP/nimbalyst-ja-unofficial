// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { FileTreeRow } from '../FileTreeRow';
import { getFlatFileTreeDeleteConfirmationCopy } from '../FlatFileTree';
import type { FlatTreeNode } from '../../store';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(cleanup);

describe('FileTreeRow localization', () => {
  it('provides Japanese singular and plural delete confirmation copy', () => {
    const singular = getFlatFileTreeDeleteConfirmationCopy(['C:/workspace/readme.md']);
    const plural = getFlatFileTreeDeleteConfirmationCopy(['C:/workspace/a.md', 'C:/workspace/b.md']);

    expect(japaneseI18n.t(singular.titleKey, { ns: 'files' })).toBe('項目を削除しますか？');
    expect(japaneseI18n.t(singular.messageKey, { ns: 'files', ...singular.messageOptions })).toBe('「readme.md」を削除しますか？');
    expect(japaneseI18n.t(singular.confirmLabelKey, { ns: 'files' })).toBe('削除');
    expect(japaneseI18n.t(plural.titleKey, { ns: 'files' })).toBe('項目を削除しますか？');
    expect(japaneseI18n.t(plural.messageKey, { ns: 'files', ...plural.messageOptions })).toBe('2件を削除しますか？');
  });

  it('localizes the copy-drag cue while keeping the directory name intact', () => {
    const node: FlatTreeNode = {
      path: 'C:/workspace/assets',
      name: 'assets',
      type: 'directory',
      depth: 0,
      index: 0,
      parentPath: null,
      hasChildren: false,
      isExpanded: false,
      isActive: false,
      isSelected: false,
      isMultiSelected: false,
      isDragOver: true,
      isSpecialDirectory: false,
      isWorkspaceRoot: false,
    };

    render(
      <I18nextProvider i18n={japaneseI18n}>
        <Provider>
          <FileTreeRow
            node={node}
            showIcons={false}
            isFocused={false}
            isRenaming={false}
            isDragSource={false}
            isCopyDrag
            onClick={() => undefined}
            onContextMenu={() => undefined}
            onDragStart={() => undefined}
            onDragEnd={() => undefined}
          />
        </Provider>
      </I18nextProvider>,
    );

    expect(screen.getByText('(コピー)')).toBeDefined();
    expect(screen.getByText('assets')).toBeDefined();
  });
});
