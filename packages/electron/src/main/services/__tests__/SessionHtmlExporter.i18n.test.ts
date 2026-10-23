// @vitest-environment node
import { afterEach, expect, it } from 'vitest';
import type { SessionData } from '@nimbalyst/runtime/ai/server/types';
import { createMainI18nController } from '../../i18n/mainI18n';
import { exportSessionToHtml } from '../SessionHtmlExporter';

let disposeI18n: (() => void) | undefined;

afterEach(() => {
  disposeI18n?.();
  disposeI18n = undefined;
});

it('localizes exported session UI and declares its document language', async () => {
  const controller = await createMainI18nController({
    get: () => 'ja',
    subscribe: () => () => undefined,
  }, 'en-US', () => undefined);
  disposeI18n = () => controller.dispose();

  const html = await exportSessionToHtml({ messages: [] } as unknown as SessionData);
  expect(html).toContain('<html lang="ja" class="dark">');
  expect(html).toContain('無題のセッション');
  expect(html).toContain('共有元 <strong>Nimbalyst</strong>');
  expect(html).toContain('このセッションのエクスポートには、機密コード');
  expect(html).toContain('title="ライト/ダークテーマを切り替え"');
});
