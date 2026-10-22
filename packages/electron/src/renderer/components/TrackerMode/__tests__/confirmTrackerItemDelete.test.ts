// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';

const { requestConfirmation } = vi.hoisted(() => ({ requestConfirmation: vi.fn() }));

vi.mock('../../../dialogs/requestConfirmation', () => ({ requestConfirmation }));

import { confirmTrackerItemDelete } from '../confirmTrackerItemDelete';

describe('confirmTrackerItemDelete', () => {
  beforeEach(() => requestConfirmation.mockReset().mockResolvedValue(true));

  it('uses the Japanese singular confirmation when a translator is provided', async () => {
    const i18n = await createI18nInstance('ja');
    const translate = i18n.getFixedT('ja', 'tracker') as TFunction<'tracker'>;

    await confirmTrackerItemDelete(1, translate);

    expect(requestConfirmation).toHaveBeenCalledWith({
      title: '項目を削除しますか？',
      message: '項目を1件削除しますか？この操作は取り消せません。',
      confirmLabel: '削除',
      destructive: true,
    });
  });

  it('uses the Japanese plural confirmation and retains English fallback without a translator', async () => {
    const i18n = await createI18nInstance('ja');
    const translate = i18n.getFixedT('ja', 'tracker') as TFunction<'tracker'>;

    await confirmTrackerItemDelete(3, translate);
    expect(requestConfirmation).toHaveBeenLastCalledWith({
      title: '項目を削除しますか？',
      message: '項目を3件削除しますか？この操作は取り消せません。',
      confirmLabel: '削除',
      destructive: true,
    });

    await confirmTrackerItemDelete(2);
    expect(requestConfirmation).toHaveBeenLastCalledWith({
      title: 'Delete items?',
      message: 'Delete 2 items? This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
  });
});
