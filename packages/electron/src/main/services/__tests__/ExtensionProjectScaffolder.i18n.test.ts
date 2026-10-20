import i18next from 'i18next';
import * as realFs from 'node:fs';
import * as os from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  showMessageBox: vi.fn(), showSaveDialog: vi.fn(), isShown: vi.fn(), markShown: vi.fn(),
  writeFile: vi.fn(), mkdir: vi.fn(), createWindow: vi.fn(), template: vi.fn(),
}));
vi.mock('electron', () => ({
  dialog: { showMessageBox: mocks.showMessageBox, showSaveDialog: mocks.showSaveDialog }, ipcMain: {},
}));
vi.mock('../../../../../extensions/extension-dev-kit/src/templates.ts', () => ({ templates: { starter: mocks.template } }));
vi.mock('../../window/WindowManager', () => ({ createWindow: mocks.createWindow, findWindowByWorkspace: vi.fn() }));
vi.mock('../../utils/store', () => ({
  addToRecentItems: vi.fn(), getWorkspaceWindowState: vi.fn(),
  isExtensionProjectIntroShown: mocks.isShown, setExtensionProjectIntroShown: mocks.markShown,
}));
vi.mock('../../utils/dialogPaths', () => ({
  getDialogDefaultPath: () => '/projects/my-nimbalyst-extension', rememberDialogSelection: vi.fn(),
}));
vi.mock('../../utils/logger', () => ({ logger: { main: { info: vi.fn(), error: vi.fn() } } }));

import { showExtensionProjectIntroDialog, showNewExtensionProjectDialog } from '../ExtensionProjectScaffolder';

let nonEmptyProjectPath: string;

beforeEach(async () => {
  vi.clearAllMocks();
  nonEmptyProjectPath = realFs.mkdtempSync(join(os.tmpdir(), 'nimbalyst-extension-i18n-'));
  realFs.writeFileSync(join(nonEmptyProjectPath, 'existing-file.txt'), 'existing');
  mocks.isShown.mockReturnValue(false);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  await i18next.changeLanguage('ja');
});
afterEach(async () => {
  realFs.rmSync(nonEmptyProjectPath, { recursive: true, force: true });
  vi.restoreAllMocks();
  await i18next.changeLanguage('en');
});

describe('native extension project dialogs in Japanese', () => {
  it.each([[0, false], [1, true], [2, true]] as const)('preserves response %s while translating the fallback intro', async (response, expected) => {
    mocks.showMessageBox.mockResolvedValue({ response });
    expect(await showExtensionProjectIntroDialog()).toBe(expected);
    const options = mocks.showMessageBox.mock.calls[0][0];
    expect(options.buttons).toEqual(['キャンセル', '今後表示しない', '続行']);
    expect(options.message).toContain('カスタムエディター');
    expect(options.detail).toContain('ビルド、インストール、テスト');
    expect(options.defaultId).toBe(2);
    expect(options.cancelId).toBe(0);
    expect(mocks.markShown).toHaveBeenCalledTimes(expected ? 1 : 0);
  });

  it('translates the folder warning and keeps paths intact without overwriting anything', async () => {
    mocks.isShown.mockReturnValue(true);
    mocks.showSaveDialog.mockResolvedValue({ canceled: false, filePath: nonEmptyProjectPath });
    mocks.showMessageBox.mockResolvedValue({ response: 0 });
    await showNewExtensionProjectDialog();
    expect(mocks.showSaveDialog).toHaveBeenCalledWith(expect.objectContaining({ title: '新しい拡張機能プロジェクトを作成', buttonLabel: 'プロジェクトを作成', defaultPath: '/projects/my-nimbalyst-extension' }));
    expect(mocks.showMessageBox).toHaveBeenCalledWith(expect.objectContaining({ title: 'フォルダーが空ではありません', detail: `選択したフォルダーには既にファイルがあります:\n${nonEmptyProjectPath}`, buttons: ['OK'] }));
    expect(mocks.writeFile).not.toHaveBeenCalled();
    expect(mocks.mkdir).not.toHaveBeenCalled();
    expect(mocks.template).not.toHaveBeenCalled();
    expect(mocks.createWindow).not.toHaveBeenCalled();
  });
});
