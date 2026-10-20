import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol } from '@nimbalyst/runtime';

interface Snapshot {
  timestamp: string;
  type: 'auto-save' | 'manual' | 'ai-diff' | 'pre-apply' | 'external-change' | 'ai-edit';
  size: number;
  baseMarkdownHash: string;
  metadata?: any;
}

export function HistoryWindow() {
  const { t, i18n } = useTranslation(['common', 'dialogs']);
  const [filePath, setFilePath] = useState<string>('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ key: string } | { message: string } | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get file path from URL params
        const params = new URLSearchParams(window.location.search);
        const path = params.get('filePath');

        if (!path) {
          setError({ key: 'dialogs:history.no_file_path' });
          return;
        }

        setFilePath(path);

        // Load snapshots
        const snapshotList = await window.electronAPI.history.listSnapshots(path);
        setSnapshots(snapshotList);

        // Select the most recent snapshot by default
        if (snapshotList.length > 0) {
          setSelectedSnapshot(snapshotList[0]);
          loadSnapshot(path, snapshotList[0].timestamp);
        }
      } catch (err) {
        setError(err instanceof Error ? { message: err.message } : { key: 'history_window.load_failed' });
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const loadSnapshot = async (path: string, timestamp: string) => {
    try {
      const content = await window.electronAPI.history.loadSnapshot(path, timestamp);
      setPreviewContent(content);
      setPreviewLoadFailed(false);
    } catch (err) {
      console.error('Failed to load snapshot:', err);
      setPreviewContent('');
      setPreviewLoadFailed(true);
    }
  };

  const handleSnapshotSelect = (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
    loadSnapshot(filePath, snapshot.timestamp);
  };

  const handleRestore = async () => {
    if (!selectedSnapshot || !previewContent) return;

    const confirmed = window.confirm(
      t('dialogs:history.restore_confirm', { date: formatDate(selectedSnapshot.timestamp) })
    );

    if (confirmed) {
      try {
        // Send the content back to the main window via IPC
        // The main window will handle actually updating the editor content
        if (window.electronAPI.sendToMainWindow) {
          await window.electronAPI.sendToMainWindow('restore-from-history', {
            filePath,
            content: previewContent,
            timestamp: selectedSnapshot.timestamp
          });
        }
        window.close();
      } catch (err) {
        alert(t('history_window.restore_failed'));
      }
    }
  };

  const handleDelete = async (snapshot: Snapshot) => {
    const confirmed = window.confirm(
      t('dialogs:history.delete_snapshot_confirm', { date: formatDate(snapshot.timestamp) })
    );

    if (confirmed) {
      try {
        await window.electronAPI.history.deleteSnapshot(filePath, snapshot.timestamp);

        // Reload snapshots
        const snapshotList = await window.electronAPI.history.listSnapshots(filePath);
        setSnapshots(snapshotList);

        // Clear selection if deleted snapshot was selected
        if (selectedSnapshot?.timestamp === snapshot.timestamp) {
          setSelectedSnapshot(null);
          setPreviewContent('');
          setPreviewLoadFailed(false);
        }
      } catch (err) {
        alert(t('dialogs:history.delete_failed'));
      }
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(i18n.resolvedLanguage ?? i18n.language);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'auto-save':
        return 'save';
      case 'manual':
        return 'bookmark';
      case 'ai-diff':
        return 'smart_toy';
      case 'ai-edit':
        return 'auto_awesome';
      case 'pre-apply':
        return 'backup';
      case 'external-change':
        return 'sync_alt';
      default:
        return 'history';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'auto-save':
        return t('dialogs:history.version_auto_save');
      case 'manual':
        return t('history_window.type_manual');
      case 'ai-diff':
        return t('history_window.type_ai_diff');
      case 'ai-edit':
        return t('dialogs:history.version_ai_edit');
      case 'pre-apply':
        return t('history_window.type_pre_apply');
      case 'external-change':
        return t('dialogs:history.version_external_change');
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="history-window flex flex-col items-center justify-center h-screen bg-[var(--nim-bg)] font-sans text-[var(--nim-text-muted)]">
        <MaterialSymbol icon="hourglass_empty" size={48} />
        <p className="mt-3 text-sm">{t('history_window.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-window flex flex-col items-center justify-center h-screen bg-[var(--nim-bg)] font-sans text-[var(--nim-error)]">
        <MaterialSymbol icon="error" size={48} />
        <p className="mt-3 text-sm">{'key' in error ? t(error.key) : error.message}</p>
      </div>
    );
  }

  return (
    <div className="history-window flex flex-col h-screen bg-[var(--nim-bg)] font-sans">
      <div className="history-header p-5 border-b border-[var(--nim-border)] bg-[var(--nim-bg-secondary)]">
        <h1 className="m-0 text-2xl font-semibold text-[var(--nim-text)]">{t('history_window.title')}</h1>
        <p className="file-path mt-2 text-[13px] text-[var(--nim-text-muted)] font-mono">{filePath}</p>
      </div>

      <div className="history-content flex flex-1 overflow-hidden">
        <div className="snapshots-list w-80 border-r border-[var(--nim-border)] flex flex-col">
          <div className="snapshots-header px-5 py-4 border-b border-[var(--nim-border)]">
            <h2 className="m-0 text-sm font-semibold text-[var(--nim-text-muted)] uppercase tracking-wide">{t('dialogs:history.snapshots_header', { displayed: snapshots.length, total: '' })}</h2>
          </div>

          {snapshots.length === 0 ? (
            <div className="no-snapshots flex flex-col items-center justify-center p-10 text-[var(--nim-text-faint)]">
              <MaterialSymbol icon="history_toggle_off" size={48} />
              <p className="mt-3 text-sm">{t('dialogs:history.no_snapshots')}</p>
            </div>
          ) : (
            <div className="snapshots flex-1 overflow-y-auto">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.timestamp}
                  className={`snapshot-item flex items-center px-5 py-3 cursor-pointer border-b border-[var(--nim-border-subtle)] transition-colors duration-150 relative hover:bg-[var(--nim-bg-hover)] ${
                    selectedSnapshot?.timestamp === snapshot.timestamp
                      ? 'selected bg-[var(--nim-bg-selected)] border-l-[3px] border-l-[var(--nim-primary)] !pl-[17px]'
                      : ''
                  }`}
                  onClick={() => handleSnapshotSelect(snapshot)}
                >
                  <div className={`snapshot-icon mr-3 flex items-center ${
                    selectedSnapshot?.timestamp === snapshot.timestamp
                      ? 'text-[var(--nim-primary)]'
                      : 'text-[var(--nim-text-muted)]'
                  }`}>
                    <MaterialSymbol icon={getTypeIcon(snapshot.type)} size={20} />
                  </div>
                  <div className="snapshot-info flex-1 min-w-0">
                    <div className="snapshot-date text-sm text-[var(--nim-text)] mb-1">{formatDate(snapshot.timestamp)}</div>
                    <div className="snapshot-meta flex gap-3 text-xs text-[var(--nim-text-muted)]">
                      <span className={`snapshot-type inline-flex items-center px-1.5 py-0.5 rounded font-medium ${
                        selectedSnapshot?.timestamp === snapshot.timestamp
                          ? 'bg-[var(--nim-accent-subtle)] text-[var(--nim-primary)]'
                          : 'bg-[var(--nim-bg-tertiary)]'
                      }`}>{getTypeLabel(snapshot.type)}</span>
                      <span className="snapshot-size">{formatSize(snapshot.size)}</span>
                    </div>
                  </div>
                  <button
                    className="snapshot-delete absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-transparent border-none text-[var(--nim-text-faint)] cursor-pointer rounded opacity-0 transition-all duration-150 hover:bg-[var(--nim-error-subtle)] hover:text-[var(--nim-error)] group-hover:opacity-100 [.snapshot-item:hover_&]:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(snapshot);
                    }}
                    title={t('dialogs:history.delete_snapshot')}
                  >
                    <MaterialSymbol icon="delete" size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="snapshot-preview flex-1 flex flex-col overflow-hidden">
          <div className="preview-header flex items-center justify-between px-5 py-4 border-b border-[var(--nim-border)]">
            <h2 className="m-0 text-sm font-semibold text-[var(--nim-text-muted)] uppercase tracking-wide">{t('dialogs:history.preview')}</h2>
            {selectedSnapshot && (
              <div className="preview-actions flex gap-2">
                <button className="btn-restore nim-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md" onClick={handleRestore} disabled={previewLoadFailed}>
                  <MaterialSymbol icon="restore" size={18} />
                  {t('dialogs:history.restore_version')}
                </button>
              </div>
            )}
          </div>

          {selectedSnapshot ? (
            <div className="preview-content flex-1 overflow-auto p-5 bg-[var(--nim-bg-secondary)]">
              <pre className="m-0 font-mono text-[13px] leading-relaxed text-[var(--nim-text)] whitespace-pre-wrap break-words">{previewLoadFailed ? t('dialogs:history.load_snapshot_content_failed') : previewContent}</pre>
            </div>
          ) : (
            <div className="no-preview flex-1 flex flex-col items-center justify-center text-[var(--nim-text-faint)]">
              <MaterialSymbol icon="preview_off" size={48} />
              <p className="mt-3 text-sm">{t('dialogs:history.select_snapshot')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
