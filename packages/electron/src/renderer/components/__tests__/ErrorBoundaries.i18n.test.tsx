// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { ErrorBoundary } from '../ErrorBoundary';
import { TabEditorErrorBoundary } from '../TabEditorErrorBoundary/TabEditorErrorBoundary';

vi.mock('../../utils/logger', () => ({ logger: { ui: { error: vi.fn() } } }));

describe('localized error recovery', () => {
  afterEach(async () => { cleanup(); vi.restoreAllMocks(); await i18next.changeLanguage('en'); });

  it('updates a failed tab on language change while preserving file names and diagnostics', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail = true;
    const Child = () => { if (fail) throw new Error('Raw diagnostic E_EDITOR_42'); return <div>Recovered</div>; };
    const onClose = vi.fn();
    const onRetry = vi.fn(() => { fail = false; });
    render(<TabEditorErrorBoundary filePath="/notes/My File.md" fileName="My File.md" onClose={onClose} onRetry={onRetry}><Child /></TabEditorErrorBoundary>);
    expect(screen.getByText('Unable to Load Editor')).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('「My File.md」の読み込み中にエラーが発生しました。')).toBeTruthy();
    expect(screen.getByText('Raw diagnostic E_EDITOR_42')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'タブを閉じる' }));
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByText('Recovered')).toBeTruthy();
  });

  it('translates the generic fallback without replacing a caller-provided fallback', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Child = (): React.ReactNode => { throw new Error(''); };
    await i18next.changeLanguage('ja');
    render(<ErrorBoundary><Child /></ErrorBoundary>);
    expect(screen.getByRole('alert').textContent).toContain('問題が発生しました');
    expect(screen.getByText('予期しないエラーが発生しました')).toBeTruthy();
    cleanup();
    render(<ErrorBoundary fallback={<div>Custom fallback</div>}><Child /></ErrorBoundary>);
    expect(screen.getByText('Custom fallback')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
