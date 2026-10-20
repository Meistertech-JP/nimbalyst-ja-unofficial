import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_EMBED_COMMAND, LexicalAutoEmbedPlugin } from '@lexical/react/LexicalAutoEmbedPlugin';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { $createCodeNode, CodeNode } from '@lexical/code';
import { $createTextNode, $getRoot, createEditor, type LexicalEditor } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import AutoEmbedPlugin, { AutoEmbedDialog, EmbedConfigs, YoutubeEmbedConfig, TwitterEmbedConfig, FigmaEmbedConfig } from '../../../../../runtime/src/editor/plugins/AutoEmbedPlugin';
import { CopyButton } from '../../../../../runtime/src/editor/plugins/CodeActionMenuPlugin/components/CopyButton';
import { copyToClipboard } from '../../../../../runtime/src/utils/clipboard';

let embedProps: React.ComponentProps<typeof LexicalAutoEmbedPlugin>;
// Observe the real Lexical plugin's public callback contract without replacing its command/listener behavior.
vi.mock('@lexical/react/LexicalAutoEmbedPlugin', async importOriginal => {
  const actual = await importOriginal<typeof import('@lexical/react/LexicalAutoEmbedPlugin')>();
  return { ...actual, LexicalAutoEmbedPlugin: (props: React.ComponentProps<typeof actual.LexicalAutoEmbedPlugin>) => {
    embedProps = props;
    return <actual.LexicalAutoEmbedPlugin {...props} />;
  } };
});
vi.mock('../../../../../runtime/src/utils/clipboard', () => ({ copyToClipboard: vi.fn() }));

const locale = i18next.createInstance();
let editor: LexicalEditor;
const roots: Array<{ editor: LexicalEditor; root: HTMLElement }> = [];
function CaptureEditor() {
  [editor] = useLexicalComposerContext();
  return null;
}
const config = { namespace: 'embed-i18n', nodes: [LinkNode, AutoLinkNode], onError: (error: Error) => { throw error; } };
function localized(children: React.ReactNode, language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider>;
}
function embedded(language = 'ja', children = <AutoEmbedPlugin />) {
  return localized(<LexicalComposer initialConfig={config}><CaptureEditor />{children}</LexicalComposer>, language);
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  vi.mocked(copyToClipboard).mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  for (const entry of roots.splice(0)) { entry.editor.setRootElement(null); entry.root.remove(); }
  vi.useRealTimers(); vi.restoreAllMocks();
});

describe('embed dialogs, titles and option identities', () => {
  it.each([
    ['YouTube', YoutubeEmbedConfig, 'Embed Youtube Video', 'YouTube動画を埋め込む'],
    ['Figma', FigmaEmbedConfig, 'Embed Figma Document', 'Figmaドキュメントを埋め込む'],
    ['X', TwitterEmbedConfig, 'Embed X(Tweet)', 'X(Tweet)を埋め込む'],
  ] as const)('retains an open %s dialog/input while its title and controls change language', async (_name, embedConfig, english, japanese) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const view = render(embedded('en'));
    act(() => { editor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type); });
    expect(screen.getByRole('heading', { name: english })).toBeTruthy();
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.placeholder).toBe(embedConfig.exampleUrl);
    expect((screen.getByRole('button', { name: 'Embed' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: embedConfig.exampleUrl } });
    view.rerender(embedded());
    expect(screen.getByRole('heading', { name: japanese })).toBeTruthy();
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input.value).toBe(embedConfig.exampleUrl);
    await waitFor(() => expect((screen.getByRole('button', { name: '埋め込む' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: '埋め込む' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    // These upstream insert stubs are intentionally retained; localization must not invent an implementation.
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('preserves invalid URL guards and Escape closes the stored modal after a locale switch', async () => {
    const view = render(embedded('en'));
    act(() => { editor.dispatchCommand(INSERT_EMBED_COMMAND, 'youtube-video'); });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'not a URL /literal' } });
    view.rerender(embedded());
    await new Promise(resolve => setTimeout(resolve, 250));
    expect((screen.getByRole('button', { name: '埋め込む' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps async parsing and insertion payloads with a custom provider', async () => {
    let resolve!: (result: { id: string; url: string }) => void;
    const parseUrl = vi.fn(() => new Promise<{ id: string; url: string }>(done => { resolve = done; }));
    const insertNode = vi.fn();
    const close = vi.fn();
    const custom = { ...YoutubeEmbedConfig, type: 'custom-provider', contentName: 'Raw custom provider', parseUrl, insertNode };
    const content = <AutoEmbedDialog embedConfig={custom} onClose={close} />;
    const view = render(embedded('en', content));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com/raw' } });
    await waitFor(() => expect(parseUrl).toHaveBeenCalledExactlyOnceWith('https://example.com/raw'));
    view.rerender(embedded('ja', content));
    expect((screen.getByRole('button', { name: '埋め込む' }) as HTMLButtonElement).disabled).toBe(true);
    const result = { id: 'raw-id', url: 'https://example.com/raw' };
    await act(async () => resolve(result));
    fireEvent.click(screen.getByRole('button', { name: '埋め込む' }));
    expect(insertNode).toHaveBeenCalledExactlyOnceWith(editor, result);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each(EmbedConfigs)('translates menu titles without changing selection keys or callbacks: $type', embedConfig => {
    const embed = vi.fn(); const dismiss = vi.fn();
    const view = render(embedded('en'));
    const english = embedProps.getMenuOptions(embedConfig, embed, dismiss);
    view.rerender(embedded());
    const japanese = embedProps.getMenuOptions(embedConfig, embed, dismiss);
    expect(japanese.map(option => option.key)).toEqual(english.map(option => option.key));
    expect(japanese.map(option => option.key)).toEqual(['Dismiss', `Embed ${embedConfig.contentName}`]);
    expect(japanese[0].title).toBe(locale.getFixedT('ja')('common:dismiss'));
    expect(japanese[1].title).toContain('を埋め込む');
    japanese[0].onSelect(null); japanese[1].onSelect(null);
    expect(dismiss).toHaveBeenCalledTimes(1); expect(embed).toHaveBeenCalledTimes(1);
    expect(embedProps.embedConfigs).toBe(EmbedConfigs);
  });

  it('preserves unknown/custom content names in modal and option captions', () => {
    const custom = { ...YoutubeEmbedConfig, type: 'custom', contentName: 'Raw custom name' };
    render(embedded());
    act(() => embedProps.onOpenEmbedModalForConfig(custom));
    expect(screen.getByRole('heading', { name: 'Raw custom nameを埋め込む' })).toBeTruthy();
    const options = embedProps.getMenuOptions(custom, () => {}, () => {});
    expect(options[1].title).toBe('Raw custom nameを埋め込む');
    expect(custom.contentName).toBe('Raw custom name');
  });
});

describe('localized code copying with real Lexical nodes', () => {
  function createCode() {
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor({ namespace: 'copy-i18n', nodes: [CodeNode], onError: error => { throw error; } });
    editor.setRootElement(root); roots.push({ editor, root });
    editor.update(() => { $getRoot().append($createCodeNode('javascript').append($createTextNode('const raw = "Original";\n// Raw comment'))); }, { discrete: true });
    return { editor, getCodeDOMNode: () => root.querySelector('code') };
  }

  it('retains raw copied text and the success timer during a locale switch', async () => {
    vi.useFakeTimers();
    const props = createCode();
    const child = <CopyButton {...props} />;
    const view = render(localized(child, 'en'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy' })));
    expect(copyToClipboard).toHaveBeenCalledExactlyOnceWith('const raw = "Original";\n// Raw comment');
    expect(view.container.querySelector('.format.success')).toBeTruthy();
    view.rerender(localized(child));
    expect(screen.getByRole('button', { name: locale.getFixedT('ja')('common:copy') })).toBeTruthy();
    expect(view.container.querySelector('.format.success')).toBeTruthy();
    act(() => vi.advanceTimersByTime(1000));
    expect(view.container.querySelector('.format.copy')).toBeTruthy();
    expect(copyToClipboard).toHaveBeenCalledTimes(1);
  });

  it('keeps the original clipboard failure handling and missing-code guard', async () => {
    const props = createCode();
    const failure = new Error('Raw clipboard failure');
    vi.mocked(copyToClipboard).mockRejectedValue(failure);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const view = render(localized(<CopyButton {...props} />));
    await act(async () => fireEvent.click(screen.getByRole('button')));
    expect(error).toHaveBeenCalledWith('Failed to copy: ', failure);
    expect(view.container.querySelector('.format.success')).toBeNull();
    view.rerender(localized(<CopyButton editor={props.editor} getCodeDOMNode={() => null} />));
    await act(async () => fireEvent.click(screen.getByRole('button')));
    expect(copyToClipboard).toHaveBeenCalledTimes(1);
  });
});
