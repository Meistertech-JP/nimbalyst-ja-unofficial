import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { store } from '../../../../store/store';
import { setInteractiveWidgetHost } from '../../../../store/atoms/interactiveWidgetHost';
import type { InteractiveWidgetHost } from '../CustomToolWidgets/InteractiveWidgetHost';
import { AttachmentStagingDeniedCard } from '../AttachmentStagingDeniedCard';

const sessionId = 'attachment-staging-session';
let i18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeEach(async () => {
  i18n = await createI18nInstance('en');
});

function renderCard(host: InteractiveWidgetHost) {
  setInteractiveWidgetHost(sessionId, host);
  return render(
    <I18nextProvider i18n={i18n}>
      <JotaiProvider store={store}>
        <AttachmentStagingDeniedCard
          sessionId={sessionId}
          systemMessage={{
            systemType: 'permission_denied',
            isAttachmentStagingDenied: true,
            attachmentFilename: 'report.txt',
            attachmentDenyRule: 'Read(**/AppData/**)',
          }}
          prompt="Summarize this report"
          attachments={[{
            id: 'attachment-1',
            filename: 'report.txt',
            filepath: '/tmp/report.txt',
            mimeType: 'text/plain',
            size: 42,
            type: 'document',
          }]}
        />
      </JotaiProvider>
    </I18nextProvider>,
  );
}

afterEach(() => setInteractiveWidgetHost(sessionId, null));

describe('AttachmentStagingDeniedCard', () => {
  it('offers the opt-in gitignore checkbox and retries with the original prompt and attachment', async () => {
    const retryAttachmentStaging = vi.fn().mockResolvedValue({ success: true });
    const host = {
      getAttachmentStagingGitignoreStatus: vi.fn().mockResolvedValue({
        isGitRepo: true,
        alreadyIgnored: false,
        shouldOffer: true,
      }),
      retryAttachmentStaging,
      openAttachmentSettings: vi.fn(),
    } as unknown as InteractiveWidgetHost;
    renderCard(host);

    const checkbox = await screen.findByRole('checkbox');
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Move attachments into the workspace and retry' }));

    await waitFor(() => expect(retryAttachmentStaging).toHaveBeenCalledWith(
      'Summarize this report',
      [expect.objectContaining({ filename: 'report.txt', filepath: '/tmp/report.txt' })],
      true,
    ));
  });

  it('opens attachment settings as a secondary action', () => {
    const openAttachmentSettings = vi.fn();
    renderCard({ openAttachmentSettings } as unknown as InteractiveWidgetHost);
    fireEvent.click(screen.getByRole('button', { name: 'Attachment settings' }));
    expect(openAttachmentSettings).toHaveBeenCalledOnce();
  });

  it('localizes fixed UI copy while preserving the filename and deny rule', async () => {
    await i18n.changeLanguage('ja');
    const host = {
      getAttachmentStagingGitignoreStatus: vi.fn().mockResolvedValue({
        isGitRepo: true,
        alreadyIgnored: false,
        shouldOffer: true,
      }),
    } as unknown as InteractiveWidgetHost;
    renderCard(host);

    expect(screen.getByText('添付ファイルのディレクトリがブロックされています')).toBeTruthy();
    expect(screen.getByText('Claude Code は現在のステージングディレクトリから report.txt を読み取れませんでした。')).toBeTruthy();
    expect(screen.getByText('Read(**/AppData/**)')).toBeTruthy();
    expect(await screen.findByRole('checkbox', { name: 'nimbalyst-local/attachments/ を .gitignore に追加' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '添付ファイルをワークスペースに移動して再試行' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '添付ファイルの設定' })).toBeTruthy();
  });

  it('localizes only the locally generated retry fallback and preserves returned errors', async () => {
    await i18n.changeLanguage('ja');
    const host = {
      retryAttachmentStaging: vi.fn().mockResolvedValue({ success: false }),
    } as unknown as InteractiveWidgetHost;
    renderCard(host);
    fireEvent.click(screen.getByRole('button', { name: '添付ファイルをワークスペースに移動して再試行' }));
    expect(await screen.findByText('添付ファイルをステージングし直せませんでした。')).toBeTruthy();
  });

  it('preserves errors returned by attachment staging', async () => {
    await i18n.changeLanguage('ja');
    const host = {
      retryAttachmentStaging: vi.fn().mockResolvedValue({ success: false, error: 'Read(**/secret/**)' }),
    } as unknown as InteractiveWidgetHost;
    renderCard(host);
    fireEvent.click(screen.getByRole('button', { name: '添付ファイルをワークスペースに移動して再試行' }));
    expect(await screen.findByText('Read(**/secret/**)')).toBeTruthy();
  });
});
