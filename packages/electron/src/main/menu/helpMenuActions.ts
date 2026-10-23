/**
 * Menu actions and error presentation that need more than a `shell.openExternal`
 * call. Kept out of ApplicationMenu.ts so they can be unit tested without
 * loading the whole menu module's dependency graph.
 */
import { dialog } from 'electron';
import { logger } from '../utils/logger';
import { AnalyticsService } from '../services/analytics/AnalyticsService';
import { startTutorialProject } from '../window/WorkspaceManagerWindow.ts';
import { translateMainDialogLabel } from '../i18n/mainI18n';

export function showMissingRecentProjectError(name: string, projectPath: string): void {
    dialog.showErrorBox(
        translateMainDialogLabel('native_dialogs.project_not_found_title', 'Project Not Found'),
        translateMainDialogLabel('native_dialogs.project_not_found_message', `The project "${name}" could not be found at:\n${projectPath}`, { name, path: projectPath })
    );
}

/**
 * Help > Launch Tutorial. Materializes the tutorial project if it isn't on disk
 * yet, then opens it (or focuses the window that already has it).
 */
export async function launchTutorialFromMenu(): Promise<void> {
    AnalyticsService.getInstance().sendEvent('help_accessed', {
        helpType: 'tutorial',
        context: 'menu',
    });

    const result = await startTutorialProject('help_menu');
    if (!result.success) {
        logger.menu.error('Failed to launch tutorial:', result.error);
        dialog.showErrorBox(
            translateMainDialogLabel('native_dialogs.tutorial_unavailable_title', 'Tutorial Unavailable'),
            translateMainDialogLabel('native_dialogs.tutorial_unavailable_message', `The tutorial project could not be opened.\n\n${result.error}`, { error: String(result.error) })
        );
    }
}
