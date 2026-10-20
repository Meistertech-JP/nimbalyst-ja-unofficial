import React from 'react';
import i18next from 'i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { EditToolResultCard } from '../../../../../runtime/src/ui/AgentTranscript/components/EditToolResultCard';
import { ToolCallChanges } from '../../../../../runtime/src/ui/AgentTranscript/components/ToolCallChanges';
import { NewFilePreview } from '../../../../../runtime/src/ui/AgentTranscript/components/NewFilePreview';
import type { TranscriptViewMessage, ToolCallDiffResult } from '../../../../../runtime/src/ai/server/transcript/TranscriptProjector';

const locale = i18next.createInstance();
const openFile = vi.fn();
function localized(children: React.ReactNode, language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider>;
}
function message(result: string | null | undefined, isError = false): TranscriptViewMessage {
  return { id: 1, sequence: 1, type: 'tool_call', subagentId: null, createdAt: new Date(1000), isError, toolCall: {
    toolName: 'file_change', toolDisplayName: 'file_change', status: 'completed', description: null,
    arguments: { file_path: '/repo/raw.txt', instruction: 'Raw instruction' }, targetFilePath: null, mcpServer: null, mcpTool: null,
    // Include legacy null results to test the existing pending-result guard.
    providerToolCallId: 'raw-tool', progress: [], result: result as string | undefined,
  } };
}
beforeEach(async () => { await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } }); openFile.mockReset(); });
afterEach(cleanup);

describe('edit result outcome and language', () => {
  it.each([undefined, null, ''])('keeps pending before a result (%s), then displays the actual outcome', result => {
    const edits = [{ file_path: '/repo/raw.txt', content: 'raw line 1\nraw line 2' }];
    const content = <EditToolResultCard toolMessage={message(result)} edits={edits} workspacePath="/repo" onOpenFile={openFile} />;
    const view = render(localized(content, 'en'));
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.queryByText('Created')).toBeNull();
    view.rerender(localized(content));
    expect(screen.getByText('保留中')).toBeTruthy();
    expect(screen.getByText('指示')).toBeTruthy();
    expect(screen.getByText('Raw instruction')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'ファイルを開く' }));
    expect(openFile).toHaveBeenCalledExactlyOnceWith('/repo/raw.txt');
    view.rerender(localized(<EditToolResultCard toolMessage={message('raw success')} edits={edits} />));
    expect(screen.getByText('作成済み')).toBeTruthy();
    expect(screen.queryByText('保留中')).toBeNull();
    view.rerender(localized(<EditToolResultCard toolMessage={message('raw failure', true)} edits={edits} />));
    expect(screen.getByText('失敗')).toBeTruthy();
    expect(screen.queryByText('作成済み')).toBeNull();
  });

  it('translates applied/count labels and file-change names without changing the raw edit', () => {
    const edits = [{ file_path: '/repo/raw.txt', old_string: 'Old raw', new_string: 'New raw' }];
    const content = <EditToolResultCard toolMessage={message('success')} edits={edits} />;
    const view = render(localized(content, 'en'));
    expect(screen.getByText('1 edit')).toBeTruthy();
    expect(screen.getByText('Applied')).toBeTruthy();
    view.rerender(localized(content));
    expect(screen.getByText('適用済み')).toBeTruthy();
    expect(screen.getByText('1件の編集')).toBeTruthy();
    expect(view.container.textContent).toContain('Old raw');
    expect(view.container.textContent).toContain('New raw');
    expect(edits[0].new_string).toBe('New raw');
  });

  it('retains embedded preview precedence and its expansion/path parameters', () => {
    const embedded = vi.fn(({ filePath }: { filePath: string }) => <div data-testid="embedded-preview">{filePath}</div>);
    const edits = [{ file_path: '/repo/drawing.custom', content: 'raw content hidden by embedded preview' }];
    const content = <EditToolResultCard toolMessage={message('success')} edits={edits} canEmbedFile={() => true} renderEmbeddedFile={embedded} />;
    const view = render(localized(content, 'en'));
    const preview = screen.getByTestId('embedded-preview');
    view.rerender(localized(content));
    expect(screen.getByTestId('embedded-preview')).toBe(preview);
    expect(embedded).toHaveBeenLastCalledWith({ filePath: '/repo/drawing.custom', defaultExpanded: true });
    expect(view.container.querySelector('.new-file-preview')).toBeNull();
    expect(view.container.textContent).not.toContain('raw content hidden');
  });
});

describe('new file preview', () => {
  it('keeps expansion and raw source through language switches', () => {
    const raw = Array.from({ length: 35 }, (_, i) => `Raw row ${i}`).join('\n');
    const content = <NewFilePreview content={raw} filePath="raw.txt" absoluteFilePath="/repo/raw.txt" onOpenFile={openFile} />;
    const view = render(localized(content, 'en'));
    expect(screen.getByText('35 lines')).toBeTruthy();
    expect(view.container.querySelector('code')?.textContent).not.toContain('Raw row 34');
    view.rerender(localized(content));
    fireEvent.click(screen.getByRole('button', { name: '全35行を表示' }));
    expect(view.container.querySelector('code')?.textContent).toBe(raw);
    fireEvent.click(screen.getByTitle('/repo/raw.txtを開く'));
    expect(openFile).toHaveBeenCalledExactlyOnceWith('/repo/raw.txt');
    view.rerender(localized(content, 'en'));
    expect(view.container.querySelector('code')?.textContent).toBe(raw);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
    expect(view.container.querySelector('code')?.textContent).not.toContain('Raw row 34');
  });

  it('keeps markdown/frontmatter handling and a singular English line count', () => {
    const view = render(localized(<NewFilePreview content={'---\nraw: secret-frontmatter\n---\n# Raw heading'} filePath="raw.md" />));
    expect(screen.getByRole('heading', { name: 'Raw heading' })).toBeTruthy();
    expect(view.container.textContent).not.toContain('secret-frontmatter');
    view.rerender(localized(<NewFilePreview content="Raw line" filePath="raw.txt" />, 'en'));
    expect(screen.getByText('1 line')).toBeTruthy();
  });
});

describe('resolved tool changes', () => {
  it.each([['create', '作成済み'], ['delete', '削除済み'], ['bash', 'シェル'], ['edit', '編集済み'], ['custom-operation', '編集済み']])('preserves expanded %s rows, stats and original path callbacks', (operation, label) => {
    const diffs: ToolCallDiffResult[] = [{ operation, filePath: '/repo/raw.txt', diffs: [], linesAdded: 2, linesRemoved: 1 }];
    const content = <ToolCallChanges diffs={diffs} isExpanded workspacePath="/repo" onOpenFile={openFile} />;
    const view = render(localized(content, 'en'));
    fireEvent.click(screen.getByRole('button', { name: /^File Changes \(1 file changed \+2 -1\)$/ }));
    view.rerender(localized(content));
    expect(screen.getByRole('button', { name: /^ファイルの変更 \(1件のファイルを変更 \+2 -1\)$/ })).toBeTruthy();
    expect(screen.getByText(label)).toBeTruthy();
    fireEvent.click(screen.getByTitle('raw.txtを開く'));
    expect(openFile).toHaveBeenCalledExactlyOnceWith('/repo/raw.txt');
    expect(diffs[0].operation).toBe(operation);
  });

  it('does not render hidden/empty diffs and retains multiple-file count semantics', () => {
    const diffs: ToolCallDiffResult[] = [{ operation: 'edit', filePath: '/repo/a.txt', diffs: [] }, { operation: 'delete', filePath: '/repo/b.txt', diffs: [] }];
    const view = render(localized(<ToolCallChanges diffs={diffs} isExpanded={false} />));
    expect(view.container.textContent).toBe('');
    view.rerender(localized(<ToolCallChanges diffs={[]} isExpanded />));
    expect(view.container.textContent).toBe('');
    view.rerender(localized(<ToolCallChanges diffs={diffs} isExpanded />, 'en'));
    expect(screen.getByRole('button', { name: /^File Changes \(2 files changed\)$/ })).toBeTruthy();
  });
});
