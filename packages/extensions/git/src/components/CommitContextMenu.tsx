import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useFloating,
  flip,
  shift,
  FloatingPortal,
  useInteractions,
  useDismiss,
  useRole,
} from '@floating-ui/react';
import { copyToClipboard } from '@nimbalyst/extension-sdk';

interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

interface CommitContextMenuProps {
  commit: GitCommit;
  x: number;
  y: number;
  workspacePath: string;
  onClose: () => void;
  onMessage: (msg: string, isError?: boolean) => void;
  onRefresh: () => void;
}

const ipc = (window as unknown as { electronAPI: { invoke: (channel: string, ...args: unknown[]) => Promise<unknown> } }).electronAPI;

interface ActionResult {
  success: boolean;
  error?: string;
}

export function CommitContextMenu({
  commit,
  x,
  y,
  workspacePath,
  onClose,
  onMessage,
  onRefresh,
}: CommitContextMenuProps) {
  const { t } = useTranslation('extensions');
  const virtualRef = useMemo(() => ({
    getBoundingClientRect: () => DOMRect.fromRect({ x, y, width: 0, height: 0 }),
  }), [x, y]);

  const { refs, floatingStyles, context } = useFloating({
    open: true,
    onOpenChange: (open) => { if (!open) onClose(); },
    elements: { reference: virtualRef as unknown as Element },
    placement: 'bottom-start',
    middleware: [flip({ padding: 8 }), shift({ padding: 8 })],
  });

  const dismiss = useDismiss(context, { escapeKey: true, outsidePress: true });
  const role = useRole(context, { role: 'menu' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  const shortHash = commit.hash.slice(0, 7);

  const handleCopyId = () => {
    copyToClipboard(commit.hash);
    onMessage(t('git_extension_ui.copied_commit_id'));
    onClose();
  };

  const handleCopyMessage = () => {
    copyToClipboard(commit.message);
    onMessage(t('git_extension_ui.copied_commit_message'));
    onClose();
  };

  const handleCheckout = async () => {
    onClose();
    const result = await ipc.invoke('git:checkout', workspacePath, commit.hash) as ActionResult;
    if (result.success) {
      onMessage(t('git_extension_ui.checked_out_detached', { hash: shortHash }));
      onRefresh();
    } else {
      onMessage(result.error ?? t('git_extension_ui.checkout_failed'), true);
    }
  };

  const handleCherryPick = async () => {
    onClose();
    const result = await ipc.invoke('git:cherry-pick', workspacePath, commit.hash) as ActionResult;
    if (result.success) {
      onMessage(t('git_extension_ui.cherry_picked', { hash: shortHash }));
      onRefresh();
    } else {
      onMessage(result.error ?? t('git_extension_ui.cherry_pick_failed'), true);
    }
  };

  const handleCreateBranch = async () => {
    const name = window.prompt(t('git_extension_ui.branch_name_prompt', { hash: shortHash }), '');
    if (!name?.trim()) return;
    onClose();
    const result = await ipc.invoke('git:create-branch', workspacePath, name.trim(), commit.hash) as ActionResult;
    if (result.success) {
      onMessage(t('git_extension_ui.created_branch', { name: name.trim() }));
      onRefresh();
    } else {
      onMessage(result.error ?? t('git_extension_ui.create_branch_failed'), true);
    }
  };

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className="git-context-menu"
        {...getFloatingProps()}
      >
        <button className="git-context-menu-item" onClick={handleCopyId}>
          {t('git_extension_ui.copy_commit_id')}
        </button>
        <button className="git-context-menu-item" onClick={handleCopyMessage}>
          {t('git_extension_ui.copy_commit_message')}
        </button>
        <div className="git-context-menu-sep" />
        <button className="git-context-menu-item" onClick={handleCheckout}>
          {t('git_extension_ui.checkout_detached')}
        </button>
        <button className="git-context-menu-item" onClick={handleCreateBranch}>
          {t('git_extension_ui.create_branch')}
        </button>
        <div className="git-context-menu-sep" />
        <button className="git-context-menu-item" onClick={handleCherryPick}>
          {t('git_extension_ui.cherry_pick')}
        </button>
      </div>
    </FloatingPortal>
  );
}
