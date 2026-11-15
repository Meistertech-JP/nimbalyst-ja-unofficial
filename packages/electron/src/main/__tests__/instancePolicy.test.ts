// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { allowsMultipleInstances } from '../utils/instancePolicy';
describe('instance lock policy', () => {
  it('keeps the lock for both default and explicitly selected profiles', () => {
    expect(allowsMultipleInstances({})).toBe(false);
    expect(allowsMultipleInstances({ NIMBALYST_USER_DATA_DIR: '/isolated/profile' })).toBe(false);
  });
  it('preserves the explicit Playwright harness bypass', () => {
    expect(allowsMultipleInstances({ PLAYWRIGHT: '1' })).toBe(true);
  });
});
