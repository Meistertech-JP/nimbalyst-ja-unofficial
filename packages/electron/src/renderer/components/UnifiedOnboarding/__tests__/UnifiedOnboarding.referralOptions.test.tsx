// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import i18next from 'i18next';
import { UnifiedOnboarding } from '../UnifiedOnboarding';

const NEW_REFERRAL_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'github', label: 'GitHub' },
  { value: 'course_training', label: 'Course/Training' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'newsletter_article', label: 'Newsletter/Article' },
];

describe('UnifiedOnboarding referral options', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('en');
  });

  afterEach(async () => {
    cleanup();
    await i18next.changeLanguage('en');
    delete (window as any).electronAPI;
  });

  it('shows and submits each discovery source', () => {
    (window as any).electronAPI = {
      invoke: vi.fn().mockResolvedValue({}),
    };
    const onComplete = vi.fn();

    render(
      <UnifiedOnboarding
        isOpen={true}
        onComplete={onComplete}
        onSkip={() => {}}
        forcedMode="new"
      />,
    );

    fireEvent.click(screen.getByText('Standard Mode'));
    const referralSelect = screen.getByLabelText('How did you hear about Nimbalyst?');

    for (const option of NEW_REFERRAL_OPTIONS) {
      const renderedOption = within(referralSelect).getByRole('option', { name: option.label });
      expect((renderedOption as HTMLOptionElement).value).toBe(option.value);
      fireEvent.change(referralSelect, { target: { value: option.value } });
      fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
      expect(onComplete).toHaveBeenLastCalledWith(
        expect.objectContaining({ referralSource: option.value }),
      );
    }
  });

  it('asks what the user searched for and submits the detail', () => {
    (window as any).electronAPI = {
      invoke: vi.fn().mockResolvedValue({}),
    };
    const onComplete = vi.fn();

    render(
      <UnifiedOnboarding
        isOpen={true}
        onComplete={onComplete}
        onSkip={() => {}}
        forcedMode="new"
      />,
    );

    fireEvent.click(screen.getByText('Standard Mode'));
    fireEvent.change(screen.getByLabelText('How did you hear about Nimbalyst?'), {
      target: { value: 'search' },
    });
    fireEvent.change(screen.getByLabelText('What did you search for?'), {
      target: { value: 'AI code editor' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ referralSource: 'search:AI code editor' }),
    );
  });

  it('localizes discovery labels and validation without changing stored values', async () => {
    (window as any).electronAPI = { invoke: vi.fn().mockResolvedValue({}) };
    const onComplete = vi.fn();

    render(<UnifiedOnboarding isOpen onComplete={onComplete} onSkip={() => {}} forcedMode="new" />);
    fireEvent.click(screen.getByText('Standard Mode'));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'invalid' } });
    expect(screen.getByText('Please enter a valid email address')).toBeTruthy();

    await act(async () => { await i18next.changeLanguage('ja'); });

    expect(screen.getByText('標準モード')).toBeTruthy();
    expect(screen.getByText('有効なメールアドレスを入力してください')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: '' } });
    const referralSelect = screen.getByLabelText('Nimbalystをどこで知りましたか？');
    expect((within(referralSelect).getByRole('option', { name: '講座・研修' }) as HTMLOptionElement).value)
      .toBe('course_training');
    fireEvent.change(referralSelect, { target: { value: 'course_training' } });
    fireEvent.click(screen.getByRole('button', { name: '始める' }));
    expect(onComplete).toHaveBeenLastCalledWith(expect.objectContaining({ referralSource: 'course_training' }));

    fireEvent.change(referralSelect, { target: { value: 'search' } });
    fireEvent.change(screen.getByLabelText('何を検索しましたか？'), { target: { value: 'AIエディター' } });
    fireEvent.click(screen.getByRole('button', { name: '始める' }));
    expect(onComplete).toHaveBeenLastCalledWith(expect.objectContaining({ referralSource: 'search:AIエディター' }));

    fireEvent.change(referralSelect, { target: { value: 'social' } });
    const platformSelect = screen.getByLabelText('どのプラットフォームですか？');
    expect((within(platformSelect).getByRole('option', { name: 'その他' }) as HTMLOptionElement).value).toBe('Other');
    fireEvent.change(platformSelect, { target: { value: 'Other' } });
    fireEvent.click(screen.getByRole('button', { name: '始める' }));
    expect(onComplete).toHaveBeenLastCalledWith(expect.objectContaining({ referralSource: 'social:Other' }));
  });
});
