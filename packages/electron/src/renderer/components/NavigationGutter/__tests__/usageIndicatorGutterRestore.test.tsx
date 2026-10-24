// @vitest-environment jsdom
/**
 * Regression coverage for the usage-indicator rail restore bug: "Disable" in
 * the Claude/Codex/Gemini usage popovers used to write the standalone
 * `ai.show*UsageIndicator` setting, which has no restore affordance anywhere
 * in the UI. Every rail-side restore surface (right-click "Show X",
 * "Customize Gutter…", "Show All") reads `hiddenGutterItemsAtom` instead, so
 * a disabled indicator was a dead end. "Disable" must hide the item through
 * the same gutter-customization atom the restore UI reads.
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, cleanup, fireEvent, screen, act } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';

import { hiddenGutterItemsAtom } from '../../../store/atoms/appSettings';
import { canHideGutterItem, type GutterItemMeta } from '../navGutterItems';

// Bypass @floating-ui/react positioning entirely -- these tests only care
// about what the "Disable" button writes, not popover placement, and
// FloatingPortal's layout effects don't have anything meaningful to attach
// to in jsdom without a real anchor element in the viewport.
vi.mock('../../../hooks/useFloatingMenu', () => ({
  useFloatingMenu: () => ({
    refs: { setFloating: () => {}, setReference: () => {} },
    floatingStyles: {},
    getFloatingProps: () => ({}),
  }),
  FloatingPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@nimbalyst/runtime', () => ({
  MaterialSymbol: () => null,
  ProviderIcon: () => null,
}));

import { claudeUsageAtom } from '../../../store/atoms/claudeUsageAtoms';
import { codexUsageAtom } from '../../../store/atoms/codexUsageAtoms';
import { geminiUsageAtom } from '../../../store/atoms/geminiUsageAtoms';
import { ClaudeUsagePopover } from '../../ClaudeUsageIndicator/ClaudeUsagePopover';
import { CodexUsagePopover } from '../../CodexUsageIndicator/CodexUsagePopover';
import { GeminiUsagePopover } from '../../GeminiUsageIndicator/GeminiUsagePopover';
import { GeminiUsageIndicator } from '../../GeminiUsageIndicator/GeminiUsageIndicator';
import { ClaudeUsageIndicator } from '../../ClaudeUsageIndicator/ClaudeUsageIndicator';
import { CodexUsageIndicator } from '../../CodexUsageIndicator/CodexUsageIndicator';
import { usageErrorDisplay } from '../../../utils/usageErrorDisplay';

afterEach(() => cleanup());

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
});

function renderUsagePopover(store: ReturnType<typeof createStore>, children: React.ReactNode) {
  return render(
    <I18nextProvider i18n={englishI18n}>
      <Provider store={store}>{children}</Provider>
    </I18nextProvider>,
  );
}

it('localizes the real Gemini not-started payload in the tooltip and popover and follows language changes', async () => {
  const i18n = await createI18nInstance('ja');
  const store = createStore();
  store.set(geminiUsageAtom, {
    fiveHour: { utilization: 0, resetsAt: null },
    sevenDay: { utilization: 0, resetsAt: null },
    lastUpdated: 1,
    notStarted: true,
    available: false,
    limitsAvailable: false,
    error: 'Gemini usage will appear after your first request.',
  });

  render(
    <I18nextProvider i18n={i18n}>
      <Provider store={store}>
        <GeminiUsageIndicator />
      </Provider>
    </I18nextProvider>,
  );

  const button = screen.getByTestId('gemini-usage-indicator');
  expect(button.getAttribute('title')).toBe('最初のリクエスト後にGeminiの使用量が表示されます');
  fireEvent.click(button);
  expect(screen.getByText('最初のリクエスト後にGeminiの使用量が表示されます。').textContent)
    .toBe('最初のリクエスト後にGeminiの使用量が表示されます。');
  await act(async () => { await i18n.changeLanguage('en'); });
  expect(button.getAttribute('title')).toBe('Gemini usage will appear after your first request');
  expect(screen.getByText('Gemini usage will appear after your first request.').textContent)
    .toBe('Gemini usage will appear after your first request.');
});

function noopRef() {
  return { current: null } as React.RefObject<HTMLElement | null>;
}

it.each([
  'Unknown error fetching usage',
  'Unknown error reading Codex session files',
  'Unknown error reading Gemini usage',
])('localizes the product-owned fallback: %s', async (error) => {
  const i18n = await createI18nInstance('ja');
  expect(usageErrorDisplay(error, i18n.getFixedT(null, 'common'))).toBe('使用量を取得できませんでした。');
  await i18n.changeLanguage('en');
  expect(usageErrorDisplay(error, i18n.getFixedT(null, 'common'))).toBe('Usage could not be retrieved.');
});

it.each(['claude', 'codex'] as const)('localizes the real %s missing-usage message in tooltip and popover', async (provider) => {
  const i18n = await createI18nInstance('ja');
  const store = createStore();
  const expected = provider === 'claude'
    ? 'Claude Codeの認証情報が見つかりません。Claude Codeにログインしてください。'
    : 'Codexの使用量データが見つかりません。ChatGPTのサブスクリプションでCodex CLIを使用すると、使用量を確認できます。';
  if (provider === 'claude') {
    store.set(claudeUsageAtom, {
      fiveHour: { utilization: 0, resetsAt: null }, sevenDay: { utilization: 0, resetsAt: null }, lastUpdated: 1,
      error: 'No Claude Code credentials found for config dir C:\\synthetic-profile\\claude. Please log in to Claude Code.',
    });
  } else {
    store.set(codexUsageAtom, { limits: [], lastUpdated: 1,
      error: 'No Codex usage data found. Use Codex CLI with a ChatGPT subscription to see usage.',
    });
  }
  render(<I18nextProvider i18n={i18n}><Provider store={store}>
    {provider === 'claude' ? <ClaudeUsageIndicator /> : <CodexUsageIndicator />}
  </Provider></I18nextProvider>);
  const button = screen.getByTestId(`${provider}-usage-indicator`);
  expect(button.getAttribute('title')).toContain(expected);
  fireEvent.click(button);
  expect(screen.getByText(expected).textContent).toBe(expected);
  await act(async () => { await i18n.changeLanguage('en'); });
  expect(button.getAttribute('title')).toContain(provider === 'claude'
    ? 'No Claude Code credentials found. Please log in to Claude Code.'
    : 'No Codex usage data found. Use Codex CLI with a ChatGPT subscription to see usage.');
});

it('keeps real Gemini error diagnostics while localizing the unavailable prefix', async () => {
  const i18n = await createI18nInstance('ja');
  const store = createStore();
  const diagnostic = 'R10 synthetic upstream diagnostic';
  store.set(geminiUsageAtom, {
    fiveHour: { utilization: 0, resetsAt: null },
    sevenDay: { utilization: 0, resetsAt: null },
    lastUpdated: 1, notStarted: false, available: false, limitsAvailable: false, error: diagnostic,
  });
  render(<I18nextProvider i18n={i18n}><Provider store={store}><GeminiUsageIndicator /></Provider></I18nextProvider>);
  const button = screen.getByTestId('gemini-usage-indicator');
  expect(button.getAttribute('title')).toBe(`Geminiの使用量を取得できません: ${diagnostic}`);
  fireEvent.click(button);
  expect(screen.getByText(diagnostic).textContent).toBe(diagnostic);
  await act(async () => { await i18n.changeLanguage('en'); });
  expect(button.getAttribute('title')).toBe(`Gemini usage unavailable: ${diagnostic}`);
  expect(screen.getByText(diagnostic).textContent).toBe(diagnostic);
});

describe('usage popover "Disable" hides via the gutter customization atom', () => {
  it('shows model percent used including unused limits without duplicating legacy Opus', () => {
    const store = createStore();
    store.set(claudeUsageAtom, {
      fiveHour: { utilization: 55, resetsAt: null },
      sevenDay: { utilization: 73, resetsAt: null },
      sevenDayOpus: { utilization: 10, resetsAt: null },
      weeklyModelLimits: [
        { model: 'Fable', utilization: 86, resetsAt: null },
        { model: 'Opus', utilization: 0, resetsAt: null },
      ],
      lastUpdated: Date.now(),
    });
    const { getByText, getAllByText } = renderUsagePopover(
      store,
      <ClaudeUsagePopover anchorRef={noopRef()} onClose={() => {}} onRefresh={async () => {}} />,
    );
    getByText('86%');
    getByText('0%');
    expect(getAllByText('Opus (Weekly)')).toHaveLength(1);
  });

  it('ClaudeUsagePopover Disable adds claude-usage to hiddenGutterItemsAtom', () => {
    const store = createStore();
    store.set(claudeUsageAtom, {
      fiveHour: { utilization: 10, resetsAt: null },
      sevenDay: { utilization: 10, resetsAt: null },
      lastUpdated: Date.now(),
    });

    const { getByText } = renderUsagePopover(
      store,
      <ClaudeUsagePopover anchorRef={noopRef()} onClose={() => {}} onRefresh={async () => {}} />,
    );

    expect(store.get(hiddenGutterItemsAtom)).not.toContain('claude-usage');
    fireEvent.click(getByText('Disable'));
    expect(store.get(hiddenGutterItemsAtom)).toContain('claude-usage');
  });

  it('CodexUsagePopover Disable adds codex-usage to hiddenGutterItemsAtom', () => {
    const store = createStore();
    // Codex usage now uses the duration-window shape (see codexUsageAtoms).
    // The Disable button renders regardless of limits, so an empty window
    // list is enough to mount the popover far enough to click it.
    store.set(codexUsageAtom, {
      limits: [],
      lastUpdated: Date.now(),
    });

    const { getByText } = renderUsagePopover(
      store,
      <CodexUsagePopover anchorRef={noopRef()} onClose={() => {}} onRefresh={async () => {}} />,
    );

    expect(store.get(hiddenGutterItemsAtom)).not.toContain('codex-usage');
    fireEvent.click(getByText('Disable'));
    expect(store.get(hiddenGutterItemsAtom)).toContain('codex-usage');
  });

  it('GeminiUsagePopover Disable adds gemini-usage to hiddenGutterItemsAtom', () => {
    const store = createStore();
    store.set(geminiUsageAtom, {
      fiveHour: { utilization: 10, resetsAt: null },
      sevenDay: { utilization: 10, resetsAt: null },
      lastUpdated: Date.now(),
    });

    const { getByText } = renderUsagePopover(
      store,
      <GeminiUsagePopover anchorRef={noopRef()} onClose={() => {}} onRefresh={async () => {}} />,
    );

    expect(store.get(hiddenGutterItemsAtom)).not.toContain('gemini-usage');
    fireEvent.click(getByText('Disable'));
    expect(store.get(hiddenGutterItemsAtom)).toContain('gemini-usage');
  });
});

// Characterization coverage (already correct pre-fix; these don't flip
// red->green) for the restore-menu filter the fix now has a path to
// exercise: an id present in hiddenGutterItemsAtom is offered as "Show X"
// only if it's still in the live registry.
describe('GutterContextMenu restorableHidden filter (canHideGutterItem / registry membership)', () => {
  const registry: GutterItemMeta[] = [
    { id: 'claude-usage', section: 'indicators', icon: 'speed', label: 'Claude Usage', hideable: true },
    { id: 'codex-usage', section: 'indicators', icon: 'speed', label: 'Codex Usage', hideable: true },
  ];

  function restorableHidden(hiddenIds: string[], items: GutterItemMeta[]): string[] {
    return hiddenIds.filter((id) => items.some((it) => it.id === id));
  }

  it('offers to restore a hidden item that is still in the registry', () => {
    expect(restorableHidden(['claude-usage'], registry)).toEqual(['claude-usage']);
  });

  it('does not offer to restore an id no longer present in the registry (e.g. uninstalled extension panel)', () => {
    expect(restorableHidden(['gemini-usage'], registry)).toEqual([]);
  });

  it('canHideGutterItem allows hiding a non-mode indicator regardless of other hidden items', () => {
    const meta = registry[0];
    expect(canHideGutterItem('claude-usage', meta, [], [])).toBe(true);
  });
});
