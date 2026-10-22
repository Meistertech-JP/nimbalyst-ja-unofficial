/**
 * An HTML page embed is live before it is selected: no shield sits over it
 * and its editor is not inert, so a reader clicks straight into the page.
 * Every other page embed keeps the click-to-select shield.
 */

import React from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

import { EmbedChrome, EmbedFrameShell } from '../EmbedFrameShell';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
  englishI18n = await createI18nInstance('en');
});

function renderJapanese(node: React.ReactNode) {
  return render(
    <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
      {node}
    </UiLanguageProvider>,
  );
}

function renderShell(interactive: boolean, attrs: Record<string, string> = {}) {
  return render(
    <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
      <LexicalComposer initialConfig={{ namespace: 'embed-shell-test', onError: (error) => { throw error; } }}>
        <EmbedFrameShell
          nodeKey="missing"
          attrs={attrs}
          label="Map"
          displayName="Map.html"
          onOpen={() => {}}
          markers={{}}
          loadingText="Loading"
          interactive={interactive}
        >
          <button type="button">inside</button>
        </EmbedFrameShell>
      </LexicalComposer>
    </UiLanguageProvider>,
  );
}

describe('EmbedFrameShell', () => {
  it('localizes embed chrome controls and accessibility labels', () => {
    renderJapanese(
      <EmbedChrome
        relativePath="Map.html"
        absolutePath={null}
        label="Map preview"
        isReadOnly
        isDirty
        onToggleReadOnly={() => {}}
        onEditClick={() => {}}
      />,
    );

    expect(screen.getByText('ファイルを開く')).toBeDefined();
    expect(screen.getByTitle('新しいタブでファイルを開く')).toBeDefined();
    expect(screen.getByTitle('未保存の変更 — 自動保存中')).toBeDefined();
    expect(screen.getByLabelText('未保存の変更')).toBeDefined();
    expect(screen.getByTitle('埋め込みファイルに自動保存しながら編集')).toBeDefined();
    expect(screen.getByTitle('リンクラベル: Map preview')).toBeDefined();
  });

  it('leaves an interactive embed reachable without selecting it', () => {
    const { queryByTestId, container } = renderShell(true);
    expect(queryByTestId('embed-frame-shield')).toBeNull();
    expect(container.querySelector('.embed-frame__editor-host')!.hasAttribute('inert')).toBe(false);
  });

  it('keeps the click-to-select shield on other embeds', () => {
    const { queryByTestId, container } = renderShell(false);
    expect(queryByTestId('embed-frame-shield')).not.toBeNull();
    expect(container.querySelector('.embed-frame__editor-host')!.hasAttribute('inert')).toBe(true);
  });

  // F-R1-3: an HTML page embed with no `height=` grows to its content.
  it('lets an interactive embed without a height follow its content', () => {
    const { container } = renderShell(true);
    const body = container.querySelector<HTMLElement>('.embed-frame__body')!;
    expect(body.style.height).toBe('');
    expect(body.classList.contains('embed-frame__body--fit')).toBe(true);
  });

  it('keeps a set height, and the default height for other embeds', () => {
    expect(renderShell(true, { height: '300' }).container.querySelector<HTMLElement>('.embed-frame__body')!.style.height).toBe('300px');
    expect(renderShell(false).container.querySelector<HTMLElement>('.embed-frame__body')!.style.height).toBe('400px');
  });
});
