// @vitest-environment node
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { basename, join } from 'path';

const { handlers, showSaveDialog, getDialogDefaultPath } = vi.hoisted(() => ({
  handlers: new Map<string, (...args: any[]) => any>(),
  showSaveDialog: vi.fn(),
  getDialogDefaultPath: vi.fn(() => '/unused'),
}));

vi.mock('electron', () => ({ app: {}, BrowserWindow: class {}, dialog: { showSaveDialog } }));
vi.mock('../../utils/ipcRegistry', () => ({ safeHandle: (name: string, handler: (...args: any[]) => any) => handlers.set(name, handler) }));
vi.mock('../../utils/appPaths', () => ({ getPreloadPath: vi.fn() }));
vi.mock('../unresponsiveHandler', () => ({ createUnresponsiveHandler: vi.fn() }));
vi.mock('../../utils/FileTree', () => ({ resolveEntryType: vi.fn() }));
vi.mock('../../utils/fileFilters', () => ({ shouldExcludeDir: vi.fn(), shouldExcludePath: vi.fn() }));
vi.mock('../../utils/store', () => ({ getRecentItems: vi.fn(), addToRecentItems: vi.fn(), store: {}, getWorkspaceWindowState: vi.fn(), getTheme: vi.fn() }));
vi.mock('../WindowManager', () => ({ createWindow: vi.fn(), findWorkspaceWindowMatch: vi.fn(), windows: new Map(), windowStates: new Map() }));
vi.mock('../../theme/ThemeManager', () => ({ getBackgroundColor: vi.fn() }));
vi.mock('../../services/analytics/AnalyticsService', () => ({ AnalyticsService: class {} }));
vi.mock('../../services/GitStatusService', () => ({ GitStatusService: class {} }));
vi.mock('../../index', () => ({ getMcpConfigService: vi.fn() }));
vi.mock('../../services/TeamService', () => ({ autoMatchTeamForWorkspace: vi.fn(), bindWorkspaceToSharedProject: vi.fn(), broadcastWorkspaceOrgChanged: vi.fn() }));
vi.mock('../../services/TrackerSyncManager', () => ({ initializeTrackerSync: vi.fn() }));
vi.mock('../../services/tracker/ensureWorkspaceLocalNumbers', () => ({ ensureWorkspaceLocalNumbersInBackground: vi.fn() }));
vi.mock('../../services/TrackerSchemaService', () => ({ updateTrackerSchemaWorkspace: vi.fn() }));
vi.mock('../../utils/dialogPaths', () => ({ getDialogDefaultPath, rememberDialogSelection: vi.fn() }));
vi.mock('../../services/tutorial/TutorialProjectService', () => ({ TutorialProjectService: class {} }));
vi.mock('../StartupActivation', () => ({ isStartupCohortWindow: vi.fn(), notifyStartupWindowRevealed: vi.fn(), registerStartupWindow: vi.fn() }));

import { setupWorkspaceManagerHandlers } from '../WorkspaceManagerWindow';
import { createMainI18nController } from '../../i18n/mainI18n';

describe('workspace creation language', () => {
  let workspacePath: string;

  beforeAll(() => { setupWorkspaceManagerHandlers(); });

  beforeEach(() => {
    workspacePath = mkdtempSync(join(tmpdir(), 'nimbalyst-workspace-readme-'));
    vi.clearAllMocks();
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: workspacePath });
  });

  afterEach(() => {
    rmSync(workspacePath, { recursive: true, force: true });
  });

  it.each([
    ['ja', '新しいワークスペースへようこそ！', '無題のワークスペース'],
    ['en', 'Welcome to your new workspace!', 'Untitled Workspace'],
  ])('creates a %s README and localized suggested folder name', async (locale, welcome, suggestedName) => {
    const controller = await createMainI18nController({ get: () => locale, subscribe: () => () => {} }, 'en', () => {});
    try {
      await expect(handlers.get('workspace-manager:create-workspace-dialog')!()).resolves.toEqual({ success: true, path: workspacePath });
      expect(readFileSync(join(workspacePath, 'README.md'), 'utf8')).toBe(`# ${basename(workspacePath)}\n\n${welcome}\n`);
      expect(getDialogDefaultPath).toHaveBeenCalledWith({ suggestedName });
    } finally {
      controller.dispose();
    }
  });

  it('preserves existing user-authored README bytes when creating in Japanese', async () => {
    const original = Buffer.from('# Existing content\r\nUser edits must remain.\r\n');
    writeFileSync(join(workspacePath, 'README.md'), original);
    const controller = await createMainI18nController({ get: () => 'ja', subscribe: () => () => {} }, 'en', () => {});
    try {
      await expect(handlers.get('workspace-manager:create-workspace-dialog')!()).resolves.toEqual({ success: true, path: workspacePath });
      expect(readFileSync(join(workspacePath, 'README.md'))).toEqual(original);
    } finally {
      controller.dispose();
    }
  });
});
