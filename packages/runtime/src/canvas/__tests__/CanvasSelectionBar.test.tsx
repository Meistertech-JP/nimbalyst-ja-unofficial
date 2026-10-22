/**
 * The selection bar's contract with the command registry.
 *
 * What is worth a test here is not how the bar looks but the two rules that
 * are invisible on screen: it must be absent in the states where acting on a
 * selection would be wrong (nothing selected, read-only board, a card hot and
 * taking keystrokes), and every button must come from a registry `enabled`
 * predicate rather than a hand-written condition. The second rule is what
 * stops "Distribute" appearing for two cards, which is the bug a reader cannot
 * see by looking at the bar.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { describe, expect, it, vi } from 'vitest';

import { CanvasSelectionBar } from '../CanvasSelectionBar';
import type { CanvasCommandContext } from '../canvasCommands';
import type { CanvasAnyNode } from '../CanvasDocument';

function node(id: string, overrides: Partial<CanvasAnyNode> = {}): CanvasAnyNode {
  return {
    id,
    type: 'text',
    text: id,
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    ...overrides,
  } as CanvasAnyNode;
}

function context(
  selection: CanvasAnyNode[],
  overrides: Partial<CanvasCommandContext> = {}
): CanvasCommandContext {
  return {
    selection,
    nodes: selection,
    readOnly: false,
    activeCardId: null,
    tool: 'select',
    ...overrides,
  };
}

async function renderWithLanguage(element: ReactElement, language: 'en' | 'ja' = 'en') {
  const i18n = await createI18nInstance(language);
  const Wrapper = ({ children }: PropsWithChildren) => (
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
      {children}
    </UiLanguageProvider>
  );
  return render(element, { wrapper: Wrapper });
}

async function renderBar(
  selection: CanvasAnyNode[],
  overrides: Partial<CanvasCommandContext> = {},
  run = vi.fn()
) {
  const ctx = context(selection, overrides);
  await renderWithLanguage(
    <CanvasSelectionBar
      selection={selection}
      ctx={ctx}
      run={run}
      onColor={vi.fn()}
      onComment={vi.fn()}
      onHistory={vi.fn()}
    />
  );
  return run;
}

describe('CanvasSelectionBar', () => {
  it('stays out of the way when there is nothing to act on', async () => {
    const { container } = await renderWithLanguage(
      <CanvasSelectionBar
        selection={[]}
        ctx={context([])}
        run={vi.fn()}
        onColor={vi.fn()}
      />
    );
    expect(container.querySelector('.canvas-selection-bar')).toBeNull();
  });

  it('stays out of the way on a read-only board and under a hot card', async () => {
    const one = [node('a')];
    const readOnly = await renderWithLanguage(
      <CanvasSelectionBar
        selection={one}
        ctx={context(one, { readOnly: true })}
        run={vi.fn()}
        onColor={vi.fn()}
      />
    );
    expect(
      readOnly.container.querySelector('.canvas-selection-bar')
    ).toBeNull();

    const hot = await renderWithLanguage(
      <CanvasSelectionBar
        selection={one}
        ctx={context(one, { activeCardId: 'a' })}
        run={vi.fn()}
        onColor={vi.fn()}
      />
    );
    expect(hot.container.querySelector('.canvas-selection-bar')).toBeNull();
  });

  it('counts only a multi-selection, and gates align at two and distribute at three', async () => {
    await renderBar([node('a')]);
    expect(screen.queryByText(/selected$/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Align' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Distribute' })).toBeNull();
    screen.getByRole('button', { name: 'Duplicate' });
  });

  it('shows align but not distribute at two cards', async () => {
    await renderBar([node('a'), node('b')]);
    screen.getByText('2 selected');
    screen.getByRole('button', { name: 'Align' });
    expect(screen.queryByRole('button', { name: 'Distribute' })).toBeNull();
  });

  it('shows distribute at three cards', async () => {
    await renderBar([node('a'), node('b'), node('c')]);
    screen.getByText('3 selected');
    screen.getByRole('button', { name: 'Distribute' });
  });

  it('runs the registry command behind Delete', async () => {
    const run = await renderBar([node('a')]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(run).toHaveBeenCalledWith('delete');
  });

  // A menu that opens without moving focus is unreachable from the keyboard:
  // the trigger keeps focus and arrows do nothing. Not visible on screen.
  it('moves focus into the Align menu on open and walks it with ArrowDown', async () => {
    await renderBar([node('a'), node('b')]);
    fireEvent.click(screen.getByRole('button', { name: 'Align' }));

    const items = screen.getAllByRole('menuitem');
    expect(items[0].textContent).toContain('Left');
    await waitFor(() => expect(document.activeElement).toBe(items[0]));

    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(items[1]));
    expect(items[1].textContent).toContain('Center');
  });

  // Escape inside a portalled menu must put focus back on the trigger, or the
  // keyboard is stranded at the top of the document with the board behind it.
  it('returns focus to the trigger when Escape closes the menu', async () => {
    await renderBar([node('a'), node('b')]);
    const trigger = screen.getByRole('button', { name: 'Align' });
    fireEvent.click(trigger);

    const first = screen.getAllByRole('menuitem')[0];
    await waitFor(() => expect(document.activeElement).toBe(first));

    fireEvent.keyDown(first, { key: 'Escape' });

    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('shows Japanese selection actions and accessible color names', async () => {
    const selection = [node('a'), node('b')];
    await renderWithLanguage(
      <CanvasSelectionBar
        selection={selection}
        ctx={context(selection)}
        run={vi.fn()}
        onColor={vi.fn()}
        onComment={vi.fn()}
      />,
      'ja'
    );

    expect(screen.getByText('2件を選択中')).not.toBeNull();
    expect(screen.getByRole('button', { name: '整列' })).not.toBeNull();
    expect(screen.getByRole('button', { name: '複製' })).not.toBeNull();
    expect(screen.getByRole('button', { name: '色' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '色' }));
    expect(screen.getByRole('menuitem', { name: '色1' })).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: '色なし' })).not.toBeNull();
  });
});
