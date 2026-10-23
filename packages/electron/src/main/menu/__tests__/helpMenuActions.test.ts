// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMainI18nController } from '../../i18n/mainI18n';

const showErrorBox = vi.fn();
const sendEvent = vi.fn();
const startTutorialProject = vi.fn();

vi.mock('electron', () => ({
    dialog: {
        showErrorBox: (...args: unknown[]) => showErrorBox(...args),
    },
}));

vi.mock('../../utils/logger', () => ({
    logger: { menu: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } },
}));

vi.mock('../../services/analytics/AnalyticsService', () => ({
    AnalyticsService: {
        getInstance: () => ({ sendEvent }),
    },
}));

vi.mock('../../window/WorkspaceManagerWindow.ts', () => ({
    startTutorialProject: () => startTutorialProject(),
}));

import { launchTutorialFromMenu, showMissingRecentProjectError } from '../helpMenuActions';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('launchTutorialFromMenu', () => {
    it('localizes missing recent project details without changing names or paths', async () => {
        const controller = await createMainI18nController({ get: () => 'ja', subscribe: () => () => undefined }, 'en-US', () => undefined);
        try {
            showMissingRecentProjectError('sample {{name}}', 'C:\\fixture\\missing');
            expect(showErrorBox).toHaveBeenLastCalledWith('プロジェクトが見つかりません', 'プロジェクト「sample {{name}}」が次の場所に見つかりません:\nC:\\fixture\\missing');
            await controller.i18n.changeLanguage('en');
            showMissingRecentProjectError('sample', '/fixture/missing');
            expect(showErrorBox).toHaveBeenLastCalledWith('Project Not Found', 'The project "sample" could not be found at:\n/fixture/missing');
        } finally { controller.dispose(); }
    });
    it('localizes the error without changing backend details and follows Main language changes', async () => {
        const controller = await createMainI18nController({ get: () => 'ja', subscribe: () => () => undefined }, 'en-US', () => undefined);
        startTutorialProject.mockResolvedValue({ success: false, error: 'fixture-only error' });
        try {
            await launchTutorialFromMenu();
            expect(showErrorBox).toHaveBeenLastCalledWith('チュートリアルを開けません', 'チュートリアルプロジェクトを開けませんでした。\n\nfixture-only error');
            await controller.i18n.changeLanguage('en');
            await launchTutorialFromMenu();
            expect(showErrorBox).toHaveBeenLastCalledWith('Tutorial Unavailable', 'The tutorial project could not be opened.\n\nfixture-only error');
        } finally { controller.dispose(); }
    });
    it('starts the tutorial project and tracks the menu access', async () => {
        startTutorialProject.mockResolvedValue({
            success: true,
            workspacePath: '/Users/test/Documents/Nimbalyst Tutorial',
            reused: false,
        });

        await launchTutorialFromMenu();

        expect(startTutorialProject).toHaveBeenCalledOnce();
        expect(sendEvent).toHaveBeenCalledWith('help_accessed', {
            helpType: 'tutorial',
            context: 'menu',
        });
        expect(showErrorBox).not.toHaveBeenCalled();
    });

    it('surfaces a failed materialization in an error dialog', async () => {
        startTutorialProject.mockResolvedValue({
            success: false,
            error: 'Tutorial template directory does not exist: /nope',
        });

        await launchTutorialFromMenu();

        expect(showErrorBox).toHaveBeenCalledWith(
            'Tutorial Unavailable',
            expect.stringContaining('Tutorial template directory does not exist: /nope')
        );
    });
});
