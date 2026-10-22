// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(() => 'C:/workspace'),
  openFileDialog: vi.fn(),
  askShareToTeam: vi.fn(),
  shareFileToTeam: vi.fn(),
  showError: vi.fn(),
  getLocalizedText: vi.fn((_namespace: string, _key: string, fallback: string) => fallback),
}));

vi.mock('@nimbalyst/runtime/store', () => ({ store: { get: mocks.get } }));
vi.mock('../ErrorNotificationService', () => ({ errorNotificationService: { showError: mocks.showError, getLocalizedText: mocks.getLocalizedText } }));
vi.mock('../shareToTeamFlow', () => ({
  askShareToTeam: mocks.askShareToTeam,
  shareFileToTeam: mocks.shareFileToTeam,
}));

import { addFileToPages } from '../addFileToPages';

describe('addFileToPages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.openFileDialog.mockResolvedValue({ canceled: true, filePaths: [] });
  });

  it('uses the localized file-picker title and button label', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { openFileDialog: mocks.openFileDialog },
    });

    await addFileToPages({
      section: 'personal',
      parentId: 'page-1',
      dialogTitle: 'ファイルから追加',
      buttonLabel: '追加',
    });

    expect(mocks.openFileDialog).toHaveBeenCalledWith({
      title: 'ファイルから追加',
      buttonLabel: '追加',
      defaultPath: 'C:/workspace',
    });
    expect(mocks.askShareToTeam).not.toHaveBeenCalled();
  });

  it('localizes the unavailable-file notification title and preserves its reason', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { openFileDialog: mocks.openFileDialog },
    });
    mocks.openFileDialog.mockResolvedValue({ canceled: false, filePaths: ['C:/workspace/mock.png'] });
    mocks.askShareToTeam.mockResolvedValue({ status: 'unavailable', reason: 'No shareable type is registered.' });

    await addFileToPages({
      section: 'personal',
      parentId: null,
      dialogTitle: 'ファイルから追加',
      buttonLabel: '追加',
    });

    expect(mocks.getLocalizedText).toHaveBeenCalledWith(
      'files',
      'notifications.add_file_failed_title',
      'Could not add mock.png',
      { fileName: 'mock.png' },
    );
    expect(mocks.showError).toHaveBeenCalledWith('Could not add mock.png', 'No shareable type is registered.');
  });
});
