import { useMemo, useState } from "react";
import { useTranslation } from "@nimbalyst/i18n/react";
import type { ProjectGraphNode } from "../types";
import type { PrototypeModel } from "./contracts";

export function SourceRecord({
  record,
  model,
  sample,
  onClose,
  onOpen,
  onResolve,
  canOpen,
  onOpenOriginal,
}: {
  record: ProjectGraphNode;
  model: PrototypeModel;
  sample: boolean;
  onClose: () => void;
  onOpen: (n: ProjectGraphNode) => void;
  onResolve: (id: string) => void;
  canOpen: boolean;
  onOpenOriginal: () => void;
}) {
  const { t } = useTranslation("extensions");
  const [tab, setTab] = useState<"record" | "graph" | "history">("record");
  const [limit, setLimit] = useState(12);
  const links = useMemo(
    () =>
      model.snapshot.edges.filter(
        (e) => e.sourceId === record.id || e.targetId === record.id
      ),
    [model, record.id]
  );
  const neighbors = useMemo(
    () =>
      [
        ...new Set(
          links.map((e) => (e.sourceId === record.id ? e.targetId : e.sourceId))
        ),
      ].sort(),
    [links, record.id]
  );
  const events = useMemo(
    () =>
      model.events
        .filter((e) => e.nodeId === record.id)
        .sort((a, b) => b.at - a.at),
    [model, record.id]
  );
  const shown = neighbors.slice(0, limit);
  const navigate = (id: string) => {
    const n = model.nodeById.get(id);
    if (n) {
      onOpen(n);
      setLimit(12);
    } else onResolve(id);
  };
  return (
    <section
      className={`pg-prototype-source ${
        tab === "graph" ? "pg-source-wide" : ""
      }`}
      aria-label={t("project_graph.source_record")}
    >
      <header>
        <strong>{record.label}</strong>
        <button aria-label={t("project_graph.close_source_record")} onClick={onClose}>
          {t("project_graph.close")}
        </button>
      </header>
      <p>
        {sample
          ? t("project_graph.illustrative_source_record")
          : `${record.source} · ${record.type} · ${record.visibility}`}
      </p>
      <nav aria-label={t("project_graph.source_exploration")}>
        {(["record", "graph", "history"] as const).map((tabKey) => (
          <button key={tabKey} aria-pressed={tab === tabKey} onClick={() => setTab(tabKey)}>
            {tabKey === "record"
              ? t("project_graph.record_tab")
              : tabKey === "graph"
              ? t("project_graph.focused_graph")
              : t("project_graph.recorded_history")}
          </button>
        ))}
      </nav>
      {tab === "record" ? (
        <>
          <p className="pg-prototype-source-text">
            {record.sublabel ?? String(record.fields?.subject ?? "")}
          </p>
          <code>{record.id}</code>
          <p>
            {t("project_graph.current_status", {
              status: record.status ?? t("project_graph.not_recorded"),
            })}
            {record.fields?.archived === true ? ` · ${t("project_graph.archived")}` : ""}.{" "}
            {model.memberships
              .get(record.id)
              ?.map((m) => m.basis)
              .join(" · ")}
          </p>
          {typeof record.fields?.body === "string" && (
            <details>
              <summary>
                {t("project_graph.source_body")}{record.fields?.bodyTruncated ? ` · ${t("project_graph.excerpt")}` : ""}
              </summary>
              <pre>{record.fields.body}</pre>
            </details>
          )}
          {canOpen ? (
            <button onClick={onOpenOriginal}>
              {t("project_graph.open_original_type", {
                type: record.source === "session"
                  ? t("project_graph.session")
                  : record.source === "tracker"
                  ? t("project_graph.tracker")
                  : t("project_graph.file"),
              })}
            </button>
          ) : (
            <p>
              {sample
                ? t("project_graph.sample_sources_do_not_open")
                : t("project_graph.original_navigation_unavailable")}
            </p>
          )}
        </>
      ) : tab === "history" ? (
        <>
          <p>
            {t("project_graph.history_state_explanation")}
          </p>
          <strong>
            {t("project_graph.now_status", {
              status: record.status ?? t("project_graph.status_not_recorded"),
            })}
            {record.fields?.archived === true ? ` · ${t("project_graph.archived_lower")}` : ""}
          </strong>
          {events.length ? (
            <ol>
              {events.map((e) => (
                <li key={e.id}>
                  <time>{new Date(e.at).toLocaleString()}</time> — {e.label}{" "}
                  <small>
                    (
                    {e.provenance === "recorded"
                      ? t("project_graph.recorded_event")
                      : t("project_graph.last_observed_only")}
                    )
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p>
              {t("project_graph.no_dated_events")}
            </p>
          )}
        </>
      ) : (
        <>
          <p>
            {t("project_graph.neighbor_summary", {
              shown: shown.length,
              total: neighbors.length,
              connections: links.length,
            })}
          </p>
          {shown.length > 0 ? (
            <svg
              role="group"
              aria-label={t("project_graph.focused_connection_graph")}
              viewBox={`0 0 640 ${Math.max(180, shown.length * 66)}`}
            >
              <defs>
                <marker
                  id="pg-source-arrow"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
                </marker>
              </defs>
              <rect
                x="8"
                y={Math.max(180, shown.length * 66) / 2 - 26}
                width="192"
                height="52"
                rx="6"
                className="pg-source-graph-focus"
              />
              <text x="18" y={Math.max(180, shown.length * 66) / 2 + 4}>
                {record.label.slice(0, 25)}
              </text>
              {shown.map((id, i) => {
                const n = model.nodeById.get(id);
                const related = links.filter(
                  (e) => e.sourceId === id || e.targetId === id
                );
                const incoming = related.some((e) => e.targetId === record.id);
                const outgoing = related.some((e) => e.sourceId === record.id);
                const y = i * 66 + 32;
                return (
                  <g key={id}>
                    <path
                      d={`M200,${Math.max(180, shown.length * 66) / 2} C255,${
                        Math.max(180, shown.length * 66) / 2
                      } 270,${y} 335,${y}`}
                      fill="none"
                      stroke="currentColor"
                      markerStart={
                        incoming ? "url(#pg-source-arrow)" : undefined
                      }
                      markerEnd={outgoing ? "url(#pg-source-arrow)" : undefined}
                    />
                    <g
                      role="button"
                      aria-label={t("project_graph.explore_record", { name: n?.label ?? id })}
                      tabIndex={0}
                      onClick={() => navigate(id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(id);
                        }
                      }}
                      className="pg-source-graph-node"
                    >
                      <rect x="340" y={y - 23} width="292" height="48" rx="5" />
                      <text x="350" y={y - 2}>
                        {(n?.label ?? id).slice(0, 39)}
                      </text>
                      <text
                        x="350"
                        y={y + 15}
                        className="pg-source-graph-caption"
                      >
                        {n
                          ? `${related.length} ${
                              related.length === 1
                              ? t("project_graph.connection")
                              : t("project_graph.connections")
                            }`
                          : t("project_graph.unresolved_try_loading_source")}
                      </text>
                      <title>{n?.label ?? id}</title>
                    </g>
                  </g>
                );
              })}
            </svg>
          ) : (
            <p>
              {t("project_graph.no_connections_available")}
            </p>
          )}
          {shown.length < neighbors.length && (
            <button
              onClick={() => setLimit((v) => Math.min(v + 12, 60))}
              disabled={limit >= 60}
            >
              {limit >= 60
                ? t("project_graph.neighbor_display_limit")
                : t("project_graph.show_more_neighbors", { count: 12 })}
            </button>
          )}
          <ul>
            {links
              .filter((e) =>
                shown.includes(
                  e.sourceId === record.id ? e.targetId : e.sourceId
                )
              )
              .slice(0, 120)
              .map((e) => (
                <li key={e.id}>
                  <strong>{e.type}</strong>:{" "}
                  {model.nodeById.get(e.sourceId)?.label ?? e.sourceId} →{" "}
                  {model.nodeById.get(e.targetId)?.label ?? e.targetId}
                  <br />
                  <small>
                    {e.provenance?.kind ?? "unknown"} —{" "}
                    {e.provenance?.basis ??
                      t("project_graph.relationship_basis_undeclared")}
                  </small>
                </li>
              ))}
          </ul>
          {links.filter((e) =>
            shown.includes(e.sourceId === record.id ? e.targetId : e.sourceId)
          ).length > 120 && (
            <p>
            {t("project_graph.relationship_details_limit", { count: 120 })}
            </p>
          )}
        </>
      )}
    </section>
  );
}
