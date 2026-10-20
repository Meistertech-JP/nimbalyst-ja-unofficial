import { test, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  createTempWorkspace,
  launchElectronApp,
  TEST_TIMEOUTS,
  waitForAppReady,
} from './helpers';
import { PLAYWRIGHT_TEST_SELECTORS } from './utils/testHelpers';

test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

let electronApp: ElectronApplication;
let page: Page;
let workspacePath: string;
let previousLanguage: 'system' | 'en' | 'ja' = 'system';

async function setUiLanguage(language: 'system' | 'en' | 'ja'): Promise<void> {
  await page.evaluate(async (nextLanguage) => {
    await window.electronAPI.settingsSet('uiLanguage', nextLanguage);
  }, language);
}

test.beforeAll(async () => {
  workspacePath = await createTempWorkspace();
  await fs.writeFile(
    path.join(workspacePath, 'localization-check.md'),
    '# Localization check\n',
    'utf8',
  );

  electronApp = await launchElectronApp({
    workspace: workspacePath,
    permissionMode: 'allow-all',
  });
  page = await electronApp.firstWindow();
  await waitForAppReady(page);

  previousLanguage = await page.evaluate(async () => {
    const settings = await window.electronAPI.settingsGetAll();
    return settings.uiLanguage;
  });
});

test.afterAll(async () => {
  if (page) {
    await setUiLanguage(previousLanguage).catch(() => undefined);
  }
  await electronApp?.close();
  await fs.rm(workspacePath, { recursive: true, force: true }).catch(() => undefined);
});

test('switches File and Workspace UI to Japanese and persists the preference', async ({
}, testInfo) => {
  await setUiLanguage('en');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('en');
  await expect(page.locator(PLAYWRIGHT_TEST_SELECTORS.workspaceSectionLabel))
    .toHaveText('Files');
  await expect(page.locator(PLAYWRIGHT_TEST_SELECTORS.fileTreeNewFileButton))
    .toHaveAttribute('aria-label', 'New file');

  await setUiLanguage('ja');

  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('ja');
  await expect(page.locator(PLAYWRIGHT_TEST_SELECTORS.workspaceSectionLabel))
    .toHaveText('ファイル');
  await expect(page.locator(PLAYWRIGHT_TEST_SELECTORS.fileTreeNewFileButton))
    .toHaveAttribute('aria-label', '新しいファイル');

  const persistedLanguage = await page.evaluate(async () => {
    const settings = await window.electronAPI.settingsGetAll();
    return settings.uiLanguage;
  });
  expect(persistedLanguage).toBe('ja');

  await expect.poll(async () => {
    return electronApp.evaluate(({ Menu }) => {
      return Menu.getApplicationMenu()?.items.map((item) => item.label) ?? [];
    });
  }).toContain('ファイル');

  await page.locator(PLAYWRIGHT_TEST_SELECTORS.fileTreeNewFileButton).click();
  const newFileMenu = page.locator(PLAYWRIGHT_TEST_SELECTORS.newFileMenu);
  await expect(newFileMenu).toBeVisible({ timeout: TEST_TIMEOUTS.DEFAULT_WAIT });
  const menuItems = newFileMenu.locator(PLAYWRIGHT_TEST_SELECTORS.newFileMenuItem);
  await expect(menuItems.filter({ hasText: 'Markdownファイル' })).toHaveCount(1);
  await expect(menuItems.filter({ hasText: 'ブラウザータブ' })).toHaveCount(1);
  await expect(menuItems.filter({ hasText: /モックアップ(?!プロジェクト)/ })).toHaveCount(1);
  await expect(menuItems.filter({ hasText: 'モックアッププロジェクト' })).toHaveCount(1);
  await expect(menuItems.filter({ hasText: 'Excalidraw図' })).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(newFileMenu).not.toBeVisible();
  await page.bringToFront();

  await electronApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getFocusedWindow()?.webContents.send('file-new-in-workspace');
  });

  const newFileDialog = page.locator(PLAYWRIGHT_TEST_SELECTORS.newFileDialog);
  await expect(newFileDialog).toBeVisible({ timeout: TEST_TIMEOUTS.FILE_TREE_LOAD });
  await expect(newFileDialog.getByRole('heading', { name: '新しいファイル' })).toBeVisible();

  const fileTypeOptions = newFileDialog.locator(
    PLAYWRIGHT_TEST_SELECTORS.newFileTypeOption,
  );
  await expect(fileTypeOptions.filter({ hasText: 'CSVスプレッドシート' })).toHaveCount(1);
  await expect(fileTypeOptions.filter({ hasText: /モックアップ(?!プロジェクト)/ })).toHaveCount(1);
  await expect(fileTypeOptions.filter({ hasText: 'ブラウザータブ' })).toHaveCount(0);

  await page.screenshot({
    path: testInfo.outputPath('ja-file-workspace.png'),
    fullPage: true,
  });

  // Verify that the persisted preference survives a full application restart.
  await electronApp.close();
  electronApp = await launchElectronApp({
    workspace: workspacePath,
    permissionMode: 'allow-all',
    preserveTestDatabase: true,
  });
  page = await electronApp.firstWindow();
  await waitForAppReady(page);
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('ja');
  await expect(page.locator(PLAYWRIGHT_TEST_SELECTORS.workspaceSectionLabel))
    .toHaveText('ファイル');

  // Verify the reverse switch and the renderer document language as well.
  await setUiLanguage('en');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('en');
  await expect(page.locator(PLAYWRIGHT_TEST_SELECTORS.workspaceSectionLabel))
    .toHaveText('Files');
  const restoredNewFileDialog = page.locator(PLAYWRIGHT_TEST_SELECTORS.newFileDialog);
  if (await restoredNewFileDialog.isVisible().catch(() => false)) {
    await restoredNewFileDialog.getByRole('button', { name: 'キャンセル' }).click();
    await expect(restoredNewFileDialog).not.toBeVisible();
  }

  // Cover the Sessions/Agents and Tracker surfaces in the same persisted app.
  await setUiLanguage('ja');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('ja');

  await page.locator('[data-testid="agent-mode-button"]').click();
  await expect(page.locator(PLAYWRIGHT_TEST_SELECTORS.agentMode)).toBeVisible({
    timeout: TEST_TIMEOUTS.SIDEBAR_LOAD,
  });
  await expect(page.locator('[data-testid="agent-mode-button"]'))
    .toHaveAttribute('aria-label', /エージェント/);
  await expect(page.locator(PLAYWRIGHT_TEST_SELECTORS.agentChatInput))
    .toHaveAttribute('placeholder', /メッセージを入力/);
  await expect(page.locator(PLAYWRIGHT_TEST_SELECTORS.sessionHistory)).toBeVisible();

  await page.locator('[data-testid="tracker-mode-button"]').click();
  await expect(page.locator('[data-testid="tracker-mode-button"]'))
    .toHaveAttribute('aria-label', /トラッカー/);
  await expect(page.locator(PLAYWRIGHT_TEST_SELECTORS.trackerSidebar)).toBeVisible({
    timeout: TEST_TIMEOUTS.SIDEBAR_LOAD,
  });
  await expect(page.locator('[data-testid="tracker-sidebar"]')).toBeVisible({
    timeout: TEST_TIMEOUTS.SIDEBAR_LOAD,
  });
  const trackerSidebar = page.locator('[data-testid="tracker-sidebar"]');
  await expect(trackerSidebar.getByText('トラッカー', { exact: true })).toBeVisible();
  for (const label of ['プラン', '決定事項', 'バグ', 'タスク', 'アイデア', 'マイルストーン', 'リリース']) {
    await expect(trackerSidebar.getByText(label, { exact: true })).toBeVisible();
  }
  await page.screenshot({
    path: testInfo.outputPath('ja-tracker.png'),
    fullPage: true,
  });

  // Cover the account/settings navigation and the installed extensions route.
  await page.locator('[data-testid="gutter-user-button"]').click();
  const accountInspector = page.locator('[data-testid="account-inspector-popover"]');
  await expect(accountInspector).toBeVisible();
  const applicationSettingsRow = accountInspector.locator(
    '[data-testid="account-inspector-application-settings-row"]',
  );
  await expect(applicationSettingsRow.getByText('アプリ設定', { exact: true })).toBeVisible();
  await applicationSettingsRow.click();
  await expect(page.locator('[data-testid="settings-sidebar"]')).toBeVisible({
    timeout: TEST_TIMEOUTS.SIDEBAR_LOAD,
  });
  await expect(page.locator('.settings-view-title')).toHaveText('設定');
  await page.screenshot({
    path: testInfo.outputPath('ja-settings.png'),
    fullPage: true,
  });
  const installedExtensionsRoute = page.locator('[data-testid="settings-route-installed-extensions"]');
  if (await installedExtensionsRoute.count()) {
    await installedExtensionsRoute.click();
    await expect(page.locator('[data-testid="installed-extensions-panel"]')).toBeVisible({
      timeout: TEST_TIMEOUTS.SIDEBAR_LOAD,
    });
  }

  await setUiLanguage('en');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('en');
});
