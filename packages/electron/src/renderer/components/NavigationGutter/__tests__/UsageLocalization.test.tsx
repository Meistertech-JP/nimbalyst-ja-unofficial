// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { codexUsageAtom, type CodexUsageWindow } from '../../../store/atoms/codexUsageAtoms';
import { hiddenGutterItemsAtom } from '../../../store/atoms/appSettings';
import { CodexUsagePopover } from '../../CodexUsageIndicator/CodexUsagePopover';
import { CustomizeGutterPopover } from '../CustomizeGutterPopover';
import { localizeCodexWindowLabel, localizeCodexWindowSubtitle, localizeUsageResetTime } from '../../ClaudeUsageIndicator/usagePresentation';

vi.mock('@nimbalyst/runtime', () => ({ MaterialSymbol: () => null, ProviderIcon: () => null }));
vi.mock('../../../hooks/useFloatingMenu', () => ({
  useFloatingMenu: () => ({
    refs: { setFloating: () => {}, setReference: () => {} },
    floatingStyles: {}, getFloatingProps: () => ({}),
  }),
  virtualElement: () => ({}),
  FloatingPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

beforeEach(async () => { await i18next.changeLanguage('en'); });
afterEach(async () => { cleanup(); await i18next.changeLanguage('en'); });

describe('usage and navigation localization', () => {
  it('translates Codex duration windows and reset credits without losing limit names or hiding behavior', async () => {
    const store = createStore();
    store.set(codexUsageAtom, {
      limits: [{
        id: 'codex-extra', name: 'Codex Extra', planType: null, credits: null,
        individualLimit: null, rateLimitReachedType: null,
        windows: [{ slot: 'primary', usedPercent: 73, windowDurationMins: 1440, resetsAt: null }],
      }],
      rateLimitResetCredits: { availableCount: 2, credits: null },
      lastUpdated: Date.now(),
    });
    render(<Provider store={store}><CodexUsagePopover
      anchorRef={{ current: null }} onClose={() => {}} onRefresh={async () => {}}
    /></Provider>);
    expect(screen.getByText('Codex Extra · Daily')).toBeTruthy();
    expect(screen.getByText('2 full resets available')).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('Codex Extra · 日次')).toBeTruthy();
    expect(screen.getByText('24時間の枠')).toBeTruthy();
    expect(screen.getByText('73%')).toBeTruthy();
    expect(screen.getByText('リセット時刻は不明です')).toBeTruthy();
    expect(screen.getByText('完全リセットを2回利用できます')).toBeTruthy();
    expect(screen.getByRole('button', { name: '使用量を更新' })).toBeTruthy();
    fireEvent.click(screen.getByText('無効にする'));
    expect(store.get(hiddenGutterItemsAtom)).toContain('codex-usage');
  });

  it('keeps custom durations and unknown slots while localizing labels', async () => {
    await i18next.changeLanguage('ja');
    const t = i18next.t.bind(i18next);
    const window: CodexUsageWindow = { slot: 'secondary', usedPercent: 10, windowDurationMins: 90, resetsAt: null };
    expect(localizeCodexWindowLabel(window, t)).toBe('副使用枠');
    expect(localizeCodexWindowSubtitle(window, t)).toBe('90分間の枠');
    expect(localizeCodexWindowSubtitle({ ...window, windowDurationMins: 43200 }, t)).toBe('30日間の枠');
    expect(localizeCodexWindowLabel({ ...window, windowDurationMins: 525600 }, t)).toBe('年次');
    expect(localizeUsageResetTime('2d 3h', t)).toBe('2日3時間');
    expect(localizeUsageResetTime('1h 4m', t)).toBe('1時間4分');
    expect(localizeUsageResetTime('Unknown', t)).toBe('不明');
    expect(localizeUsageResetTime('Now', t)).toBe('現在');
  });

  it('translates gutter section headings but preserves extension labels and item IDs', async () => {
    await i18next.changeLanguage('ja');
    const toggle = vi.fn();
    render(<CustomizeGutterPopover
      x={0} y={0}
      items={[{ id: 'extension.example', section: 'panels', icon: 'extension', label: 'Example Extension', hideable: true }]}
      hiddenIds={[]} sectionOrder={{}} canHide={() => true}
      onToggleHidden={toggle} onReorder={() => {}} onReset={() => {}} onClose={() => {}}
    />);
    expect(screen.getByText('パネル')).toBeTruthy();
    expect(screen.getByText('Example Extension')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Example Extensionを非表示' }));
    expect(toggle).toHaveBeenCalledWith('extension.example');
  });
});
