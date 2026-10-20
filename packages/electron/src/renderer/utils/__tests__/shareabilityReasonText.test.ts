import { describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { getShareabilityReasonText } from '../shareabilityReasonText';

describe('getShareabilityReasonText', () => {
  it('uses the localized reason key and preserves interpolation values', () => {
    const t = vi.fn((key: string, params?: Record<string, unknown>) =>
      `${key}:${JSON.stringify(params ?? {})}`) as unknown as TFunction;

    const message = getShareabilityReasonText(t, {
      code: 'conflicting_editors',
      params: { suffix: '.md', owners: 'Editor A, Editor B' },
    });

    expect(t).toHaveBeenCalledWith('files:shareability.conflicting_editors', {
      suffix: '.md',
      owners: 'Editor A, Editor B',
    });
    expect(message).toContain('files:shareability.conflicting_editors');
  });

  it('localizes missing extension placeholders', () => {
    const t = vi.fn((key: string) => key.endsWith('unknown_extension') ? '不明な拡張機能' : key) as unknown as TFunction;

    const message = getShareabilityReasonText(t, {
      code: 'missing_custom_editor',
      params: { suffix: '.example' },
    });

    expect(t).toHaveBeenCalledWith('files:shareability.unknown_extension');
    expect(t).toHaveBeenCalledWith('files:shareability.missing_custom_editor', {
      suffix: '.example',
      extension: '不明な拡張機能',
    });
    expect(message).toBe('files:shareability.missing_custom_editor');
  });
});
