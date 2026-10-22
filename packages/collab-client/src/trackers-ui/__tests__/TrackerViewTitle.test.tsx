// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render as testingLibraryRender, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { TrackerViewTitle } from '../TrackerViewTitle';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
});

function render(tree: React.ReactElement) {
  return testingLibraryRender(tree, {
    wrapper: ({ children }) => (
      <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
        {children}
      </UiLanguageProvider>
    ),
  });
}

function renderTitle(overrides: Partial<Parameters<typeof TrackerViewTitle>[0]> = {}) {
  const onSaveView = vi.fn();
  const onRenameSavedView = vi.fn();
  const onUpdateSavedView = vi.fn();
  const onExitSavedView = vi.fn();
  render(
    <TrackerViewTitle
      fallbackTitle="All Items"
      onSaveView={onSaveView}
      onRenameSavedView={onRenameSavedView}
      onUpdateSavedView={onUpdateSavedView}
      onExitSavedView={onExitSavedView}
      {...overrides}
    />,
  );
  return { onSaveView, onRenameSavedView, onUpdateSavedView, onExitSavedView };
}

describe('TrackerViewTitle', () => {
  it('names a new saved view inline in the left title slot', () => {
    const { onSaveView } = renderTitle({ showSaveViewAction: true });

    expect(screen.getByTestId('tracker-view-title').textContent).toBe('All Items');
    fireEvent.click(screen.getByTestId('tracker-saved-view-add'));
    expect(screen.queryByText('All Items')).toBeNull();
    fireEvent.change(screen.getByTestId('tracker-saved-view-name-input'), {
      target: { value: 'Review queue' },
    });
    fireEvent.keyDown(screen.getByTestId('tracker-saved-view-name-input'), {
      key: 'Enter',
    });

    expect(onSaveView).toHaveBeenCalledWith('Review queue');
  });

  it('renames an active saved view inline in the same title slot', () => {
    const { onRenameSavedView } = renderTitle({
      activeSavedViewName: 'Review queue',
    });

    fireEvent.click(screen.getByTestId('tracker-view-title'));
    const input = screen.getByTestId('tracker-saved-view-name-input');
    expect((input as HTMLInputElement).value).toBe('Review queue');
    fireEvent.change(input, { target: { value: 'Ready for review' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRenameSavedView).toHaveBeenCalledWith('Ready for review');
  });

  it('offers Save changes next to a dirty saved-view title', () => {
    const { onUpdateSavedView } = renderTitle({
      activeSavedViewName: 'Review queue',
      savedViewDirty: true,
    });

    fireEvent.click(screen.getByTestId('tracker-saved-view-update'));
    expect(onUpdateSavedView).toHaveBeenCalledTimes(1);
  });

  it('offers an explicit exit from the active saved-view context', () => {
    const { onExitSavedView } = renderTitle({
      activeSavedViewName: 'Review queue',
    });

    fireEvent.click(screen.getByTestId('tracker-saved-view-exit'));
    expect(onExitSavedView).toHaveBeenCalledTimes(1);
  });
});
