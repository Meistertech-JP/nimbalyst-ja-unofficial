// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { FileContextMenu } from '../FileContextMenu';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => cleanup());

function renderJapanese(node: React.ReactNode) {
  return render(
    <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
      {node}
    </UiLanguageProvider>,
  );
}

const baseProps = {
  x: 100,
  y: 100,
  filePath: '/workspace/docs',
  fileName: 'docs',
  fileType: 'directory' as const,
  onClose: () => {},
  onRename: () => {},
  onDelete: () => {},
};

describe('FileContextMenu Japanese localization', () => {
  it('localizes file and folder creation and history actions', () => {
    renderJapanese(
      <FileContextMenu {...baseProps} onNewFile={() => {}} onNewFolder={() => {}} onViewWorkspaceHistory={() => {}} />,
    );

    expect(screen.getByText('Markdownファイルを新規作成')).toBeDefined();
    expect(screen.getByText('ファイルを新規作成...')).toBeDefined();
    expect(screen.getByText('フォルダーを新規作成')).toBeDefined();
    expect(screen.getByText('フォルダーの履歴を表示...')).toBeDefined();
  });

  it('localizes detaching a workspace folder', () => {
    renderJapanese(
      <FileContextMenu
        {...baseProps}
        isWorkspaceRoot
        onDetachFolder={() => {}}
      />,
    );

    expect(screen.getByText('ワークスペースからフォルダーを切り離す')).toBeDefined();
  });
});
