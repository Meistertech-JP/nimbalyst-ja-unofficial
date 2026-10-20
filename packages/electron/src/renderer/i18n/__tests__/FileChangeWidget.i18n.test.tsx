import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { FileChangeWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/FileChangeWidget';
import { noopInteractiveWidgetHost } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/InteractiveWidgetHost';
import { interactiveWidgetHostAtom } from '../../../../../runtime/src/store/atoms/interactiveWidgetHost';
import type { TranscriptViewMessage } from '../../../../../runtime/src/ai/server/types';

const locale = i18next.createInstance();
let store: ReturnType<typeof createStore>;
const readFile = vi.fn();
const openFile = vi.fn();
const toggle = vi.fn();
type Props = React.ComponentProps<typeof FileChangeWidget>;
type Change = { path: string; kind: string };
const change: Change = { path: '/repo/raw.md', kind: 'update' };
function message(changes: Change[] = [change], result: unknown = 'completed'): TranscriptViewMessage {
  return { id: 1, sequence: 1, type: 'tool_call', subagentId: null, createdAt: new Date(1000), toolCall: {
    toolName: 'file_change', toolDisplayName: 'file_change', status: 'completed', description: null,
    arguments: { changes }, targetFilePath: null, mcpServer: null, mcpTool: null, providerToolCallId: 'raw-tool', progress: [],
    // Legacy snapshots have an object result; the widget explicitly still accepts this shape.
    result: result as string,
  } };
}
function localized(props: Partial<Props> = {}, language = 'ja') {
  const t = locale.getFixedT(language);
  return <JotaiProvider store={store}><RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>
    <FileChangeWidget sessionId="file-i18n" message={message()} isExpanded onToggle={toggle} workspacePath="/repo" {...props} />
  </RuntimeTranslationProvider></JotaiProvider>;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  store = createStore();
  readFile.mockReset(); openFile.mockReset(); toggle.mockReset();
  store.set(interactiveWidgetHostAtom('file-i18n'), { ...noopInteractiveWidgetHost, openFile });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('file change summaries', () => {
  it.each([
    ['create', 'Created', '作成済み'], ['delete', 'Deleted', '削除済み'], ['update', 'Updated', '更新済み'], ['future-kind', 'Updated', '更新済み'],
  ])('preserves paths and fallback classification for %s', (kind, english, japanese) => {
    const changes = [{ ...change, kind }];
    const props = { message: message(changes), isExpanded: false };
    const view = render(localized(props, 'en'));
    expect(screen.getByRole('button', { name: `${english} raw.md` })).toBeTruthy();
    view.rerender(localized(props));
    fireEvent.click(screen.getByRole('button', { name: `raw.mdを${japanese}` }));
    expect(toggle).toHaveBeenCalledTimes(1);
    view.rerender(localized({ ...props, message: message([...changes, { path: '/repo/second.md', kind }]) }));
    expect(screen.getByText(`ファイル2件を${japanese}`)).toBeTruthy();
    expect(screen.getByText('raw.md, second.md')).toBeTruthy();
    expect(changes[0].kind).toBe(kind);
  });

  it('distinguishes empty and mixed-kind summaries', () => {
    const view = render(localized({ message: message([]), isExpanded: false }));
    expect(screen.getByText('ファイルの変更はありません')).toBeTruthy();
    view.rerender(localized({ message: message([change, { path: '/repo/new.md', kind: 'create' }]), isExpanded: false }));
    expect(screen.getByText('ファイル2件を変更')).toBeTruthy();
  });

  it('keeps hooks stable through missing tool data and localizes the running timer', () => {
    vi.spyOn(Date, 'now').mockReturnValue(6000);
    const missing = { ...message(), toolCall: undefined };
    const view = render(localized({ message: missing }));
    expect(view.container.textContent).toBe('');
    view.rerender(localized({ message: message([change], null) }, 'en'));
    expect(screen.getByText('Running')).toBeTruthy();
    expect(screen.getByText('5s')).toBeTruthy();
    view.rerender(localized({ message: message([change], null) }));
    expect(screen.getByText('実行中')).toBeTruthy();
    expect(screen.getByText('5秒')).toBeTruthy();
    view.rerender(localized({ message: missing }));
    expect(view.container.textContent).toBe('');
  });
});

describe('file preview state and navigation', () => {
  it('opens the original absolute path without triggering a preview read', () => {
    render(localized({ readFile }));
    fireEvent.click(screen.getByTitle('raw.mdを開く'));
    expect(openFile).toHaveBeenCalledExactlyOnceWith('/repo/raw.md');
    expect(readFile).not.toHaveBeenCalled();
    expect(screen.queryByText('スナップショットを利用できません')).toBeNull();
    expect(toggle).not.toHaveBeenCalled();
  });

  it.each([
    ['binary', 'Binary file - content cannot be displayed', 'バイナリファイルのため内容を表示できません'],
    ['deleted', 'File was deleted', 'ファイルは削除されました'],
    ['missing', 'Snapshot unavailable', 'スナップショットを利用できません'],
    ['error', 'Raw snapshot error', 'Raw snapshot error'],
  ])('retains selected %s snapshot through locale switches', (kind, english, japanese) => {
    const selected = { ...change, kind: kind === 'deleted' ? 'delete' : 'update' };
    const result = kind === 'missing' ? 'completed' : { fileSnapshots: { [change.path]: { content: null, isBinary: kind === 'binary', error: kind === 'error' ? english : undefined } } };
    const props = { message: message([selected], result) };
    const view = render(localized(props, 'en'));
    fireEvent.click(screen.getByRole('button', { name: /raw.md/ }));
    expect(screen.getByText(english)).toBeTruthy();
    view.rerender(localized(props));
    expect(screen.getByText(japanese)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /raw.md/ }));
    expect(screen.queryByText(japanese)).toBeNull();
  });

  it('keeps snapshot precedence, content expansion and raw contents', () => {
    const raw = Array.from({ length: 28 }, (_, index) => `raw ${index}`).join('\n');
    const props = { readFile, message: message([change], { fileSnapshots: { [change.path]: { content: raw, truncated: true } } }) };
    const view = render(localized(props, 'en'));
    fireEvent.click(screen.getByRole('button', { name: /raw.md/ }));
    expect(screen.getByText('File truncated at 100KB')).toBeTruthy();
    expect(view.container.querySelector('pre')?.textContent?.split('\n')).toHaveLength(25);
    fireEvent.click(screen.getByRole('button', { name: 'Show 3 more lines' }));
    view.rerender(localized(props));
    expect(screen.getByText('ファイルは100KBで切り詰められています')).toBeTruthy();
    expect(view.container.querySelector('pre')?.textContent).toBe(raw);
    fireEvent.click(screen.getByRole('button', { name: '表示を減らす' }));
    expect(screen.getByRole('button', { name: '残り3行を表示' })).toBeTruthy();
    expect(readFile).not.toHaveBeenCalled();
  });

  it('keeps an in-flight live read and caches the original returned contents', async () => {
    let finish!: (value: { success: boolean; content: string }) => void;
    readFile.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const props = { readFile, message: message() };
    const view = render(localized(props, 'en'));
    fireEvent.click(screen.getByRole('button', { name: /raw.md/ }));
    view.rerender(localized(props));
    expect(readFile).toHaveBeenCalledExactlyOnceWith('/repo/raw.md');
    await act(async () => finish({ success: true, content: 'Raw live file' }));
    expect(screen.getByText('現在のファイルを表示しています（スナップショットなし）')).toBeTruthy();
    expect(screen.getByText('Raw live file')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /raw.md/ }));
    fireEvent.click(screen.getByRole('button', { name: /raw.md/ }));
    expect(screen.getByText('Raw live file')).toBeTruthy();
    expect(readFile).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('translates app-owned read failures only (external error=%s)', external => {
    readFile.mockImplementation(async () => {
      if (external) return { success: false, error: 'Raw read error' };
      throw new Error('Internal exception');
    });
    return (async () => {
      const props = { readFile, message: message() };
      const view = render(localized(props, 'en'));
      fireEvent.click(screen.getByRole('button', { name: /raw.md/ }));
      await screen.findByText(external ? 'Raw read error' : 'Failed to read file');
      view.rerender(localized(props));
      expect(screen.getByText(external ? 'Raw read error' : 'ファイルを読み込めませんでした')).toBeTruthy();
      await waitFor(() => expect(readFile).toHaveBeenCalledTimes(1));
    })();
  });
});
