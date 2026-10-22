import { test, expect } from '@playwright/test';
import type { ElectronApplication, Page } from 'playwright';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createTempWorkspace, launchElectronApp, waitForAppReady } from './helpers';

test.describe.configure({ mode: 'serial' });

const runId = `${process.pid}-${Date.now()}`;
const userDataDir = path.join(os.tmpdir(), `nimbalyst-i18n-e2e-user-data-${runId}`);
const databaseDir = path.join(os.tmpdir(), `nimbalyst-i18n-e2e-database-${runId}`);

let app: ElectronApplication | undefined;
let page: Page;
let workspaceDir = '';

async function launchIsolatedApp(): Promise<ElectronApplication> {
  return launchElectronApp({
    workspace: workspaceDir,
    permissionMode: 'allow-all',
    // The helper's default database path is shared across E2E runs. Preserve it
    // and route this run to a unique temporary database instead.
    preserveTestDatabase: true,
    recordVideo: false,
    env: {
      NODE_ENV: 'test',
      NIMBALYST_USER_DATA_DIR: userDataDir,
      NIMBALYST_USER_DATA_PATH: databaseDir,
    },
  });
}

async function openAdvancedSettings(): Promise<void> {
  await page.getByTestId('gutter-user-button').click();
  await page.getByTestId('account-inspector-application-settings-row').click();
  await page.getByTestId('settings-route-advanced').click();
  await expect(page.locator('.setting-item select').first()).toBeVisible();
}

test('switches UI language and restores Japanese after relaunch', async ({}, testInfo) => {
  test.setTimeout(120_000);
  workspaceDir = await createTempWorkspace();
  await app?.close();
  app = await launchIsolatedApp();
  page = await app.firstWindow();
  await waitForAppReady(page);

  await openAdvancedSettings();
  const languageSelect = page.locator('.setting-item select').first();

  await languageSelect.selectOption('en');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('en');
  await expect(page.getByRole('heading', { name: 'Interface language', level: 4 })).toBeVisible();

  await languageSelect.selectOption('ja');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('ja');
  await expect(page.getByRole('heading', { name: '表示言語', level: 4 })).toBeVisible();
  await expect(page.getByTestId('settings-route-notifications')).toContainText('通知');
  await expect(page.getByTestId('settings-route-themes')).toContainText('テーマ');
  await expect(page.getByTestId('settings-group-application')).toContainText('アプリ');
  await page.screenshot({ path: testInfo.outputPath('i18n-ja-settings.png'), fullPage: false });

  await app.close();
  app = await launchIsolatedApp();
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.settings-view')).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('ja');

  await page.getByTestId('settings-route-advanced').click();
  const relaunchedLanguageSelect = page.locator('.setting-item select').first();
  await expect(relaunchedLanguageSelect).toHaveValue('ja');
  await relaunchedLanguageSelect.selectOption('en');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('en');
  await expect(page.getByRole('heading', { name: 'Interface language', level: 4 })).toBeVisible();
});

test.afterAll(async () => {
  await app?.close();
  if (workspaceDir) await fs.rm(workspaceDir, { recursive: true, force: true });
  // These are unique directories under the system temp folder, owned only by
  // this spec. Never touch the shared Playwright or application user data.
  await fs.rm(userDataDir, { recursive: true, force: true });
  await fs.rm(databaseDir, { recursive: true, force: true });
});
