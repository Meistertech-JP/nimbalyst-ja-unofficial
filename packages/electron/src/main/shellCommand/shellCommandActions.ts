import { app, BrowserWindow, dialog, type MessageBoxOptions } from 'electron';
import path from 'path';
import { translateMainDialogLabel } from '../i18n/mainI18n';
import { safeHandle } from '../utils/ipcRegistry';
import { logger } from '../utils/logger';
import { ShellCommandInstaller, type ShellCommandResult, type ShellCommandStatus } from './ShellCommandInstaller';

/**
 * The app-menu and Settings entry points for the `nimbalyst` shell command.
 * Both run the same flow so the confirmations and messages cannot drift.
 */

let installer: ShellCommandInstaller | null = null;

function getInstaller(): ShellCommandInstaller {
    if (!installer) {
        const supported = process.platform === 'darwin' && app.isPackaged;
        installer = new ShellCommandInstaller({
            shimPath: supported ? path.join(process.resourcesPath, 'bin', 'nimbalyst') : null,
            unsupportedReason: process.platform !== 'darwin'
                ? 'The nimbalyst shell command can be installed from the app on macOS only.'
                : 'The nimbalyst shell command is only available in the packaged app.',
        });
    }
    return installer;
}

export function getShellCommandStatus(): Promise<ShellCommandStatus> {
    return getInstaller().getStatus();
}

function showMessage(parent: BrowserWindow | null, options: MessageBoxOptions) {
    return parent && !parent.isDestroyed()
        ? dialog.showMessageBox(parent, options)
        : dialog.showMessageBox(options);
}

export async function installShellCommandInteractive(parent: BrowserWindow | null): Promise<ShellCommandResult | null> {
    const status = await getInstaller().getStatus();
    if (status.state === 'unsupported') {
        const isMacOS = process.platform === 'darwin';
        await showMessage(parent, {
            type: 'info',
            message: translateMainDialogLabel('shell_command.unavailable_title', 'Shell command unavailable'),
            detail: translateMainDialogLabel(
                isMacOS ? 'shell_command.unsupported_packaged_only' : 'shell_command.unsupported_macos_only',
                status.reason,
            ),
        });
        return null;
    }

    let replaceForeign = false;
    if (status.state === 'foreign') {
        const { response } = await showMessage(parent, {
            type: 'warning',
            message: translateMainDialogLabel('shell_command.replace_title', 'Replace the existing "nimbalyst" command?'),
            detail: status.target
                ? translateMainDialogLabel('shell_command.replace_detail_with_target', '{{path}} already exists and points to {{target}}. It was not installed by Nimbalyst.', {
                    path: status.linkPath,
                    target: status.target,
                })
                : translateMainDialogLabel('shell_command.replace_detail', '{{path}} already exists. It was not installed by Nimbalyst.', {
                    path: status.linkPath,
                }),
            buttons: [
                translateMainDialogLabel('shell_command.replace_button', 'Replace'),
                translateMainDialogLabel('shell_command.cancel_button', 'Cancel'),
            ],
            defaultId: 1,
            cancelId: 1,
        });
        if (response !== 0) return null;
        replaceForeign = true;
    }

    const result = await getInstaller().install({ replaceForeign });
    logger.main.info('[ShellCommand] install:', { ok: result.ok, state: result.status.state, error: result.ok ? undefined : result.error });
    if (result.ok) {
        await showMessage(parent, {
            type: 'info',
            message: translateMainDialogLabel('shell_command.installed_title', 'Installed the "nimbalyst" command'),
            detail: translateMainDialogLabel('shell_command.installed_detail', 'Open a new terminal and run "nimbalyst ." to open the current folder in Nimbalyst.\n\nInstalled at {{path}}.', {
                path: linkPathOf(result.status),
            }),
        });
    } else if (!result.cancelled) {
        await showMessage(parent, {
            type: 'error',
            message: translateMainDialogLabel('shell_command.install_failed_title', 'Could not install the "nimbalyst" command'),
            detail: translateMainDialogLabel('shell_command.error_detail', 'Details: {{error}}', { error: result.error ?? '' }),
        });
    }
    return result;
}

export async function uninstallShellCommandInteractive(parent: BrowserWindow | null): Promise<ShellCommandResult | null> {
    const result = await getInstaller().uninstall();
    logger.main.info('[ShellCommand] uninstall:', { ok: result.ok, state: result.status.state, error: result.ok ? undefined : result.error });
    if (result.ok) {
        await showMessage(parent, {
            type: 'info',
            message: translateMainDialogLabel('shell_command.removed_title', 'Removed the "nimbalyst" command'),
        });
    } else if (!result.cancelled) {
        await showMessage(parent, {
            type: 'error',
            message: translateMainDialogLabel('shell_command.remove_failed_title', 'Could not remove the "nimbalyst" command'),
            detail: translateMainDialogLabel('shell_command.error_detail', 'Details: {{error}}', { error: result.error ?? '' }),
        });
    }
    return result;
}

function linkPathOf(status: ShellCommandStatus): string {
    return 'linkPath' in status ? status.linkPath : '';
}

export function registerShellCommandHandlers(): void {
    safeHandle('shell-command:get-status', () => getShellCommandStatus());
    safeHandle('shell-command:install', async (event) => {
        await installShellCommandInteractive(BrowserWindow.fromWebContents(event.sender));
        return getShellCommandStatus();
    });
    safeHandle('shell-command:uninstall', async (event) => {
        await uninstallShellCommandInteractive(BrowserWindow.fromWebContents(event.sender));
        return getShellCommandStatus();
    });
}
