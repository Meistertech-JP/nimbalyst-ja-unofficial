import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolCallChanges } from '../ToolCallChanges';

let i18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeEach(async () => {
  i18n = await createI18nInstance('en');
});

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe('ToolCallChanges lazy hydration', () => {
  it('does not request history diffs until the user opens File Changes', async () => {
    const loadDiffs = vi.fn().mockResolvedValue({
      state: 'ready',
      diffs: [{
        filePath: '/workspace/a.ts',
        operation: 'edit',
        diffs: [{ oldString: 'before\n', newString: 'after\n' }],
        linesAdded: 1,
        linesRemoved: 1,
      }],
      omissions: [],
    });

    renderWithI18n(<ToolCallChanges diffs={undefined} isExpanded loadDiffs={loadDiffs} />);

    expect(loadDiffs).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /file changes/i }));

    await waitFor(() => expect(loadDiffs).toHaveBeenCalledTimes(1));
    expect((await screen.findAllByText('/workspace/a.ts')).length).toBeGreaterThan(0);
  });

  it('renders an input-limit omission as an expected result', async () => {
    const loadDiffs = vi.fn().mockResolvedValue({
      state: 'partial',
      diffs: [],
      omissions: [{ filePath: '/workspace/large.json', reason: 'input-too-large' }],
    });

    renderWithI18n(<ToolCallChanges diffs={undefined} isExpanded loadDiffs={loadDiffs} />);
    fireEvent.click(screen.getByRole('button', { name: /file changes/i }));

    expect(await screen.findByText(/too large to compare safely/i)).toBeTruthy();
  });

  it('renders file changes in Japanese after the locale changes', async () => {
    await i18n.changeLanguage('ja');
    renderWithI18n(
      <ToolCallChanges
        diffs={[{
          filePath: '/workspace/new.ts',
          operation: 'create',
          diffs: [],
          content: 'export const value = 1;\n',
          linesAdded: 1,
          linesRemoved: 0,
        }]}
        isExpanded
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /ファイル変更.*1件のファイルを変更/ }));
    expect(screen.getByRole('button', { name: /ファイル変更.*1件のファイルを変更/ })).toBeTruthy();
    expect(screen.getByText('作成')).toBeTruthy();
  });

  it('localizes the no-attributable-changes state', async () => {
    await i18n.changeLanguage('ja');
    const loadDiffs = vi.fn().mockResolvedValue({
      state: 'none',
      diffs: [],
      omissions: [],
    });
    renderWithI18n(<ToolCallChanges diffs={undefined} isExpanded loadDiffs={loadDiffs} />);
    fireEvent.click(screen.getByRole('button', { name: /差分を表示/ }));

    expect(await screen.findByText('該当するファイル変更は見つかりませんでした。')).toBeTruthy();
  });

  it('localizes safe load failure and retry action', async () => {
    await i18n.changeLanguage('ja');
    const loadDiffs = vi.fn().mockRejectedValue(new Error('internal detail'));
    renderWithI18n(<ToolCallChanges diffs={undefined} isExpanded loadDiffs={loadDiffs} />);
    fireEvent.click(screen.getByRole('button', { name: /差分を表示/ }));

    expect(await screen.findByText('ファイル変更を安全に読み込めませんでした。')).toBeTruthy();
    expect(screen.getByRole('button', { name: '再試行' })).toBeTruthy();
  });
});
