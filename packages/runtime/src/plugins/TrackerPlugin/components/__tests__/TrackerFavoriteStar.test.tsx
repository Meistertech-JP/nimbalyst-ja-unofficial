import React from 'react';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { TrackerFavoriteStar } from '../TrackerFavoriteStar';

let testI18n: Awaited<ReturnType<typeof createI18nInstance>>;

function render(ui: React.ReactElement) {
  return rtlRender(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);
}

beforeEach(async () => {
  testI18n = await createI18nInstance('ja');
});

describe('TrackerFavoriteStar', () => {
  it('localizes its accessible name and toggles without activating its row/card', () => {
    const parentClick = vi.fn();
    const parentDoubleClick = vi.fn();
    const parentContextMenu = vi.fn();
    const parentDragStart = vi.fn();
    const toggle = vi.fn();
    render(
      <div onClick={parentClick} onDoubleClick={parentDoubleClick} onContextMenu={parentContextMenu} onDragStart={parentDragStart}>
        <TrackerFavoriteStar itemId="item-1" isFavorite={false} onToggle={toggle} />
      </div>,
    );
    const star = screen.getByRole('button', { name: 'お気に入りに追加' });
    fireEvent.click(star);
    fireEvent.doubleClick(star);
    fireEvent.contextMenu(star);
    fireEvent.dragStart(star);

    expect(toggle).toHaveBeenCalledWith('item-1');
    expect(parentClick).not.toHaveBeenCalled();
    expect(parentDoubleClick).not.toHaveBeenCalled();
    expect(parentContextMenu).not.toHaveBeenCalled();
    expect(parentDragStart).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'お気に入りに追加' })).toBeTruthy();
  });
});
