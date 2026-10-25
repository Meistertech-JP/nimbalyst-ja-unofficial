// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const register = vi.hoisted(() => vi.fn());
vi.mock('electron', () => ({
  protocol: { registerSchemesAsPrivileged: register },
}));

import { registerAppSchemes } from '../registerAppSchemes';

describe('renderer protocol privileges', () => {
  it('registers all three fetch-capable schemes in one Electron call without bypassing CSP', () => {
    registerAppSchemes();
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith([
      { scheme: 'nim-asset', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: false, corsEnabled: true } },
      { scheme: 'nim-preview', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: false, corsEnabled: true, codeCache: true } },
      { scheme: 'collab-asset', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: false, corsEnabled: true } },
    ]);
  });
});
