// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WalkthroughCallout } from '../components/WalkthroughCallout';
import { walkthroughs } from '../definitions';
import { agentWelcomeIntro } from '../definitions/agent-welcome-intro';
import { attachFilesIntro } from '../definitions/attach-files-intro';
import { diffModeIntro } from '../definitions/diff-mode-intro';

vi.mock('../WalkthroughService', () => ({
  resolveTarget: () => document.body,
  isTargetValid: () => true,
  calculateCalloutPosition: () => ({ top: 20, left: 20, arrowPosition: 'left', arrowOffset: 10 }),
}));

afterEach(async () => {
  cleanup();
  await i18next.changeLanguage('en');
});

describe('Japanese walkthrough callouts', () => {
  it.each(walkthroughs)('localizes the menu name for $id without changing the definition', (definition) => {
    expect(i18next.getResource('en', 'menu', `walkthrough_names.${definition.id}`)).toBe(definition.name);
    expect(i18next.getResource('ja', 'menu', `walkthrough_names.${definition.id}`)).toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  });
  it.each(walkthroughs.flatMap(definition => definition.steps.map(step => ({ definition, step }))))('preserves full upstream text and translates $definition.id / $step.id', ({ definition, step }) => {
    const prefix = definition.id === 'agent-mode-intro' ? 'walkthrough_content.agent_mode'
      : definition.id === 'files-mode-intro' ? 'walkthrough_content.files_mode'
        : `help.${definition.id === 'agent-welcome-intro' ? 'agent-welcome' : definition.id === 'attach-files-intro' ? 'attach-files-input' : step.target.testId ?? step.id}`;
    for (const field of ['title', 'body'] as const) {
      expect(i18next.getResource('en', 'common', `${prefix}.${field}`)).toBe(step[field]);
      const japanese = i18next.getResource('ja', 'common', `${prefix}.${field}`);
      expect(japanese).toBeTruthy();
      expect(japanese).not.toBe(step[field]);
    }
  });

  it.each([agentWelcomeIntro, attachFilesIntro])('uses the correct help entry for $id instead of the target selector', async (definition) => {
    await i18next.changeLanguage('ja');
    render(<WalkthroughCallout definition={definition} stepIndex={0} onNext={vi.fn()} onBack={vi.fn()} onDismiss={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByRole('dialog').textContent).toContain(definition.id === 'agent-welcome-intro' ? '最初のセッションを開始' : 'ファイルと画像を添付');
    await act(() => i18next.changeLanguage('en'));
    expect(screen.getByRole('dialog').textContent).toContain(definition.steps[0].body);
  });

  it('localizes multi-step navigation and preserves completion and dismissal callbacks', async () => {
    await i18next.changeLanguage('ja');
    const onBack = vi.fn(), onComplete = vi.fn(), onDismiss = vi.fn();
    render(<WalkthroughCallout definition={diffModeIntro} stepIndex={1} onNext={vi.fn()} onBack={onBack} onDismiss={onDismiss} onComplete={onComplete} />);
    expect(screen.getByText('2/2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '戻る' }));
    fireEvent.click(screen.getByRole('button', { name: '完了' }));
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
