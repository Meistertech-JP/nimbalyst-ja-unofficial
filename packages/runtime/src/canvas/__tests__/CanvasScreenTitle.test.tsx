import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { PropsWithChildren, ReactNode } from 'react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CanvasScreenTitle } from '../CanvasScreenTitle';

afterEach(cleanup);

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

it('commits a trimmed title once on Enter and contains editing keys', async () => {
  const rename = vi.fn(),
    outerKey = vi.fn(),
    outerDoubleClick = vi.fn();
  await renderWithLanguage(
    <div onKeyDown={outerKey} onDoubleClick={outerDoubleClick}>
      <CanvasScreenTitle label="Files" readOnly={false} onRename={rename} />
    </div>
  );
  fireEvent.doubleClick(screen.getByRole('button', { name: 'Rename Files' }));
  const input = screen.getByRole('textbox', { name: 'Screenshot title' });
  fireEvent.change(input, { target: { value: '  Workspace  ' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  fireEvent.blur(input);
  expect(rename.mock.calls).toEqual([['Workspace']]);
  expect(outerKey).not.toHaveBeenCalled();
  expect(outerDoubleClick).not.toHaveBeenCalled();
});

it('cancels on Escape, ignores empty titles, and saves on blur', async () => {
  const rename = vi.fn();
  await renderWithLanguage(
    <CanvasScreenTitle label="Files" readOnly={false} onRename={rename} />
  );
  const start = () => {
    fireEvent.doubleClick(screen.getByRole('button'));
    return screen.getByRole('textbox');
  };
  let input = start();
  fireEvent.change(input, { target: { value: 'Discard me' } });
  fireEvent.keyDown(input, { key: 'Escape' });
  input = start();
  expect((input as HTMLInputElement).value).toBe('Files');
  fireEvent.change(input, { target: { value: '   ' } });
  fireEvent.blur(input);
  expect(rename).not.toHaveBeenCalled();
  input = start();
  fireEvent.change(input, { target: { value: 'Workspace' } });
  fireEvent.blur(input);
  expect(rename.mock.calls).toEqual([['Workspace']]);
});

it('supports keyboard editing and cancels when the card becomes read-only', async () => {
  const rename = vi.fn();
  const { rerender } = await renderWithLanguage(
    <CanvasScreenTitle label="Files" readOnly={false} onRename={rename} />
  );
  fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Not allowed' },
  });
  rerender(<CanvasScreenTitle label="Files" readOnly onRename={rename} />);
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
  expect(rename).not.toHaveBeenCalled();
});

it('localizes the screenshot title accessibility label and rename hint', async () => {
  await renderWithLanguage(
    <CanvasScreenTitle label="Files" readOnly={false} onRename={vi.fn()} />,
    'ja'
  );

  expect(
    screen.getByRole('button', { name: 'Filesの名前を変更' })
  ).toHaveProperty('title', 'ダブルクリックして名前を変更');

  fireEvent.doubleClick(screen.getByRole('button'));
  expect(
    screen
      .getByRole('textbox', { name: 'スクリーンショットのタイトル' })
      .getAttribute('aria-label')
  ).toBe('スクリーンショットのタイトル');
});
