import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { PropsWithChildren, ReactNode } from 'react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { CanvasCardReference } from '../canvasCallbacks';
import type { CanvasRevisionEntry, CanvasRevisionSource } from '../canvasRevisions';
import { CanvasRevisionRail } from '../CanvasRevisionRail';

afterEach(cleanup);

const reference: CanvasCardReference = {
  kind: 'doc',
  uri: 'nimbalyst://doc/workspace/design',
};

const entry: CanvasRevisionEntry = {
  revisionId: 'revision-7',
  createdAt: Date.UTC(2026, 5, 10, 12, 30),
  sequence: 7,
  revisionKind: null,
  editorType: null,
  provenance: {
    authorUserId: 'user-1',
    authorName: 'Aki',
    sessionId: 'session-1',
    sessionName: 'Refine layout',
    prompt: 'Move the title above the image',
    commit: {
      sha: '1234567890abcdef',
      subject: 'Adjust title placement',
      sessionId: 'session-1',
      committedAt: Date.UTC(2026, 5, 10, 12, 35),
    },
  },
};

async function renderWithLanguage(
  element: ReactNode,
  language: 'en' | 'ja' = 'en'
) {
  const i18n = await createI18nInstance(language);
  const Wrapper = ({ children }: PropsWithChildren) => (
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
      {children}
    </UiLanguageProvider>
  );
  return render(element, { wrapper: Wrapper });
}

function railProps(
  source: CanvasRevisionSource,
  onPin = vi.fn(),
  canPin = true
) {
  return {
    nodeId: 'card-1',
    label: 'Design',
    reference,
    source,
    onPin,
    onClose: vi.fn(),
    canPin,
  };
}

it('localizes revision history and pins the selected revision', async () => {
  const onPin = vi.fn();
  let resolveList!: (entries: readonly CanvasRevisionEntry[]) => void;
  const source: CanvasRevisionSource = {
    list: vi.fn(
      () =>
        new Promise<readonly CanvasRevisionEntry[]>((resolve) => {
          resolveList = resolve;
        })
    ),
  };
  await renderWithLanguage(
    <CanvasRevisionRail {...railProps(source, onPin)} />,
    'ja'
  );
  await act(async () => resolveList([entry]));

  expect(screen.getByText('Designの履歴')).not.toBeNull();
  expect(screen.getByRole('button', { name: '履歴を閉じる' })).not.toBeNull();
  expect(screen.getByText('v7')).not.toBeNull();
  expect(screen.getByText('作成者')).not.toBeNull();
  expect(screen.getByText('セッション')).not.toBeNull();
  expect(screen.getByText('プロンプト')).not.toBeNull();
  expect(screen.getByText('コミット')).not.toBeNull();
  expect(screen.getByText('Move the title above the image')).not.toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'v7をカードとして追加' }));
  expect(onPin).toHaveBeenCalledWith(entry);
});

it('keeps loading, unavailable, and empty history as distinct states', async () => {
  let rejectList!: (error: Error) => void;
  const source: CanvasRevisionSource = {
    list: () =>
      new Promise<readonly CanvasRevisionEntry[]>((_, reject) => {
        rejectList = reject;
      }),
  };
  await renderWithLanguage(<CanvasRevisionRail {...railProps(source)} />);
  expect(screen.getByText('Loading history…')).not.toBeNull();
  await act(async () => rejectList(new Error('offline')));
  expect(screen.getByText("This card's history could not be loaded.")).not.toBeNull();
  expect(screen.queryByText('No revisions have been captured for this document yet.')).toBeNull();

  cleanup();
  let resolveEmpty!: (entries: readonly CanvasRevisionEntry[]) => void;
  const emptySource: CanvasRevisionSource = {
    list: vi.fn(
      () =>
        new Promise<readonly CanvasRevisionEntry[]>((resolve) => {
          resolveEmpty = resolve;
        })
    ),
  };
  await renderWithLanguage(<CanvasRevisionRail {...railProps(emptySource)} />);
  await act(async () => resolveEmpty([]));
  expect(screen.getByText('No revisions have been captured for this document yet.')).not.toBeNull();
});

it('does not offer pinning when the board is read-only', async () => {
  let resolveList!: (entries: readonly CanvasRevisionEntry[]) => void;
  const source: CanvasRevisionSource = {
    list: vi.fn(
      () =>
        new Promise<readonly CanvasRevisionEntry[]>((resolve) => {
          resolveList = resolve;
        })
    ),
  };
  await renderWithLanguage(
    <CanvasRevisionRail {...railProps(source, vi.fn(), false)} />,
    'ja'
  );
  await act(async () => resolveList([entry]));

  expect(screen.getByText('Designの履歴')).not.toBeNull();
  expect(screen.queryByRole('button', { name: 'v7をカードとして追加' })).toBeNull();
});
