import { describe, expect, it } from 'vitest';
import { AUTOMATIC_UPDATES_ENABLED } from '../autoUpdaterUtils';

describe('unofficial edition update policy', () => {
  it('does not enable the official Nimbalyst update feed', () => {
    expect(AUTOMATIC_UPDATES_ENABLED).toBe(false);
  });
});
