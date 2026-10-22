// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';

const state = vi.hoisted(() => ({
  createTypePage: vi.fn(),
  body: {
    status: 'error' as 'loading' | 'ready' | 'unavailable' | 'error',
    retryLoad: vi.fn(),
    initialContent: '',
    editorEpoch: 0,
    notice: null as string | null,
    dismissNotice: vi.fn(),
    onEdit: vi.fn(),
  },
}));

vi.mock('../usePersonalPageBody', () => ({ usePersonalPageBody: () => state.body }));
vi.mock('@nimbalyst/runtime/editor', () => ({ NimbalystEditor: () => null }));
vi.mock('@nimbalyst/runtime/DocumentPathContext', () => ({ DocumentPathProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@nimbalyst/runtime/store', () => ({ store: { set: vi.fn() } }));
vi.mock('../../../store/atoms/historyDialog', () => ({ historyDialogFileAtom: {} }));
vi.mock('../../../utils/assetUrl', () => ({ nimAssetUrl: (value: string) => value }));
vi.mock('../../EmbedFrame/CollaborativeEmbedEditor', () => ({ CollaborativeEmbedEditor: () => null }));
vi.mock('../../EmbedFrame/resolveCollaborativeEmbedRequest', () => ({ resolveCollaborativeEmbedRequest: vi.fn() }));
vi.mock('../../../services/collaborativeDocumentCreationOrchestrator', () => ({ ensureTypePageDocument: state.createTypePage }));

import { PersonalPageBodyEditor } from '../PersonalPageBodyEditor';
import { TypePageProse } from '../TypePageProse';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([createI18nInstance('en'), createI18nInstance('ja')]);
});
afterEach(() => {
  cleanup();
  state.body.status = 'error';
  state.body.notice = null;
  state.body.retryLoad.mockClear();
  state.body.dismissNotice.mockClear();
  state.createTypePage.mockReset();
});

describe('PersonalPageBodyEditor and TypePageProse localization', () => {
  it('localizes unavailable and retry UI, and maps fixed save notices', () => {
    state.body.status = 'unavailable';
    state.body.notice = 'This page changed elsewhere; your edits were kept in local history.';
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <PersonalPageBodyEditor documentId="doc-1" workspacePath="/ws" />
      </I18nextProvider>,
    );

    expect(screen.getByText(/このページはこのデバイスでは利用できません/)).toBeTruthy();
    expect(screen.getByText('このページが別の場所で変更されたため、編集内容をローカル履歴に保存しました。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(state.body.dismissNotice).toHaveBeenCalledOnce();
    expect(state.body.retryLoad).toHaveBeenCalledOnce();
  });

  it('localizes the empty type-page prompt while preserving dynamic names and backend errors', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <TypePageProse
          typeId="type-1" typeName="Tasks" itemName="Task" lane="team" scope={null}
          workspacePath="/ws" parentFolderId={null} documents={[]}
        />
      </I18nextProvider>,
    );
    expect(screen.getByRole('button').textContent).toBe('taskとは何か、ここに何を記載するかを説明してください');
  });

  it('shows the English prompt in English', () => {
    render(
      <I18nextProvider i18n={englishI18n}>
        <TypePageProse
          typeId="type-1" typeName="Tasks" itemName="Task" lane="team" scope={null}
          workspacePath="/ws" parentFolderId={null} documents={[]}
        />
      </I18nextProvider>,
    );
    expect(screen.getByRole('button').textContent).toBe('Describe what a task is and what belongs here');
  });

  it('localizes the create-error prefix and preserves the backend error text', async () => {
    state.createTypePage.mockRejectedValue(new Error('The server rejected the request'));
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <TypePageProse
          typeId="type-1" typeName="Tasks" itemName="Task" lane="team" scope={{} as never}
          workspacePath="/ws" parentFolderId={null} documents={[]}
        />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect((await screen.findByRole('alert')).textContent).toContain('このページを作成できませんでした: The server rejected the request');
  });
});
