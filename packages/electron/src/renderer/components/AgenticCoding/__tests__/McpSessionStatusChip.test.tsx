// @vitest-environment jsdom
/**
 * Session header chip for in-session MCP status (NIM-2272 / GH #1089).
 *
 * The reporter's complaint is that a missing tool is indistinguishable from
 * auth failure, a config mismatch, or a server class the app never loaded. So
 * the tests that matter here are about not making a claim the data can't back:
 * hide on providers with no MCP channel, hide before the session has a live
 * provider, and put the "never reached this session" rows first when they exist.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpSessionStatusSnapshot } from '@nimbalyst/runtime/types/MCPServerConfig';
import { mcpSessionStatusAtomFamily } from '../../../store/atoms/mcpStatus';
import { sessionStoreAtom } from '../../../store/atoms/sessions';
import { settingAtom } from '../../../store/atoms/settingAtomFamily';
import { ActiveSessionMcpStatusChip, McpSessionStatusChip } from '../McpSessionStatusChip';

// Minimal floating-ui stand-in. useClick's real job — toggling open state from
// the reference element's click — is preserved so the popover assertions below
// exercise the component's own open/close wiring rather than a mock's.
const floatingState = vi.hoisted(() => ({
  current: null as null | { open?: boolean; onOpenChange?: (v: boolean) => void },
}));

vi.mock('@floating-ui/react', () => ({
  autoUpdate: vi.fn(),
  flip: vi.fn(() => ({ name: 'flip' })),
  FloatingPortal: ({ children }: { children: React.ReactNode }) => children,
  offset: vi.fn(() => ({ name: 'offset' })),
  shift: vi.fn(() => ({ name: 'shift' })),
  useClick: vi.fn(() => ({})),
  useDismiss: vi.fn(() => ({})),
  useRole: vi.fn(() => ({})),
  useFloating: vi.fn((options: { open?: boolean; onOpenChange?: (v: boolean) => void }) => {
    floatingState.current = options;
    return {
      refs: { setReference: vi.fn(), setFloating: vi.fn() },
      floatingStyles: {},
      context: options,
    };
  }),
  useInteractions: vi.fn(() => ({
    getReferenceProps: (props: Record<string, unknown> = {}) => ({
      ...props,
      onClick: () => {
        const ctx = floatingState.current;
        ctx?.onOpenChange?.(!ctx.open);
      },
    }),
    getFloatingProps: (props: Record<string, unknown> = {}) => props,
  })),
}));

const SESSION_ID = 'session-1';
let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

function snapshot(overrides: Partial<McpSessionStatusSnapshot> = {}): McpSessionStatusSnapshot {
  return {
    sessionId: SESSION_ID,
    supported: true,
    active: true,
    servers: [{ name: 'trackers', state: 'connected', scope: 'local', toolCount: 18 }],
    lastCheckedAt: Date.now(),
    ...overrides,
  };
}

function renderChip(
  initial: McpSessionStatusSnapshot | null,
  provider = 'claude-code',
  i18n: typeof englishI18n = englishI18n,
) {
  const store = createStore();
  if (initial) store.set(mcpSessionStatusAtomFamily(SESSION_ID), initial);
  const result = render(
    <I18nextProvider i18n={i18n}>
      <JotaiProvider store={store}>
        <McpSessionStatusChip sessionId={SESSION_ID} provider={provider} />
      </JotaiProvider>
    </I18nextProvider>,
  );
  return { store, ...result };
}

describe('McpSessionStatusChip', () => {
  beforeEach(() => {
    (window as any).electronAPI = {
      aiGetMcpSessionStatus: vi.fn(async () => null),
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    delete (window as any).electronAPI;
  });

  it('renders nothing for a provider with no MCP status channel', async () => {
    renderChip(snapshot(), 'openai-codex');

    expect(screen.queryByTestId('mcp-session-status-chip')).toBeNull();
    // And it must not even ask — an unsupported provider is decided by type.
    expect((window as any).electronAPI.aiGetMcpSessionStatus).not.toHaveBeenCalled();
  });

  it('renders nothing before the session has a live provider', async () => {
    renderChip(snapshot({ active: false, servers: [] }));

    await waitFor(() =>
      expect((window as any).electronAPI.aiGetMcpSessionStatus).toHaveBeenCalled(),
    );
    expect(screen.queryByTestId('mcp-session-status-chip')).toBeNull();
  });

  it('renders a quiet total when every server is connected', async () => {
    renderChip(snapshot());

    expect(screen.getByTestId('mcp-session-status-chip').textContent).toContain('MCP 1');
  });

  it('shows a connected/total count when something is not available', async () => {
    renderChip(
      snapshot({
        servers: [
          { name: 'trackers', state: 'connected', scope: 'local', toolCount: 18 },
          { name: 'atlassian', state: 'needs-auth', scope: 'user' },
          { name: 'google-drive', state: 'absent' },
        ],
      }),
    );

    expect(screen.getByTestId('mcp-session-status-chip').textContent).toContain('MCP 1/3');
  });

  it('pulls on mount, since no push listener exists until a message is sent', async () => {
    const pulled = snapshot({
      servers: [{ name: 'posthog', state: 'connected', scope: 'user', toolCount: 6 }],
    });
    (window as any).electronAPI.aiGetMcpSessionStatus = vi.fn(async () => pulled);

    renderChip(null);

    await waitFor(() =>
      screen.getByTestId('mcp-session-status-chip'),
    );
    expect((window as any).electronAPI.aiGetMcpSessionStatus).toHaveBeenCalledWith(
      SESSION_ID,
      'claude-code',
    );
  });

  it('keeps the last known list when a pull fails rather than blanking the surface', async () => {
    (window as any).electronAPI.aiGetMcpSessionStatus = vi.fn(async () => {
      throw new Error('provider gone');
    });

    renderChip(snapshot());

    await waitFor(() =>
      expect((window as any).electronAPI.aiGetMcpSessionStatus).toHaveBeenCalled(),
    );
    expect(screen.getByTestId('mcp-session-status-chip').textContent).toContain('MCP 1');
  });

  it('leads the popover with servers that never reached the session', async () => {
    renderChip(
      snapshot({
        servers: [
          { name: 'trackers', state: 'connected', scope: 'local', toolCount: 18 },
          { name: 'internal-tools', state: 'failed', scope: 'project', error: 'connection closed' },
          { name: 'google-drive', state: 'absent' },
        ],
      }),
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('mcp-session-status-chip'));
    });

    const popover = await screen.findByTestId('mcp-session-status-popover');
    const names = Array.from(
      popover.querySelectorAll('.mcp-session-status-row-name'),
    ).map((el) => el.textContent);
    expect(names).toEqual(['google-drive', 'internal-tools', 'trackers']);

    expect(popover.textContent).toContain('Configured but never reached this session');
    expect(popover.textContent).toContain('Failed - connection closed');
    expect(popover.textContent).toContain('18 tools');
  });

  it('scopes its claim to what Nimbalyst passed, not every configured server', async () => {
    renderChip(snapshot());

    await act(async () => {
      fireEvent.click(screen.getByTestId('mcp-session-status-chip'));
    });

    const popover = await screen.findByTestId('mcp-session-status-popover');
    expect(popover.textContent).toContain(
      'Servers the CLI reads from its own settings may not appear here',
    );
  });

  it('says so plainly when no poll has happened yet', async () => {
    renderChip(snapshot({ lastCheckedAt: null }));

    await act(async () => {
      fireEvent.click(screen.getByTestId('mcp-session-status-chip'));
    });

    const popover = await screen.findByTestId('mcp-session-status-popover');
    expect(popover.textContent).toContain('not checked yet');
  });

  it('localizes the status popover, details, tooltip, and accessible labels', async () => {
    renderChip(snapshot({
      lastCheckedAt: null,
      servers: [
        { name: 'google-drive', state: 'absent' },
        { name: 'atlassian', state: 'needs-auth' },
        { name: 'trackers', state: 'connected', scope: 'local', toolCount: 2 },
      ],
    }), 'claude-code', japaneseI18n);

    const chip = screen.getByRole('button', { name: 'MCPサーバーの状態：MCP 1/3' });
    expect(chip.getAttribute('title')).toBe('このセッションのMCPサーバー');

    await act(async () => {
      fireEvent.click(chip);
    });

    const popover = await screen.findByTestId('mcp-session-status-popover');
    expect(popover.getAttribute('aria-label')).toBe('MCPサーバーの状態');
    expect(popover.textContent).toContain('MCPサーバー');
    expect(popover.textContent).toContain('未確認');
    expect(popover.textContent).toContain('利用不可');
    expect(popover.textContent).toContain('設定されていますが、このセッションでは一度も接続されていません');
    expect(popover.textContent).toContain('認証が必要です');
    expect(popover.textContent).toContain('接続済み');
    expect(popover.textContent).toContain('2個のツール');
    expect(popover.textContent).toContain('この一覧には、Nimbalystがこのセッションに渡したサーバーが表示されます。');
    expect(popover.textContent).toContain('CLIが独自の設定から読み込むサーバーは表示されない場合があります。');
  });
});

/**
 * The chip ships off by default, behind the "Show MCP Server Status" setting.
 * A regression here is silent — the surface just quietly appears for everyone —
 * so the default-off case is asserted explicitly rather than implied.
 */
describe('ActiveSessionMcpStatusChip setting gate', () => {
  beforeEach(() => {
    (window as any).electronAPI = {
      aiGetMcpSessionStatus: vi.fn(async () => snapshot()),
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    delete (window as any).electronAPI;
  });

  function renderGated(options: { visible?: boolean; withProvider?: boolean } = {}) {
    const { visible = false, withProvider = true } = options;
    const store = createStore();
    // Direct primitive write; the real atom would round-trip through IPC.
    store.set(settingAtom('ai.showMcpSessionStatus'), visible);
    store.set(mcpSessionStatusAtomFamily(SESSION_ID), snapshot());
    if (withProvider) {
      store.set(sessionStoreAtom(SESSION_ID), { id: SESSION_ID, provider: 'claude-code' } as any);
    }
    return render(
      <JotaiProvider store={store}>
        <ActiveSessionMcpStatusChip sessionId={SESSION_ID} />
      </JotaiProvider>,
    );
  }

  it('renders nothing when the setting is off', async () => {
    renderGated({ visible: false });

    expect(screen.queryByTestId('mcp-session-status-chip')).toBeNull();
    // Gated before mount, so a hidden chip costs no IPC either.
    expect((window as any).electronAPI.aiGetMcpSessionStatus).not.toHaveBeenCalled();
  });

  it('renders the chip once the setting is on', async () => {
    renderGated({ visible: true });

    await waitFor(() =>
      screen.getByTestId('mcp-session-status-chip'),
    );
  });

  it('stays hidden with the setting on but no provider resolved yet', async () => {
    renderGated({ visible: true, withProvider: false });

    expect(screen.queryByTestId('mcp-session-status-chip')).toBeNull();
  });
});
