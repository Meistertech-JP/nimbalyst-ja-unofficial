// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

import { EffortLevelSelector } from '../EffortLevelSelector';
import { ThinkingModeSelector } from '../ThinkingModeSelector';

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: () => null,
}));

afterEach(() => cleanup());

async function renderWithLanguage(children: React.ReactNode, language: 'en' | 'ja' = 'en') {
  const i18n = await createI18nInstance(language);
  return render(
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
      {children}
    </UiLanguageProvider>,
  );
}

describe('reasoning selector menu positioning', () => {
  it('focuses effort by typeahead without selecting, and clears the query on reopening', async () => {
    const onLevelChange = vi.fn();
    await renderWithLanguage(<EffortLevelSelector level="high" modelId="openai-codex/gpt-6-astra" onLevelChange={onLevelChange} />);
    const trigger = screen.getByTestId('effort-level-selector');
    fireEvent.click(trigger);
    for (const key of 'me') fireEvent.keyDown(document.activeElement!, { key });
    expect(document.activeElement).toBe(screen.getByRole('menuitemradio', { name: 'Medium' }));
    expect(onLevelChange).not.toHaveBeenCalled();
    fireEvent.click(document.activeElement!);
    expect(onLevelChange).toHaveBeenCalledWith('medium');
    fireEvent.click(trigger);
    fireEvent.keyDown(document.activeElement!, { key: 'l' });
    expect(document.activeElement).toBe(screen.getByRole('menuitemradio', { name: 'Low' }));
  });

  it.each([
    {
      name: 'effort',
      triggerLabel: 'Effort level: High',
      optionLabel: 'xHigh',
      optionRole: 'menuitemradio',
      renderSelector: () => <EffortLevelSelector level="high" modelId="openai-codex/gpt-6-astra" onLevelChange={vi.fn()} />,
    },
    {
      name: 'thinking',
      triggerLabel: 'Extended thinking: On',
      optionLabel: 'Extended: Off',
      optionRole: 'button',
      renderSelector: () => <ThinkingModeSelector mode="enabled" onModeChange={vi.fn()} />,
    },
  ])('portals the $name menu outside an overflow boundary', async ({ triggerLabel, optionLabel, optionRole, renderSelector }) => {
    const { container } = await renderWithLanguage(
      <div data-testid="overflow-boundary" style={{ overflow: 'hidden' }}>
        {renderSelector()}
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: triggerLabel }));

    const option = screen.getByRole(optionRole, { name: optionLabel });
    const menu = option.closest('[role="menu"]');
    expect(menu).not.toBeNull();
    expect(container.contains(menu)).toBe(false);
  });

  it('shows Japanese effort and thinking labels, including accessible names', async () => {
    await renderWithLanguage(
      <>
        <EffortLevelSelector level="high" modelId="openai-codex/gpt-6-astra" onLevelChange={vi.fn()} />
        <ThinkingModeSelector mode="enabled" onModeChange={vi.fn()} />
      </>,
      'ja',
    );

    const effort = screen.getByRole('button', { name: '推論の深さ: 高' });
    expect(effort.textContent).toContain('高');
    fireEvent.click(effort);
    expect(screen.getByRole('menuitemradio', { name: '中' })).toBeTruthy();

    const thinking = screen.getByRole('button', { name: '拡張思考: オン' });
    expect(thinking.textContent).toContain('拡張思考: オン');
    fireEvent.click(thinking);
    expect(screen.getByRole('button', { name: '拡張思考: オフ' })).toBeTruthy();
  });
});
