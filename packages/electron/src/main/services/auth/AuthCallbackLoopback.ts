import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Socket } from 'node:net';

import { AUTH_FLOW_TTL_MS } from './PendingAuthFlowLedger';
import { getMainI18n, translateMainDialogLabel } from '../../i18n/mainI18n';

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]!);
}

/** Read locale at response time: a pending sign-in can outlive a UI language change. */
function callbackHtml(success: boolean): string {
  const locale = getMainI18n()?.resolvedLanguage === 'ja' ? 'ja' : 'en';
  const title = success
    ? translateMainDialogLabel('auth_callback.success_title', 'Nimbalyst sign-in')
    : translateMainDialogLabel('auth_callback.error_title', 'Nimbalyst sign-in error');
  const heading = success
    ? translateMainDialogLabel('auth_callback.success_heading', "You're signed in")
    : translateMainDialogLabel('auth_callback.error_heading', 'Sign-in could not be completed');
  const message = success
    ? translateMainDialogLabel('auth_callback.success_message', 'Return to Nimbalyst.')
    : translateMainDialogLabel('auth_callback.error_message', 'Return to Nimbalyst and try again.');
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><main><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(message)}</p></main></body></html>`;
}

/**
 * The listener only ever serves one local round trip from the browser, so every
 * socket-level wait is short. Without these a stalled local connection keeps the
 * server alive and delays signOut()/before-quit by Node's minute-scale defaults.
 */
const HEADERS_TIMEOUT_MS = 4_000;
const REQUEST_TIMEOUT_MS = 5_000;
const KEEP_ALIVE_TIMEOUT_MS = 1_000;

/** Auth params are a few hundred bytes; a larger body is not our callback. */
const MAX_BODY_BYTES = 64 * 1024;

/** What a routed callback did, so the caller can react to sign-in but not to a secondary account add. */
export interface AuthCallbackOutcome {
  success: boolean;
  /** True when the callback changed the identity personal sync runs as. */
  affectsSyncIdentity: boolean;
}

const FAILED_OUTCOME: AuthCallbackOutcome = { success: false, affectsSyncIdentity: false };

export interface AuthCallbackLoopbackController {
  readonly port: number;
  readonly callbackBaseUrl: string;
  readonly callbackUrl: string;
  renew(): void;
  close(): Promise<void>;
}

interface StartAuthCallbackLoopbackOptions {
  state: string;
  ttlMs?: number;
  onCallback: (url: string) => Promise<AuthCallbackOutcome>;
  onSuccess?: (outcome: AuthCallbackOutcome) => void | Promise<void>;
  onClose?: () => void;
}

function respondPlain(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'close',
  });
  response.end(body);
}

/**
 * Read an `application/x-www-form-urlencoded` body, or null when it exceeds the
 * cap. Tokens arrive in the body (not the query string) so they never land in a
 * URL that could be logged or end up in browser history.
 */
async function readUrlEncodedBody(request: IncomingMessage): Promise<URLSearchParams | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  let oversize = false;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      // Keep draining rather than destroying the socket, so the rejection is
      // actually delivered. `requestTimeout` bounds how long that can take.
      oversize = true;
      chunks.length = 0;
      continue;
    }
    if (!oversize) chunks.push(buffer);
  }
  if (oversize) return null;
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

export async function startAuthCallbackLoopback(
  options: StartAuthCallbackLoopbackOptions,
): Promise<AuthCallbackLoopbackController> {
  const ttlMs = options.ttlMs ?? AUTH_FLOW_TTL_MS;
  let handlingCallback = false;
  let closed = false;
  let timeout: NodeJS.Timeout | null = null;
  const sockets = new Set<Socket>();

  const server: Server = createServer(async (request, response) => {
    const host = request.headers.host;
    const requestUrl = request.url;
    const method = request.method;
    if (!host || !requestUrl || (method !== 'GET' && method !== 'POST')) {
      respondPlain(response, 404, 'Not found');
      return;
    }

    const parsed = new URL(requestUrl, `http://${host}`);
    if (parsed.pathname !== '/auth/callback') {
      respondPlain(response, 404, 'Not found');
      return;
    }

    /**
     * The nonce is checked before anything is consumed. Any local process — or
     * any web page the user has open — can reach this port, and a request with
     * the wrong state must leave the listener alive and unconsumed so the real
     * callback still lands. It answers like a port that serves nothing.
     */
    if (parsed.searchParams.get('state') !== options.state) {
      respondPlain(response, 404, 'Not found');
      return;
    }

    if (handlingCallback) {
      respondPlain(response, 410, translateMainDialogLabel('auth_callback.already_used', 'This sign-in callback has already been used.'));
      return;
    }

    // The server delivers auth params as an auto-submitting form POST: only the
    // nonce is in the URL, the tokens are in the body. Both shapes then go
    // through the same validation path.
    let callbackUrl = parsed;
    if (method === 'POST') {
      let body: URLSearchParams | null;
      try {
        body = await readUrlEncodedBody(request);
      } catch {
        // Cancellation/sign-out destroys in-flight sockets. A truncated body
        // must neither escape this async HTTP handler nor reach auth routing.
        // Never log the body or error, which can contain callback credentials.
        if (!closed && !response.destroyed) {
          respondPlain(response, 400, translateMainDialogLabel('auth_callback.invalid_body', 'Invalid callback body'));
        }
        return;
      }
      if (closed || response.destroyed) return;
      if (!body) {
        respondPlain(response, 413, translateMainDialogLabel('auth_callback.payload_too_large', 'Callback payload too large'));
        return;
      }
      callbackUrl = new URL(parsed.toString());
      for (const [key, value] of body) {
        // The query nonce is the one that was checked; a body copy cannot override it.
        if (key === 'state') continue;
        callbackUrl.searchParams.set(key, value);
      }
    }

    // A POST may have started reading before another request claimed the flow.
    // Recheck after that await so a delayed body cannot invoke routing twice.
    if (handlingCallback) {
      respondPlain(response, 410, translateMainDialogLabel('auth_callback.already_used', 'This sign-in callback has already been used.'));
      return;
    }
    handlingCallback = true;

    let outcome: AuthCallbackOutcome = FAILED_OUTCOME;
    try {
      outcome = await options.onCallback(callbackUrl.toString());
      if (outcome.success) await options.onSuccess?.(outcome);
    } catch {
      outcome = FAILED_OUTCOME;
    }

    response.writeHead(outcome.success ? 200 : 400, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'close',
    });
    response.end(callbackHtml(outcome.success), () => {
      void close();
    });
  });

  server.headersTimeout = HEADERS_TIMEOUT_MS;
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
  server.on('connection', (socket: Socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });

  const armTimeout = (): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => void close(), ttlMs);
    timeout.unref?.();
  };

  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    const stopped = new Promise<void>((resolve) => server.close(() => resolve()));
    // server.close() only stops new connections; a half-open local socket would
    // otherwise hold the close promise open through sign-out and quit.
    for (const socket of sockets) socket.destroy();
    sockets.clear();
    await stopped;
    options.onClose?.();
  };

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    await close();
    throw new Error('Auth callback listener did not receive a TCP port');
  }

  const callbackBaseUrl = `http://127.0.0.1:${address.port}/auth/callback`;
  armTimeout();
  return {
    port: address.port,
    callbackBaseUrl,
    callbackUrl: `${callbackBaseUrl}?state=${encodeURIComponent(options.state)}`,
    renew: armTimeout,
    close,
  };
}
