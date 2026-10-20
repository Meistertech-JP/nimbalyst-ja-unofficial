// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { FeedbackIntakeDialog } from '../FeedbackIntakeDialog';

vi.mock('@nimbalyst/runtime', () => ({ MaterialSymbol: () => null }));
vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));

describe('feedback intake localization', () => {
  afterEach(async () => { cleanup(); await i18next.changeLanguage('en'); });

  it('updates labels on language change without changing bug consent or launch payload', async () => {
    const onLaunch = vi.fn();
    const onClose = vi.fn();
    render(<FeedbackIntakeDialog isOpen onLaunch={onLaunch} onClose={onClose} />);
    expect(screen.getByRole('button', { name: 'Choose a type to continue' }).hasAttribute('disabled')).toBe(true);
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByRole('button', { name: '閉じる' })).toBeTruthy();
    fireEvent.click(screen.getByTestId('feedback-intake-select-bug'));
    const consent = screen.getByRole('checkbox') as HTMLInputElement;
    expect(consent.checked).toBe(true);
    fireEvent.click(consent);
    fireEvent.click(screen.getByRole('button', { name: 'バグ報告を開始' }));
    expect(onLaunch).toHaveBeenCalledWith({ kind: 'bug', mayGatherLogs: false });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('retains the feature mockup option in Japanese', async () => {
    await i18next.changeLanguage('ja');
    const onLaunch = vi.fn();
    render(<FeedbackIntakeDialog isOpen onLaunch={onLaunch} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('feedback-intake-select-feature'));
    expect(screen.getByText('まずUXモックアップでアイデアを確認')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '機能要望を開始' }));
    expect(onLaunch).toHaveBeenCalledWith({ kind: 'feature', shouldCreateMockup: true });
  });
});
