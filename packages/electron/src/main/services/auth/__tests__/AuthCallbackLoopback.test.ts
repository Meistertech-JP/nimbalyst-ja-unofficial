// @vitest-environment node
import { once } from 'node:events';
import { request } from 'node:http';
import { connect } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { startAuthCallbackLoopback, type AuthCallbackLoopbackController } from '../AuthCallbackLoopback';
import { routeAuthCallbackUrl } from '../AuthCallbackRouting';
import { PendingAuthFlowLedger } from '../PendingAuthFlowLedger';
import { createMainI18nController, type MainI18nController } from '../../../i18n/mainI18n';

describe('auth callback loopback listener', () => {
  let controller: AuthCallbackLoopbackController | null = null;
  let languageController: MainI18nController | null = null;

  afterEach(async () => {
    await controller?.close();
    controller = null;
    languageController?.dispose();
    languageController = null;
    vi.restoreAllMocks();
  });

  async function startFlow() {
    const ledger = new PendingAuthFlowLedger();
    const nonce = ledger.createNonce();
    const handleCallback = vi.fn(async () => ({ affectsSyncIdentity: false }));
    const onSuccess = vi.fn();
    controller = await startAuthCallbackLoopback({
      state: nonce,
      onCallback: async (url) => {
        const result = await routeAuthCallbackUrl(url, ledger, handleCallback);
        return {
          success: result.success,
          affectsSyncIdentity: result.success ? result.affectsSyncIdentity : false,
        };
      },
      onSuccess,
    });
    ledger.register(nonce, {
      intent: 'add-account',
      method: 'google',
      port: controller.port,
    });
    return { ledger, nonce, handleCallback, onSuccess };
  }

  for (const locale of ['ja', 'en'] as const) {
    for (const success of [true, false]) {
      it(`renders the ${success ? 'success' : 'error'} page in ${locale} after a UI language change`, async () => {
        let emit!: (key: 'app.uiLanguage', value: unknown) => void;
        languageController = await createMainI18nController({
          get: () => locale === 'ja' ? 'en' : 'ja',
          subscribe: (listener) => { emit = listener; return () => undefined; },
        }, 'en-US', () => undefined);
        controller = await startAuthCallbackLoopback({
          state: 'dummy-localized', onCallback: async () => ({ success, affectsSyncIdentity: false }),
        });
        emit('app.uiLanguage', locale);
        await vi.waitFor(() => expect(languageController!.i18n.resolvedLanguage).toBe(locale));
        const response = await fetch(controller.callbackUrl);
        const html = await response.text();
        expect(response.status).toBe(success ? 200 : 400);
        expect(html).toContain(`<html lang="${locale}">`);
        expect(html).toContain(`<title>${locale === 'ja' ? success ? 'Nimbalystへのログイン' : 'Nimbalystへのログインエラー' : success ? 'Nimbalyst sign-in' : 'Nimbalyst sign-in error'}</title>`);
        expect(html).toContain(`<h1>${locale === 'ja' ? success ? 'ログインしました' : 'ログインを完了できませんでした' : success ? 'You&#39;re signed in' : 'Sign-in could not be completed'}</h1>`);
        expect(html).toContain(`<p>${locale === 'ja' ? success ? 'Nimbalystに戻ってください。' : 'Nimbalystに戻って、もう一度お試しください。' : success ? 'Return to Nimbalyst.' : 'Return to Nimbalyst and try again.'}</p>`);
        expect(response.headers.get('cache-control')).toBe('no-store');
      });
    }
    it(`localizes oversized and already-used refusals in ${locale}`, async () => {
      languageController = await createMainI18nController({ get: () => locale, subscribe: () => () => undefined }, 'en-US', () => undefined);
      let entered!: () => void;
      const started = new Promise<void>((resolve) => { entered = resolve; });
      let release!: () => void;
      const pending = new Promise<void>((resolve) => { release = resolve; });
      controller = await startAuthCallbackLoopback({
        state: 'dummy-localized-refusal',
        onCallback: async () => { entered(); await pending; return { success: true, affectsSyncIdentity: false }; },
      });
      const oversized = await fetch(controller.callbackUrl, { method: 'POST', body: 'x'.repeat(70 * 1024) });
      expect(oversized.status).toBe(413);
      expect(await oversized.text()).toBe(locale === 'ja' ? 'コールバックのデータが大きすぎます' : 'Callback payload too large');
      const first = fetch(controller.callbackUrl);
      try {
        await started;
        const replay = await fetch(controller.callbackUrl);
        expect(replay.status).toBe(410);
        expect(replay.headers.get('cache-control')).toBe('no-store');
        expect(await replay.text()).toBe(locale === 'ja' ? 'このログイン用コールバックはすでに使用されています。' : 'This sign-in callback has already been used.');
      } finally {
        release();
        const winner = await first;
        expect(winner.status).toBe(200);
        await winner.text();
      }
    });
  }

  it('escapes translated page title, heading and message as HTML text', async () => {
    languageController = await createMainI18nController({ get: () => 'ja', subscribe: () => () => undefined }, 'en-US', () => undefined);
    const i18n = languageController.i18n;
    const keys = ['success_title', 'success_heading', 'success_message'];
    const originals = keys.map((key) => i18n.getResource('ja', 'dialogs', `auth_callback.${key}`));
    const payload = '<script id="localization-injection">\'&</script>';
    const escaped = '&lt;script id=&quot;localization-injection&quot;&gt;&#39;&amp;&lt;/script&gt;';
    try {
      for (const key of keys) i18n.addResource('ja', 'dialogs', `auth_callback.${key}`, payload);
      controller = await startAuthCallbackLoopback({ state: 'dummy-escape', onCallback: async () => ({ success: true, affectsSyncIdentity: false }) });
      const response = await fetch(controller.callbackUrl);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain(`<title>${escaped}</title>`);
      expect(html).toContain(`<h1>${escaped}</h1>`);
      expect(html).toContain(`<p>${escaped}</p>`);
      expect(html).not.toContain(payload);
    } finally {
      keys.forEach((key, index) => i18n.addResource('ja', 'dialogs', `auth_callback.${key}`, originals[index]));
    }
  });

  it('serves one successful callback, routes its params, and closes', async () => {
    const { handleCallback, onSuccess } = await startFlow();
    const response = await fetch(
      `${controller!.callbackUrl}&session_token=token&session_jwt=a.b.c&user_id=member&email=user%40example.com&org_id=personal-org`,
    );

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Nimbalyst sign-in</title>');
    expect(html).toContain('You&#39;re signed in');
    expect(handleCallback).toHaveBeenCalledWith(expect.objectContaining({
      intent: 'add-account',
      sessionToken: 'token',
      sessionJwt: 'a.b.c',
      userId: 'member',
      email: 'user@example.com',
      orgId: 'personal-org',
    }));
    expect(onSuccess).toHaveBeenCalledOnce();
    await expect(fetch(controller!.callbackUrl)).rejects.toThrow();
  });

  /**
   * Any local process — or any web page the user has open — can reach this
   * port. A request without the flow's nonce must not consume the one-shot
   * listener, or the real callback arrives to find it closed.
   */
  it('leaves the listener usable after a request with no nonce', async () => {
    const { handleCallback, onSuccess } = await startFlow();
    const response = await fetch(
      `${controller!.callbackBaseUrl}?session_token=token&org_id=personal-org`,
    );

    expect(response.status).toBe(404);
    expect(handleCallback).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();

    const real = await fetch(
      `${controller!.callbackUrl}&session_token=token&org_id=personal-org`,
    );
    expect(real.status).toBe(200);
    expect(handleCallback).toHaveBeenCalledOnce();
  });

  it('feeds server errors and missing org_id through callback validation', async () => {
    const errorFlow = await startFlow();
    const errorResponse = await fetch(`${controller!.callbackUrl}&error=oauth_failed&error_description=Denied`);
    expect(errorResponse.status).toBe(400);
    expect(errorFlow.handleCallback).not.toHaveBeenCalled();
    await controller!.close();
    controller = null;

    const missingOrgFlow = await startFlow();
    const missingOrgResponse = await fetch(`${controller!.callbackUrl}&session_token=token`);
    expect(missingOrgResponse.status).toBe(400);
    expect(missingOrgFlow.handleCallback).not.toHaveBeenCalled();
  });

  it('rejects a wrong nonce and still serves the real callback afterwards', async () => {
    const { ledger, nonce, handleCallback, onSuccess } = await startFlow();
    const probe = await fetch(
      `${controller!.callbackBaseUrl}?state=wrong&session_token=token&org_id=personal-org`,
    );

    expect(probe.status).toBe(404);
    expect(handleCallback).not.toHaveBeenCalled();
    expect(ledger.peek(nonce)).not.toBeNull();

    const real = await fetch(
      `${controller!.callbackUrl}&session_token=token&session_jwt=a.b.c&org_id=personal-org`,
    );
    expect(real.status).toBe(200);
    expect(handleCallback).toHaveBeenCalledWith(expect.objectContaining({
      sessionToken: 'token',
      orgId: 'personal-org',
    }));
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  /**
   * The server delivers auth params as an auto-submitting form POST so tokens
   * never appear in a URL: only the nonce rides in the query string.
   */
  it('accepts a form POST whose nonce is in the query and tokens in the body', async () => {
    const { handleCallback, onSuccess } = await startFlow();
    const response = await fetch(controller!.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        session_token: 'token',
        session_jwt: 'a.b.c',
        user_id: 'member',
        email: 'user@example.com',
        org_id: 'personal-org',
      }).toString(),
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('You&#39;re signed in');
    expect(handleCallback).toHaveBeenCalledWith(expect.objectContaining({
      intent: 'add-account',
      sessionToken: 'token',
      sessionJwt: 'a.b.c',
      userId: 'member',
      email: 'user@example.com',
      orgId: 'personal-org',
    }));
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('rejects a POST whose body exceeds the cap without consuming the flow', async () => {
    const { ledger, nonce, handleCallback } = await startFlow();
    const response = await fetch(controller!.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `session_token=${'x'.repeat(70 * 1024)}&org_id=personal-org`,
    });

    expect(response.status).toBe(413);
    expect(handleCallback).not.toHaveBeenCalled();
    expect(ledger.peek(nonce)).not.toBeNull();
  });

  it('rejects legacy nimbalyst callbacks even when they carry a known nonce', async () => {
    const ledger = new PendingAuthFlowLedger();
    const nonce = ledger.createNonce();
    ledger.register(nonce, { intent: 'sign-in', method: 'google', port: 4400 });
    const handleCallback = vi.fn(async () => ({ affectsSyncIdentity: false }));

    await expect(routeAuthCallbackUrl(
      `nimbalyst://auth/callback?state=${nonce}&session_token=token&org_id=personal-org`,
      ledger,
      handleCallback,
    )).resolves.toEqual({ success: false, reason: 'not-loopback' });
    expect(handleCallback).not.toHaveBeenCalled();
    expect(ledger.peek(nonce)).not.toBeNull();
  });

  it('closes the listener when its TTL expires', async () => {
    let closed!: () => void;
    const closedPromise = new Promise<void>((resolve) => {
      closed = resolve;
    });
    controller = await startAuthCallbackLoopback({
      state: 'short-lived',
      ttlMs: 20,
      onCallback: async () => ({ success: true, affectsSyncIdentity: true }),
      onClose: closed,
    });

    await closedPromise;
    await expect(fetch(controller.callbackUrl)).rejects.toThrow();
  });

  it('uses a distinct ephemeral IPv4 loopback port for each active flow', async () => {
    await startFlow();
    const first = controller!;
    const second = await startAuthCallbackLoopback({
      state: 'another-dummy-flow',
      onCallback: async () => ({ success: true, affectsSyncIdentity: false }),
    });
    try {
      expect(first.port).toBeGreaterThan(0);
      expect(second.port).toBeGreaterThan(0);
      expect(first.port).not.toBe(second.port);
      for (const listener of [first, second]) {
        const url = new URL(listener.callbackUrl);
        expect(url.protocol).toBe('http:');
        expect(url.hostname).toBe('127.0.0.1');
        expect(Number(url.port)).toBe(listener.port);
      }
    } finally {
      await second.close();
    }
  });

  it('does not allow a POST body to replace the validated query nonce', async () => {
    const { handleCallback } = await startFlow();
    const rejected = await fetch(`${controller!.callbackBaseUrl}?state=wrong`, {
      method: 'POST',
      body: new URLSearchParams({ state: new URL(controller!.callbackUrl).searchParams.get('state')!, session_token: 'dummy', org_id: 'dummy-org' }),
    });
    expect(rejected.status).toBe(404);
    expect(handleCallback).not.toHaveBeenCalled();
    const accepted = await fetch(controller!.callbackUrl, {
      method: 'POST',
      body: new URLSearchParams({ state: 'wrong-body-state', session_token: 'dummy', org_id: 'dummy-org' }),
    });
    expect(accepted.status).toBe(200);
    expect(handleCallback).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ sessionToken: 'dummy', orgId: 'dummy-org' }));
  });

  it('rejects replay while the first callback is still being applied', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let entered!: () => void;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const callback = vi.fn(async () => {
      entered();
      await pending;
      return { success: true, affectsSyncIdentity: false };
    });
    controller = await startAuthCallbackLoopback({ state: 'dummy-one-shot', onCallback: callback });
    const first = fetch(controller.callbackUrl);
    try {
      await started;
      const replay = await fetch(controller.callbackUrl);
      expect(replay.status).toBe(410);
      expect(callback).toHaveBeenCalledOnce();
    } finally {
      release();
      const response = await first;
      expect(response.status).toBe(200);
      await response.text();
    }
  });

  it('cancels idle sockets and closes only once without accepting a callback', async () => {
    const callback = vi.fn(async () => ({ success: true, affectsSyncIdentity: false }));
    const onClose = vi.fn();
    controller = await startAuthCallbackLoopback({ state: 'dummy-cancel', onCallback: callback, onClose });
    const socket = connect(controller.port, '127.0.0.1');
    try {
      await once(socket, 'connect');
      const disconnected = once(socket, 'close');
      await controller.close();
      await disconnected;
      await controller.close();
      expect(onClose).toHaveBeenCalledOnce();
      expect(callback).not.toHaveBeenCalled();
      await expect(fetch(controller.callbackUrl)).rejects.toThrow();
    } finally {
      socket.destroy();
    }
  });

  it('does not echo dummy tokens or callback exception details in responses or logs', async () => {
    const logs = ['log', 'warn', 'error', 'info', 'debug'].map((method) => vi.spyOn(console, method as 'log').mockImplementation(() => {}));
    const dummySecret = 'R10_DUMMY_TOKEN_NOT_A_REAL_CREDENTIAL';
    controller = await startAuthCallbackLoopback({
      state: 'dummy-redaction',
      onCallback: async () => { throw new Error(dummySecret); },
    });
    const response = await fetch(controller.callbackUrl, {
      method: 'POST',
      body: new URLSearchParams({ session_token: dummySecret, org_id: 'dummy-org' }),
    });
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toContain(dummySecret);
    for (const log of logs) expect(JSON.stringify(log.mock.calls)).not.toContain(dummySecret);
  });

  it('cancels a partially received POST without invoking the callback or leaking a rejected read', async () => {
    const callback = vi.fn(async () => ({ success: true, affectsSyncIdentity: false }));
    controller = await startAuthCallbackLoopback({ state: 'dummy-partial', onCallback: callback });
    const socket = connect(controller.port, '127.0.0.1');
    try {
      await once(socket, 'connect');
      const continued = once(socket, 'data');
      const sent = new Promise<void>((resolve, reject) => socket.write(
        'POST /auth/callback?state=dummy-partial HTTP/1.1\r\n'
        + `Host: 127.0.0.1:${controller!.port}\r\n`
        + 'Content-Type: application/x-www-form-urlencoded\r\n'
        + 'Expect: 100-continue\r\n'
        + 'Content-Length: 1000\r\n\r\nsession_token=dummy-incomplete',
        (error) => error ? reject(error) : resolve(),
      ));
      await sent;
      // The actual HTTP handshake proves server dispatch, not a timing guess.
      expect(String((await continued)[0])).toContain('100 Continue');
      const disconnected = once(socket, 'close');
      await controller.close();
      await disconnected;
      await new Promise((resolve) => setImmediate(resolve));
      expect(callback).not.toHaveBeenCalled();
      await expect(fetch(controller.callbackUrl)).rejects.toThrow();
    } finally {
      socket.destroy();
    }
  });

  it('rejects a POST that finishes reading after another callback has claimed the nonce', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let entered!: () => void;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const callback = vi.fn(async () => {
      entered();
      await pending;
      return { success: true, affectsSyncIdentity: false };
    });
    controller = await startAuthCallbackLoopback({ state: 'dummy-post-race', onCallback: callback });
    const body = 'session_token=dummy&org_id=dummy-org';
    const slow = request(controller.callbackUrl, {
      method: 'POST', timeout: 3000,
      headers: { 'Content-Length': Buffer.byteLength(body), Expect: '100-continue' },
    });
    const slowResponse = new Promise<number | Error>((resolve) => {
      slow.on('response', (response) => { response.resume(); resolve(response.statusCode!); });
      slow.on('error', resolve);
    });
    slow.on('timeout', () => slow.destroy(new Error('Callback response deadline exceeded')));
    const continued = once(slow, 'continue');
    slow.flushHeaders();
    await continued;
    slow.write(body.slice(0, 8));
    const first = fetch(controller.callbackUrl).then((response) => response.status, (error: Error) => error);
    try {
      await started;
      slow.end(body.slice(8));
      expect(await slowResponse).toBe(410);
      expect(callback).toHaveBeenCalledOnce();
    } finally {
      release();
      expect(await first).toBe(200);
      await slowResponse;
      slow.destroy();
    }
  });
});
