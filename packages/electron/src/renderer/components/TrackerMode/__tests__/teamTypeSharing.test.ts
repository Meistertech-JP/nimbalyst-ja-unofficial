// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { globalRegistry } from '@nimbalyst/tracker-schema';
import { parseBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models/ModelLoader';

const mocks = vi.hoisted(() => ({
  showInfo: vi.fn(),
  showError: vi.fn(),
  getLocalizedText: vi.fn((_namespace: string, key: string) => `ja:${key}`),
  promoteToTeam: vi.fn(),
  requestConfirmation: vi.fn(async () => true),
}));

vi.mock('../../../services/ErrorNotificationService', () => ({ errorNotificationService: mocks }));
vi.mock('@nimbalyst/runtime/store', () => ({ store: { get: vi.fn(() => 3) } }));
vi.mock('@nimbalyst/runtime/plugins/TrackerPlugin', () => ({ trackerItemCountByTypeAtom: vi.fn(() => 'count-atom') }));
vi.mock('@nimbalyst/runtime/plugins/TrackerPlugin/models/trackerLifecycle', () => ({
  resolveTrackerPromotionEligibility: vi.fn(() => ({ canPromote: true })),
}));
vi.mock('../../../dialogs/requestConfirmation', () => ({ requestConfirmation: mocks.requestConfirmation }));

import { shareTrackerTypeWithTeam } from '../teamTypeSharing';

describe('shareTrackerTypeWithTeam notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requestConfirmation.mockResolvedValue(true);
    mocks.promoteToTeam.mockResolvedValue({
      success: true,
      promotion: { publishedCount: 2, pendingKeyCount: 1 },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { electronAPI: { trackerLifecycle: { promoteToTeam: mocks.promoteToTeam } } },
    });
  });

  it.each([['ja', 'プランをチームと共有しますか？'], ['en', 'Share Plans with your team?']] as const)(
    'localizes the builtin name in the %s sharing confirmation without changing its identity', async (language, title) => {
      const model = structuredClone(parseBuiltinTrackers().find(seed => seed.type === 'plan')!);
      model.sharing = 'personal';
      globalRegistry.register(model, true);
      const before = JSON.stringify(model);
      const i18n = await createI18nInstance(language);
      mocks.requestConfirmation.mockResolvedValueOnce(false);
      await shareTrackerTypeWithTeam('/workspace', model, i18n.getFixedT(language, 'tracker'));
      expect(mocks.requestConfirmation).toHaveBeenCalledWith(expect.objectContaining({ title }));
      expect(JSON.stringify(model)).toBe(before);
      expect(mocks.promoteToTeam).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['ja', '課題をチームと共有しますか？', '3件すべて', 'チームと共有'],
    ['en', 'Share 課題 with your team?', 'All 3 items', 'Share with team'],
  ] as const)('localizes the %s confirmation and does not share after cancellation', async (language, title, itemLabel, confirmLabel) => {
    const i18n = await createI18nInstance(language);
    mocks.requestConfirmation.mockResolvedValueOnce(false);
    const model = { type: 'issue', displayNamePlural: '課題', sharing: 'personal' } as never;

    await expect(shareTrackerTypeWithTeam('/workspace', model, i18n.getFixedT(language, 'tracker'))).resolves.toBe(false);

    expect(mocks.requestConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      title,
      message: expect.stringContaining(itemLabel),
      confirmLabel,
    }));
    expect(mocks.promoteToTeam).not.toHaveBeenCalled();
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
