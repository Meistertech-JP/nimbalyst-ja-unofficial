// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { I18nextProvider } from 'react-i18next';
import { ContextUsageDisplay } from '../ContextUsageDisplay';

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: () => null,
}));

// inputTokens > 0 makes the breakdown panel eligible (enableTooltip).
const props = {
  provider: 'claude-code',
  inputTokens: 80_000,
  outputTokens: 20_000,
  totalTokens: 100_000,
  contextWindow: 200_000,
  currentContext: { tokens: 132_000, contextWindow: 200_000 },
};

afterEach(() => cleanup());

async function renderWithLanguage(language: 'en' | 'ja', component: React.ReactNode) {
  const i18n = await createI18nInstance(language);
  return render(
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
      {component}
    </UiLanguageProvider>,
  );
}

describe('ContextUsageDisplay - context meter opens on click, not hover (#429)', () => {
  it('does NOT open the breakdown panel on hover', async () => {
    await renderWithLanguage('en', <ContextUsageDisplay {...props} />);
    fireEvent.mouseEnter(screen.getByTestId('context-indicator'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('toggles the panel open and closed on click', async () => {
    await renderWithLanguage('en', <ContextUsageDisplay {...props} />);
    const meter = screen.getByTestId('context-indicator');
    fireEvent.click(meter);
    screen.getByRole('tooltip');
    fireEvent.click(meter);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('closes the panel on an outside click', async () => {
    await renderWithLanguage('en', <ContextUsageDisplay {...props} />);
    fireEvent.click(screen.getByTestId('context-indicator'));
    screen.getByRole('tooltip');
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('closes the panel on Escape', async () => {
    await renderWithLanguage('en', <ContextUsageDisplay {...props} />);
    fireEvent.click(screen.getByTestId('context-indicator'));
    screen.getByRole('tooltip');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('exposes the meter as a button with aria-expanded when a breakdown exists', async () => {
    await renderWithLanguage('en', <ContextUsageDisplay {...props} />);
    const meter = screen.getByTestId('context-indicator');
    expect(meter.getAttribute('role')).toBe('button');
    expect(meter.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(meter);
    expect(meter.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('ContextUsageDisplay - cumulative rows are labeled as session totals (#824)', () => {
  it('labels the io breakdown as cumulative session totals when the header shows window fill', async () => {
    // Header-right shows current window fill (132k / 200k) while the io rows
    // show cumulative session usage (100k). Without a label the two read as
    // the same quantity and contradict each other (#824: 76k vs 12,073).
    await renderWithLanguage('en', <ContextUsageDisplay {...props} />);
    fireEvent.click(screen.getByTestId('context-indicator'));
    screen.getByText('Session totals (cumulative)');
  });

  it('omits the session-totals label when there is no context window (header already says Session Token Usage)', async () => {
    // contextWindow: 0 is the no-window state (hasContextWindow derives from
    // displayContextWindow > 0); the header then reads "Session Token Usage" and no
    // window-fill total renders, so there is no second quantity to label.
    await renderWithLanguage('en',
      <ContextUsageDisplay
        provider="openai"
        inputTokens={80_000}
        outputTokens={20_000}
        totalTokens={100_000}
        contextWindow={0}
      />
    );
    fireEvent.click(screen.getByTestId('context-indicator'));
    expect(screen.queryByText('Session totals (cumulative)')).toBeNull();
  });
});

describe('ContextUsageDisplay - measured provider support (#914)', () => {
  it('does not render an indicator for a provider that reports no usage', async () => {
    await renderWithLanguage('en',
      <ContextUsageDisplay
        provider="copilot-cli"
        inputTokens={0}
        outputTokens={0}
        totalTokens={0}
        contextWindow={200_000}
        currentContext={{ tokens: 0, contextWindow: 200_000 }}
      />
    );

    expect(screen.queryByTestId('context-indicator')).toBeNull();
  });

  it('shows cumulative counts without inventing a percentage for count-only providers', async () => {
    // contextWindow is deliberately non-zero: a catalog window must not turn
    // cumulative spend into a fill, whatever else is passed in.
    await renderWithLanguage('en',
      <ContextUsageDisplay
        provider="grok-build"
        inputTokens={80_000}
        outputTokens={20_000}
        totalTokens={100_000}
        contextWindow={200_000}
      />
    );

    // #914: never a fill percentage without a real denominator.
    expect(screen.getByTestId('context-indicator').textContent).not.toMatch(/%|\//);
  });
});

describe('ContextUsageDisplay localization', () => {
  it('localizes expanded help live without changing the usage measurement or panel state', async () => {
    const i18n = await createI18nInstance('ja');
    render(<I18nextProvider i18n={i18n}><ContextUsageDisplay {...props} /></I18nextProvider>);
    const meter = screen.getByTestId('context-indicator');
    fireEvent.click(meter);
    fireEvent.click(screen.getByTitle('これは何ですか？'));
    expect(screen.getByText('コンテキストウィンドウ').textContent).toBe('コンテキストウィンドウ');
    expect(screen.getByText('AIのコンテキストウィンドウの使用量を表示します。ファイル、会話履歴、ツールが含まれます。').textContent)
      .toContain('ファイル、会話履歴、ツール');
    expect(meter.getAttribute('aria-expanded')).toBe('true');
    await act(async () => { await i18n.changeLanguage('en'); });
    screen.getByText('Context Window');
    expect(meter.getAttribute('aria-expanded')).toBe('true');
    expect(meter.textContent).toContain('132k/200k (66%)');
    await act(async () => { await i18n.changeLanguage('ja'); });
    screen.getByText('コンテキストウィンドウ');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
  it('renders Japanese usage labels, tooltip details, and actions', async () => {
    await renderWithLanguage('ja', (
      <ContextUsageDisplay
        provider="claude-code"
        inputTokens={80_000}
        outputTokens={20_000}
        cacheReadInputTokens={10_000}
        cacheCreationInputTokens={5_000}
        totalTokens={115_000}
        contextWindow={200_000}
        currentContext={{
          tokens: 132_000,
          contextWindow: 200_000,
          categories: [{ name: 'Free space', tokens: 68_000, percentage: 34 }],
        }}
      />
    ));

    const meter = screen.getByTestId('context-indicator');
    expect(meter.getAttribute('aria-label')).toContain('コンテキスト使用量');
    expect(meter.textContent).toContain('132k/200k (66%)');
    fireEvent.click(meter);

    expect(screen.getByText('コンテキストの内訳').textContent).toBe('コンテキストの内訳');
    expect(screen.getByText('セッション合計（累計）').textContent).toBe('セッション合計（累計）');
    expect(screen.getByText('入力（キャッシュなし）:').textContent).toBe('入力（キャッシュなし）:');
    expect(screen.getByText('キャッシュ読み込み:').textContent).toBe('キャッシュ読み込み:');
    expect(screen.getByText('キャッシュ書き込み:').textContent).toBe('キャッシュ書き込み:');
    expect(screen.getByText('合計:').textContent).toBe('合計:');
    expect(screen.getByText('68,000トークン').textContent).toBe('68,000トークン');
    expect(screen.getByText('ツールを管理').textContent).toBe('ツールを管理');
  });

  it('renders the no-window count and tooltip note in Japanese', async () => {
    await renderWithLanguage('ja', (
      <ContextUsageDisplay
        provider="openai"
        inputTokens={80_000}
        outputTokens={20_000}
        totalTokens={100_000}
        contextWindow={0}
      />
    ));

    const meter = screen.getByTestId('context-indicator');
    expect(meter.getAttribute('aria-label')).toContain('セッションのトークン使用量');
    expect(meter.textContent).toContain('100kトークン使用済み');
    fireEvent.click(meter);

    expect(screen.getByText('このセッションの累計使用量です。このエージェントはコンテキストウィンドウサイズを報告しないため、使用率は表示されません。').textContent)
      .toBe('このセッションの累計使用量です。このエージェントはコンテキストウィンドウサイズを報告しないため、使用率は表示されません。');
  });
});
