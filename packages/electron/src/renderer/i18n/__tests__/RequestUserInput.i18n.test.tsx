import React from 'react';
import i18next from 'i18next';
import { createStore, Provider } from 'jotai';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $createParagraphNode, $createTextNode, $getRoot, getNearestEditorFromDOMNode } from 'lexical';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { RequestUserInputWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/RequestUserInputWidget';
import type { CustomToolWidgetProps } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets';
import type { InteractiveWidgetHost } from '../../../../../runtime/src/ui/AgentTranscript/components/CustomToolWidgets/InteractiveWidgetHost';
import type { RequestUserInputField } from '../../../../../runtime/src/ai/server/providers/shared/requestUserInputTypes';
import { interactiveWidgetHostAtom } from '../../../../../runtime/src/store/atoms/interactiveWidgetHost';
import { clearRequestUserInputDraft } from '../../../../../runtime/src/store/atoms/requestUserInputDraft';

const locale = i18next.createInstance();
let testStore: ReturnType<typeof createStore>;
const submit = vi.fn();
const cancel = vi.fn();
const host = { requestUserInputSubmit: submit, requestUserInputCancel: cancel } as unknown as InteractiveWidgetHost;
let promptNumber = 0;
const promptIds: string[] = [];
const items = [
  { id: 'raw-a', title: 'Original A', removable: true },
  { id: 'raw-b', title: 'Original B', removable: true },
  { id: 'raw-c', title: 'Original C', removable: true },
];
function message(fields: RequestUserInputField[], args: object = {}, result?: string): CustomToolWidgetProps['message'] {
  const promptId = `request-i18n-${++promptNumber}`;
  promptIds.push(promptId);
  return {
    id: promptNumber, sequence: promptNumber, type: 'tool_call', subagentId: null, createdAt: new Date(),
    toolCall: {
      toolName: 'RequestUserInput', providerToolCallId: promptId, status: result ? 'completed' : 'running', result,
      toolDisplayName: 'RequestUserInput', description: null, targetFilePath: null, mcpServer: null, mcpTool: null, progress: [],
      arguments: { fields, ...args },
    },
  };
}
function localized(data: CustomToolWidgetProps['message'], language = 'ja') {
  const translate = locale.getFixedT(language);
  return <Provider store={testStore}><RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => translate(key, { ...params, defaultValue }) }}>
    <RequestUserInputWidget message={data} sessionId="input-i18n" isExpanded onToggle={() => {}} />
  </RuntimeTranslationProvider></Provider>;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  testStore = createStore();
  submit.mockReset().mockResolvedValue(undefined);
  cancel.mockReset().mockResolvedValue(undefined);
  testStore.set(interactiveWidgetHostAtom('input-i18n'), host);
});
afterEach(() => {
  cleanup();
  for (const id of promptIds.splice(0)) clearRequestUserInputDraft(id);
  vi.restoreAllMocks();
});

describe('RequestUserInput localization', () => {
  it('keeps selections, Other draft and confirmation on language switch and submits protocol IDs', async () => {
    const data = message([
      { type: 'multiSelect', id: 'multi', label: 'Original checklist', items, minSelected: 1, maxSelected: 2 },
      { type: 'singleSelect', id: 'single', label: 'Original question', options: [{ id: 'raw-option', label: 'Original option' }], allowOther: true },
      { type: 'confirm', id: 'confirm', label: 'Original confirmation' },
    ], { title: 'Custom title', intro: 'Custom introduction' });
    const view = render(localized(data, 'en'));
    expect((screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Original A'));
    fireEvent.click(screen.getByRole('button', { name: 'Other' }));
    const input = screen.getByPlaceholderText('Type your answer...') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '  Original answer /literal  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    view.rerender(localized(data));
    expect(screen.getByText('Custom title')).toBeTruthy();
    expect(screen.getByText('Custom introduction')).toBeTruthy();
    expect(screen.getByText('1～2件選択')).toBeTruthy();
    expect(screen.getByPlaceholderText('回答を入力...')).toBe(input);
    expect(input.value).toBe('  Original answer /literal  ');
    expect(screen.getByRole('button', { name: 'はい' })).toBeTruthy();
    expect(screen.getAllByTestId('request-user-input-multiselect-row')[0].getAttribute('data-selected')).toBe('true');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '確認' })); });
    expect(submit).toHaveBeenCalledExactlyOnceWith(data.toolCall!.providerToolCallId, {
      multi: { type: 'multiSelect', selectedIds: ['raw-a'] },
      single: { type: 'singleSelect', selectedId: '__other__', otherText: 'Original answer /literal' },
      confirm: { type: 'confirm', value: true },
    });
    expect(screen.getByTestId('request-user-input-completed').textContent).toContain('送信済み');
    expect(screen.getByText('Original answer /literal')).toBeTruthy();
    view.rerender(localized(data, 'en'));
    expect(screen.getByTestId('request-user-input-completed').textContent).toContain('Submitted');
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ minSelected: 1 }, '1件以上選択', 'Pick at least 1'],
    [{ maxSelected: 2 }, '2件まで選択', 'Pick up to 2'],
    [{}, '任意の項目を選択', 'Pick any subset'],
  ])('translates selection constraints %j without changing validation', (limits, ja, en) => {
    const data = message([{ type: 'multiSelect', id: 'multi', label: 'Original label', items, ...limits }]);
    const view = render(localized(data));
    expect(screen.getByText(ja)).toBeTruthy();
    view.rerender(localized(data, 'en'));
    expect(screen.getByText(en)).toBeTruthy();
  });

  it('preserves custom button labels and original option IDs', async () => {
    const data = message([{ type: 'singleSelect', id: 'choice', label: 'Original label', options: [{ id: 'raw-id', label: 'Original option' }] }], { submitLabel: 'Custom submit', cancelLabel: 'Custom cancel' });
    render(localized(data));
    expect(screen.getByText('1つ選択')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Custom cancel' })).toBeTruthy();
    fireEvent.click(screen.getByText('Original option'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Custom submit' })); });
    expect(submit).toHaveBeenCalledExactlyOnceWith(data.toolCall!.providerToolCallId, { choice: { type: 'singleSelect', selectedId: 'raw-id' } });
    expect(screen.getByText('入力を送信しました')).toBeTruthy();
  });

  it('preserves reorder removals and minimum constraints across locale changes', async () => {
    const data = message([{ type: 'reorder', id: 'order', label: 'Original order', items, minItems: 1 }]);
    const view = render(localized(data));
    expect(screen.getByText('3件（最低1件）')).toBeTruthy();
    const handle = screen.getAllByRole('button', { name: 'ドラッグして並べ替え' })[0];
    expect(handle.getAttribute('aria-roledescription')).toBe('並べ替え可能');
    const instructionsId = handle.getAttribute('aria-describedby')!;
    expect(document.getElementById(instructionsId)?.textContent).toContain('スペースキー');
    fireEvent.click(screen.getAllByRole('button', { name: '項目を削除' })[0]);
    expect(screen.getByText('削除済み: 1件')).toBeTruthy();
    view.rerender(localized(data, 'en'));
    expect(screen.getByText('Removed: 1 item')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Drag to reorder' })[0].getAttribute('aria-roledescription')).toBe('sortable');
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove item' })[0]);
    expect(screen.getByText('Removed: 2 items')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Remove item' }) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(localized(data));
    expect(screen.getByText('削除済み: 2件')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '確認' })); });
    expect(submit).toHaveBeenCalledExactlyOnceWith(data.toolCall!.providerToolCallId, {
      order: { type: 'reorder', orderedIds: ['raw-c'], removedIds: ['raw-a', 'raw-b'] },
    });
    expect(screen.getByText('Original C')).toBeTruthy();
    expect(screen.getByText('削除済み: 2件')).toBeTruthy();
  });

  it('localizes keyboard drag announcements and retains cancellation behavior', async () => {
    render(localized(message([{ type: 'reorder', id: 'order', label: 'Order', items }])));
    const handle = screen.getAllByRole('button', { name: 'ドラッグして並べ替え' })[0];
    act(() => handle.focus());
    fireEvent.keyDown(handle, { code: 'Space', key: ' ' });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('項目raw-a'));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    fireEvent.keyDown(document, { code: 'Escape', key: 'Escape' });
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('ドラッグをキャンセルし、項目raw-aを離しました。'));
    expect(screen.getAllByTestId('request-user-input-reorder-row').map(row => row.getAttribute('data-item-id'))).toEqual(['raw-a', 'raw-b', 'raw-c']);
  });

  it.each(['plain', 'markdown'] as const)('retains real Lexical %s edits across language switch', async format => {
    const data = message([{ type: 'editText', id: 'text', label: 'Original text', initialText: 'Original draft', format, maxLength: 100 }]);
    const view = render(localized(data));
    const editable = screen.getByRole('textbox', { name: 'テキストを編集' });
    const editor = getNearestEditorFromDOMNode(editable);
    if (!editor) throw new Error('Expected a mounted Lexical editor');
    await act(async () => { editor.update(() => { $getRoot().clear().append($createParagraphNode().append($createTextNode('User text /literal'))); }); });
    await waitFor(() => expect(screen.getByText('• 下書きから変更済み')).toBeTruthy());
    expect(view.container.textContent).toContain('18文字');
    expect(view.container.textContent).toContain('最大100文字');
    if (format === 'markdown') {
      expect(screen.getByRole('button', { name: '太字' })).toBeTruthy();
      expect(screen.getByRole('button', { name: '斜体' })).toBeTruthy();
      expect(screen.getByRole('button', { name: '下線' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'コード' })).toBeTruthy();
    }
    view.rerender(localized(data, 'en'));
    expect(screen.getByRole('textbox', { name: 'Edit text' })).toBe(editable);
    expect(editable.textContent).toBe('User text /literal');
    expect(screen.getByText('• edited from draft')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirm' })); });
    expect(submit).toHaveBeenCalledExactlyOnceWith(data.toolCall!.providerToolCallId, { text: { type: 'editText', text: 'User text /literal', edited: true } });
    view.rerender(localized(data));
    expect(screen.getByText('下書きから変更済み')).toBeTruthy();
  });

  it('localizes host-unavailable and cancellation states', async () => {
    const data = message([{ type: 'confirm', id: 'confirm', label: 'Original confirm' }]);
    testStore.set(interactiveWidgetHostAtom('input-i18n'), null);
    render(localized(data));
    expect(screen.getByText('待機中...')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    act(() => { testStore.set(interactiveWidgetHostAtom('input-i18n'), host); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'キャンセル' })); });
    expect(cancel).toHaveBeenCalledExactlyOnceWith(data.toolCall!.providerToolCallId);
    expect(screen.getByText('入力はキャンセルされました')).toBeTruthy();
    expect(screen.getByText('ユーザーがリクエストをキャンセルしました。')).toBeTruthy();
  });

  it('translates stored empty answers and leaves raw text untouched', () => {
    const fields: RequestUserInputField[] = [
      { type: 'multiSelect', id: 'multi', label: 'Multi', items },
      { type: 'singleSelect', id: 'single', label: 'Single', options: [{ id: 'option', label: 'Option' }], allowOther: true },
      { type: 'confirm', id: 'missing', label: 'Missing' },
      { type: 'confirm', id: 'confirm', label: 'Confirm' },
    ];
    const data = message(fields, {}, JSON.stringify({ answers: {
      multi: { type: 'multiSelect', selectedIds: [] }, single: { type: 'singleSelect', selectedId: '__other__', otherText: '' }, confirm: { type: 'confirm', value: false },
    } }));
    render(localized(data));
    expect(screen.getByText('（未選択）')).toBeTruthy();
    expect(screen.getByText('（空欄）')).toBeTruthy();
    expect(screen.getByText('回答が記録されていません')).toBeTruthy();
    expect(screen.getByText('いいえ')).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it.each([
    [{ type: 'reorder', id: 'order', label: 'Order', items: Array.from({ length: 7 }, (_, index) => ({ id: `id-${index}`, title: `Title ${index}` })) } as RequestUserInputField, '音声では対応できません。並べ替える項目が多すぎます（7件）'],
    [{ type: 'editText', id: 'text', label: 'Text', initialText: 'x'.repeat(241), format: 'plain' } as RequestUserInputField, '音声では対応できません。音声で扱うには文章が長すぎます'],
  ])('localizes voice limitations without changing form content', (field, expected) => {
    render(localized(message([field])));
    expect(screen.getByText(expected)).toBeTruthy();
  });
});
