// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { PendingAuthFlowLedger } from '../PendingAuthFlowLedger';

describe('PendingAuthFlowLedger', () => {
  it('creates 256-bit hexadecimal nonces and does not reuse an active nonce', () => {
    const ledger = new PendingAuthFlowLedger();
    const first = ledger.createNonce();
    ledger.register(first, { intent: 'sign-in', method: 'google', port: 4100 });
    const second = ledger.createNonce();
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(second);
    const values = ['collision', 'collision', 'unique'];
    const collisionLedger = new PendingAuthFlowLedger({ createNonce: () => values.shift()! });
    collisionLedger.register(collisionLedger.createNonce(), { intent: 'sign-in', method: 'google', port: 4100 });
    expect(collisionLedger.createNonce()).toBe('unique');
  });

  it('does not consume a nonce for a different listener port, and clears cancelled flows', () => {
    const ledger = new PendingAuthFlowLedger();
    const nonce = ledger.createNonce();
    ledger.register(nonce, { intent: 'sign-in', method: 'google', port: 4100 });
    expect(ledger.consume(nonce, 4200)).toBeNull();
    expect(ledger.peek(nonce)).toMatchObject({ port: 4100 });
    ledger.clear();
    expect(ledger.consume(nonce, 4100)).toBeNull();
  });

  it('rejects unknown and reused nonces', () => {
    const ledger = new PendingAuthFlowLedger({ createNonce: () => 'nonce' });
    expect(ledger.consume('unknown', 4100)).toBeNull();

    const nonce = ledger.createNonce();
    ledger.register(nonce, { intent: 'sign-in', method: 'google', port: 4100 });
    expect(ledger.consume(nonce, 4100)).toMatchObject({ intent: 'sign-in' });
    expect(ledger.consume(nonce, 4100)).toBeNull();
  });

  it('rejects an expired nonce after the 15-minute TTL', () => {
    let now = 1_000;
    const ledger = new PendingAuthFlowLedger({ now: () => now });
    const nonce = ledger.createNonce();
    ledger.register(nonce, { intent: 'add-account', method: 'google', port: 4200 });

    now += 15 * 60 * 1000;
    expect(ledger.consume(nonce, 4200)).toBeNull();
  });

  it('renews the matching magic-link flow when a link is resent', () => {
    let now = 5_000;
    const ledger = new PendingAuthFlowLedger({ now: () => now });
    const nonce = ledger.createNonce();
    ledger.register(nonce, {
      intent: 'reauth',
      targetPersonalOrgId: 'personal-secondary',
      method: 'magicLink',
      port: 4300,
    });

    now += 14 * 60 * 1000;
    const reusable = ledger.find('magicLink', {
      intent: 'reauth',
      targetPersonalOrgId: 'personal-secondary',
    });
    expect(reusable?.nonce).toBe(nonce);
    expect(ledger.renew(nonce)?.startedAt).toBe(now);

    now += 14 * 60 * 1000;
    expect(ledger.consume(nonce, 4300)).toMatchObject({
      intent: 'reauth',
      targetPersonalOrgId: 'personal-secondary',
    });
  });
});
