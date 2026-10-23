// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { localizeMcpTestProgress } from '../mcpTestProgressText';

describe('MCP connection test progress text', () => {
  it('translates app-owned progress and follows language changes', async () => {
    const i18n = await createI18nInstance('ja');
    const translate = (key: string) => String(i18n.t(key, { ns: 'settings' }));
    const messages = ['Starting server...', 'Testing server connection...', 'Downloading packages...'];
    expect(messages.map(message => localizeMcpTestProgress(message, translate))).toEqual([
      'サーバーを起動中…', 'サーバー接続をテスト中…', 'パッケージをダウンロード中…',
    ]);
    await i18n.changeLanguage('en');
    expect(messages.map(message => localizeMcpTestProgress(message, translate))).toEqual(messages);
    await i18n.changeLanguage('ja');
    expect(localizeMcpTestProgress(messages[0], translate)).toBe('サーバーを起動中…');
  });

  it('preserves external diagnostics and empty completion messages', () => {
    const translate = () => { throw new Error('External text must not be translated'); };
    for (const message of ['', 'Server returned EACCES: /tmp/example', 'Starting server... custom detail']) {
      expect(localizeMcpTestProgress(message, translate)).toBe(message);
    }
  });
});
