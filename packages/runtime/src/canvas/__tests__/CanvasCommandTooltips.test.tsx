import { useRef } from 'react';
import type { PropsWithChildren } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { CanvasCommandTooltips } from '../CanvasCommandTooltips';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function renderInJapanese(element: React.ReactElement) {
  const i18n = await createI18nInstance('ja');
  const Wrapper = ({ children }: PropsWithChildren) => (
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
      {children}
    </UiLanguageProvider>
  );
  return render(element, { wrapper: Wrapper });
}

it('shows delayed hover and focus help, dismisses on click, and preserves the action', async () => {
  vi.useFakeTimers();
  const action = vi.fn();
  function Harness() {
    const surface = useRef<HTMLDivElement>(null);
    return (
      <div ref={surface}>
        <button data-canvas-help="canvas-tool-pan-tool" onClick={action}>
          Hand
        </button>
        <CanvasCommandTooltips surfaceRef={surface} />
      </div>
    );
  }
  await renderInJapanese(<Harness />);
  const button = screen.getByRole('button');
  fireEvent.mouseOver(button);
  await act(() => vi.advanceTimersByTimeAsync(499));
  expect(screen.queryByRole('tooltip')).toBeNull();
  await act(() => vi.advanceTimersByTimeAsync(2));
  expect(screen.getByRole('tooltip').textContent).toContain('ボードを移動');
  expect(screen.getByRole('tooltip').textContent).toContain(
    'ドラッグしてボードを移動します。Spaceキーを押すと一時的に移動できます。'
  );
  expect(button.getAttribute('aria-describedby')).toBe(
    screen.getByRole('tooltip').id
  );
  fireEvent.pointerDown(button);
  fireEvent.click(button);
  expect(action).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('tooltip')).toBeNull();
  expect(button.hasAttribute('aria-describedby')).toBe(false);
  fireEvent.focusIn(button);
  await act(() => vi.advanceTimersByTimeAsync(600));
  expect(screen.queryByRole('tooltip')).toBeNull();
  await act(() => vi.advanceTimersByTimeAsync(5000));
  fireEvent.focusIn(button);
  await act(() => vi.advanceTimersByTimeAsync(501));
  screen.getByRole('tooltip');
  fireEvent.keyDown(button, { key: 'Escape' });
  expect(screen.queryByRole('tooltip')).toBeNull();
});
