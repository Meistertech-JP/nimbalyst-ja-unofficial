import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

import { audit, classifyUntrackedPath, finiteStringValues, findSecretMatchesInText, flattenLeaves, placeholders, publicationDecision, resolveTranslationKey } from '../audit-ja-source.mjs';

test('audits translation references and user-facing candidates in CLI and Wiki Web', (context) => {
  const root = mkdtempSync(path.join(tmpdir(), 'nimbalyst-i18n-audit-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', root]);
  const fixture = (relative, contents) => {
    const target = path.join(root, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, contents);
  };
  for (const locale of ['en', 'ja']) {
    fixture(`packages/i18n/src/resources/${locale}/common.json`, '{"known":"Known"}');
  }
  fixture('packages/i18n/src/__tests__/core.test.ts', 'expect(totalKeys).toBe(1);');
  fixture('packages/cli/src/export.ts', "t('common:missing_cli');");
  fixture('packages/wiki-web/src/View.tsx', "const view = <button title=\"Open navigation\">{t('common:missing_web')}</button>;");
  const report = audit(root);
  assert.deepEqual(report.references.missingLiteralReferences.map((ref) => ref.key).sort(), ['missing_cli', 'missing_web']);
  assert.equal(report.references.astEnglishCandidates[0].file, 'packages/wiki-web/src/View.tsx');
  assert.equal(report.references.astEnglishCandidates[0].text, 'Open navigation');
});

test('flattens nested translation objects to leaf keys only', () => {
  assert.deepEqual([...flattenLeaves({ menu: { open: 'Open' }, empty: '' })], [
    ['menu.open', 'Open'],
    ['empty', ''],
  ]);
});

test('extracts sorted interpolation placeholders independent of order', () => {
  assert.deepEqual(placeholders('{{count}} / {{ file.name }}'), ['count', 'file.name']);
});

test('uses i18next namespace prefix and configured default namespace semantics', () => {
  assert.deepEqual(resolveTranslationKey('ui_language.label'), { namespace: 'common', key: 'ui_language.label' });
  assert.deepEqual(resolveTranslationKey('settings:ui_language.label'), { namespace: 'settings', key: 'ui_language.label' });
  assert.deepEqual(resolveTranslationKey('label', 'settings'), { namespace: 'settings', key: 'label' });
});

test('enumerates bounded literal alternatives in conditional and concatenated translation keys', () => {
  const expression = (text) => {
    const source = ts.createSourceFile('fixture.ts', `t(${text})`, ts.ScriptTarget.Latest, true);
    return source.statements[0].expression.arguments[0];
  };
  assert.deepEqual(finiteStringValues(expression("isOpen ? 'status.open' : 'status.closed'")), ['status.open', 'status.closed']);
  assert.deepEqual(finiteStringValues(expression("'status.' + (isOpen ? 'open' : 'closed')")), ['status.open', 'status.closed']);
  assert.equal(finiteStringValues(expression('`status.${value}`')), undefined);
  assert.equal(finiteStringValues(expression("condition ? 'known' : unknownKey")), undefined);
});

test('classifies publication additions and generated declarations separately', () => {
  assert.equal(classifyUntrackedPath('README.en.md'), 'publication-document');
  assert.equal(classifyUntrackedPath('packages/i18n/src/resources/ja/menu.json'), 'i18n-resource');
  assert.equal(classifyUntrackedPath('packages/electron/src/Foo.test.tsx'), 'test');
  assert.equal(classifyUntrackedPath('packages/collab-bundle/types/Foo.d.ts'), 'generated-type-output');
  assert.equal(classifyUntrackedPath('packages/collab-bundle/scripts/write-declaration.mjs'), 'implementation');
  assert.equal(classifyUntrackedPath('packages/electron/build/electron-abi-probe.js'), 'implementation');
  assert.equal(classifyUntrackedPath('docs/UNOFFICIAL_RELEASE.md'), 'publication-document');
  assert.equal(classifyUntrackedPath('scripts/audit-ja-source.mjs'), 'audit-tooling');
  assert.equal(classifyUntrackedPath('scripts/__tests__/audit-ja-source.test.mjs'), 'audit-test');
  assert.equal(classifyUntrackedPath('packages/electron/src/Foo.tsx'), 'implementation');
  assert.equal(publicationDecision(classifyUntrackedPath('docs/UNOFFICIAL_RELEASE.md'), 'docs/UNOFFICIAL_RELEASE.md').decision, 'include');
  assert.equal(publicationDecision(classifyUntrackedPath('packages/electron/build/electron-abi-probe.js'), 'packages/electron/build/electron-abi-probe.js').decision, 'include');
});

test('publication decisions exclude reproducible generated declarations and retain their build source', () => {
  assert.equal(publicationDecision('generated-type-output').decision, 'exclude');
  assert.equal(publicationDecision('unclassified').decision, 'review');
});

test('secret scan findings expose only path, line, and category', () => {
  const secret = 'q7N4vZ8pL2mX9cR5tW3kB6hF';
  const findings = findSecretMatchesInText('src/example.ts', `const client_secret = "${secret}";`);
  assert.deepEqual(findings, [{ path: 'src/example.ts', line: 1, category: 'generic-secret-assignment' }]);
  assert.equal(JSON.stringify(findings).includes(secret), false);
});
