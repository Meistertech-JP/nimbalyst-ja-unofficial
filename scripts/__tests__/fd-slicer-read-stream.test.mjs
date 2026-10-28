import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { mkdtemp, open, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { createFromFd } = require('fd-slicer');

test('fd-slicer delivers all buffered range bytes before ending', { timeout: 5000 }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nimbalyst-fd-slicer-'));
  const filename = path.join(directory, 'fixture.bin');
  const data = Buffer.alloc(2 * 1024 * 1024 + 123, 0xa5);
  await writeFile(filename, data);
  const handle = await open(filename, 'r');
  try {
    const slicer = createFromFd(handle.fd);
    const stream = slicer.createReadStream({ start: 11, end: data.length, highWaterMark: 65536 });
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.deepEqual(Buffer.concat(chunks), data.subarray(11));
    assert.equal(slicer.refCount, 0);
  } finally {
    await handle.close();
    await rm(directory, { recursive: true });
  }
});

for (const mode of ['eof', 'data', 'error']) {
  test(`fd-slicer releases a cancelled pending read once (${mode})`, async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'nimbalyst-fd-slicer-cancel-'));
    const filename = path.join(directory, 'fixture.bin');
    await writeFile(filename, Buffer.alloc(64));
    const handle = await open(filename, 'r');
    const originalRead = fs.read;
    try {
      const slicer = createFromFd(handle.fd);
      const stream = slicer.createReadStream({ start: 0, end: 64 });
      let pending;
      fs.read = (...args) => {
        if (args[0] !== handle.fd) return originalRead(...args);
        pending = args.at(-1);
      };
      stream.on('error', () => {});
      stream.read(1);
      assert.equal(typeof pending, 'function');
      stream.destroy();
      if (mode === 'error') pending(new Error('simulated read failure'), 0, Buffer.alloc(0));
      else if (mode === 'data') pending(null, 10, Buffer.alloc(10));
      else pending(null, 0, Buffer.alloc(0));
      assert.equal(slicer.refCount, 0);
    } finally {
      fs.read = originalRead;
      await handle.close();
      await rm(directory, { recursive: true });
    }
  });
}
