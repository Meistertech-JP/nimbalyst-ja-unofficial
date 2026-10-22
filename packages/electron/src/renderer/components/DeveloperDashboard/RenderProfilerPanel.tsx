import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTranslation } from '@nimbalyst/i18n/react';

/**
 * Developer Dashboard > Renders.
 *
 * Drives the main app window's React render profiler over `dev:render-profiler`.
 * Recording is off until you press Start, so the instrument costs nothing while
 * you are looking at some other tab.
 *
 * The reading is of the *main app window*, not this one. Chromium throttles
 * hidden windows, so the banner calls out a backgrounded target rather than
 * letting a quiet table read as a clean bill of health.
 */

interface ComponentRenderStat {
  name: string;
  renders: number;
  commits: number;
  mounts: number;
  updates: number;
  reasons: Record<string, number>;
  rendersPerSec: number;
}

interface AtomWriteStat {
  name: string;
  writes: number;
  writesPerSec: number;
}

interface ProfilerSnapshot {
  recording: boolean;
  durationMs: number;
  commits: number;
  commitsPerSec: number;
  totalRenders: number;
  rendersPerSec: number;
  components: ComponentRenderStat[];
  timeline: { second: number; commits: number; renders: number }[];
  overheadMs: number;
  window: { visibilityState: string; hasFocus: boolean; url: string };
  truncated: boolean;
  atoms: AtomWriteStat[];
  atomWrites: number;
  atomsPerSec: number;
  atomTrackingUnavailable: string | null;
  available?: false;
  reason?: string;
}

const POLL_INTERVAL_MS = 1000;
const MAX_ROWS = 40;

/** Above this, a surface is repainting far more often than a human can perceive. */
const RENDERS_PER_SEC_WARN = 20;
const RENDERS_PER_SEC_BAD = 60;

async function callProfiler(action: 'start' | 'stop' | 'snapshot' | 'reset'): Promise<ProfilerSnapshot | null> {
  try {
    return await window.electronAPI.invoke('dev:render-profiler', action);
  } catch {
    return null;
  }
}

function rateColor(perSec: number): string {
  if (perSec >= RENDERS_PER_SEC_BAD) return 'text-[var(--nim-error)] font-bold';
  if (perSec >= RENDERS_PER_SEC_WARN) return 'text-[var(--nim-warning)]';
  return 'text-[var(--nim-text)]';
}

function topReason(reasons: Record<string, number>): string {
  const entries = Object.entries(reasons);
  if (!entries.length) return '';
  const [reason, count] = entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  return entries.length > 1 ? `${reason} (${count})` : reason;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="render-profiler-stat-card px-3 py-2 rounded border border-[var(--nim-border)] bg-[var(--nim-surface-raised)]">
      <div className="text-[10px] uppercase tracking-wide text-[var(--nim-text-muted)]">{label}</div>
      <div className="text-lg font-mono text-[var(--nim-text)]">{value}</div>
      {hint && <div className="text-[10px] text-[var(--nim-text-muted)]">{hint}</div>}
    </div>
  );
}

export function RenderProfilerPanel() {
  const { t } = useTranslation('settings');
  const [snapshot, setSnapshot] = useState<ProfilerSnapshot | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    const next = await callProfiler('snapshot');
    if (!next) return;
    if (next.available === false) {
      setError(next.reason ?? t('developer_dashboard.render_profiler.profiler_unavailable'));
      return;
    }
    setError(null);
    setSnapshot(next);
  }, [t]);

  useEffect(() => {
    if (!recording) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [recording, poll]);

  const start = useCallback(async () => {
    const result = await callProfiler('start');
    if (result && (result as any).available === false) {
      setError((result as any).reason ?? t('developer_dashboard.render_profiler.profiler_unavailable'));
      return;
    }
    setError(null);
    setRecording(true);
    void poll();
  }, [poll, t]);

  const stop = useCallback(async () => {
    const final = await callProfiler('stop');
    setRecording(false);
    if (final && final.available !== false) setSnapshot(final);
  }, []);

  const reset = useCallback(async () => {
    await callProfiler('reset');
    void poll();
  }, [poll]);

  const targetHidden = snapshot ? snapshot.window.visibilityState !== 'visible' : false;

  return (
    <div className="render-profiler-panel h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        {recording ? (
          <button
            onClick={stop}
            className="px-3 py-1.5 text-sm rounded bg-[var(--nim-error)] text-white"
          >
            {t('developer_dashboard.render_profiler.stop_recording')}
          </button>
        ) : (
          <button
            onClick={start}
            className="px-3 py-1.5 text-sm rounded bg-[var(--nim-accent)] text-white"
          >
            {t('developer_dashboard.render_profiler.start_recording')}
          </button>
        )}
        <button
          onClick={reset}
          className="px-3 py-1.5 text-sm rounded border border-[var(--nim-border)] text-[var(--nim-text)]"
        >
          {t('developer_dashboard.render_profiler.reset_counters')}
        </button>
        {recording && <span className="text-xs text-[var(--nim-text-muted)] animate-pulse">{t('developer_dashboard.render_profiler.recording_main_window')}</span>}
      </div>

      {error && (
        <div className="px-3 py-2 rounded border border-[var(--nim-error)] text-sm text-[var(--nim-error)]">
          {error}
        </div>
      )}

      {targetHidden && (
        <div className="px-3 py-2 rounded border border-[var(--nim-warning)] text-sm text-[var(--nim-warning)]">
          {t('developer_dashboard.render_profiler.target_hidden_before')}{' '}
          <strong>{snapshot?.window.visibilityState}</strong>
          {t('developer_dashboard.render_profiler.target_hidden_after')}
        </div>
      )}

      {!snapshot && !error && (
        <div className="text-sm text-[var(--nim-text-muted)]">
          {t('developer_dashboard.render_profiler.empty_state')}
        </div>
      )}

      {snapshot && (
        <>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
            <StatCard label={t('developer_dashboard.render_profiler.commits_per_sec')} value={String(snapshot.commitsPerSec)} hint={t('developer_dashboard.render_profiler.hint_total', { count: snapshot.commits })} />
            <StatCard label={t('developer_dashboard.render_profiler.renders_per_sec')} value={String(snapshot.rendersPerSec)} hint={t('developer_dashboard.render_profiler.hint_total', { count: snapshot.totalRenders })} />
            <StatCard label={t('developer_dashboard.render_profiler.atom_writes_per_sec')} value={String(snapshot.atomsPerSec)} hint={t('developer_dashboard.render_profiler.hint_total', { count: snapshot.atomWrites })} />
            <StatCard label={t('developer_dashboard.render_profiler.duration')} value={`${(snapshot.durationMs / 1000).toFixed(1)}s`} />
            <StatCard label={t('developer_dashboard.render_profiler.profiler_overhead')} value={`${snapshot.overheadMs}ms`} hint={t('developer_dashboard.render_profiler.overhead_hint')} />
            <StatCard label={t('developer_dashboard.render_profiler.components')} value={String(snapshot.components.length)} />
          </div>

          {snapshot.timeline.length > 1 && (
            <div className="h-48 border border-[var(--nim-border)] rounded p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshot.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--nim-border)" />
                  <XAxis dataKey="second" stroke="var(--nim-text-muted)" fontSize={10} unit="s" />
                  <YAxis stroke="var(--nim-text-muted)" fontSize={10} />
                  <Tooltip contentStyle={{ background: 'var(--nim-surface-raised)', border: '1px solid var(--nim-border)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="renders" stroke="#f472b6" dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="commits" stroke="#60a5fa" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-[var(--nim-text)] mb-2">
              {t('developer_dashboard.render_profiler.components_by_render_count')}
              {snapshot.truncated && <span className="ml-2 text-xs text-[var(--nim-warning)]">{t('developer_dashboard.render_profiler.tree_walk_truncated')}</span>}
            </h3>
            <div className="overflow-x-auto border border-[var(--nim-border)] rounded">
              <table className="w-full text-xs font-mono border-collapse">
                <thead className="bg-[var(--nim-surface-raised)] text-[var(--nim-text-muted)] text-left">
                  <tr>
                    <th className="px-2 py-1.5">{t('developer_dashboard.render_profiler.component')}</th>
                    <th className="px-2 py-1.5 text-right">{t('developer_dashboard.render_profiler.renders')}</th>
                    <th className="px-2 py-1.5 text-right">{t('developer_dashboard.render_profiler.per_sec')}</th>
                    <th className="px-2 py-1.5 text-right">{t('developer_dashboard.render_profiler.commits')}</th>
                    <th className="px-2 py-1.5 text-right">{t('developer_dashboard.render_profiler.mounts')}</th>
                    <th className="px-2 py-1.5">{t('developer_dashboard.render_profiler.most_common_reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.components.slice(0, MAX_ROWS).map(c => (
                    <tr key={c.name} className="border-b border-[var(--nim-border)] hover:bg-[var(--nim-surface-hover)]">
                      <td className="px-2 py-1 text-[var(--nim-text)]">{c.name}</td>
                      <td className="px-2 py-1 text-right text-[var(--nim-text)]">{c.renders}</td>
                      <td className={`px-2 py-1 text-right ${rateColor(c.rendersPerSec)}`}>{c.rendersPerSec}</td>
                      <td className="px-2 py-1 text-right text-[var(--nim-text-muted)]">{c.commits}</td>
                      <td className="px-2 py-1 text-right text-[var(--nim-text-muted)]">{c.mounts}</td>
                      <td className="px-2 py-1 text-[var(--nim-text-muted)]">{topReason(c.reasons)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-[var(--nim-text)] mb-2">{t('developer_dashboard.render_profiler.atom_writes_heading')}</h3>
            {snapshot.atomTrackingUnavailable ? (
              <div className="text-xs text-[var(--nim-warning)]">{snapshot.atomTrackingUnavailable}</div>
            ) : (
              <div className="overflow-x-auto border border-[var(--nim-border)] rounded">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead className="bg-[var(--nim-surface-raised)] text-[var(--nim-text-muted)] text-left">
                    <tr>
                      <th className="px-2 py-1.5">{t('developer_dashboard.render_profiler.atom')}</th>
                      <th className="px-2 py-1.5 text-right">{t('developer_dashboard.render_profiler.writes')}</th>
                      <th className="px-2 py-1.5 text-right">{t('developer_dashboard.render_profiler.per_sec')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.atoms.slice(0, MAX_ROWS).map(a => (
                      <tr key={a.name} className="border-b border-[var(--nim-border)] hover:bg-[var(--nim-surface-hover)]">
                        <td className="px-2 py-1 text-[var(--nim-text)]">{a.name}</td>
                        <td className="px-2 py-1 text-right text-[var(--nim-text)]">{a.writes}</td>
                        <td className={`px-2 py-1 text-right ${rateColor(a.writesPerSec)}`}>{a.writesPerSec}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
