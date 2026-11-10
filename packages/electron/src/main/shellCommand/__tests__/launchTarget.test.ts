// @vitest-environment node
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { resolveLaunchTarget, type PathKind } from '../launchTarget';

const volumeRoot = path.parse(process.cwd()).root;
const projectPath = path.join(volumeRoot, 'Users', 'me', 'project');
const projectSourcePath = path.join(projectPath, 'src');
const projectReadmePath = path.join(projectPath, 'README.md');
const otherProjectPath = path.join(volumeRoot, 'Users', 'me', 'other');
const temporaryPath = path.join(volumeRoot, 'tmp');
const tree: Record<string, PathKind> = {
    [projectPath]: 'directory',
    [projectSourcePath]: 'directory',
    [projectReadmePath]: 'file',
};
const kindOf = (p: string): PathKind => tree[p] ?? null;

describe('resolveLaunchTarget', () => {
    it('resolves `.` against the shell directory to the folder to open', () => {
        expect(resolveLaunchTarget(['.'], projectPath, kindOf)).toEqual({
            kind: 'directory',
            path: projectPath,
        });
    });

    it('resolves relative files and folders and keeps absolute paths', () => {
        expect(resolveLaunchTarget(['README.md'], projectPath, kindOf)).toEqual({
            kind: 'file',
            path: projectReadmePath,
        });
        expect(resolveLaunchTarget([projectSourcePath], temporaryPath, kindOf)).toEqual({
            kind: 'directory',
            path: projectSourcePath,
        });
    });

    it('skips switches macOS and Chromium add, deep links, and flag values', () => {
        const args = [
            '-psn_0_12345',
            '--allow-file-access-from-files',
            'nimbalyst://open?x=1',
            '--workspace',
            otherProjectPath,
            'src',
        ];
        expect(resolveLaunchTarget(args, projectPath, kindOf)).toEqual({
            kind: 'directory',
            path: projectSourcePath,
        });
    });

    it('reports a path that does not exist instead of dropping it', () => {
        expect(resolveLaunchTarget(['nope'], projectPath, kindOf)).toEqual({
            kind: 'missing',
            path: path.join(projectPath, 'nope'),
        });
    });

    it('returns null when no path was given', () => {
        expect(resolveLaunchTarget([], projectPath, kindOf)).toBeNull();
        expect(resolveLaunchTarget(['--safe-mode'], projectPath, kindOf)).toBeNull();
    });
});
