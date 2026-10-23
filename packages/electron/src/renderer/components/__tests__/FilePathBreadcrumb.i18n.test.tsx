// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { FilePathBreadcrumb } from '../common/FilePathBreadcrumb';

afterEach(cleanup);

it('localizes the file-tree breadcrumb tooltip', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      <Provider>
        <FilePathBreadcrumb filePath="C:/workspace/docs/readme.md" workspacePath="C:/workspace" />
      </Provider>
    </UiLanguageProvider>,
  );

  expect(screen.getByText('docs').getAttribute('title')).toBe('ファイルツリーでdocsを開く');
  expect(screen.getByText('readme.md').getAttribute('title')).toBe('ファイルツリーでreadme.mdを開く');
});
