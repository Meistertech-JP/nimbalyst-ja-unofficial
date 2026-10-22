// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { CommentBody } from '../CommentBody';
import type { BodySegment, MessageAttachmentView } from '../commentTypes';

function imageAttachment(
  overrides: Partial<MessageAttachmentView> = {},
): MessageAttachmentView {
  return {
    assetId: 'asset-1',
    fileName: 'screenshot.png',
    mimeType: 'image/png',
    byteSize: 2048,
    sizeLabel: '2 KB',
    isImage: true,
    src: 'collab-asset://doc/conversation-1/asset/asset-1',
    width: 800,
    height: 600,
    ...overrides,
  };
}

function renderSegments(segments: BodySegment[]) {
  return render(
    <I18nextProvider i18n={englishI18n}>
      <CommentBody segments={segments} />
    </I18nextProvider>,
  );
}

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

describe('CommentBody attachments', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows an image inline, bounded, and addressed by its collab-asset URL', () => {
    renderSegments([{ type: 'attachments', attachments: [imageAttachment()] }]);

    const image = screen.getByAltText('screenshot.png') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('collab-asset://doc/conversation-1/asset/asset-1');
    // Intrinsic dimensions travel so the row does not reflow when it loads.
    expect(image.getAttribute('width')).toBe('800');
    expect(image.className).toContain('max-h-[320px]');
  });

  it('opens the full-size image on click', () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    renderSegments([{ type: 'attachments', attachments: [imageAttachment()] }]);

    fireEvent.click(screen.getByTestId('comment-body-attachment-image'));

    expect(open).toHaveBeenCalledWith('collab-asset://doc/conversation-1/asset/asset-1');
    vi.unstubAllGlobals();
  });

  it('renders a non-image as a downloadable chip with its name and size', () => {
    renderSegments([
      {
        type: 'attachments',
        attachments: [
          imageAttachment({
            assetId: 'asset-2',
            fileName: 'report.pdf',
            mimeType: 'application/pdf',
            sizeLabel: '1.4 MB',
            isImage: false,
          }),
        ],
      },
    ]);

    const chip = screen.getByTestId('comment-body-attachment-file') as HTMLAnchorElement;
    expect(chip.getAttribute('download')).toBe('report.pdf');
    expect(chip.textContent).toContain('report.pdf');
    expect(chip.textContent).toContain('1.4 MB');
    expect(screen.queryByTestId('comment-body-attachment-image')).toBeNull();
  });

  it('places the attachments after the message text', () => {
    const { container } = renderSegments([
      { type: 'text', text: 'have a look' },
      { type: 'attachments', attachments: [imageAttachment()] },
    ]);

    const body = container.querySelector('.comment-body')!;
    const attachments = body.querySelector('.comment-body-attachments')!;
    expect(body.textContent?.startsWith('have a look')).toBe(true);
    expect(
      body.compareDocumentPosition(attachments) & Node.DOCUMENT_POSITION_CONTAINED_BY,
    ).toBeTruthy();
    expect(attachments.previousSibling).not.toBeNull();
  });

  it('renders nothing extra for a message with no attachments', () => {
    renderSegments([{ type: 'text', text: 'just words' }]);

    expect(screen.queryByTestId('comment-body-attachments')).toBeNull();
  });

  it('localizes agent mention accessibility labels and preserves dynamic names', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <CommentBody
          segments={[{
            type: 'agentMention',
            sessionId: 'session-1',
            sessionName: 'Sync repro',
            ownerDisplayName: 'Rowan',
            pending: true,
          }]}
        />
      </I18nextProvider>,
    );

    const mention = screen.getByTestId('comment-mention-agent');
    expect(mention.getAttribute('title')).toBe('エージェントセッション「Sync repro」（所有者: Rowan）');
    expect(mention.querySelector('[aria-label="エージェント"]')).not.toBeNull();
    expect(mention.querySelector('[title="送信待ち"]')).not.toBeNull();
  });
});
