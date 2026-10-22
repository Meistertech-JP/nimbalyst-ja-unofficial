/**
 * Regression test for issue #276.
 *
 * Before: when `useAtomValue(interactiveWidgetHostAtom(sessionId))` captured
 * a null host (transient state during SessionTranscript's effect re-run, or
 * a session view that hadn't installed a host yet), ToolPermissionWidget
 * returned an early non-interactive shell at the "host is null" branch.
 * The user saw "Waiting..." with no Allow/Deny/Cancel buttons and was
 * stuck indefinitely. benv-nti reported 10+ minutes stuck on v0.58.21 for
 * a `gh api repos/.../contents/...` permission request.
 *
 * After: the widget renders the full interactive UI even when host is null.
 * A visible "Reconnecting to permission backend" note is shown so the user
 * has a clue, and the buttons stay clickable; the click handlers fall back
 * to getInteractiveWidgetHost(sessionId) for a fresh imperative read at
 * click time.
 */

import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { store } from '../../../../../store/store';
import { setInteractiveWidgetHost } from '../../../../../store/atoms/interactiveWidgetHost';
import { ToolPermissionWidget } from '../ToolPermissionWidget';
import type { InteractiveWidgetHost } from '../InteractiveWidgetHost';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

// Bind each render to the same Jotai store that the test setup writes to,
// and provide the host i18n instance expected by the shared runtime widget.
function renderWithStore(ui: React.ReactElement, language: 'en' | 'ja' = 'en') {
  const i18n = language === 'ja' ? japaneseI18n : englishI18n;
  return render(
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
      <JotaiProvider store={store}>{ui}</JotaiProvider>
    </UiLanguageProvider>,
  );
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    toolCall: {
      providerToolCallId: 'tool-call-1',
      arguments: {
        requestId: 'req-stuck-on-gh-api',
        toolName: 'Bash',
        rawCommand: 'gh api repos/dotnet/skills/contents/plugins/dotnet-upgrade',
        pattern: 'Bash(gh api:*)',
        patternDisplayName: 'gh api commands',
        isDestructive: false,
        warnings: [],
        workspacePath: '/tmp/workspace',
      },
      result: null,
      ...overrides,
    },
  } as any;
}

function makeFakeHost(): InteractiveWidgetHost {
  return {
    toolPermissionSubmit: vi.fn().mockResolvedValue(undefined),
  } as unknown as InteractiveWidgetHost;
}

describe('ToolPermissionWidget — host-null regression (#276)', () => {
  const sessionId = 'session-stuck';

  beforeEach(() => {
    setInteractiveWidgetHost(sessionId, null);
  });

  it('starts a constrained request on deny and offers only one-call approval', async () => {
    const host = makeFakeHost();
    setInteractiveWidgetHost(sessionId, host);
    const message = makeMessage();
    Object.assign(message.toolCall.arguments, { defaultToNo: true, suppressAlwaysAllowRule: true });
    renderWithStore(<ToolPermissionWidget message={message} sessionId={sessionId} isExpanded={false} onToggle={() => {}} />);
    expect(document.activeElement).toBe(screen.getByTestId('tool-permission-deny'));
    expect(screen.queryByTestId('tool-permission-allow-session')).toBeNull();
    expect(screen.queryByTestId('tool-permission-allow-always')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByTestId('tool-permission-allow-once'));
    });
    expect(host.toolPermissionSubmit).toHaveBeenCalledWith('req-stuck-on-gh-api', { decision: 'allow', scope: 'once' });
  });

  it('renders the action buttons even when host is null', () => {
    setInteractiveWidgetHost(sessionId, null);

    renderWithStore(
      <ToolPermissionWidget
        message={makeMessage()}
        sessionId={sessionId}
        isExpanded={false}
        onToggle={() => {}}
      />,
    );

    // Before the fix, the widget short-circuited to a Waiting-only shell.
    // The fix means we should see all four interactive buttons even
    // without a host installed.
    screen.getByTestId('tool-permission-deny');
    screen.getByTestId('tool-permission-allow-once');
    screen.getByTestId('tool-permission-allow-session');
    screen.getByTestId('tool-permission-allow-always');
  });

  it('shows translated permission controls in Japanese', () => {
    renderWithStore(
      <ToolPermissionWidget
        message={makeMessage()}
        sessionId={sessionId}
        isExpanded={false}
        onToggle={() => {}}
      />,
      'ja',
    );

    screen.getByText('このツールを許可しますか？');
    screen.getByRole('button', { name: '一度だけ許可' });
    screen.getByRole('button', { name: '常に許可' });
  });

  it('shows a "Reconnecting to permission backend" note when host is null', () => {
    setInteractiveWidgetHost(sessionId, null);

    renderWithStore(
      <ToolPermissionWidget
        message={makeMessage()}
        sessionId={sessionId}
        isExpanded={false}
        onToggle={() => {}}
      />,
    );

    screen.getByTestId('tool-permission-host-reconnecting');
  });

  it('hides the reconnecting note once a host is installed', () => {
    setInteractiveWidgetHost(sessionId, makeFakeHost());

    renderWithStore(
      <ToolPermissionWidget
        message={makeMessage()}
        sessionId={sessionId}
        isExpanded={false}
        onToggle={() => {}}
      />,
    );

    expect(screen.queryByTestId('tool-permission-host-reconnecting')).toBeNull();
    screen.getByTestId('tool-permission-deny');
  });

  it('does not regress the no-toolCall guard', () => {
    setInteractiveWidgetHost(sessionId, null);

    const { container } = renderWithStore(
      <ToolPermissionWidget
        message={{ toolCall: null } as any}
        sessionId={sessionId}
        isExpanded={false}
        onToggle={() => {}}
      />,
    );

    // Widget returns null when there's no tool call to render
    expect(container.firstChild).toBeNull();
  });
});
