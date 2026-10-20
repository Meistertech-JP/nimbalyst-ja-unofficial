import { readFileSync } from 'fs';
import path from 'path';
import ts from 'typescript';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Execute only the actual dialog call expressions, without booting Electron,
// registering IPC handlers, or touching the user's database.
const source = ts.createSourceFile('index.ts', readFileSync(path.join(__dirname, '../index.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
const calls: ts.CallExpression[] = [];
function visit(node: ts.Node) {
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(source) === 'dialog'
      && ['showErrorBox', 'showMessageBox'].includes(node.expression.name.text)) calls.push(node);
  ts.forEachChild(node, visit);
}
visit(source);

function invoke(call: ts.CallExpression) {
  const dialog = { showErrorBox: vi.fn(), showMessageBox: vi.fn() };
  const dbPath = 'F:\\User Data\\pglite-db';
  const errorMessage = 'EACCES: User <A> & B';
  new Function('dialog', 't', 'dbPath', 'errorMessage', call.getText(source))(
    dialog, i18next.t.bind(i18next), dbPath, errorMessage,
  );
  return { dialog, dbPath, errorMessage };
}

afterEach(async () => { await i18next.changeLanguage('en'); });

describe('main entrypoint native dialogs', () => {
  it('translates both database startup errors and preserves path/error diagnostics', async () => {
    await i18next.changeLanguage('ja');
    const errors = calls.filter(call => call.expression.getText(source) === 'dialog.showErrorBox');
    expect(errors).toHaveLength(2);
    const wasm = invoke(errors[0]);
    const generic = invoke(errors[1]);
    expect(wasm.dialog.showErrorBox.mock.calls[0][0]).toBe('Nimbalyst - データベースの初期化に失敗しました');
    expect(wasm.dialog.showErrorBox.mock.calls[0][1]).toContain(wasm.dbPath);
    expect(wasm.dialog.showErrorBox.mock.calls[0][1]).toContain('アクセス権限');
    expect(generic.dialog.showErrorBox.mock.calls[0][1]).toContain(generic.errorMessage);
    expect(generic.dialog.showErrorBox.mock.calls[0][1]).toContain('データベースがないため');
  });

  it('keeps Cancel as the default while localizing quit confirmation on each call', async () => {
    const confirmations = calls.filter(call => call.expression.getText(source) === 'dialog.showMessageBox');
    const quitConfirmation = confirmations.find(call => call.getText(source).includes('quit_active_title'));
    expect(quitConfirmation).toBeTruthy();
    await i18next.changeLanguage('ja');
    expect(invoke(quitConfirmation!).dialog.showMessageBox.mock.calls[0][0]).toMatchObject({
      title: 'AIセッションが実行中です', buttons: ['終了する', 'キャンセル'], defaultId: 1, cancelId: 1,
      detail: '今終了すると、現在のAI応答が失われます。終了してもよろしいですか？',
    });
    await i18next.changeLanguage('en');
    expect(invoke(quitConfirmation!).dialog.showMessageBox.mock.calls[0][0]).toMatchObject({
      title: 'AI Session in Progress', buttons: ['Quit Anyway', 'Cancel'], defaultId: 1, cancelId: 1,
    });
  });

  it('explains the shared protocol conflict without silently changing the default handler', async () => {
    const warning = calls.find(call => call.expression.getText(source) === 'dialog.showMessageBox'
      && call.getText(source).includes('protocol_conflict_title'));
    expect(warning).toBeTruthy();
    await i18next.changeLanguage('ja');
    expect(invoke(warning!).dialog.showMessageBox.mock.calls[0][0]).toMatchObject({
      title: '認証リンクの関連付け',
      buttons: ['Windowsの設定を開く', '閉じる'],
      defaultId: 1,
      cancelId: 1,
    });
  });
});
