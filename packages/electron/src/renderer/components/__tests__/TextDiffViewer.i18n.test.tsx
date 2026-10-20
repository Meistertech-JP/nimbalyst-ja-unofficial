// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextDiffViewer } from '../HistoryDialog/TextDiffViewer';

vi.mock('@nimbalyst/runtime', () => ({
  generateUnifiedDiff: vi.fn(() => ''),
}));

describe('TextDiffViewer localization', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('en');
  });

  afterEach(async () => {
    cleanup();
    await i18next.changeLanguage('en');
  });

  it('updates the version headers when the UI language changes', async () => {
    render(<TextDiffViewer oldText="before" newText="after" />);

    expect(screen.getByText('Old Version')).toBeTruthy();
    expect(screen.getByText('New Version')).toBeTruthy();

    await act(async () => {
      await i18next.changeLanguage('ja');
    });

    expect(screen.getByText('旧バージョン')).toBeTruthy();
    expect(screen.getByText('新バージョン')).toBeTruthy();
    expect(screen.queryByText('Old Version')).toBeNull();
    expect(screen.queryByText('New Version')).toBeNull();
  });
});
