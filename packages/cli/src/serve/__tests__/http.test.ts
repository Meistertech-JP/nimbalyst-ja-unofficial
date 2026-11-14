// @vitest-environment node
import type { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import { expect, it } from 'vitest';
import { readBytes } from '../http.js';

function body(chunks: Buffer[], length?: string): IncomingMessage {
  return Object.assign(Readable.from(chunks), {
    headers: {
      'content-type': 'application/octet-stream',
      ...(length === undefined ? {} : { 'content-length': length }),
    },
  }) as unknown as IncomingMessage;
}

it('accepts the exact byte limit across multiple body chunks', async () => {
  expect(await readBytes(body([Buffer.from('ab'), Buffer.from('c')]), 3)).toEqual(new Uint8Array([97, 98, 99]));
});

it('rejects streamed overflow even without a declared Content-Length', async () => {
  await expect(readBytes(body([Buffer.from('ab'), Buffer.from('cd')]), 3))
    .rejects.toMatchObject({ status: 413, code: 'too-large' });
});

it('rejects a declared oversized body before consuming any chunks', async () => {
  const request = body([], '4');
  request[Symbol.asyncIterator] = () => { throw new Error('Body must not be consumed'); };
  await expect(readBytes(request, 3)).rejects.toMatchObject({ status: 413, code: 'too-large' });
});
