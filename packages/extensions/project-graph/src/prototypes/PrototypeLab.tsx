import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@nimbalyst/i18n/react";
import type { PanelHostProps } from "@nimbalyst/extension-sdk";
import type { ProjectGraphNode, ProjectGraphSnapshot } from "../types";
import { ProjectIndex } from "../indexing/projectIndex";
import { buildPrototypeModel } from "./model";
import { createPrototypeSample } from "./sample";
import { prototypeRange, precedingRange } from "./range";
import type { PrototypeViewProps } from "./contracts";
import { AtlasPrototype } from "./atlas/AtlasPrototype";
import { PulsePrototype } from "./pulse/PulsePrototype";
import { TrailsPrototype } from "./trails/TrailsPrototype";
import {
  createAreaRegistry,
  normalizeAreaRegistry,
  type AreaRule,
} from "./areaRegistry";
import {
  normalizeSettings,
  indexOptions,
  scopeModel,
  SETTINGS_KEY,
  REGISTRY_KEY,
  lensMatches,
  type ViewSettings,
} from "./viewSettings";
import { UnderstandingSettings } from "./UnderstandingSettings";
import { indexCoverageMessages, periodCoverageForIndex } from "./coverage";
import { SourceRecord } from "./SourceRecord";
import "./prototype-shell.css";

export function PrototypeLab({ host }: PanelHostProps) {
  const { t } = useTranslation("extensions");
  const [settings, setSettings] = useState(() =>
    normalizeSettings(host.storage.get(SETTINGS_KEY))
  );
  const [registry, setRegistry] = useState(() =>
    normalizeAreaRegistry(host.storage.get(REGISTRY_KEY))
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [source, setSource] = useState<"live" | "sample">("live");
  const [offset, setOffset] = useState(0);
  const [timeAnchor, setTimeAnchor] = useState(() => Date.now());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [record, setRecord] = useState<ProjectGraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const sample = useMemo(() => createPrototypeSample(), []);
  const index = useMemo(
    () => new ProjectIndex(host, indexOptions(settings)),
    [host]
  );
  const [indexState, setIndexState] = useState(() => index.getState());
  const alive = useRef(true);
  const lastOptions = useRef("");
  const settingsWrites = useRef(Promise.resolve());
  const registryWrites = useRef(Promise.resolve());
  const options = useMemo(
    () =>
      indexOptions(
        settings,
        offset + settings.days * (settings.compare ? 2 : 1)
      ),
    [
      settings.sources,
      settings.includeArchived,
      settings.historyDays,
      settings.safetyLimit,
      settings.days,
      settings.compare,
      offset,
    ]
  );
  useEffect(() => {
    alive.current = true;
    const unsubscribe = index.subscribe(setIndexState);
    setIndexState(index.getState());
    return () => {
      alive.current = false;
      unsubscribe();
      lastOptions.current = "";
      index.cancel();
      queueMicrotask(() => {
        if (!alive.current) index.dispose();
      });
    };
  }, [index]);
  useEffect(() => {
    if (source !== "live") return;
    const key = JSON.stringify(options);
    if (lastOptions.current === key && index.getState().status !== "idle")
      return;
    lastOptions.current = key;
    let cancelled = false;
    void (async () => {
      if (index.getState().status === "idle") await index.hydrateFromCache();
      if (!cancelled) await index.load(options);
    })().catch((e) => {
      if (alive.current && !cancelled) setError(String(e));
    });
    return () => {
      cancelled = true;
    };
  }, [index, options, source]);
  const saveSettings = useCallback(
    (next: ViewSettings) => {
      setSettings(next);
      settingsWrites.current = settingsWrites.current
        .then(() => host.storage.set(SETTINGS_KEY, next))
        .catch((e) => {
          if (alive.current)
            setError(t("project_graph.error_save_settings", { error: String(e) }));
        });
    },
    [host, t]
  );
  const saveRegistry = useCallback(
    (next: AreaRule[]) => {
      setRegistry(next);
      registryWrites.current = registryWrites.current
        .then(() => host.storage.set(REGISTRY_KEY, next))
        .catch((e) => {
          if (alive.current)
            setError(t("project_graph.error_save_areas", { error: String(e) }));
        });
    },
    [host, t]
  );
  const liveSnapshot = useMemo<ProjectGraphSnapshot>(() => {
    const countsByType: Record<string, number> = {};
    for (const n of indexState.records)
      countsByType[n.type] = (countsByType[n.type] ?? 0) + 1;
    return {
      generatedAt: indexState.generatedAt,
      nodes: indexState.records,
      edges: indexState.edges,
      stats: {
        nodeCount: indexState.records.length,
        edgeCount: indexState.edges.length,
        countsByType,
      },
    };
  }, [indexState.records, indexState.edges, indexState.generatedAt]);
  useEffect(() => {
    if (
      indexState.status === "ready" &&
      !indexState.fromCache &&
      liveSnapshot.nodes.length &&
      !registry.length
    )
      saveRegistry(createAreaRegistry(liveSnapshot));
  }, [
    indexState.status,
    indexState.fromCache,
    liveSnapshot,
    registry.length,
    saveRegistry,
  ]);
  const snapshot = source === "sample" ? sample : liveSnapshot;
  // Progress ticks recreate the small coverage object, but unchanged messages
  // must not invalidate the entire 20k-record projection on every page.
  const coverageKey = JSON.stringify(indexState.coverage);
  const coverage = useMemo(
    () => indexCoverageMessages(indexState),
    [coverageKey, indexState.fromCache]
  );
  const fullModel = useMemo(() => {
    if (
      source === "live" &&
      !snapshot.nodes.length &&
      indexState.status !== "ready"
    )
      return null;
    return buildPrototypeModel(snapshot, {
      source,
      areaRegistry: source === "live" && registry.length ? registry : undefined,
      coverage: source === "live" ? coverage : undefined,
      periodCoverage:
        source === "sample"
          ? { startMs: 0, endMs: snapshot.generatedAt, complete: true }
          : periodCoverageForIndex(indexState),
    });
  }, [snapshot, source, registry, coverage, indexState.status]);
  const model = useMemo(
    () => (fullModel ? scopeModel(fullModel, settings.excludedTypes) : null),
    [fullModel, settings.excludedTypes]
  );
  useEffect(() => {
    if (!fullModel) return;
    setRecord((current) =>
      current
        ? fullModel.nodeById.get(current.id) ??
          (indexState.status === "ready" ? null : current)
        : null
    );
  }, [fullModel, indexState.status]);
  const range = useMemo(
    () =>
      prototypeRange(
        source === "sample" ? sample.generatedAt : timeAnchor,
        settings.days,
        offset
      ),
    [source, sample.generatedAt, timeAnchor, settings.days, offset]
  );
  const comparisonRange = useMemo(
    () => (settings.compare ? precedingRange(range) : undefined),
    [range, settings.compare]
  );
  const evidenceRequest = useRef("");
  useEffect(() => {
    if (
      source !== "live" ||
      indexState.status !== "ready" ||
      indexState.fromCache ||
      indexState.coverage.git?.availability !== "available"
    )
      return;
    const startMs = comparisonRange?.startMs ?? range.startMs;
    const key = `${indexState.generation}:${startMs}:${range.endMs}`;
    if (evidenceRequest.current === key) return;
    evidenceRequest.current = key;
    void index
      .loadCommitEvidence({ sinceMs: startMs, untilMs: range.endMs })
      .then((result) => {
        if (alive.current && result.error)
            setError(t("project_graph.error_commit_evidence", { error: result.error }));
      })
      .catch((e) => {
        if (alive.current)
            setError(t("project_graph.error_retrieve_commit_evidence", { error: String(e) }));
      });
  }, [
    index,
    indexState.generation,
    indexState.status,
    indexState.fromCache,
    indexState.coverage.git?.availability,
    source,
    range,
    comparisonRange,
    t,
  ]);
  const navigate = useCallback<PrototypeViewProps["onNavigate"]>(
    (mode, nodeId, areaId) => {
      saveSettings({
        ...settings,
        mode,
        ...(areaId !== undefined ? { areaId } : {}),
      });
      if (nodeId !== undefined) setSelectedNodeId(nodeId);
    },
    [settings, saveSettings]
  );
  const rename = useCallback(
    (id: string, label: string) => {
      const clean = label.trim().slice(0, 80);
      if (!clean) return;
      if (source === "live")
        saveRegistry(
          registry.map((r) => (r.id === id ? { ...r, label: clean } : r))
        );
    },
    [registry, source, saveRegistry]
  );
  const open = useCallback(
    (node: ProjectGraphNode) => {
      setRecord(node);
      setSelectedNodeId(node.id);
      if (source === "live")
        void index
          .loadDetail(node.id)
          .then((detail) => {
            if (alive.current && detail)
              setRecord((current) =>
                current?.id === node.id
                  ? {
                      ...current,
                      fields: {
                        ...current.fields,
                        ...detail.fields,
                        ...(detail.body !== undefined
                          ? {
                              body: detail.body,
                              bodyTruncated: detail.truncated ?? false,
                            }
                          : {}),
                      },
                    }
                  : current
              );
          })
          .catch((e) => {
            if (alive.current)
            setError(t("project_graph.error_fetch_source_detail", { error: String(e) }));
          });
    },
    [source, index, t]
  );
  const resolve = useCallback(
    (id: string) => {
      if (source !== "live") return;
      setResolving(true);
      setError(null);
      void index
        .resolveNode(id)
        .then((n) => {
          if (!alive.current) return;
          if (n) {
            setSelectedNodeId(n.id);
            setRecord(n);
          } else
            setError(t("project_graph.reference_unresolved"));
        })
        .catch((e) => {
          if (alive.current) setError(String(e));
        })
        .finally(() => {
          if (alive.current) setResolving(false);
        });
    },
    [index, source, t]
  );
  const openOriginal = () => {
    if (!record || source === "sample") return;
    const id = record.fields?.id;
    if (record.source === "session" && typeof id === "string") {
      host.close();
      requestAnimationFrame(() =>
        window.dispatchEvent(
          new CustomEvent("open-ai-session", {
            detail: { sessionId: id, workspacePath: host.workspacePath },
          })
        )
      );
    } else if (record.source === "tracker" && typeof id === "string") {
      host.close();
      requestAnimationFrame(() =>
        window.dispatchEvent(
          new CustomEvent("nimbalyst:navigate-tracker-item", {
            detail: { itemId: id },
          })
        )
      );
    } else {
      const path = record.fields?.documentPath ?? record.fields?.path;
      if (
        typeof path === "string" &&
        ["file", "memory"].includes(record.source) &&
        record.type !== "directory"
      ) {
        host.close();
        host.openFile(path);
      }
    }
  };
  const canOpen =
    record &&
    source === "live" &&
    ((["session", "tracker"].includes(record.source) &&
      typeof record.fields?.id === "string") ||
      (["file", "memory"].includes(record.source) &&
        record.type !== "directory" &&
        typeof (record.fields?.documentPath ?? record.fields?.path) ===
          "string"));

  const viewProps: PrototypeViewProps | null = model
    ? {
        model,
        range,
        comparisonRange,
        selectedAreaId: model.areas.some((a) => a.id === settings.areaId)
          ? settings.areaId
          : null,
        selectedNodeId: model.nodeById.has(selectedNodeId ?? "")
          ? selectedNodeId
          : null,
        onSelectArea: (id) => saveSettings({ ...settings, areaId: id }),
        onSelectNode: setSelectedNodeId,
        onOpenNode: open,
        onResolveNode: resolve,
        onNavigate: navigate,
        onRenameArea: rename,
      }
    : null;
  const loading = indexState.status === "loading";
  const lens = settings.lenses.find((l) => l.id === settings.lensId);
  return (
    <div className="pg-prototype-lab">
      <header className="pg-prototype-toolbar">
        <nav aria-label={t("project_graph.project_views")}>
          {(["pulse", "atlas", "trails"] as const).map((m) => (
            <button
              key={m}
              aria-pressed={settings.mode === m}
              onClick={() => navigate(m)}
            >
              {m === "trails"
                ? t("project_graph.evidence_trails")
                : m === "atlas"
        ? t("project_graph.atlas_label")
        : t("project_graph.pulse_label")}
            </button>
          ))}
        </nav>
        <label>
          {t("project_graph.data_label")} {" "}
          <select
            aria-label={t("project_graph.prototype_data_source")}
            value={source}
            onChange={(e) => {
              setSource(e.target.value as typeof source);
              setSelectedNodeId(null);
              setRecord(null);
              saveSettings({ ...settings, areaId: null });
              setOffset(0);
              setError(null);
            }}
          >
            <option value="live">{t("project_graph.live_project")}</option>
            <option value="sample">{t("project_graph.illustrative_sample_records", { count: "3,080" })}</option>
          </select>
        </label>
        <label>
          {t("project_graph.area_label")} {" "}
          <select
            aria-label={t("project_graph.prototype_area")}
            value={viewProps?.selectedAreaId ?? ""}
            onChange={(e) =>
              saveSettings({ ...settings, areaId: e.target.value || null })
            }
          >
            <option value="">{t("project_graph.all_areas")}</option>
            {model?.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("project_graph.range_label")} {" "}
          <select
            aria-label={t("project_graph.prototype_time_range")}
            value={settings.days}
            onChange={(e) => {
              saveSettings({ ...settings, days: Number(e.target.value) });
              setOffset(0);
            }}
          >
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                {t("project_graph.days", { count: d })}
              </option>
            ))}
          </select>
        </label>
        <button
          aria-label={t("project_graph.previous_time_window")}
          onClick={() => setOffset((v) => v + settings.days)}
        >
          ←
        </button>
        <button
          disabled={!offset}
          aria-label={t("project_graph.next_time_window")}
          onClick={() => setOffset((v) => Math.max(0, v - settings.days))}
        >
          →
        </button>
        <button
          onClick={() => {
            setOffset(0);
            setTimeAnchor(Date.now());
          }}
        >
          {t("project_graph.now")}
        </button>
        <label>
          <input
            type="checkbox"
            checked={settings.compare}
            onChange={(e) =>
              saveSettings({ ...settings, compare: e.target.checked })
            }
          />
          {t("project_graph.compare_previous_period")}
        </label>
        {settings.lenses.length > 0 && (
          <label>
            {t("project_graph.lens_label")} {" "}
            <select
              aria-label={t("project_graph.saved_lens")}
              value={settings.lensId ?? ""}
              onChange={(e) => {
                const l = settings.lenses.find((x) => x.id === e.target.value);
                if (l) {
                  saveSettings({
                    ...settings,
                    mode: l.mode,
                    days: l.days,
                    areaId: l.areaId,
                    excludedTypes: l.excludedTypes,
                    compare: l.compare,
                    lensId: l.id,
                  });
                  setOffset(0);
                } else saveSettings({ ...settings, lensId: null });
              }}
            >
              <option value="">{t("project_graph.custom_view")}</option>
              {settings.lenses.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            {lens && !lensMatches(settings, lens) && <span>{t("project_graph.modified")}</span>}
          </label>
        )}
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
        >
          {t("project_graph.settings")}
        </button>
        <button
          disabled={loading || source === "sample"}
          onClick={() => {
            setError(null);
            void index.refresh().catch((e) => {
              if (alive.current)
                setError(t("project_graph.error_refresh_index", { error: String(e) }));
            });
          }}
        >
          {t("project_graph.refresh")}
        </button>
        {loading && (
          <button onClick={() => index.cancel()}>{t("project_graph.cancel_indexing")}</button>
        )}
      </header>
      <div className="pg-prototype-context">
        <strong>
          {source === "sample"
            ? t("project_graph.illustrative_sample")
            : indexState.fromCache
            ? t("project_graph.cached_project_metadata_refreshing")
            : t("project_graph.live_project")}
        </strong>
        <span>
          {new Date(range.startMs).toLocaleDateString()} –{" "}
          {new Date(range.endMs).toLocaleDateString()}
        </span>
        <span>
          {source === "live"
            ? `${t("project_graph.indexed_count", { count: indexState.records.length.toLocaleString() })} · `
            : ""}
          {t("project_graph.records_in_view", {
            count: model?.snapshot.nodes.length.toLocaleString() ?? "…",
            observations: model?.events
              .filter((e) => e.at >= range.startMs && e.at <= range.endMs)
              .length.toLocaleString() ?? "…",
          })}
        </span>
        {loading && (
          <span role="status">
            {t("project_graph.indexing_status", {
              source: indexState.progress.activeSourceId ?? t("project_graph.sources"),
              records: indexState.progress.recordsIndexed.toLocaleString(),
              completed: indexState.progress.completedSources,
              total: indexState.progress.totalSources,
            })}
          </span>
        )}
        {resolving && <span role="status">{t("project_graph.resolving_source")}</span>}
        <details>
          <summary>{t("project_graph.sources_and_limitations")}</summary>
          <ul>
            {model?.coverage.map((message, i) => (
              <li key={i}>{message}</li>
            ))}
            {!model && coverage.map((message, i) => <li key={i}>{message}</li>)}
          </ul>
        </details>
      </div>
      {(error || indexState.error) && (
        <div className="pg-prototype-error" role="alert">
          {error ?? indexState.error}
        </div>
      )}
      {settingsOpen ? (
        <UnderstandingSettings
          value={settings}
          onChange={saveSettings}
          index={indexState}
          registry={registry}
          onRegistry={saveRegistry}
          nodes={liveSnapshot.nodes}
          onClose={() => setSettingsOpen(false)}
        />
      ) : viewProps ? (
        <div className="pg-prototype-view">
          {settings.mode === "atlas" ? (
            <AtlasPrototype {...viewProps} />
          ) : settings.mode === "pulse" ? (
            <PulsePrototype {...viewProps} />
          ) : (
            <TrailsPrototype {...viewProps} />
          )}
        </div>
      ) : (
        <div className="pg-prototype-empty">
          {loading
            ? t("project_graph.indexing_project_evidence")
            : t("project_graph.no_project_snapshot_loaded")} {t("project_graph.select_sample_while_loading")}
        </div>
      )}
      {record && model && (
        <SourceRecord
          record={record}
          model={fullModel ?? model}
          sample={source === "sample"}
          onClose={() => setRecord(null)}
          onOpen={open}
          onResolve={resolve}
          canOpen={!!canOpen}
          onOpenOriginal={openOriginal}
        />
      )}
    </div>
  );
}
