import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useFloating, offset, flip, shift, size, FloatingPortal,
  useDismiss, useRole, useInteractions, autoUpdate,
} from '@floating-ui/react';
import { copyToClipboard } from '@nimbalyst/extension-sdk';
import { useTranslation } from '@nimbalyst/i18n/react';

/**
 * #1959: the toolbar branch button. Shows the CHECKED-OUT branch and switches
 * it. Every switch is a plain `git switch` in main; uncommitted changes come
 * along or git refuses, and nothing here stashes, forces or discards.
 *
 * Confirm and refusal cards render inside the popover (no window.confirm).
 */

// ---- Wire types (mirror packages/electron/src/main/services/gitBranchSwitch.ts) ----

interface OccupiedBy {
  path: string;
  worktreeId?: string;
  sessionTitle?: string;
}

interface LocalBranchInfo {
  name: string;
  upstream: string | null;
  ahead: number;
  behind: number;
  upstreamGone: boolean;
  lastCommitDate: string | null;
  isCurrent: boolean;
  occupiedBy: OccupiedBy | null;
}

interface RemoteBranchInfo {
  remoteRef: string;
  remote: string;
  name: string;
  lastCommitDate: string | null;
}

interface BranchListResult {
  current: { branch: string | null; detached: boolean; headSha: string | null; headReachable: boolean | null };
  local: LocalBranchInfo[];
  remoteOnly: RemoteBranchInfo[];
  lastFetchedAt: number | null;
  managedWorktree: { worktreeId: string; name: string } | null;
  worktreeLookupFailed: boolean;
}

export type SwitchRequest =
  | { kind: 'local'; branch: string }
  | { kind: 'remote'; remoteRef: string }
  | { kind: 'create'; name: string; startPoint: string };

interface PreflightResult {
  blocked:
    | { reason: 'occupied'; occupiedBy: OccupiedBy }
    | { reason: 'managed-worktree'; worktreeId: string; name: string }
    | { reason: 'unverified'; message: string }
    | null;
  /** The local branch the switch ends on (derived from the configured remote for a remote target). */
  targetBranch: string;
  dirtyFiles: string[];
  dirtyCount: number;
  runningSessions: Array<{ id: string; title: string }>;
  unreachableHead: { sha: string } | null;
  localExists: boolean;
  needsConfirm: boolean;
  /** Echoed back to git:switch-branch; main re-checks and asks again if the state moved. */
  confirmToken: string;
}

type SwitchResult =
  | { success: true; branch: string }
  | {
      success: false;
      error: string;
      conflict?: 'local-exists';
      branch?: string;
      blocked?: PreflightResult['blocked'];
      needsConfirm?: PreflightResult;
    };

/** Ask the host to open the session that owns a Nimbalyst worktree. */
export const OPEN_WORKTREE_SESSION_EVENT = 'nimbalyst:open-worktree-session';

const ipc = (window as unknown as {
  electronAPI: { invoke: (channel: string, ...args: unknown[]) => Promise<unknown> };
}).electronAPI;

// ---- View state ----

type View =
  | { kind: 'list' }
  | { kind: 'busy'; label: string }
  | { kind: 'create'; startPoint: string; startLabel: string }
  | { kind: 'confirm'; repoPath: string; target: SwitchRequest; preflight: PreflightResult }
  | { kind: 'local-exists'; branch: string }
  | { kind: 'occupied'; occupiedBy: OccupiedBy; branch: string }
  | { kind: 'blocked'; message: string }
  | { kind: 'refused'; error: string };

type Row =
  | { kind: 'local'; branch: LocalBranchInfo }
  | { kind: 'remote'; branch: RemoteBranchInfo };

/** Opens the switcher on the new-branch form, e.g. from the Log context menu. */
export interface CreateBranchRequest {
  startPoint: string;
  /** What the form says the branch starts from (a short hash, a branch). */
  startLabel: string;
  /** Changes on every request so the same commit can be asked for twice. */
  nonce: number;
}

interface BranchSwitcherProps {
  repoPath: string;
  /** Checked-out branch, or 'HEAD' when detached. */
  currentBranch: string;
  disabled?: boolean;
  createRequest?: CreateBranchRequest | null;
  onSwitched: (branch: string) => void;
  onOpenChanges: () => void;
}

/** Display name before preflight has resolved the remote's local branch name. */
function provisionalLabel(target: SwitchRequest): string {
  if (target.kind === 'local') return target.branch;
  if (target.kind === 'remote') return target.remoteRef;
  return target.name;
}

function formatAgo(ms: number, t: (key: string, options?: { count?: number }) => string): string {
  const secs = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (secs < 60) return t('supplemental.branch_switcher.seconds_ago', { count: secs });
  const mins = Math.floor(secs / 60);
  if (mins < 60) return t('supplemental.branch_switcher.minutes_ago', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('supplemental.branch_switcher.hours_ago', { count: hours });
  return t('supplemental.branch_switcher.days_ago', { count: Math.floor(hours / 24) });
}

function trackingSummary(b: LocalBranchInfo, t: (key: string, options?: { count?: number; upstream?: string }) => string): string {
  if (!b.upstream) return t('supplemental.branch_switcher.no_upstream');
  if (b.upstreamGone) return t('supplemental.branch_switcher.upstream_gone', { upstream: b.upstream });
  const parts: string[] = [];
  if (b.ahead) parts.push(t('supplemental.branch_switcher.ahead', { count: b.ahead }));
  if (b.behind) parts.push(t('supplemental.branch_switcher.behind', { count: b.behind }));
  return `${b.upstream} · ${parts.length ? parts.join(', ') : t('supplemental.branch_switcher.up_to_date')}`;
}

export function BranchSwitcher({
  repoPath,
  currentBranch,
  disabled,
  createRequest,
  onSwitched,
  onOpenChanges,
}: BranchSwitcherProps) {
  const { t } = useTranslation('git');
  const [isOpen, setIsOpen] = useState(false);
  const [list, setList] = useState<BranchListResult | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [fetching, setFetching] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('HEAD');
  const [formError, setFormError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Every preflight or switch captures the generation it started in and drops
  // its result if the popover closed, the target changed, the repo changed or
  // the component unmounted in the meantime.
  const generationRef = useRef(0);
  const nextGeneration = () => ++generationRef.current;

  /**
   * A user action that replaces the current target (a new create request,
   * "New branch...", "Create branch here", Back/Cancel) must also invalidate
   * any preflight or switch still in flight for the old one.
   */
  const replaceView = useCallback((next: View) => {
    nextGeneration();
    setView(next);
  }, []);

  const close = useCallback(() => {
    nextGeneration();
    setIsOpen(false);
    setView({ kind: 'list' });
    setQuery('');
    setFormError(null);
  }, []);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => { if (open) setIsOpen(true); else close(); },
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${Math.max(200, Math.min(480, availableHeight))}px`;
        },
      }),
    ],
  });
  // Escape steps back from a card to the list before it closes the popover.
  const dismiss = useDismiss(context, { escapeKey: false });
  const role = useRole(context, { role: 'dialog' });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role]);

  const loadList = useCallback(async () => {
    setListError(null);
    const requestedRepo = repoPath;
    try {
      const result = await ipc.invoke('git:list-branches-detailed', requestedRepo) as BranchListResult;
      if (repoPathRef.current === requestedRepo) setList(result);
    } catch (err) {
      if (repoPathRef.current === requestedRepo) setListError(err instanceof Error ? err.message : 'Could not list branches');
    }
  }, [repoPath]);

  // A confirm or pending switch belongs to one repository; a repo change
  // closes the popover and invalidates anything still in flight.
  const repoPathRef = useRef(repoPath);
  useEffect(() => {
    if (repoPathRef.current === repoPath) return;
    repoPathRef.current = repoPath;
    setList(null);
    close();
  }, [repoPath, close]);

  useEffect(() => () => { nextGeneration(); }, []);

  // D-C3: listing is local only; nothing fetches when the switcher opens.
  useEffect(() => {
    if (isOpen) void loadList();
  }, [isOpen, loadList]);

  useEffect(() => {
    if (!createRequest) return;
    setIsOpen(true);
    setNewName('');
    setNewStart(createRequest.startPoint);
    setFormError(null);
    replaceView({ kind: 'create', startPoint: createRequest.startPoint, startLabel: createRequest.startLabel });
  }, [createRequest, replaceView]);

  useEffect(() => {
    if (isOpen && view.kind === 'list') searchRef.current?.focus();
  }, [isOpen, view.kind]);

  const rows = useMemo<Row[]>(() => {
    if (!list) return [];
    const q = query.trim().toLowerCase();
    const match = (s: string) => !q || s.toLowerCase().includes(q);
    return [
      ...list.local.filter(b => match(b.name)).map(b => ({ kind: 'local', branch: b }) as Row),
      ...list.remoteOnly.filter(b => match(b.remoteRef)).map(b => ({ kind: 'remote', branch: b }) as Row),
    ];
  }, [list, query]);

  useEffect(() => {
    setActiveIndex(i => Math.min(i, Math.max(0, rows.length - 1)));
  }, [rows.length]);

  /** Routes a preflight (or main's fresh re-check) to the card it calls for. */
  const showPreflight = useCallback((target: SwitchRequest, preflight: PreflightResult): boolean => {
    const blocked = preflight.blocked;
    if (blocked) {
      if (blocked.reason === 'occupied') {
        setView({ kind: 'occupied', occupiedBy: blocked.occupiedBy, branch: preflight.targetBranch });
      } else {
        setView({
          kind: 'blocked',
          message: blocked.reason === 'managed-worktree'
            ? t('supplemental.branch_switcher.managed_worktree', { name: blocked.name })
            : [t('supplemental.branch_switcher.switch_not_allowed'), blocked.message].filter(Boolean).join('\n'),
        });
      }
      return true;
    }
    if (target.kind === 'remote' && preflight.localExists) {
      setView({ kind: 'local-exists', branch: preflight.targetBranch });
      return true;
    }
    if (preflight.needsConfirm) {
      setView({ kind: 'confirm', repoPath, target, preflight });
      return true;
    }
    return false;
  }, [repoPath, t]);

  const runSwitch = useCallback(async (target: SwitchRequest, confirmToken: string, label: string) => {
    const generation = nextGeneration();
    setView({ kind: 'busy', label: t('supplemental.branch_switcher.switching_to', { branch: label }) });
    try {
      const result = await ipc.invoke('git:switch-branch', repoPath, target, confirmToken) as SwitchResult;
      if (generation !== generationRef.current) return;
      if (result.success) {
        close();
        onSwitched(result.branch);
        return;
      }
      // Main re-checked inside the lock and the state moved: confirm again.
      if (result.needsConfirm || result.blocked) {
        const fresh = result.needsConfirm;
        if (fresh && showPreflight(target, fresh)) return;
        if (result.blocked) {
          setView(result.blocked.reason === 'occupied'
            ? { kind: 'occupied', occupiedBy: result.blocked.occupiedBy, branch: label }
            : {
                kind: 'blocked',
                message: result.blocked.reason === 'managed-worktree'
                  ? t('supplemental.branch_switcher.managed_worktree', { name: result.blocked.name })
                  : [t('supplemental.branch_switcher.switch_not_allowed'), result.blocked.message].filter(Boolean).join('\n'),
              });
          return;
        }
      }
      if (result.conflict === 'local-exists' && result.branch) {
        setView({ kind: 'local-exists', branch: result.branch });
        return;
      }
      // D-C1: no retry, stash or force. Only Open Changes and Close.
      setView({ kind: 'refused', error: result.error });
    } catch (err) {
      if (generation !== generationRef.current) return;
      setView({ kind: 'refused', error: err instanceof Error ? err.message : t('supplemental.branch_switcher.git_switch_failed') });
    }
  }, [repoPath, close, onSwitched, showPreflight, t]);

  const choose = useCallback(async (target: SwitchRequest) => {
    const generation = nextGeneration();
    setView({ kind: 'busy', label: t('supplemental.branch_switcher.checking_worktree') });
    let preflight: PreflightResult;
    try {
      preflight = await ipc.invoke('git:switch-preflight', repoPath, target) as PreflightResult;
    } catch (err) {
      if (generation !== generationRef.current) return;
      setView({ kind: 'refused', error: err instanceof Error ? err.message : t('supplemental.branch_switcher.could_not_check_worktree') });
      return;
    }
    if (generation !== generationRef.current) return;
    if (showPreflight(target, preflight)) return;
    await runSwitch(target, preflight.confirmToken, preflight.targetBranch);
  }, [repoPath, runSwitch, showPreflight]);

  const openSession = useCallback((worktreeId: string) => {
    window.dispatchEvent(new CustomEvent(OPEN_WORKTREE_SESSION_EVENT, { detail: { worktreeId } }));
    close();
  }, [close]);

  const activateRow = useCallback((row: Row) => {
    if (row.kind === 'local') {
      const b = row.branch;
      if (b.isCurrent) return;
      if (b.occupiedBy) {
        // Never switch to a branch another worktree has checked out.
        if (b.occupiedBy.worktreeId) openSession(b.occupiedBy.worktreeId);
        return;
      }
      void choose({ kind: 'local', branch: b.name });
    } else {
      void choose({ kind: 'remote', remoteRef: row.branch.remoteRef });
    }
  }, [choose, openSession]);

  const handleFetch = useCallback(async () => {
    setFetching(true);
    try {
      await ipc.invoke('git:fetch', repoPath);
    } catch {
      // The Output tab records the failure; the list just stays as it was.
    } finally {
      setFetching(false);
      void loadList();
    }
  }, [repoPath, loadList, t]);

  const startCreate = useCallback(() => {
    setNewName(query.trim());
    setNewStart('HEAD');
    setFormError(null);
    replaceView({ kind: 'create', startPoint: 'HEAD', startLabel: currentBranch === 'HEAD' ? 'HEAD' : currentBranch });
  }, [query, currentBranch, replaceView]);

  const submitCreate = useCallback(() => {
    const name = newName.trim();
    const startPoint = newStart.trim() || 'HEAD';
    if (!name) { setFormError(t('supplemental.branch_switcher.enter_branch_name')); return; }
    if (name.startsWith('-') || startPoint.startsWith('-')) { setFormError(t('supplemental.branch_switcher.names_cannot_start_with_dash')); return; }
    void choose({ kind: 'create', name, startPoint });
  }, [newName, newStart, choose, t]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (view.kind === 'list' || view.kind === 'busy') close();
      else replaceView({ kind: 'list' });
      return;
    }
    if (view.kind !== 'list') return;
    // A focused button keeps its own Enter/Space; only the search box drives the list.
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = rows[activeIndex];
      if (row) activateRow(row);
    }
  }, [view.kind, rows, activeIndex, activateRow, close, replaceView]);

  useEffect(() => {
    rootRef.current
      ?.querySelector(`[data-row-index="${activeIndex}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  const displayLabel = currentBranch === 'HEAD' ? t('supplemental.branch_switcher.detached_head') : currentBranch;
  const localRows = rows.filter(r => r.kind === 'local');
  const remoteRows = rows.filter(r => r.kind === 'remote');

  const renderRow = (row: Row, index: number) => {
    const active = index === activeIndex;
    if (row.kind === 'remote') {
      const b = row.branch;
      return (
        <div
          key={`r:${b.remoteRef}`}
          data-row-index={index}
          role="option"
          aria-selected={active}
          className={`git-branch-switcher-row${active ? ' git-branch-switcher-row--active' : ''}`}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => activateRow(row)}
        >
          <span className="git-branch-switcher-check" />
          <div className="git-branch-switcher-main">
            <div className="git-branch-switcher-name">{b.remoteRef}</div>
            <div className="git-branch-switcher-sub">{t('supplemental.branch_switcher.creates_local_tracking', { branch: b.name, remote: b.remote })}</div>
          </div>
        </div>
      );
    }
    const b = row.branch;
    const occupied = b.occupiedBy;
    return (
      <div
        key={`l:${b.name}`}
        data-row-index={index}
        role="option"
        aria-selected={active}
        aria-disabled={!!occupied || b.isCurrent}
        className={[
          'git-branch-switcher-row',
          active ? 'git-branch-switcher-row--active' : '',
          occupied ? 'git-branch-switcher-row--occupied' : '',
          b.isCurrent ? 'git-branch-switcher-row--current' : '',
        ].filter(Boolean).join(' ')}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => activateRow(row)}
      >
        <span className="git-branch-switcher-check">{b.isCurrent ? '✓' : ''}</span>
        <div className="git-branch-switcher-main">
          <div className="git-branch-switcher-name">{b.name}</div>
          <div className="git-branch-switcher-sub">
            {occupied ? t('supplemental.branch_switcher.checked_out_elsewhere') : trackingSummary(b, t)}
          </div>
        </div>
        {occupied && (
          <div className="git-branch-switcher-right">
            {occupied.worktreeId ? (
              <>
                <span className="git-branch-switcher-tag">{t('supplemental.branch_switcher.in_worktree', { path: occupied.sessionTitle ?? occupied.path })}</span>
                <button
                  type="button"
                  className="git-branch-switcher-link"
                  onClick={(e) => { e.stopPropagation(); openSession(occupied.worktreeId!); }}
                >
                  {t('supplemental.branch_switcher.open_session')}
                </button>
              </>
            ) : (
              <>
                <span className="git-branch-switcher-tag" title={occupied.path}>{t('supplemental.branch_switcher.in_worktree', { path: occupied.path })}</span>
                <button
                  type="button"
                  className="git-branch-switcher-link"
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(occupied.path); }}
                >
                  {t('supplemental.branch_switcher.copy_path')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCard = () => {
    switch (view.kind) {
      case 'busy':
        return <div className="git-branch-switcher-card git-branch-switcher-busy">{view.label}</div>;
      case 'blocked':
        return (
          <div className="git-branch-switcher-card git-branch-switcher-refusal">
            <p className="git-branch-switcher-card-body">{view.message}</p>
            <div className="git-branch-switcher-btn-row">
              <button type="button" className="git-log-action-btn" onClick={close}>{t('supplemental.branch_switcher.close')}</button>
            </div>
          </div>
        );
      case 'occupied':
        return (
          <div className="git-branch-switcher-card">
            <p className="git-branch-switcher-card-body">
              {view.occupiedBy.sessionTitle
                ? t('supplemental.branch_switcher.branch_checked_out_in_session', { branch: view.branch, title: view.occupiedBy.sessionTitle })
                : t('supplemental.branch_switcher.branch_checked_out_in_worktree', { branch: view.branch, path: view.occupiedBy.path })}
            </p>
            <div className="git-branch-switcher-btn-row">
              <button type="button" className="git-log-action-btn" onClick={() => replaceView({ kind: 'list' })}>{t('supplemental.branch_switcher.back')}</button>
              {view.occupiedBy.worktreeId && (
                <button type="button" className="git-log-action-btn git-branch-switcher-primary" onClick={() => openSession(view.occupiedBy.worktreeId!)}>
                  {t('supplemental.branch_switcher.open_session')}
                </button>
              )}
            </div>
          </div>
        );
      case 'local-exists':
        return (
          <div className="git-branch-switcher-card">
            <p className="git-branch-switcher-card-body">
              {t('supplemental.branch_switcher.local_branch_exists', { branch: view.branch })}
            </p>
            <div className="git-branch-switcher-btn-row">
              <button type="button" className="git-log-action-btn" onClick={() => replaceView({ kind: 'list' })}>{t('supplemental.branch_switcher.cancel')}</button>
              <button
                type="button"
                className="git-log-action-btn git-branch-switcher-primary"
                onClick={() => void choose({ kind: 'local', branch: view.branch })}
              >
                {t('supplemental.branch_switcher.switch_to_local', { branch: view.branch })}
              </button>
            </div>
          </div>
        );
      case 'refused':
        return (
          <div className="git-branch-switcher-card git-branch-switcher-refusal">
            <div className="git-branch-switcher-refusal-line">
              <span className="git-branch-switcher-glyph">{'×'}</span>
              <span className="git-branch-switcher-error">{t('supplemental.branch_switcher.git_refused', { error: view.error })}</span>
            </div>
            <div className="git-branch-switcher-btn-row">
              <button type="button" className="git-log-action-btn" onClick={() => { close(); onOpenChanges(); }}>{t('supplemental.branch_switcher.open_changes')}</button>
              <button type="button" className="git-log-action-btn" onClick={close}>{t('supplemental.branch_switcher.close')}</button>
            </div>
          </div>
        );
      case 'confirm': {
        const { target, preflight } = view;
        // A confirm belongs to the repo it was computed for.
        if (view.repoPath !== repoPath) return null;
        const label = preflight.targetBranch || provisionalLabel(target);
        const dirty = preflight.dirtyCount > 0;
        return (
          <div className="git-branch-switcher-card git-branch-switcher-confirm">
            <p className="git-branch-switcher-card-title">
              {target.kind === 'create'
                ? t('supplemental.branch_switcher.create_and_switch_to', { branch: label })
                : t('supplemental.branch_switcher.switch_to', { branch: label })}
            </p>
            {dirty && (
              <>
                <p className="git-branch-switcher-card-body">
                  {t('supplemental.branch_switcher.dirty_files_warning', { count: preflight.dirtyCount, branch: label })}
                </p>
                <div className="git-branch-switcher-files">
                  {preflight.dirtyFiles.map(file => (
                    <div key={file} className="git-branch-switcher-file">{file}</div>
                  ))}
                  {preflight.dirtyCount > preflight.dirtyFiles.length && (
                    <div className="git-branch-switcher-file git-branch-switcher-file--more">
                      {t('supplemental.branch_switcher.and_more', { count: preflight.dirtyCount - preflight.dirtyFiles.length })}
                    </div>
                  )}
                </div>
              </>
            )}
            {preflight.runningSessions.length > 0 && (
              <div className="git-branch-switcher-warning">
                <span className="git-branch-switcher-glyph">!</span>
                <span>
                  {t('supplemental.branch_switcher.agent_sessions_running', { count: preflight.runningSessions.length })}{' '}
                  ({preflight.runningSessions.map((s, i) => (
                    <React.Fragment key={s.id}>{i > 0 ? ', ' : ''}<b>{s.title}</b></React.Fragment>
                  ))}). {t('supplemental.branch_switcher.switching_changes_files')}
                </span>
              </div>
            )}
            {preflight.unreachableHead && (
              <div className="git-branch-switcher-warning">
                <span className="git-branch-switcher-glyph">!</span>
                <span>
                  {t('supplemental.branch_switcher.unreachable_commit', { sha: preflight.unreachableHead.sha.slice(0, 7) })}
                </span>
              </div>
            )}
            <div className="git-branch-switcher-btn-row">
              <button type="button" className="git-log-action-btn" onClick={() => replaceView({ kind: 'list' })}>{t('supplemental.branch_switcher.cancel')}</button>
              {preflight.unreachableHead && (
                <button
                  type="button"
                  className="git-log-action-btn"
                  onClick={() => {
                    setNewName('');
                    setNewStart(preflight.unreachableHead!.sha);
                    setFormError(null);
                    replaceView({ kind: 'create', startPoint: preflight.unreachableHead!.sha, startLabel: preflight.unreachableHead!.sha.slice(0, 7) });
                  }}
                >
                  {t('supplemental.branch_switcher.create_branch_here')}
                </button>
              )}
              <button
                type="button"
                className="git-log-action-btn git-branch-switcher-primary"
                onClick={() => void runSwitch(target, preflight.confirmToken, label)}
              >
                {dirty ? t('supplemental.branch_switcher.switch_keep_changes') : t('supplemental.branch_switcher.switch')}
              </button>
            </div>
          </div>
        );
      }
      case 'create':
        return (
          <form
            className="git-branch-switcher-card git-branch-switcher-create"
            onSubmit={(e) => { e.preventDefault(); submitCreate(); }}
          >
            <p className="git-branch-switcher-card-title">{t('supplemental.branch_switcher.new_branch_from', { start: view.startLabel })}</p>
            <label className="git-branch-switcher-field">
              <span>{t('supplemental.branch_switcher.name')}</span>
              <input
                className="git-log-search-input"
                autoFocus
                value={newName}
                onChange={e => { setNewName(e.target.value); setFormError(null); }}
                placeholder={t('supplemental.branch_switcher.branch_name_placeholder')}
                aria-label={t('supplemental.branch_switcher.new_branch_name')}
                spellCheck={false}
              />
            </label>
            <label className="git-branch-switcher-field">
              <span>{t('supplemental.branch_switcher.start_point')}</span>
              <input
                className="git-log-search-input"
                value={newStart}
                onChange={e => { setNewStart(e.target.value); setFormError(null); }}
                aria-label={t('supplemental.branch_switcher.start_point')}
                spellCheck={false}
              />
            </label>
            {formError && <div className="git-branch-switcher-error">{formError}</div>}
            <div className="git-branch-switcher-btn-row">
              <button type="button" className="git-log-action-btn" onClick={() => replaceView({ kind: 'list' })}>{t('supplemental.branch_switcher.cancel')}</button>
              <button type="submit" className="git-log-action-btn git-branch-switcher-primary">{t('supplemental.branch_switcher.create_and_switch')}</button>
            </div>
          </form>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        className="git-log-select git-branch-picker-trigger git-branch-switcher-trigger"
        title={t('supplemental.branch_switcher.switch_branch')}
        aria-label={t('supplemental.branch_switcher.switch_branch_current', { branch: displayLabel || t('supplemental.branch_switcher.unknown_branch') })}
        disabled={disabled}
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        {...getReferenceProps()}
      >
        <span className="git-branch-switcher-trigger-label">{displayLabel || t('supplemental.branch_switcher.loading')}</span>
        <span className="git-branch-picker-chevron">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={(node) => { refs.setFloating(node); rootRef.current = node; }}
            style={floatingStyles}
            className="git-branch-switcher"
            {...getFloatingProps({ onKeyDown: handleKeyDown })}
          >
            {view.kind === 'list' ? (
              <>
                <div className="git-branch-switcher-search">
                  <input
                    ref={searchRef}
                    className="git-log-search-input"
                    type="search"
                    placeholder={t('supplemental.branch_switcher.search_placeholder')}
                    aria-label={t('supplemental.branch_switcher.search_branches')}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
                    spellCheck={false}
                  />
                </div>
                <div className="git-branch-switcher-fetch">
                  {list?.lastFetchedAt ? <span>{t('supplemental.branch_switcher.fetched_ago', { time: formatAgo(list.lastFetchedAt, t) })}</span> : <span />}
                  <button
                    type="button"
                    className="git-branch-switcher-link"
                    onClick={() => void handleFetch()}
                    disabled={fetching}
                    title={t('supplemental.branch_switcher.fetch_now')}
                    aria-label={t('supplemental.branch_switcher.fetch_now')}
                  >
                    {fetching ? t('supplemental.branch_switcher.fetching') : '↻'}
                  </button>
                </div>
                {list?.worktreeLookupFailed && (
                  <div className="git-branch-switcher-warning">
                    <span className="git-branch-switcher-glyph">!</span>
                    <span>{t('supplemental.branch_switcher.worktree_records_unavailable')}</span>
                  </div>
                )}
                {list?.managedWorktree && (
                  <div className="git-branch-switcher-warning">
                    <span className="git-branch-switcher-glyph">!</span>
                    <span>{t('supplemental.branch_switcher.managed_worktree', { name: list.managedWorktree.name })}</span>
                  </div>
                )}
                <div className="git-branch-switcher-list" role="listbox" aria-label={t('supplemental.branch_switcher.branches')}>
                  {listError && <div className="git-branch-switcher-error">{listError}</div>}
                  {!list && !listError && <div className="git-branch-menu-empty">{t('supplemental.branch_switcher.loading_branches')}</div>}
                  {localRows.length > 0 && <div className="git-branch-menu-section">{t('supplemental.branch_switcher.local')}</div>}
                  {localRows.map((row, i) => renderRow(row, i))}
                  {remoteRows.length > 0 && <div className="git-branch-menu-section">{t('supplemental.branch_switcher.remote_only')}</div>}
                  {remoteRows.map((row, i) => renderRow(row, localRows.length + i))}
                  {list && rows.length === 0 && <div className="git-branch-menu-empty">{t('supplemental.branch_switcher.no_matching_branches')}</div>}
                </div>
                <div className="git-branch-switcher-footer">
                  <button type="button" className="git-branch-switcher-footer-action" onClick={startCreate}>
                    + {t('supplemental.branch_switcher.new_branch_from', { start: displayLabel })}
                  </button>
                </div>
              </>
            ) : renderCard()}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
