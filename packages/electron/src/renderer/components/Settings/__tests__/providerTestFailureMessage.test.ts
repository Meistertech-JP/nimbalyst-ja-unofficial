import { describe, expect, it } from 'vitest';
import { providerTestFailureMessage } from '../providerTestFailureMessage';

describe('providerTestFailureMessage', () => {
  it('keeps safe provider diagnostics alongside the localized summary', () => {
    expect(providerTestFailureMessage('接続に失敗しました。', 'HTTP 401: invalid model id'))
      .toBe('接続に失敗しました。 HTTP 401: invalid model id');
  });

  it('redacts common credential forms from provider diagnostics', () => {
    const message = providerTestFailureMessage(
      'Connection failed.',
      'HTTP 401 Authorization: Bearer abc.def.ghi; sk-123456789012345678901234',
    );
    expect(message).toContain('HTTP 401');
    expect(message).not.toContain('abc.def.ghi');
    expect(message).not.toContain('sk-123456789012345678901234');
    expect(message).toContain('[REDACTED]');
  });

  it('uses the localized summary when no safe diagnostic is available', () => {
    expect(providerTestFailureMessage('接続に失敗しました。', undefined))
      .toBe('接続に失敗しました。');
  });
});
