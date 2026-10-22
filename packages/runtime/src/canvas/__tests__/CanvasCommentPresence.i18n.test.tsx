import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { PropsWithChildren, ReactNode } from 'react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { afterEach, expect, it, vi } from 'vitest';

import { CanvasCommentComposer } from '../CanvasCommentComposer';
import {
  CanvasPresenceLayer,
  CanvasPresenceRoster,
} from '../CanvasPresenceLayer';
import type { CanvasPresenceParticipant } from '../canvasPresence';

vi.mock('@xyflow/react', () => ({
  ViewportPortal: ({ children }: PropsWithChildren) => children,
  useStore: (selector: (state: { transform: number[] }) => number) =>
    selector({ transform: [0, 0, 1] }),
}));

afterEach(cleanup);

async function renderWithLanguage(
  element: ReactNode,
  language: 'en' | 'ja'
) {
  const i18n = await createI18nInstance(language);
  const Wrapper = ({ children }: PropsWithChildren) => (
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
      {children}
    </UiLanguageProvider>
  );
  return render(element, { wrapper: Wrapper });
}

const remoteUser: CanvasPresenceParticipant = {
  key: 'user:2',
  clientId: 2,
  kind: 'user',
  name: 'Aki',
  color: '#456789',
  isLocal: false,
  cursor: { x: 20, y: 30 },
  viewport: { x: 0, y: 0, width: 100, height: 80 },
};

it('localizes canvas comment labels and keeps the comment body user-controlled', async () => {
  const onSubmit = vi.fn();
  await renderWithLanguage(
    <CanvasCommentComposer
      target={{ kind: 'point', point: { x: 1, y: 2 } }}
      targetLabel="Board"
      getMembers={() => []}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
    'ja'
  );

  const input = screen.getByRole('textbox', {
    name: 'キャンバスへの新しいコメント',
  });
  expect(input.getAttribute('placeholder')).toBe(
    'コメントを追加。@agent にメンションするとセッションに依頼できます。'
  );
  fireEvent.change(input, { target: { value: 'Keep this English text' } });
  fireEvent.click(screen.getByRole('button', { name: 'コメント' }));
  expect(onSubmit).toHaveBeenCalledExactlyOnceWith(
    'Keep this English text',
    []
  );
});

it('localizes presence explanations while preserving participant names', async () => {
  await renderWithLanguage(
    <>
      <CanvasPresenceLayer participants={[remoteUser]} nodes={[]} />
      <CanvasPresenceRoster
        participants={[remoteUser]}
        onJumpTo={vi.fn()}
      />
    </>,
    'ja'
  );

  expect(screen.getByText('Akiさんがここを表示中')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Aki' }).title).toBe(
    'Akiさんの表示位置へ移動'
  );
});

it('shows English canvas comment and presence copy when English is selected', async () => {
  await renderWithLanguage(
    <>
      <CanvasCommentComposer
        target={{ kind: 'point', point: { x: 1, y: 2 } }}
        targetLabel="Board"
        getMembers={() => []}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
      <CanvasPresenceRoster
        participants={[{ ...remoteUser, viewport: undefined }]}
        onJumpTo={vi.fn()}
      />
    </>,
    'en'
  );

  expect(
    screen.getByRole('textbox', { name: 'New canvas comment' })
  ).not.toBeNull();
  expect(
    screen.getByRole('textbox').getAttribute('placeholder')
  ).toBe('Add a comment. Mention @agent to hand it to a session.');
  expect(screen.getByRole('button', { name: 'Aki' }).title).toBe(
    'Aki has not published a view of this board'
  );
});
