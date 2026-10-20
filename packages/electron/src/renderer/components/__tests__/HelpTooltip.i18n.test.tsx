// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelpTooltip, lastWindowFocusTimeAtom } from '../../help/HelpTooltip';
import { HelpContent } from '../../help/HelpContent';
import { store } from '../../store';

vi.mock('../../extensions/panels/PanelRegistry', () => ({
  getRegisteredPanels: () => [{ id: 'custom-panel', title: 'User panel title', tooltip: '**User body** with a custom description.' }],
}));
vi.mock('../../extensions/commands/ExtensionCommandRegistry', () => ({ getRegisteredKeybindings: () => [] }));

beforeEach(async () => {
  vi.useFakeTimers();
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  store.set(lastWindowFocusTimeAtom, 0);
  await i18next.changeLanguage('ja');
});
afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  await i18next.changeLanguage('en');
});

describe('help tooltip localization', () => {
  it.each(Object.entries(HelpContent))('retains the full current upstream content for %s', (testId, entry) => {
    for (const field of ['title', 'body'] as const) {
      expect(i18next.getResource('en', 'common', `help.${testId}.${field}`)).toBe(entry[field]);
      const japanese = i18next.getResource('ja', 'common', `help.${testId}.${field}`);
      expect(japanese).toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
      expect(japanese).not.toBe(entry[field]);
    }
  });

  it('updates an open tooltip without losing its child state or shortened security caveats', async () => {
    render(<HelpTooltip testId="h2-security-encryption-section"><input aria-label="User draft" defaultValue="Initial" /></HelpTooltip>);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'User draft remains' } });
    fireEvent.focus(input);
    act(() => vi.advanceTimersByTime(600));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('オーナーと管理者のみ');
    expect(tooltip.textContent).toContain('ゼロ知識方式ではなくなります');
    expect(tooltip.textContent).toContain('個人の同期は常にエンドツーエンド暗号化');
    await act(() => i18next.changeLanguage('en'));
    expect(screen.getByRole('tooltip')).toBe(tooltip);
    expect(tooltip.textContent).toContain(HelpContent['h2-security-encryption-section'].body);
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input.value).toBe('User draft remains');
  });

  it('preserves markdown, technical paths, and the existing click cooldown', () => {
    render(<HelpTooltip testId="tracker-automation-section"><button>Target</button></HelpTooltip>);
    const target = screen.getByRole('button');
    fireEvent.mouseEnter(target);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByText('NIM-123').tagName).toBe('STRONG');
    expect(screen.getByText('CLAUDE.md').tagName).toBe('STRONG');
    fireEvent.mouseDown(target);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.mouseEnter(target);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('does not replace custom extension help with built-in translations', () => {
    render(<HelpTooltip testId="extension-panel-custom-panel"><button>Target</button></HelpTooltip>);
    fireEvent.focus(screen.getByRole('button'));
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByText('User panel title')).toBeTruthy();
    expect(screen.getByText('User body').tagName).toBe('STRONG');
  });
});
