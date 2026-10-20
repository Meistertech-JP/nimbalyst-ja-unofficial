// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtensionProjectIntroModal } from '../../ExtensionProjectIntroModal/ExtensionProjectIntroModal';
import WelcomeModal from '../../WelcomeModal/WelcomeModal';
import { WorktreeOnboardingModal } from '../../WorktreeOnboardingModal/WorktreeOnboardingModal';

describe('Onboarding dialog localization', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('en');
  });

  afterEach(async () => {
    cleanup();
    await i18next.changeLanguage('en');
  });

  it('preserves worktree emphasis and callbacks when switching language', async () => {
    const onContinue = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(<WorktreeOnboardingModal isOpen onContinue={onContinue} onCancel={onCancel} />);
    expect(container.querySelector('.worktree-onboarding-description strong')?.textContent).toBe('isolated directory');

    await act(async () => { await i18next.changeLanguage('ja'); });

    expect(screen.getByRole('heading', { name: 'Worktreeとは？' })).toBeTruthy();
    expect(container.querySelector('.worktree-onboarding-description strong')?.textContent).toBe('分離したディレクトリ');
    fireEvent.click(screen.getByRole('button', { name: 'Worktreeを作成' }));
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('localizes extension introduction without changing button actions', async () => {
    await i18next.changeLanguage('ja');
    const onContinue = vi.fn();
    const onDontShowAgain = vi.fn();
    const onCancel = vi.fn();
    render(<ExtensionProjectIntroModal isOpen onContinue={onContinue} onDontShowAgain={onDontShowAgain} onCancel={onCancel} />);

    expect(screen.getByRole('heading', { name: '拡張機能を作成' })).toBeTruthy();
    expect(screen.getByText('Claudeがプロジェクト内の作業で使えるAIツール')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '続行' }));
    fireEvent.click(screen.getByRole('button', { name: '今後表示しない' }));
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onDontShowAgain).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('localizes welcome and plan location text while preserving technical paths', async () => {
    await i18next.changeLanguage('ja');
    const { container } = render(<WelcomeModal workspacePath="/workspace" workspaceName="My Project" onComplete={vi.fn()} onSkip={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'My Projectへようこそ' })).toBeTruthy();
    expect(screen.getByTitle('導入をスキップ')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.getByRole('heading', { name: 'プランの保存場所を設定' })).toBeTruthy();
    expect(screen.getByText('nimbalyst-local/plans')).toBeTruthy();
    expect(screen.getByText('plans/')).toBeTruthy();
    expect(container.querySelector('.plan-location-info code')?.textContent).toBe('.gitignore');
    expect(screen.getByText('指定した場所にプランフォルダーを作成します')).toBeTruthy();
  });
});
