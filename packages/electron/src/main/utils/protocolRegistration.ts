import path from 'path';

/**
 * Decides how (or whether) to claim the `nimbalyst://` URL scheme with the OS.
 *
 * The macOS dev case is the reason this is a separate, tested function. On macOS
 * `app.setAsDefaultProtocolClient(scheme, execPath, args)` IGNORES execPath/args --
 * Electron registers the *running bundle's* identifier, which for an unpackaged dev
 * run is the generic `com.github.Electron` shipped by every copy of Electron in every
 * `node_modules`. A machine with several checkouts/worktrees has a dozen bundles
 * claiming that id, so the OS routes `nimbalyst://` to an arbitrary one and launches
 * it with no app path -- the blank Electron welcome window, and a deep link that never
 * reaches Nimbalyst. Worse, every dev launch (including the short-lived instance that
 * forwards a deep link) re-registered it, stomping any correct handler.
 *
 * Dev authentication callbacks use a nonce-protected loopback listener owned by the
 * instance that started the flow, so unpackaged development runs do not need to claim
 * the shared `nimbalyst://` scheme on any platform.
 */
export type ProtocolRegistrationPlan =
    | { action: 'register-packaged' }
    | { action: 'register-dev'; execPath: string; args: string[] }
    | { action: 'skip'; reason: string };

export interface ProtocolRegistrationInput {
    platform: NodeJS.Platform;
    /** `process.defaultApp` -- true when Electron was started with an app path (dev). */
    isDefaultApp: boolean;
    argv: string[];
    execPath: string;
    /** `NIMBALYST_DEV_PROTOCOL=1` escape hatch to force the legacy dev registration. */
    forceDevRegistration?: boolean;
}

export function planProtocolRegistration(input: ProtocolRegistrationInput): ProtocolRegistrationPlan {
    // The current electron-builder NSIS target does not register URL protocols.
    // Keep Windows startup from replacing the user's selected handler (which may
    // be the official Nimbalyst installation). Authentication uses an instance-
    // owned loopback callback; other deep links keep the existing system handler.
    if (input.platform === 'win32') {
        return {
            action: 'skip',
            reason: 'Windows startup does not claim the shared nimbalyst:// scheme; preserve the existing system handler',
        };
    }

    if (!input.isDefaultApp) {
        return { action: 'register-packaged' };
    }

    if (input.argv.length < 2) {
        return { action: 'skip', reason: 'dev run has no app path in argv' };
    }

    if (input.platform === 'darwin' && !input.forceDevRegistration) {
        return {
            action: 'skip',
            reason:
                `${input.platform} dev run does not register the shared nimbalyst:// scheme; ` +
                'authentication uses an instance-owned loopback callback ' +
                '(NIMBALYST_DEV_PROTOCOL=1 forces legacy registration)',
        };
    }

    return {
        action: 'register-dev',
        execPath: input.execPath,
        args: [path.resolve(input.argv[1])],
    };
}
