// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { WorktreeOnboardingModal } from '../WorktreeOnboardingModal';

afterEach(cleanup);

describe('WorktreeOnboardingModal real-provider localization', () => {
  it.each([
    {
      locale: 'en' as const,
      title: 'What is a Worktree?',
      description: 'Worktrees create a git branch in an isolated directory, separate from your main repository. This gives you a safe place to make changes without affecting the rest of your code.',
      emphasis: 'isolated directory',
      continueLabel: 'Create Worktree',
      cancelLabel: 'Cancel',
    },
    {
      locale: 'ja' as const,
      title: 'Worktreeとは？',
      description: 'Worktreeはメインリポジトリから分離したディレクトリにGitブランチを作成します。コード全体に影響を与えず安全に変更できます。',
      emphasis: '分離したディレクトリ',
      continueLabel: 'Worktreeを作成',
      cancelLabel: 'キャンセル',
    },
  ])('renders the $locale description and rich markup from the onboarding namespace', async (labels) => {
    const i18n = await createI18nInstance(labels.locale);
    expect(i18n.options.defaultNS).toBe('common');
    const onContinue = vi.fn();
    const onCancel = vi.fn();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <WorktreeOnboardingModal isOpen onContinue={onContinue} onCancel={onCancel} />
      </I18nextProvider>,
    );

    expect(view.getByRole('heading', { name: labels.title }).textContent).toBe(labels.title);
    expect(view.container.querySelector('.worktree-onboarding-description')?.textContent).toBe(labels.description);
    expect(view.getByText(labels.emphasis).tagName).toBe('STRONG');
    fireEvent.click(view.getByRole('button', { name: labels.continueLabel }));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: labels.cancelLabel }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
