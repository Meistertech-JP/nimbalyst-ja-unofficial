/**
 * Application menu builder for Nimbalyst Electron app.
 *
 * Creates and manages the native application menu bar with support for:
 * - File operations (new, open, save, recent items)
 * - Edit commands (undo/redo, copy/paste, find/replace)
 * - View modes (files, agent) and panels (AI chat, bottom panel)
 * - Window management (minimize, close, window list with keyboard shortcuts)
 * - Theme switching (light, dark, crystal-dark, system)
 * - Developer tools (console, file watcher diagnostics, database server)
 * - Help and documentation
 *
 * The menu adapts based on:
 * - Platform (macOS vs Windows/Linux)
 * - Window state (workspace vs document mode)
 * - Active mode (files vs agent mode for context-aware New command)
 * - Development vs production build (shows/hides dev-only features)
 *
 * Menu updates are triggered when:
 * - Theme changes
 * - Recent items change
 * - Windows are opened/closed/focused
 */
import { Menu, BrowserWindow, app, dialog, shell, nativeTheme } from 'electron';
import { basename, join } from 'path';
import * as path from 'path';
import { existsSync } from 'fs';
import * as fs from 'fs';
import { windowStates, createWindow, findWindowByFilePath, getWindowId } from '../window/WindowManager';
import { createAboutWindow } from '../window/AboutWindow';
import { createWorkspaceManagerWindow } from '../window/WorkspaceManagerWindow.ts';
import { createTeamManagementWindow } from '../window/TeamManagementWindow';
import { createAIUsageReportWindow } from '../window/AIUsageReportWindow';
import { createDatabaseBrowserWindow } from '../window/DatabaseBrowserWindow';
import { createDeveloperDashboardWindow } from '../window/DeveloperDashboardWindow';
import { runDiffErgonomicsHarness } from '../file/DiffErgonomicsFixture';
import { loadFileIntoWindow } from '../file/FileOperations';
import { getRecentItems, clearRecentItems, addToRecentItems, getTheme, setTheme, store, getWorkspaceState, getWorkspaceWindowState, isExtensionDevToolsEnabled, setWorktreeOnboardingShown } from '../utils/store';
import { updateWindowTitleBars, updateNativeTheme } from '../theme/ThemeManager';
import { refreshWorkspaceFileTree } from '../file/FileWatcherDebug';
import { getFolderContents } from '../utils/FileTree';
import { logger } from '../utils/logger';
import { t } from '../i18n';
import { getFocusedWindow } from '../utils/windowFocus';
import { showSplashScreen } from '../window/SplashScreen';
import { autoUpdaterService } from '../services/autoUpdater';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { AnalyticsService } from '../services/analytics/AnalyticsService';
import { FeatureTrackingService } from '../services/analytics/FeatureTrackingService';
import { getDialogDefaultPath, rememberDialogSelection } from '../utils/dialogPaths';
import {
    showExtensionProjectIntroDialog,
    showNewExtensionProjectDialog,
} from '../services/ExtensionProjectScaffolder';

// Import shared SDK docs path function
import { getExtensionSDKDocsPath } from '../utils/workspaceDetection';
import { database } from '../database/PGLiteDatabaseWorker';
import { getRegisteredWalkthroughs, getRegisteredTips } from '../ipc/WalkthroughHandlers';

// Create window list menu items
function createWindowListMenu(): any[] {
    const menuItems: any[] = [];
    const allWindows = BrowserWindow.getAllWindows();

    if (allWindows.length === 0) {
        return [];
    }

    // Categorize windows
    const workspaceWindows: { window: BrowserWindow; title: string }[] = [];
    const documentWindows: { window: BrowserWindow; title: string }[] = [];
    const otherWindows: { window: BrowserWindow; title: string }[] = [];

    allWindows.forEach((window) => {
        // Skip destroyed windows
        if (!window || window.isDestroyed()) {
            return;
        }

        const windowId = getWindowId(window);
        const state = windowId !== null ? windowStates.get(windowId) : undefined;
        let title = 'Untitled';
        let category: 'workspace' | 'document' | 'other' = 'document';

        // Check for special windows first
        if (isWorkspaceManagerWindow(window)) {
            title = 'Project Manager';
            category = 'other';
        } else if (isAboutWindow(window)) {
            title = 'About';
            category = 'other';
        } else if (state) {
            if (state.mode === 'workspace' && state.workspacePath) {
                title = basename(state.workspacePath);
                category = 'workspace';
            }
        }

        // Add to appropriate category
        if (category === 'workspace') {
            workspaceWindows.push({ window, title });
        } else if (category === 'document') {
            documentWindows.push({ window, title });
        } else {
            otherWindows.push({ window, title });
        }
    });

    // Build menu items with groups

    // Add workspace windows
    if (workspaceWindows.length > 0) {
        if (menuItems.length > 0) {
            menuItems.push({ type: 'separator' });
        }
        menuItems.push({ label: t('menu:open_projects'), enabled: false });
        workspaceWindows.forEach(({ window, title }) => {
            menuItems.push({
                label: title,
                type: 'checkbox',
                checked: !window.isDestroyed() && window.isFocused(),
                click: async () => {
                    if (!window.isDestroyed()) {
                        window.focus();
                    }
                }
            });
        });
    }

    // Add document windows
    if (documentWindows.length > 0) {
        if (menuItems.length > 0) {
            menuItems.push({ type: 'separator' });
        }
        menuItems.push({ label: t('menu:open_documents'), enabled: false });
        documentWindows.forEach(({ window, title }) => {
            menuItems.push({
                label: title,
                type: 'checkbox',
                checked: !window.isDestroyed() && window.isFocused(),
                click: async () => {
                    if (!window.isDestroyed()) {
                        window.focus();
                    }
                }
            });
        });
    }

    // Add other windows
    // if (otherWindows.length > 0) {
    //     if (menuItems.length > 0) {
    //         menuItems.push({ type: 'separator' });
    //     }
    //     menuItems.push({ label: t('menu:other_windows'), enabled: false });
    //     otherWindows.forEach(({ window, title }) => {
    //         const accelerator = shortcutIndex < 9 ? `CmdOrCtrl+${shortcutIndex + 1}` : undefined;
    //         shortcutIndex++;
    //         menuItems.push({
    //             label: title,
    //             accelerator,
    //             type: 'checkbox',
    //             checked: window.isFocused(),
    //             click: async () => {
    //                 window.focus();
    //             }
    //         });
    //     });
    // }

    return menuItems;
}

// Create the recent projects submenu
async function createRecentSubmenu(): Promise<any[]> {
    const recentWorkspaces = await getRecentItems('workspaces');
    const submenu: any[] = [];

    if (recentWorkspaces.length > 0) {
        recentWorkspaces.forEach(workspace => {
            submenu.push({
                label: workspace.name,
                click: async () => {
                    // Check if workspace exists
                    if (existsSync(workspace.path)) {
                        // Check for saved workspace window state
                        const savedState = getWorkspaceWindowState(workspace.path);

                        // Create window with saved bounds if available
                        const window = createWindow(false, true, workspace.path, savedState?.bounds);

                        // Restore dev tools if they were open
                        if (savedState?.devToolsOpen) {
                            window.webContents.once('did-finish-load', () => {
                                window.webContents.openDevTools();
                            });
                        }
                    } else {
                        // Remove from recent if doesn't exist
                        const items = getRecentItems('workspaces').filter(item => item.path !== workspace.path);
                        store.set('recent.workspaces', items);
                        updateApplicationMenu();
                        dialog.showErrorBox(
                            t('menu:project_not_found_title'),
                            t('menu:project_not_found_message', { name: workspace.name, path: workspace.path }),
                        );
                    }
                }
            });
        });

        submenu.push({ type: 'separator' });
        submenu.push({
            label: t('menu:clear_recent_projects'),
            click: async () => {
                clearRecentItems('workspaces');
                updateApplicationMenu();
            }
        });
    }

    // If no recent items
    if (submenu.length === 0) {
        submenu.push({ label: t('menu:no_recent_projects'), enabled: false });
    }

    return submenu;
}

// Create application menu
export async function createApplicationMenu() {
    // Get current theme from store
    const currentTheme = getTheme();
    const isDev = process.env.NODE_ENV !== 'production';

    const template: any[] = [
        {
            label: t('menu:file.title'),
            submenu: [
                {
                    id: 'file-new-file',
                    label: t('menu:new_file'),
                    click: async () => {
                        const focusedWindow = getFocusedWindow();

                        if (focusedWindow) {
                            const windowId = getWindowId(focusedWindow);

                            if (windowId !== null) {
                                const state = windowStates.get(windowId);

                                if (state?.mode === 'workspace') {
                                    // Switch to files mode first (in case we're in agent mode)
                                    focusedWindow.webContents.send('set-content-mode', 'files');
                                    // Small delay to let mode switch complete before opening dialog
                                    setTimeout(() => {
                                        focusedWindow.webContents.send('file-new-in-workspace');
                                    }, 50);
                                } else {
                                    // In document mode, create new window
                                    createWindow();
                                }
                            } else {
                                createWindow();
                            }
                        } else {
                            createWindow();
                        }
                    }
                },
                {
                    id: 'file-new-session',
                    label: t('menu:launch_new_session'),
                    accelerator: KeyboardShortcuts.file.sessionLaunchPopup,
                    click: async () => {
                        const focusedWindow = getFocusedWindow();

                        if (focusedWindow) {
                            const windowId = getWindowId(focusedWindow);

                            if (windowId !== null) {
                                const state = windowStates.get(windowId);

                                if (state?.mode === 'workspace' && state.workspacePath) {
                                    focusedWindow.webContents.send('session-launch-popup-open');
                                }
                            }
                        }
                    }
                },
                {
                    id: 'file-new-browser-tab',
                    label: t('menu:new_browser_tab'),
                    accelerator: KeyboardShortcuts.file.newBrowserTab,
                    click: async () => {
                        const focusedWindow = getFocusedWindow();
                        if (!focusedWindow) return;

                        const windowId = getWindowId(focusedWindow);
                        if (windowId === null) return;

                        const state = windowStates.get(windowId);
                        if (state?.mode !== 'workspace' || !state.workspacePath) return;

                        AnalyticsService.getInstance().sendEvent('menu_action_used', {
                            menu: 'file',
                            action: 'new_browser_tab',
                            hasKeyboardEquivalent: true,
                        });

                        // Switch to files mode first (in case we're in agent mode),
                        // then open the browser virtual tab once the mode settles.
                        focusedWindow.webContents.send('set-content-mode', 'files');
                        setTimeout(() => {
                            focusedWindow.webContents.send('file-new-browser-tab');
                        }, 50);
                    }
                },
                {
                    id: 'file-new-extension-project',
                    label: t('menu:new_extension_project'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('menu_action_used', {
                            menu: 'file',
                            action: 'new_extension_project',
                            hasKeyboardEquivalent: false,
                        });

                        await showNewExtensionProjectDialog(getFocusedWindow());
                    }
                },
                {
                    id: 'file-import-claude-code-sessions',
                    label: t('menu:import_claude_code_sessions'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('claude_code_import_dialog_opened', {
                            source: 'file_menu',
                        });
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('show-session-import-dialog');
                        }
                    }
                },
                {
                    // Hidden menu item that handles Cmd+N dynamically based on current mode
                    id: 'file-new-dynamic',
                    label: t('menu:new'),
                    accelerator: KeyboardShortcuts.file.newFile,
                    visible: false, // Hidden from menu - only provides the accelerator
                    click: async () => {
                        const focusedWindow = getFocusedWindow();
                        if (!focusedWindow) {
                            createWindow();
                            return;
                        }

                        const windowId = getWindowId(focusedWindow);
                        if (windowId === null) {
                            createWindow();
                            return;
                        }

                        const state = windowStates.get(windowId);
                        if (state?.mode !== 'workspace' || !state.workspacePath) {
                            createWindow();
                            return;
                        }

                        // Check current mode at keypress time (not menu build time)
                        const workspaceState = getWorkspaceState(state.workspacePath);
                        const currentMode = workspaceState?.activeMode;

                        if (currentMode === 'agent') {
                            // In agent mode, create new AI session
                            focusedWindow.webContents.send('agent-new-session');
                        } else {
                            // In files/plan/settings mode, create new file
                            focusedWindow.webContents.send('file-new-in-workspace');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:open'),
                    accelerator: KeyboardShortcuts.file.open,
                    click: async () => {
                        const focusedWindow = BrowserWindow.getFocusedWindow();
                        const dialogOptions: Electron.OpenDialogOptions = {
                            defaultPath: getDialogDefaultPath({ window: focusedWindow }),
                            properties: ['openFile'],
                            filters: [
                                { name: 'Markdown Files', extensions: ['md', 'markdown'] },
                                { name: 'Text Files', extensions: ['txt'] },
                                { name: 'All Files', extensions: ['*'] }
                            ]
                        };
                        const result = focusedWindow
                            ? await dialog.showOpenDialog(focusedWindow, dialogOptions)
                            : await dialog.showOpenDialog(dialogOptions);

                        if (!result.canceled && result.filePaths.length > 0) {
                            const filePath = result.filePaths[0];
                            rememberDialogSelection(filePath, 'file');
                            // Check if file is already open
                            const existingWindow = findWindowByFilePath(filePath);
                            if (existingWindow) {
                                existingWindow.focus();
                            } else {
                                // Open in new window
                                const window = createWindow(true);
                                window.once('ready-to-show', () => {
                                    loadFileIntoWindow(window, filePath);
                                });
                            }
                        }
                    }
                },
                {
                    label: t('menu:open_project'),
                    click: async () => {
                        // Track menu action
                        AnalyticsService.getInstance().sendEvent('menu_action_used', {
                            menu: 'file',
                            action: 'open_project',
                            hasKeyboardEquivalent: true,
                        });

                        createWorkspaceManagerWindow();
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:recent_projects'),
                    submenu: await createRecentSubmenu()
                },
                ...(process.platform !== 'darwin' ? [
                  {
                      label: t('menu:settings'),
                      accelerator: KeyboardShortcuts.window.aiModels,
                      click: async () => {
                          // Track settings opened
                          AnalyticsService.getInstance().sendEvent('global_settings_opened', {
                              source: 'menu',
                              section: 'general',
                          });
                          // Switch to settings mode in the focused window
                          const focused = getFocusedWindow();
                          if (focused && !isAboutWindow(focused)) {
                              focused.webContents.send('set-content-mode', 'settings');
                          }
                      }
                  },
                ]: []),
                { type: 'separator' },
                {
                    label: t('menu:save'),
                    accelerator: KeyboardShortcuts.file.save,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused && !isAboutWindow(focused)) {
                            focused.webContents.send('file-save');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:close_tab'),
                    accelerator: KeyboardShortcuts.file.closeTab,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            const windowId = getWindowId(focused);
                            if (windowId !== null) {
                                const state = windowStates.get(windowId);

                                // If in workspace or agentic coding mode, close the active tab
                                if (state?.mode === 'workspace' || state?.mode === 'agentic-coding') {
                                    logger.menu.info(`[Close Tab] Sending close-active-tab to window ${windowId}`);
                                    focused.webContents.send('close-active-tab');
                                    return;
                                }
                            }

                            // Default behavior: close the window
                            focused.close();
                        } else {
                            logger.menu.warn('[Close Tab] No focused window found');
                        }
                    }
                },
                {
                    label: t('menu:reopen_closed_tab'),
                    accelerator: KeyboardShortcuts.file.reopenClosedTab,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            const windowId = getWindowId(focused);
                            if (windowId !== null) {
                                const state = windowStates.get(windowId);

                                // Only works in workspace or agentic coding mode
                                if (state?.mode === 'workspace' || state?.mode === 'agentic-coding') {
                                    logger.menu.info(`[Reopen Closed Tab] Sending reopen-last-closed-tab to window ${windowId}`);
                                    focused.webContents.send('reopen-last-closed-tab');
                                } else {
                                    logger.menu.warn('[Reopen Closed Tab] Not in workspace/agentic mode');
                                }
                            }
                        } else {
                            logger.menu.warn('[Reopen Closed Tab] No focused window found');
                        }
                    }
                },
                {
                    label: t('menu:close_project'),
                    accelerator: KeyboardShortcuts.file.closeProject,
                    click: async () => {
                        const focused = getFocusedWindow();

                        if (focused && !focused.isDestroyed()) {
                            // Get window info for logging
                            const windowId = getWindowId(focused);
                            const state = windowId !== null ? windowStates.get(windowId) : undefined;
                            let projectName = 'Untitled';

                            if (state?.mode === 'workspace' && state.workspacePath) {
                                projectName = basename(state.workspacePath);
                            } else if (state?.filePath) {
                                projectName = basename(state.filePath);
                            }

                            console.log('[Close Project] Closing:', {
                                windowId,
                                projectName,
                                mode: state?.mode,
                                electronId: focused.id
                            });

                            // TODO: Add warning dialog if AI/agent is running
                            focused.close();
                        } else {
                            console.error('[Close Project] No focused window found or window is destroyed');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:quit'),
                    accelerator: KeyboardShortcuts.file.quit,
                    click: async () => {
                        try {
                            console.log('Quit menu item clicked');
                            app.quit();
                        } catch (error) {
                            console.error('Error during quit:', error);
                            // Force quit if normal quit fails
                            process.exit(0);
                        }
                    }
                }
            ]
        },
        {
            label: t('menu:edit.title'),
            submenu: [
                { label: t('menu:undo'), accelerator: KeyboardShortcuts.edit.undo, role: 'undo' },
                { label: t('menu:redo'), accelerator: KeyboardShortcuts.edit.redo, role: 'redo' },
                { type: 'separator' },
                { label: t('menu:cut'), accelerator: KeyboardShortcuts.edit.cut, role: 'cut' },
                { label: t('menu:copy'), accelerator: KeyboardShortcuts.edit.copy, role: 'copy' },
                {
                    label: t('menu:copy_as_markdown'),
                    accelerator: KeyboardShortcuts.edit.copyMarkdown,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('copy-as-markdown');
                        }
                    }
                },
                { label: t('menu:paste'), accelerator: KeyboardShortcuts.edit.paste, role: 'paste' },
                { label: t('menu:select_all'), accelerator: KeyboardShortcuts.edit.selectAll, role: 'selectAll' },
                { type: 'separator' },
                {
                    label: t('menu:find'),
                    accelerator: KeyboardShortcuts.edit.find,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('menu:find');
                        }
                    }
                },
                {
                    label: t('menu:find_next'),
                    accelerator: KeyboardShortcuts.edit.findNext,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('menu:find-next');
                        }
                    }
                },
                {
                    label: t('menu:find_previous'),
                    accelerator: KeyboardShortcuts.edit.findPrevious,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('menu:find-previous');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:view_local_history'),
                    accelerator: KeyboardShortcuts.edit.viewHistory,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('view-history');
                        }
                    }
                },
                {
                    label: t('menu:view_folder_history'),
                    accelerator: 'CmdOrCtrl+Shift+H',
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('view-workspace-history');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:approve_current_action'),
                    accelerator: KeyboardShortcuts.edit.approve,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('approve-action');
                        }
                    }
                },
                {
                    label: t('menu:reject_current_action'),
                    accelerator: KeyboardShortcuts.edit.reject,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('reject-action');
                        }
                    }
                }
            ]
        },
        {
            label: t('menu:view.title'),
            submenu: [
                // View Modes
                {
                    label: t('menu:files_mode'),
                    accelerator: KeyboardShortcuts.view.filesMode,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('set-content-mode', 'files');
                        }
                    }
                },
                {
                    label: t('menu:agent_mode'),
                    accelerator: KeyboardShortcuts.view.agentMode,
                    click: async () => {
                        console.log('[Menu] Agent Mode clicked');
                        const focused = getFocusedWindow();
                        console.log('[Menu] Focused window:', focused ? 'exists' : 'null');
                        if (focused) {
                            console.log('[Menu] Sending set-content-mode event with agent');
                            focused.webContents.send('set-content-mode', 'agent');
                        }
                    }
                },
                { type: 'separator' },
                // Panels
                {
                    label: t('menu:toggle_ai_chat_panel'),
                    accelerator: KeyboardShortcuts.view.toggleAIChat,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('toggle-ai-chat-panel');
                        }
                    }
                },
                {
                    label: t('menu:toggle_bottom_panel'),
                    accelerator: KeyboardShortcuts.view.toggleBottomPanel,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('toggle-bottom-panel');
                        }
                    }
                },
                { type: 'separator' },
                // Navigation
                {
                    label: t('menu:navigate_back'),
                    accelerator: KeyboardShortcuts.view.navigateBack,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('navigation:go-back');
                        }
                    }
                },
                {
                    label: t('menu:navigate_forward'),
                    accelerator: KeyboardShortcuts.view.navigateForward,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('navigation:go-forward');
                        }
                    }
                },
                { type: 'separator' },
                // Tab Navigation
                {
                    label: t('menu:next_tab'),
                    accelerator: KeyboardShortcuts.view.nextTab,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('next-tab');
                        }
                    }
                },
                {
                    label: t('menu:previous_tab'),
                    accelerator: KeyboardShortcuts.view.prevTab,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('previous-tab');
                        }
                    }
                },
                { type: 'separator' },
                // Zoom
                {
                    label: t('menu:actual_size'),
                    accelerator: KeyboardShortcuts.view.actualSize,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) focused.webContents.setZoomFactor(1);
                    }
                },
                {
                    label: t('menu:zoom_in'),
                    accelerator: KeyboardShortcuts.view.zoomIn,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            const currentZoom = focused.webContents.getZoomFactor();
                            focused.webContents.setZoomFactor(currentZoom + 0.1);
                        }
                    }
                },
                {
                    // Hidden alias for Zoom In so users can press CmdOrCtrl+=
                    // without holding Shift. The visible accelerator `Cmd+Plus`
                    // requires Shift+= on Windows/Linux QWERTY layouts and the
                    // Electron `Plus` accelerator can also miss the keystroke
                    // when Windows reports the unshifted `=` keycode. Pattern
                    // matches the hidden `New File` accelerator above. See #205.
                    label: t('menu:zoom_in_alt'),
                    accelerator: 'CmdOrCtrl+=',
                    visible: false,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            const currentZoom = focused.webContents.getZoomFactor();
                            focused.webContents.setZoomFactor(currentZoom + 0.1);
                        }
                    }
                },
                {
                    // Hidden alias matching the literal Shift+= keystroke that
                    // produces `+` on QWERTY layouts; some keyboard drivers
                    // report this with the Shift modifier still set, so the
                    // bare `CmdOrCtrl+=` binding above doesn't always catch it.
                    label: t('menu:zoom_in_shift'),
                    accelerator: 'CmdOrCtrl+Shift+=',
                    visible: false,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            const currentZoom = focused.webContents.getZoomFactor();
                            focused.webContents.setZoomFactor(currentZoom + 0.1);
                        }
                    }
                },
                {
                    // Hidden alias for the numeric keypad `+`. Reported as a
                    // distinct keycode from the main-row `+`, so neither
                    // CmdOrCtrl+Plus nor CmdOrCtrl+= pick it up.
                    label: t('menu:zoom_in_numpad'),
                    accelerator: 'CmdOrCtrl+numadd',
                    visible: false,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            const currentZoom = focused.webContents.getZoomFactor();
                            focused.webContents.setZoomFactor(currentZoom + 0.1);
                        }
                    }
                },
                {
                    label: t('menu:zoom_out'),
                    accelerator: KeyboardShortcuts.view.zoomOut,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            const currentZoom = focused.webContents.getZoomFactor();
                            focused.webContents.setZoomFactor(Math.max(0.5, currentZoom - 0.1));
                        }
                    }
                },
                {
                    // Hidden alias for the numeric keypad `-`. Symmetric with
                    // the numpad zoom-in binding above.
                    label: t('menu:zoom_out_numpad'),
                    accelerator: 'CmdOrCtrl+numsub',
                    visible: false,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            const currentZoom = focused.webContents.getZoomFactor();
                            focused.webContents.setZoomFactor(Math.max(0.5, currentZoom - 0.1));
                        }
                    }
                },
                { type: 'separator' },
                // Appearance
                {
                    label: t('menu:theme'),
                    submenu: [
                        {
                            label: t('menu:light'),
                            type: 'radio',
                            checked: currentTheme === 'light',
                            click: async () => {
                                const fromTheme = currentTheme;
                                const featureTracking = FeatureTrackingService.getInstance();
                                const isFirstChange = !featureTracking.hasBeenUsed('theme_changed' as any);

                                if (isFirstChange) {
                                    featureTracking.isFirstUse('theme_changed' as any);
                                }

                                setTheme('light');
                                updateNativeTheme();
                                BrowserWindow.getAllWindows().forEach(window => {
                                    window.webContents.send('theme-change', 'light');
                                });
                                updateWindowTitleBars();
                                await createApplicationMenu();

                                // Track theme change
                                AnalyticsService.getInstance().sendEvent('theme_changed', {
                                    fromTheme,
                                    toTheme: 'light',
                                    isFirstChange,
                                });
                            }
                        },
                        {
                            label: t('menu:dark'),
                            type: 'radio',
                            checked: currentTheme === 'dark',
                            click: async () => {
                                const fromTheme = currentTheme;
                                const featureTracking = FeatureTrackingService.getInstance();
                                const isFirstChange = !featureTracking.hasBeenUsed('theme_changed' as any);

                                if (isFirstChange) {
                                    featureTracking.isFirstUse('theme_changed' as any);
                                }

                                setTheme('dark');
                                updateNativeTheme();
                                BrowserWindow.getAllWindows().forEach(window => {
                                    window.webContents.send('theme-change', 'dark');
                                });
                                updateWindowTitleBars();
                                await createApplicationMenu();

                                // Track theme change
                                AnalyticsService.getInstance().sendEvent('theme_changed', {
                                    fromTheme,
                                    toTheme: 'dark',
                                    isFirstChange,
                                });
                            }
                        },
                        {
                            label: t('menu:crystal_dark'),
                            type: 'radio',
                            checked: currentTheme === 'crystal-dark',
                            click: async () => {
                                const fromTheme = currentTheme;
                                const featureTracking = FeatureTrackingService.getInstance();
                                const isFirstChange = !featureTracking.hasBeenUsed('theme_changed' as any);

                                if (isFirstChange) {
                                    featureTracking.isFirstUse('theme_changed' as any);
                                }

                                setTheme('crystal-dark');
                                updateNativeTheme();
                                BrowserWindow.getAllWindows().forEach(window => {
                                    window.webContents.send('theme-change', 'crystal-dark');
                                });
                                updateWindowTitleBars();
                                await createApplicationMenu();

                                // Track theme change
                                AnalyticsService.getInstance().sendEvent('theme_changed', {
                                    fromTheme,
                                    toTheme: 'crystal-dark',
                                    isFirstChange,
                                });
                            }
                        },
                        {
                            label: t('menu:system'),
                            type: 'radio',
                            checked: currentTheme === 'system',
                            click: async () => {
                                const fromTheme = currentTheme;
                                const featureTracking = FeatureTrackingService.getInstance();
                                const isFirstChange = !featureTracking.hasBeenUsed('theme_changed' as any);

                                if (isFirstChange) {
                                    featureTracking.isFirstUse('theme_changed' as any);
                                }

                                setTheme('system');
                                updateNativeTheme();
                                // Send resolved theme (light or dark) to renderers
                                const resolvedTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
                                BrowserWindow.getAllWindows().forEach(window => {
                                    window.webContents.send('theme-change', resolvedTheme);
                                });
                                updateWindowTitleBars();
                                await createApplicationMenu();

                                // Track theme change
                                AnalyticsService.getInstance().sendEvent('theme_changed', {
                                    fromTheme,
                                    toTheme: 'system',
                                    isFirstChange,
                                });
                            }
                        }
                    ]
                },
                { type: 'separator' },
                // Full screen
                {
                    label: t('menu:toggle_full_screen'),
                    accelerator: KeyboardShortcuts.view.toggleFullScreen,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            focused.setFullScreen(!focused.isFullScreen());
                        }
                    }
                }
            ]
        },
        {
            label: t('menu:window.title'),
            submenu: [
                {
                    label: t('menu:project_manager'),
                    accelerator: KeyboardShortcuts.window.workspaceManager,
                    click: async () => {
                        // Track menu action
                        AnalyticsService.getInstance().sendEvent('menu_action_used', {
                            menu: 'window',
                            action: 'project_manager',
                            hasKeyboardEquivalent: true,
                        });
                        createWorkspaceManagerWindow();
                    }
                },
                {
                    // No orgId: the window opens on the last-selected organization
                    // (or the first one you belong to), same as the switcher's
                    // untargeted entry points.
                    label: t('menu:organization_manager'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('menu_action_used', {
                            menu: 'window',
                            action: 'organization_manager',
                            hasKeyboardEquivalent: false,
                        });
                        createTeamManagementWindow();
                    }
                },
                {
                    label: t('menu:switch_project'),
                    accelerator: KeyboardShortcuts.window.projectQuickOpen,
                    registerAccelerator: false, // Handled by renderer keyboard handler
                    click: () => {
                        const focused = getFocusedWindow();
                        if (focused) focused.webContents.send('open-navigation-dialog', 'project-quick-open');
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:quick_open'),
                    accelerator: KeyboardShortcuts.file.open,
                    registerAccelerator: false,
                    click: () => {
                        const focused = getFocusedWindow();
                        if (focused) focused.webContents.send('open-navigation-dialog', 'quick-open');
                    }
                },
                {
                    label: t('menu:session_quick_open'),
                    accelerator: KeyboardShortcuts.window.sessionQuickOpen,
                    registerAccelerator: false,
                    click: () => {
                        const focused = getFocusedWindow();
                        if (focused) focused.webContents.send('open-navigation-dialog', 'session-quick-open');
                    }
                },
                {
                    label: t('menu:prompt_quick_open'),
                    accelerator: KeyboardShortcuts.window.promptQuickOpen,
                    registerAccelerator: false,
                    click: () => {
                        const focused = getFocusedWindow();
                        if (focused) focused.webContents.send('open-navigation-dialog', 'prompt-quick-open');
                    }
                },
                {
                    label: t('menu:content_search'),
                    accelerator: KeyboardShortcuts.window.contentSearch,
                    registerAccelerator: false,
                    click: () => {
                        const focused = getFocusedWindow();
                        if (focused) focused.webContents.send('open-navigation-dialog', 'content-search');
                    }
                },
                {
                    label: t('menu:global_search'),
                    accelerator: KeyboardShortcuts.window.globalSearch,
                    registerAccelerator: false, // Handled by renderer keyboard handler
                    click: () => {
                        const focused = getFocusedWindow();
                        if (focused) focused.webContents.send('open-navigation-dialog', 'global-search');
                    }
                },
                {
                    label: t('menu:team_quick_open'),
                    accelerator: KeyboardShortcuts.window.teamQuickOpen,
                    registerAccelerator: false, // Handled by renderer keyboard handler
                    click: () => {
                        const focused = getFocusedWindow();
                        if (focused) focused.webContents.send('open-navigation-dialog', 'team-quick-open');
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:ai_usage_report'),
                    click: async () => {
                        // Track menu action
                        AnalyticsService.getInstance().sendEvent('menu_action_used', {
                            menu: 'window',
                            action: 'ai_usage_report',
                        });
                        createAIUsageReportWindow();
                    }
                },
                // {
                //     label: t('menu:session_manager'),
                //     accelerator: KeyboardShortcuts.window.sessionManager,
                //     click: async () => {
                //         createSessionManagerWindow();
                //     }
                // },
                // {
                //     label: t('menu:agentic_coding'),
                //     accelerator: KeyboardShortcuts.window.agenticCoding,
                //     click: async () => {
                //         const focused = getFocusedWindow();
                //         if (!focused) return;
                //
                //         const windowId = getWindowId(focused);
                //         const state = windowId !== null ? windowStates.get(windowId) : undefined;
                //
                //         if (!state || !state.workspacePath) {
                //             dialog.showMessageBox(focused, {
                //                 type: 'info',
                //                 title: 'No Workspace',
                //                 message: 'Please open a workspace to use agentic coding.'
                //             });
                //             return;
                //         }
                //
                //         createAgenticCodingWindow({
                //             workspacePath: state.workspacePath,
                //             planDocumentPath: state.filePath && state.filePath.endsWith('.md') ? state.filePath : undefined
                //         });
                //     }
                // },
                { type: 'separator' },
                { label: t('menu:minimize'), accelerator: KeyboardShortcuts.window.minimize, role: 'minimize' },
                { type: 'separator' },
                { label: t('menu:bring_all_to_front'), role: 'front' },
                { type: 'separator' },
                ...createWindowListMenu()
            ]
        },
        {
            label: t('menu:developer'),
            submenu: [
                {
                    label: t('menu:development_assistance'),
                    enabled: false
                },
                { type: 'separator' },
                {
                    label: t('menu:toggle_developer_tools'),
                    accelerator: KeyboardShortcuts.view.toggleDevTools,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) focused.webContents.toggleDevTools();
                    }
                },
                {
                    label: t('menu:new_extension_project'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('menu_action_used', {
                            menu: 'developer',
                            action: 'new_extension_project',
                            hasKeyboardEquivalent: false,
                        });

                        await showNewExtensionProjectDialog(getFocusedWindow());
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:reload'),
                    accelerator: KeyboardShortcuts.view.reload,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) focused.webContents.reload();
                    }
                },
                {
                    label: t('menu:force_reload'),
                    accelerator: KeyboardShortcuts.view.forceReload,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) focused.webContents.reloadIgnoringCache();
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:developer_dashboard'),
                    click: () => {
                        createDeveloperDashboardWindow();
                    }
                },
                {
                    label: t('menu:diff_ergonomics_test_harness'),
                    click: async () => {
                        await runDiffErgonomicsHarness(getFocusedWindow());
                    }
                },
                {
                    label: t('menu:refresh_file_tree'),
                    accelerator: KeyboardShortcuts.developer.refreshFileTree,
                    click: async () => {
                        const focused = getFocusedWindow();
                        if (focused) {
                            refreshWorkspaceFileTree(focused);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:open_debug_log'),
                    click: async () => {
                        const logPath = path.join(app.getPath('userData'), 'nimbalyst-debug.log');

                        // Create the log file if it doesn't exist
                        if (!fs.existsSync(logPath)) {
                            fs.writeFileSync(logPath, `=== Nimbalyst Debug Log ===\nNo debug messages yet.\n\nDebug logging is only active in development mode.\nTo enable debug logging in production, set NODE_ENV=development\n`);
                        }

                        shell.openPath(logPath).catch((err: any) => {
                            console.error('Failed to open debug log:', err);
                            dialog.showErrorBox(t('menu:generic_error_title'), t('menu:debug_log_open_failed', { path: logPath }));
                        });
                    }
                },
                {
                    label: t('menu:open_main_log'),
                    click: async () => {
                        const logPath = path.join(app.getPath('userData'), 'logs', 'main.log');

                        // Create the log file if it doesn't exist
                        if (!fs.existsSync(logPath)) {
                            const logsDir = path.dirname(logPath);
                            if (!fs.existsSync(logsDir)) {
                                fs.mkdirSync(logsDir, { recursive: true });
                            }
                            fs.writeFileSync(logPath, `=== Nimbalyst Main Log ===\nNo log messages yet.\n\nThis log contains main process and application logs.\n`);
                        }

                        shell.openPath(logPath).catch((err: any) => {
                            console.error('Failed to open main log:', err);
                            dialog.showErrorBox(t('menu:generic_error_title'), t('menu:main_log_open_failed', { path: logPath }));
                        });
                    }
                },
                {
                    label: t('menu:rotate_logs'),
                    click: async () => {
                        const userData = app.getPath('userData');
                        const results: string[] = [];

                        // Rotate debug logs (shift numbered backups, move current to .1)
                        try {
                            const baseName = 'nimbalyst-debug';
                            const ext = '.log';
                            const maxSessions = 5;

                            // Delete oldest
                            const oldestPath = path.join(userData, `${baseName}.${maxSessions - 1}${ext}`);
                            if (fs.existsSync(oldestPath)) {
                                fs.unlinkSync(oldestPath);
                            }

                            // Shift existing: N-1 -> N, ..., 1 -> 2
                            for (let i = maxSessions - 2; i >= 1; i--) {
                                const currentPath = path.join(userData, `${baseName}.${i}${ext}`);
                                const nextPath = path.join(userData, `${baseName}.${i + 1}${ext}`);
                                if (fs.existsSync(currentPath)) {
                                    fs.renameSync(currentPath, nextPath);
                                }
                            }

                            // Move current to .1
                            const currentLogPath = path.join(userData, `${baseName}${ext}`);
                            const firstBackupPath = path.join(userData, `${baseName}.1${ext}`);
                            if (fs.existsSync(currentLogPath)) {
                                fs.renameSync(currentLogPath, firstBackupPath);
                                results.push('Debug log rotated');
                            } else {
                                results.push('Debug log: no file to rotate');
                            }

                            // Start fresh debug log
                            const timestamp = new Date().toISOString();
                            fs.writeFileSync(currentLogPath, `=== Debug Log Started ${timestamp} (manual rotation) ===\n`);
                        } catch (error) {
                            results.push(`Debug log rotation failed: ${error}`);
                        }

                        // Rotate main log (shift numbered backups, same as startup)
                        try {
                            const logsDir = path.join(userData, 'logs');
                            const mainBase = 'main';
                            const mainExt = '.log';
                            const maxMainSessions = 3;

                            const mainLogPath = path.join(logsDir, `${mainBase}${mainExt}`);
                            let sizeMB = '0';
                            if (fs.existsSync(mainLogPath)) {
                                sizeMB = (fs.statSync(mainLogPath).size / (1024 * 1024)).toFixed(1);
                            }

                            // Delete oldest
                            const oldestMain = path.join(logsDir, `${mainBase}.${maxMainSessions - 1}${mainExt}`);
                            if (fs.existsSync(oldestMain)) {
                                fs.unlinkSync(oldestMain);
                            }

                            // Shift existing: N-1 -> N, ..., 1 -> 2
                            for (let i = maxMainSessions - 2; i >= 1; i--) {
                                const cur = path.join(logsDir, `${mainBase}.${i}${mainExt}`);
                                const nxt = path.join(logsDir, `${mainBase}.${i + 1}${mainExt}`);
                                if (fs.existsSync(cur)) {
                                    fs.renameSync(cur, nxt);
                                }
                            }

                            // Move current to .1 (electron-log will create a fresh main.log on next write)
                            if (fs.existsSync(mainLogPath)) {
                                fs.renameSync(mainLogPath, path.join(logsDir, `${mainBase}.1${mainExt}`));
                                results.push(`Main log rotated (was ${sizeMB} MB)`);
                            } else {
                                results.push('Main log: no file to rotate');
                            }
                        } catch (error) {
                            results.push(`Main log rotation failed: ${error}`);
                        }

                        const focused = getFocusedWindow();
                        if (focused) {
                            dialog.showMessageBox(focused, {
                                type: 'info',
                                title: t('menu:log_rotation_title'),
                                message: t('menu:log_rotation_message'),
                                detail: results.join('\n'),
                                buttons: ['OK']
                            });
                        }
                    }
                },
                {
                    label: t('menu:open_user_data_directory'),
                    click: async () => {
                        const userDataPath = app.getPath('userData');
                        shell.openPath(userDataPath).catch((err: any) => {
                            console.error('Failed to open user data directory:', err);
                            dialog.showErrorBox(t('menu:generic_error_title'), t('menu:user_data_open_failed', { path: userDataPath }));
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:show_dialogs'),
                    submenu: [
                        {
                            label: t('menu:show_onboarding_new_user'),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('show-unified-onboarding', { forceNewUser: true });
                                }
                            }
                        },
                        {
                            label: t('menu:show_onboarding_existing_user'),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('show-unified-onboarding', { forceExistingUser: true });
                                }
                            }
                        },
                        {
                            label: t('menu:show_discord_invitation'),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('show-discord-invitation');
                                }
                            }
                        },
                        {
                            label: t('menu:show_extension_project_intro'),
                            click: async () => {
                                await showExtensionProjectIntroDialog(getFocusedWindow(), {
                                    forceShow: true,
                                    markShown: false,
                                });
                            }
                        },
                        {
                            label: t('menu:show_worktree_onboarding'),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('show-worktree-onboarding');
                                }
                            }
                        },
                        {
                            label: t('menu:show_windows_warning'),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('show-windows-claude-code-warning');
                                }
                            }
                        },
                        {
                            label: t('menu:show_commands_toast'),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('show-commands-toast');
                                }
                            }
                        },
                        {
                            label: t('menu:show_trust_toast'),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('show-trust-toast');
                                }
                            }
                        },
                        {
                            label: t('menu:show_figma_mcp_migration_toast'),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('show-figma-mcp-migration');
                                }
                            }
                        },
                        {
                            label: t('menu:reset_worktree_onboarding'),
                            click: () => {
                                setWorktreeOnboardingShown(false);
                            }
                        },
                        { type: 'separator' },
                        {
                            label: t('menu:show_database_recovery_dialog'),
                            click: async () => {
                                database.showRecoveryDialog();
                            }
                        },
                        {
                            label: t('menu:show_splash_screen'),
                            click: () => {
                                showSplashScreen();
                            }
                        },
                        { type: 'separator' },
                        {
                            label: t('menu:show_update_error_toast'),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('update-toast:error', {
                                        message: t('menu:update_signature_mismatch')
                                    });
                                }
                            }
                        }
                    ]
                },
                {
                    label: t('menu:show_walkthroughs'),
                    submenu: [
                        // Dynamically generated from registered walkthroughs
                        ...getRegisteredWalkthroughs().map(walkthrough => ({
                            label: t(`menu:walkthrough_names.${walkthrough.id}`, { defaultValue: walkthrough.name }),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('trigger-walkthrough', walkthrough.id);
                                }
                            }
                        })),
                        ...(getRegisteredWalkthroughs().length > 0 ? [{ type: 'separator' as const }] : []),
                        {
                            label: t('menu:reset_all_walkthroughs'),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('reset-walkthroughs');
                                }
                            }
                        }
                    ]
                },
                {
                    label: t('menu:show_tips'),
                    submenu: [
                        ...getRegisteredTips().map(tip => ({
                            label: t(`menu:tip_names.${tip.id}`, { defaultValue: tip.name }),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('trigger-tip', tip.id);
                                }
                            }
                        })),
                        ...(getRegisteredTips().length > 0 ? [{ type: 'separator' as const }] : []),
                        {
                            label: t('menu:reset_all_tips'),
                            click: async () => {
                                const focused = getFocusedWindow();
                                if (focused) {
                                    focused.webContents.send('reset-tips');
                                }
                            }
                        }
                    ]
                },
                ...(isDev ? [
                    { type: 'separator' },
                    {
                        label: t('menu:database_browser'),
                        click: async () => {
                            createDatabaseBrowserWindow();
                        }
                    }
                ] : [])
            ]
        }
    ];

    // Add app menu on macOS
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                {
                    label: t('menu:about_nimbalyst'),
                    click: async () => {
                        createAboutWindow();
                    }
                },
                {
                    label: t('menu:check_for_updates'),
                    enabled: autoUpdaterService.isEnabled(),
                    click: async () => {
                        autoUpdaterService.checkForUpdatesWithUI();
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:settings'),
                    accelerator: KeyboardShortcuts.window.aiModels,
                    click: async () => {
                        // Track settings opened
                        AnalyticsService.getInstance().sendEvent('global_settings_opened', {
                            source: 'menu',
                            section: 'general',
                        });
                        // Switch to settings mode in the focused window
                        const focused = getFocusedWindow();
                        if (focused && !isAboutWindow(focused)) {
                            focused.webContents.send('set-content-mode', 'settings');
                        }
                    }
                },
                { type: 'separator' },
                { label: t('menu:services'), submenu: [] },
                { type: 'separator' },
                { label: t('menu:hide') + app.getName(), accelerator: 'Command+H', role: 'hide' },
                { label: t('menu:hide_others'), accelerator: 'Command+Shift+H', role: 'hideothers' },
                { label: t('menu:show_all'), role: 'unhide' },
                { type: 'separator' },
                {
                    label: t('menu:quit'),
                    accelerator: 'Command+Q',
                    click: async () => {
                        try {
                            console.log('Quit menu item clicked (macOS)');
                            app.quit();
                        } catch (error) {
                            console.error('Error during quit:', error);
                            // Force quit if normal quit fails
                            process.exit(0);
                        }
                    }
                }
            ]
        });

        // Add Help menu for macOS
        template.push({
            label: t('menu:help.title'),
            submenu: [
                // {
                //     label: t('menu:welcome'),
                //     click: async () => {
                //         // Track help accessed
                //         AnalyticsService.getInstance().sendEvent('help_accessed', {
                //             helpType: 'welcome',
                //             context: 'menu',
                //         });
                //         // Send message to renderer to open welcome tab
                //         const focusedWindow = getFocusedWindow();
                //         if (focusedWindow) {
                //             focusedWindow.webContents.send('open-welcome-tab');
                //         }
                //     }
                // },
                {
                    label: t('menu:documentation'),
                    click: async () => {
                        // Track help accessed
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'docs',
                            context: 'menu',
                        });
                        shell.openExternal('https://docs.nimbalyst.com/');
                    }
                },
                {
                    label: t('menu:install_chrome_extension'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'chrome_extension',
                            context: 'menu',
                        });
                        shell.openExternal('https://chromewebstore.google.com/detail/nimbalyst-web-clipper/fdbmklnnkalihoblphakoebgmieljkbb');
                    }
                },
                // Extension SDK Documentation - only show when Extension Development Kit is enabled
                ...(isExtensionDevToolsEnabled() ? [{
                    label: t('menu:extension_sdk_documentation'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'extension_sdk_docs',
                            context: 'menu',
                        });
                        const sdkDocsPath = getExtensionSDKDocsPath();
                        if (sdkDocsPath) {
                            // Open as a workspace window
                            addToRecentItems('workspaces', sdkDocsPath, 'Extension SDK Docs');
                            createWindow(false, true, sdkDocsPath);
                        } else {
                            dialog.showErrorBox(
                                t('menu:sdk_docs_not_found_title'),
                                t('menu:sdk_docs_not_found_message'),
                            );
                        }
                    }
                }] : []),
                {
                    label: t('menu:keyboard_shortcuts'),
                    accelerator: 'CmdOrCtrl+/',
                    click: async () => {
                        // Track help accessed
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'keyboard_shortcuts',
                            context: 'menu',
                        });
                        const focusedWindow = getFocusedWindow();
                        if (focusedWindow) {
                            focusedWindow.webContents.send('open-keyboard-shortcuts');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:send_feedback'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'feedback',
                            context: 'menu',
                        });
                        const focusedWindow = getFocusedWindow();
                        if (focusedWindow) {
                            focusedWindow.webContents.send('open-feedback');
                        }
                    }
                },
                {
                    label: t('menu:browse_issues_on_github'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'github_issues',
                            context: 'menu',
                        });
                        shell.openExternal('https://github.com/nimbalyst/nimbalyst/issues');
                    }
                },
                {
                    label: t('menu:github_discussions'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'github_discussions',
                            context: 'menu',
                        });
                        shell.openExternal('https://github.com/nimbalyst/nimbalyst/discussions');
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:community'),
                    submenu: [
                        {
                            label: t('menu:join_discord'),
                            click: async () => {
                                AnalyticsService.getInstance().sendEvent('help_accessed', { helpType: 'discord', context: 'menu' });
                                shell.openExternal('https://discord.gg/ubZDt4esEn');
                            }
                        },
                        { type: 'separator' },
                        {
                            label: t('menu:youtube'),
                            click: async () => {
                                AnalyticsService.getInstance().sendEvent('help_accessed', { helpType: 'youtube', context: 'menu' });
                                shell.openExternal('https://youtube.com/@nimbalyst');
                            }
                        },
                        {
                            label: t('menu:linkedin'),
                            click: async () => {
                                AnalyticsService.getInstance().sendEvent('help_accessed', { helpType: 'linkedin', context: 'menu' });
                                shell.openExternal('https://linkedin.com/company/nimbalyst');
                            }
                        },
                        {
                            label: t('menu:x_twitter'),
                            click: async () => {
                                AnalyticsService.getInstance().sendEvent('help_accessed', { helpType: 'x', context: 'menu' });
                                shell.openExternal('https://x.com/nimbalyst');
                            }
                        },
                        {
                            label: t('menu:tiktok'),
                            click: async () => {
                                AnalyticsService.getInstance().sendEvent('help_accessed', { helpType: 'tiktok', context: 'menu' });
                                shell.openExternal('https://www.tiktok.com/@nimbalyst');
                            }
                        },
                        {
                            label: t('menu:instagram'),
                            click: async () => {
                                AnalyticsService.getInstance().sendEvent('help_accessed', { helpType: 'instagram', context: 'menu' });
                                shell.openExternal('https://www.instagram.com/nimbalyst');
                            }
                        },
                    ]
                }
            ]
        });
    } else {
        // Windows and Linux
        template.push({
            label: t('menu:help.title'),
            submenu: [
                {
                    label: t('menu:welcome'),
                    click: async () => {
                        // Track help accessed
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'welcome',
                            context: 'menu',
                        });
                        // Send message to renderer to open welcome tab
                        const focusedWindow = getFocusedWindow();
                        if (focusedWindow) {
                            focusedWindow.webContents.send('open-welcome-tab');
                        }
                    }
                },
                {
                    label: t('menu:documentation'),
                    click: async () => {
                        // Track help accessed
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'docs',
                            context: 'menu',
                        });
                        shell.openExternal('https://docs.nimbalyst.com/');
                    }
                },
                {
                    label: t('menu:install_chrome_extension'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'chrome_extension',
                            context: 'menu',
                        });
                        shell.openExternal('https://chromewebstore.google.com/detail/nimbalyst-web-clipper/fdbmklnnkalihoblphakoebgmieljkbb');
                    }
                },
                // Extension SDK Documentation - only show when Extension Development Kit is enabled
                ...(isExtensionDevToolsEnabled() ? [{
                    label: t('menu:extension_sdk_documentation'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'extension_sdk_docs',
                            context: 'menu',
                        });
                        const sdkDocsPath = getExtensionSDKDocsPath();
                        if (sdkDocsPath) {
                            // Open as a workspace window
                            addToRecentItems('workspaces', sdkDocsPath, 'Extension SDK Docs');
                            createWindow(false, true, sdkDocsPath);
                        } else {
                            dialog.showErrorBox(
                                t('menu:sdk_docs_not_found_title'),
                                t('menu:sdk_docs_not_found_message'),
                            );
                        }
                    }
                }] : []),
                {
                    label: t('menu:keyboard_shortcuts'),
                    accelerator: 'CmdOrCtrl+/',
                    click: async () => {
                        // Track help accessed
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'keyboard_shortcuts',
                            context: 'menu',
                        });
                        const focusedWindow = getFocusedWindow();
                        if (focusedWindow) {
                            focusedWindow.webContents.send('open-keyboard-shortcuts');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:send_feedback'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'feedback',
                            context: 'menu',
                        });
                        const focusedWindow = getFocusedWindow();
                        if (focusedWindow) {
                            focusedWindow.webContents.send('open-feedback');
                        }
                    }
                },
                {
                    label: t('menu:browse_issues_on_github'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'github_issues',
                            context: 'menu',
                        });
                        shell.openExternal('https://github.com/nimbalyst/nimbalyst/issues');
                    }
                },
                {
                    label: t('menu:github_discussions'),
                    click: async () => {
                        AnalyticsService.getInstance().sendEvent('help_accessed', {
                            helpType: 'github_discussions',
                            context: 'menu',
                        });
                        shell.openExternal('https://github.com/nimbalyst/nimbalyst/discussions');
                    }
                },
                { type: 'separator' },
                {
                    label: t('menu:community'),
                    submenu: [
                        {
                            label: t('menu:join_discord'),
                            click: async () => {
                                AnalyticsService.getInstance().sendEvent('help_accessed', { helpType: 'discord', context: 'menu' });
                                shell.openExternal('https://discord.gg/ubZDt4esEn');
                            }
                        },
                        { type: 'separator' },
                        {
                            label: t('menu:youtube'),
                            click: async () => {
                                AnalyticsService.getInstance().sendEvent('help_accessed', { helpType: 'youtube', context: 'menu' });
                                shell.openExternal('https://youtube.com/@nimbalyst');
                            }
                        },
                        {
                            label: t('menu:linkedin'),
                            click: async () => {
                                AnalyticsService.getInstance().sendEvent('help_accessed', { helpType: 'linkedin', context: 'menu' });
                                shell.openExternal('https://linkedin.com/company/nimbalyst');
                            }
                        },
                        {
                            label: t('menu:x_twitter'),
                            click: async () => {
                                AnalyticsService.getInstance().sendEvent('help_accessed', { helpType: 'x', context: 'menu' });
                                shell.openExternal('https://x.com/nimbalyst');
                            }
                        },
                        {
                            label: t('menu:tiktok'),
                            click: async () => {
                                AnalyticsService.getInstance().sendEvent('help_accessed', { helpType: 'tiktok', context: 'menu' });
                                shell.openExternal('https://www.tiktok.com/@nimbalyst');
                            }
                        },
                        {
                            label: t('menu:instagram'),
                            click: async () => {
                                AnalyticsService.getInstance().sendEvent('help_accessed', { helpType: 'instagram', context: 'menu' });
                                shell.openExternal('https://www.instagram.com/nimbalyst');
                            }
                        },
                    ]
                },
                { type: 'separator' },
                {
                    label: t('menu:about_nimbalyst'),
                    click: async () => {
                        createAboutWindow();
                    }
                },
                {
                    label: t('menu:check_for_updates'),
                    enabled: autoUpdaterService.isEnabled(),
                    click: async () => {
                        autoUpdaterService.checkForUpdatesWithUI();
                    }
                }
            ]
        });
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Update application menu
export async function updateApplicationMenu() {
    try {
        await createApplicationMenu();
    } catch (error) {
        logger.menu.error('Error updating application menu:', error);
    }
}

// Helper to check if window is about window
function isAboutWindow(window: BrowserWindow): boolean {
    // Check if window is destroyed first
    if (!window || window.isDestroyed()) {
        return false;
    }
    // Check if this is the about window by checking the title
    return window.getTitle() === 'About Nimbalyst';
}

// Helper to check if window is workspace manager window
function isWorkspaceManagerWindow(window: BrowserWindow): boolean {
    // Check if window is destroyed first
    if (!window || window.isDestroyed()) {
        return false;
    }
    // Check if this is the workspace manager window by checking the title
    return window.getTitle() === 'Project Manager - Nimbalyst';
}
