// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  showInfo: vi.fn(),
  showError: vi.fn(),
  getLocalizedText: vi.fn((_namespace: string, key: string) => `ja:${key}`),
  promoteToTeam: vi.fn(),
}));

vi.mock('../../../services/ErrorNotificationService', () => ({ errorNotificationService: mocks }));
vi.mock('@nimbalyst/runtime/store', () => ({ store: { get: vi.fn(() => 3) } }));
vi.mock('@nimbalyst/runtime/plugins/TrackerPlugin', () => ({ trackerItemCountByTypeAtom: vi.fn(() => 'count-atom') }));
vi.mock('@nimbalyst/runtime/plugins/TrackerPlugin/models/trackerLifecycle', () => ({
  resolveTrackerPromotionEligibility: vi.fn(() => ({ canPromote: true })),
}));
vi.mock('../../../dialogs/requestConfirmation', () => ({ requestConfirmation: vi.fn(async () => true) }));

import { shareTrackerTypeWithTeam } from '../teamTypeSharing';

describe('shareTrackerTypeWithTeam notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.promoteToTeam.mockResolvedValue({
      success: true,
      promotion: { publishedCount: 2, pendingKeyCount: 1 },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { electronAPI: { trackerLifecycle: { promoteToTeam: mocks.promoteToTeam } } },
    });
  });

  it('uses the localized notification service for fixed copy and preserves dynamic counts', async () => {
    const model = { type: 'issue', displayNamePlural: 'Issues', sharing: 'personal' } as never;
    const translate = ((key: string) => key) as never;

    await expect(shareTrackerTypeWithTeam('/workspace', model, translate)).resolves.toBe(true);

    expect(mocks.getLocalizedText).toHaveBeenCalledWith(
      'tracker',
      'config.lifecycle.promoted_title',
      "{{name}} is now your team's",
      { name: 'Issues' },
    );
    expect(mocks.getLocalizedText).toHaveBeenCalledWith(
      'tracker',
      'config.lifecycle.promoted_pending',
      '{{publishedCount}} item(s) published. {{pendingKeyCount}} are waiting on the server for their keys.',
      { publishedCount: 2, pendingKeyCount: 1 },
    );
    expect(mocks.showInfo).toHaveBeenCalledWith(
      'ja:config.lifecycle.promoted_title',
      'ja:config.lifecycle.promoted_pending',
      { duration: 4000 },
    );
  });

  it('retains dynamic errors while localizing the fixed notification title', async () => {
    mocks.promoteToTeam.mockRejectedValue(new Error('server unavailable'));
    const model = { type: 'issue', displayNamePlural: 'Issues', sharing: 'personal' } as never;
    const translate = ((key: string) => key) as never;

    await expect(shareTrackerTypeWithTeam('/workspace', model, translate)).resolves.toBe(false);

    expect(mocks.showError).toHaveBeenCalledWith('ja:config.lifecycle.update_failed', 'server unavailable');
  });
});
