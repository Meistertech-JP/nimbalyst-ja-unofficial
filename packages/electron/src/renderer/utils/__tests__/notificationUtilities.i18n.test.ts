import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleWorkspaceFileSelect } from '../workspaceFileOperations';
import { normalizeAudioCaptureError } from '../audioCapture';
import { CollabAssetService } from '../../services/CollabAssetService';

const mocks = vi.hoisted(() => ({ showWarning: vi.fn() }));
vi.mock('../../services/ErrorNotificationService', () => ({ errorNotificationService: mocks }));

describe('renderer utility notifications in Japanese', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('ja');
    mocks.showWarning.mockReset();
  });
  afterEach(async () => { await i18next.changeLanguage('en'); });

  it('translates the file-open warning while retaining the backend detail', async () => {
    const switchWorkspaceFile = vi.fn().mockResolvedValue({ error: 'E_FILE: /repo/file.md' });
    (window as any).electronAPI = { switchWorkspaceFile };
    const addTab = vi.fn();
    await handleWorkspaceFileSelect({ filePath: '/repo/file.md', currentFilePath: null, tabs: { findTabByPath: () => null, addTab }, isInitializedRef: { current: true } });
    expect(switchWorkspaceFile).toHaveBeenCalledWith('/repo/file.md');
    expect(mocks.showWarning).toHaveBeenCalledWith('ファイルを開けません', 'E_FILE: /repo/file.md', { duration: 5000 });
    expect(addTab).not.toHaveBeenCalled();
  });

  it('translates actionable microphone guidance but keeps other errors intact', () => {
    expect(normalizeAudioCaptureError(new DOMException('Requested device not found', 'NotFoundError')).message)
      .toBe('使用できるマイクが見つかりません。マイクを接続または有効にし、システムのマイク設定を確認してから、もう一度お試しください。');
    const original = new Error('E_AUDIO_CONTEXT');
    expect(normalizeAudioCaptureError(original)).toBe(original);
  });

  it('translates attachment upload failure without changing bytes, names or raw errors', async () => {
    const uploadAsset = vi.fn().mockResolvedValue({ success: false });
    (window as any).electronAPI = { documentSync: { uploadAsset } };
    const service = new CollabAssetService({ orgId: 'org-1', documentId: 'doc-1' } as any);
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const file = { name: 'original.txt', type: 'text/plain', arrayBuffer: async () => bytes } as File;
    await expect(service.uploadFile(file)).rejects.toThrow('添付ファイルのアップロードに失敗しました');
    expect(uploadAsset).toHaveBeenCalledWith({ orgId: 'org-1', documentId: 'doc-1', fileBytes: bytes, mimeType: 'text/plain', fileName: 'original.txt' });
    uploadAsset.mockResolvedValueOnce({ success: false, error: 'E_ASSET_42' });
    await expect(service.uploadFile(file)).rejects.toThrow('E_ASSET_42');
    uploadAsset.mockResolvedValueOnce({ success: true, uri: 'collab-asset://org-1/doc-1/hash' });
    await expect(service.uploadFile(file)).resolves.toEqual({ kind: 'file', src: 'collab-asset://org-1/doc-1/hash', name: 'original.txt', altText: 'original.txt' });
  });
});
