import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { writeDeclarationIfChanged } from '../write-declaration.mjs';

let tempDirectory: string | undefined;

afterEach(() => {
  if (tempDirectory) fs.rmSync(tempDirectory, { recursive: true, force: true });
  tempDirectory = undefined;
});

function createDeclaration(source: string): string {
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-bundle-types-'));
  const declarationPath = path.join(tempDirectory, 'sample.d.ts');
  fs.writeFileSync(declarationPath, source, 'utf8');
  return declarationPath;
}

describe('writeDeclarationIfChanged', () => {
  it('preserves the emitted declaration when rewriting is a no-op', async () => {
    const source = "import type { X } from './X';\nexport type Sample = X;\n";
    const declarationPath = createDeclaration(source);
    const originalMtime = fs.statSync(declarationPath).mtimeMs;

    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(writeDeclarationIfChanged(declarationPath, source, source)).toBe(false);
    expect(fs.readFileSync(declarationPath, 'utf8')).toBe(source);
    expect(fs.statSync(declarationPath).mtimeMs).toBe(originalMtime);
    expect(fs.readdirSync(tempDirectory!)).toEqual(['sample.d.ts']);
  });

  it('atomically replaces a declaration when import rewriting changes it', () => {
    const source = "import type { X } from '@nimbalyst/runtime/types';\nexport type Sample = X;\n";
    const rewritten = "import type { X } from '../runtime/src/types';\nexport type Sample = X;\n";
    const declarationPath = createDeclaration(source);

    expect(writeDeclarationIfChanged(declarationPath, source, rewritten)).toBe(true);
    expect(fs.readFileSync(declarationPath, 'utf8')).toBe(rewritten);
    expect(fs.readdirSync(tempDirectory!)).toEqual(['sample.d.ts']);
  });
});
