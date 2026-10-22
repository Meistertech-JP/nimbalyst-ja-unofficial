import { describe, it, expect } from 'vitest';
import path from 'path';
import { planProtocolRegistration } from '../protocolRegistration';

describe('planProtocolRegistration', () => {
    it('skips registration for an unpackaged macOS run so it cannot claim com.github.Electron', () => {
        const plan = planProtocolRegistration({
            platform: 'darwin',
            isDefaultApp: true,
            argv: ['/repo/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron', '/repo/packages/electron'],
            execPath: '/repo/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
        });

        expect(plan.action).toBe('skip');
    });

    it('still registers on macOS when NIMBALYST_DEV_PROTOCOL forces it', () => {
        const plan = planProtocolRegistration({
            platform: 'darwin',
            isDefaultApp: true,
            argv: ['/electron', '/repo/packages/electron'],
            execPath: '/electron',
            forceDevRegistration: true,
        });

        expect(plan).toEqual({
            action: 'register-dev',
            execPath: '/electron',
            args: [path.resolve('/repo/packages/electron')],
        });
    });

    it('does not claim the shared URL scheme from an unpackaged Windows run', () => {
        const plan = planProtocolRegistration({
            platform: 'win32',
            isDefaultApp: true,
            argv: ['/electron', '/repo/packages/electron', '--workspace', '/tmp/ws'],
            execPath: '/electron',
        });

        expect(plan).toEqual({
            action: 'skip',
            reason: expect.stringContaining('Windows startup does not claim'),
        });
    });

    it('does not replace a Windows URL handler even when legacy dev registration is forced', () => {
        const plan = planProtocolRegistration({
            platform: 'win32',
            isDefaultApp: true,
            argv: ['/electron', '/repo/packages/electron'],
            execPath: '/electron',
            forceDevRegistration: true,
        });

        expect(plan.action).toBe('skip');
    });

    it('registers with execPath and app path for an unpackaged Linux run', () => {
        for (const platform of ['linux'] as const) {
            const plan = planProtocolRegistration({
                platform,
                isDefaultApp: true,
                argv: ['/electron', '/repo/packages/electron', '--workspace', '/tmp/ws'],
                execPath: '/electron',
            });

            expect(plan).toEqual({
                action: 'register-dev',
                execPath: '/electron',
                args: [path.resolve('/repo/packages/electron')],
            });
        }
    });

    it('registers the packaged bundle on non-Windows platforms', () => {
        for (const platform of ['darwin', 'linux'] as const) {
            const plan = planProtocolRegistration({
                platform,
                isDefaultApp: false,
                argv: ['/Applications/Nimbalyst.app/Contents/MacOS/Nimbalyst'],
                execPath: '/Applications/Nimbalyst.app/Contents/MacOS/Nimbalyst',
            });

            expect(plan).toEqual({ action: 'register-packaged' });
        }
    });

    it('does not claim the Windows URL handler from a packaged startup', () => {
        expect(planProtocolRegistration({
            platform: 'win32',
            isDefaultApp: false,
            argv: ['C:/Program Files/Nimbalyst/Nimbalyst.exe'],
            execPath: 'C:/Program Files/Nimbalyst/Nimbalyst.exe',
        })).toEqual({
            action: 'skip',
            reason: expect.stringContaining('preserve the existing system handler'),
        });
    });

    it('always skips Windows registration for packaged and dev runs, even when forced', () => {
        for (const isDefaultApp of [false, true]) {
            for (const forceDevRegistration of [false, true]) {
                const plan = planProtocolRegistration({
                    platform: 'win32',
                    isDefaultApp,
                    argv: ['/electron', '/repo/packages/electron'],
                    execPath: '/electron',
                    forceDevRegistration,
                });

                expect(plan.action).toBe('skip');
            }
        }
    });

    it('skips a dev run that has no app path to register', () => {
        const plan = planProtocolRegistration({
            platform: 'win32',
            isDefaultApp: true,
            argv: ['/electron'],
            execPath: '/electron',
        });

        expect(plan.action).toBe('skip');
    });
});
