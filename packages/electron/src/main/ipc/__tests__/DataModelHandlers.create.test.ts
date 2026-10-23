// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const { handlers } = vi.hoisted(() => ({ handlers: new Map<string, (...args: any[]) => any>() }));
vi.mock('electron', () => ({ BrowserWindow: {} }));
vi.mock('../../utils/logger', () => ({ logger: { main: { info: vi.fn(), error: vi.fn() } } }));
vi.mock('../../utils/ipcRegistry', () => ({
  safeHandle: (name: string, handler: (...args: any[]) => any) => handlers.set(name, handler),
  removeHandler: vi.fn(),
}));
vi.mock('../../window/WindowManager', () => ({ getWindowId: vi.fn(), windowStates: new Map() }));

import { registerDataModelHandlers } from '../DataModelHandlers';
import { createMainI18nController } from '../../i18n/mainI18n';

const expectedSchema = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
`;
const expectedExample = `// model User {
//   id        Int      @id @default(autoincrement())
//   email     String   @unique
//   name      String?
//   createdAt DateTime @default(now())
// }
`;

describe('new data model scaffold language', () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'nimbalyst-datamodel-i18n-'));
    handlers.clear();
    registerDataModelHandlers();
  });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

  it.each([
    ['ja', 'ここにモデルを追加してください', '例:'],
    ['en', 'Add your models here', 'Example:'],
  ])('creates %s instructions without changing Prisma syntax or metadata', async (locale, instruction, example) => {
    const controller = await createMainI18nController({ get: () => locale, subscribe: () => () => {} }, 'en', () => {});
    try {
      const filePath = join(directory, 'model.prisma');
      await expect(handlers.get('datamodel:create-datamodel')!({}, 'model.prisma', directory)).resolves.toEqual({ success: true, filePath });
      const content = await readFile(filePath, 'utf8');
      const normalized = content.replace(/\r\n/g, '\n');
      expect(normalized.split('\n')[0]).toBe('// @nimbalyst {"viewport":{"x":0,"y":0,"zoom":1},"positions":{},"entityViewMode":"standard"}');
      expect(normalized).toContain(expectedSchema);
      expect(normalized).toContain(`// ${instruction}\n// ${example}\n${expectedExample}`);
    } finally {
      controller.dispose();
    }
  });

  it('refuses an existing data model without changing its bytes', async () => {
    const filePath = join(directory, 'model.prisma');
    const original = Buffer.from('// User-authored schema\r\nmodel Custom {}\r\n');
    await writeFile(filePath, original);
    const controller = await createMainI18nController({ get: () => 'ja', subscribe: () => () => {} }, 'en', () => {});
    try {
      await expect(handlers.get('datamodel:create-datamodel')!({}, 'model', directory)).resolves.toMatchObject({ success: false });
      expect(await readFile(filePath)).toEqual(original);
    } finally {
      controller.dispose();
    }
  });
});
