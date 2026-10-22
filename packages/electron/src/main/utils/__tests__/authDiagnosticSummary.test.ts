// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { summarizeAuthDiagnostic, summarizeAuthRejection, summarizeDeepLink, summarizeStartupArguments } from '../authDiagnosticSummary';
import { formatLogArgs } from '../formatLogArgs';

describe('authentication diagnostic projections', () => {
  it.each([
    'session_token', 'session_jwt', 'token', 'stytch_token', 'oauth_state', 'state',
    'code', 'jwt', 'access_token', 'refresh_token', 'error_description', 'future_parameter', 'TOKEN',
  ])('never logs the value of the %s callback parameter', (key) => {
    const secret = `synthetic-private-${key}-value`;
    const logged = formatLogArgs(['[DeepLink] open-url event:', summarizeDeepLink(`nimbalyst://auth/callback?${key}=${encodeURIComponent(secret)}`)]);
    expect(logged).not.toContain(secret);
  });

  it.each([
    'nimbalyst://auth/callback#synthetic-private-value',
    'nimbalyst://synthetic-private-value:password@auth/callback',
    'nimbalyst://auth/synthetic-private-value',
    'nimbalyst://synthetic-private-value/callback',
    'nimbalyst://auth/callback?synthetic-private-value=anything',
    'nimbalyst://[malformed?token=synthetic-private-value',
    'not a URL synthetic-private-value',
  ])('does not log untrusted URL components: %s', (input) => {
    const logged = formatLogArgs(['[DeepLink]', summarizeDeepLink(input)]);
    expect(logged).not.toContain('synthetic-private-value');
    expect(logged).not.toContain('password');
    expect(logged).not.toContain(input);
  });

  it.each([
    ['app.exe', '--token', 'synthetic-private-value'],
    ['app.exe', '--token=synthetic-private-value'],
    ['app.exe', 'nimbalyst://auth/callback?code=synthetic-private-value'],
    ['app.exe', 'nimbalyst://[invalid?jwt=synthetic-private-value'],
    ['app.exe', 'synthetic-private-value'],
  ])('logs counts instead of startup argument contents: %j', (...argv) => {
    const logged = formatLogArgs(['[SingleInstance] second-instance event, argv:', summarizeStartupArguments(argv)]);
    expect(logged).not.toContain('synthetic-private-value');
    expect(summarizeStartupArguments(argv)).toEqual({ argumentCount: argv.length });
  });

  it('retains only fixed route classification and aggregate URL metadata', () => {
    expect(summarizeDeepLink('nimbalyst://user:pass@auth/callback?token=a&code=b&code=c#private')).toEqual({
      validUrl: true,
      route: 'auth-callback',
      queryParameterCount: 3,
      hasFragment: true,
      hasUserInfo: true,
    });
  });

  it('does not classify a non-nimbalyst URL as an authentication callback', () => {
    expect(summarizeDeepLink('https://auth/callback?unknown=private')).toEqual({
      validUrl: true, route: 'other', queryParameterCount: 1, hasFragment: false, hasUserInfo: false,
    });
  });

  it('records invalid input without the raw URL or parser exception', () => {
    expect(summarizeDeepLink('nimbalyst://[invalid?token=private')).toEqual({ validUrl: false });
  });

  it.each([
    new Error('synthetic-auth-bait-secret'),
    Object.assign(new Error('failure'), { input: 'nimbalyst://auth/callback?token=synthetic-auth-bait-secret', cause: new Error('synthetic-auth-bait-secret') }),
    { error_description: 'synthetic-auth-bait-secret', session_jwt: 'synthetic-auth-bait-secret' },
    'http://user:synthetic-auth-bait-secret@localhost/auth/callback',
    ['app', '--token', 'synthetic-auth-bait-secret'],
  ])('never logs arbitrary diagnostic data: %j', (details) => {
    const logged = formatLogArgs(['[Auth] diagnostic', summarizeAuthDiagnostic(details)]);
    expect(logged).not.toContain('synthetic-auth-bait-secret');
    expect(summarizeAuthDiagnostic(details)).toEqual({ detailCount: 1 });
  });

  it('retains the number of diagnostic inputs without reading their contents', () => {
    const input = { get message(): never { throw new Error('must not inspect'); } };
    expect(summarizeAuthDiagnostic(input, 'private', new Error('private'))).toEqual({ detailCount: 3 });
  });

  it('preserves only the fixed callback rejection classification', () => {
    const logged = formatLogArgs(['[Auth] rejected', summarizeAuthRejection({ reason: 'server-error', details: { errorDescription: 'synthetic-auth-bait-secret' } })]);
    expect(logged).not.toContain('synthetic-auth-bait-secret');
    expect(summarizeAuthRejection({ reason: 'server-error', details: 'private' })).toEqual({ reason: 'server-error' });
  });

  it('does not pass an unrecognized rejection reason through', () => {
    expect(summarizeAuthRejection({ reason: 'synthetic-auth-bait-secret' })).toEqual({ reason: 'other' });
  });
});
