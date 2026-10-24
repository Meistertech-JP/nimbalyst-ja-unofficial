// @vitest-environment node
import { expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { documentTypeDisplayName } from '../../../../../../collab-client/src/docs-ui/documentTypeDisplayName';

it('translates built-in creation names in both locales and preserves custom names', async () => {
  const instance = await createI18nInstance('ja');
  const t = instance.getFixedT(null, 'common');
  expect(documentTypeDisplayName('HTML page', t)).toBe('HTMLページ');
  expect(documentTypeDisplayName('Project Canvas', t)).toBe('プロジェクトキャンバス');
  expect(documentTypeDisplayName('Data Model', t)).toBe('データモデル');
  expect(documentTypeDisplayName('Custom Editor', t)).toBe('Custom Editor');
  expect(documentTypeDisplayName('toString', t)).toBe('toString');
  expect(documentTypeDisplayName('Animation', t)).toBe('アニメーション');
  expect(documentTypeDisplayName('Browser Tab', t)).toBe('ブラウザータブ');
  expect(documentTypeDisplayName('Image Generation Project', t)).toBe('画像生成プロジェクト');
  expect(documentTypeDisplayName('Swift File', t)).toBe('Swiftファイル');
  const prefixedT = instance.getFixedT(null, 'files', 'new_file_menu');
  expect(documentTypeDisplayName('HTML page', prefixedT)).toBe('HTMLページ');
  await instance.changeLanguage('en');
  expect(documentTypeDisplayName('HTML page', t)).toBe('HTML page');
});
