import { useState } from "react";
import { useTranslation } from "@nimbalyst/i18n/react";
import type { ViewSettings, ViewLens } from "./viewSettings";
import { SOURCES, lensMatches } from "./viewSettings";
import type { ProjectIndexState } from "../indexing/projectIndex";
import type { AreaRule } from "./areaRegistry";
import { addAreaRule } from "./areaRegistry";
import type { ProjectGraphNode } from "../types";

export function UnderstandingSettings({
  value,
  onChange,
  index,
  registry,
  onRegistry,
  nodes,
  onClose,
}: {
  value: ViewSettings;
  onChange: (s: ViewSettings) => void;
  index: ProjectIndexState;
  registry: AreaRule[];
  onRegistry: (r: AreaRule[]) => void;
  nodes: ProjectGraphNode[];
  onClose: () => void;
}) {
  const { t } = useTranslation("extensions");
  const [draft, setDraft] = useState(value);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<"tag" | "path" | "anchor">("tag");
  const [rule, setRule] = useState("");
  const [lensName, setLensName] = useState("");
  const [anchorSearch, setAnchorSearch] = useState("");
  const types = [...new Set(nodes.map((n) => n.type))].sort();
  const anchors = nodes
    .filter((n) => n.label.toLowerCase().includes(anchorSearch.toLowerCase()))
    .slice(0, 40);
  const saveLens = () => {
    if (!lensName.trim()) return;
    const l: ViewLens = {
      id: `lens:${Date.now()}`,
      name: lensName.trim().slice(0, 80),
      mode: draft.mode,
      days: draft.days,
      areaId: draft.areaId,
      excludedTypes: draft.excludedTypes,
      compare: draft.compare,
    };
    const next = { ...draft, lenses: [...draft.lenses, l], lensId: l.id };
    setDraft(next);
    setLensName("");
  };
  return (
    <section
      className="pg-understanding-settings"
      aria-label={t("project_graph.project_view_settings")}
    >
      <header>
        <h2>{t("project_graph.project_view_settings")}</h2>
        <button onClick={onClose}>{t("project_graph.close_settings")}</button>
      </header>
      <div className="pg-settings-columns">
        <section>
          <h3>{t("project_graph.indexed_sources")}</h3>
          <p>
            {t("project_graph.indexed_sources_description")}
          </p>
          {SOURCES.map(({ id }) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={draft.sources[id] !== false}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    sources: { ...draft.sources, [id]: e.target.checked },
                  })
                }
              />
              {t(`project_graph.source_${id}`)}
            </label>
          ))}
          <label>
            <input
              type="checkbox"
              checked={draft.includeArchived}
              onChange={(e) =>
                setDraft({ ...draft, includeArchived: e.target.checked })
              }
            />
            {t("project_graph.include_archived_records")}
          </label>
          <label>
            {t("project_graph.event_history")} {" "}
            <select
              value={draft.historyDays ?? "all"}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  historyDays:
                    e.target.value === "all" ? null : Number(e.target.value),
                })
              }
            >
              <option value={90}>{t("project_graph.days", { count: 90 })}</option>
              <option value={365}>{t("project_graph.one_year")}</option>
              <option value="all">{t("project_graph.all_available")}</option>
            </select>
          </label>
          <details>
            <summary>{t("project_graph.advanced_loading")}</summary>
            <p>
              {t("project_graph.advanced_loading_description")}
            </p>
            <label>
              {t("project_graph.safety_limit_per_source")} {" "}
              <select
                value={draft.safetyLimit ?? "none"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    safetyLimit:
                      e.target.value === "none" ? null : Number(e.target.value),
                  })
                }
              >
                <option value="none">{t("project_graph.no_record_limit")}</option>
                <option value={10000}>10,000</option>
                <option value={50000}>50,000</option>
                <option value={100000}>100,000</option>
              </select>
            </label>
            <ul>
              {SOURCES.map(({ id }) => (
                <li key={id}>
                  {t("project_graph.source_timing", {
                    source: t(`project_graph.source_${id}`),
                    totalMs: Math.round(index.timings[id]?.totalMs ?? 0),
                    pages: index.timings[id]?.pages ?? 0,
                    slowestMs: Math.round(index.timings[id]?.slowestPageMs ?? 0),
                  })}
                </li>
              ))}
            </ul>
          </details>
        </section>
        <section>
          <h3>{t("project_graph.view_filters_saved_lenses")}</h3>
          <p>
            {t("project_graph.view_filters_description")}
          </p>
          <div className="pg-settings-type-list">
            {types.map((type) => (
              <label key={type}>
                <input
                  type="checkbox"
                  checked={!draft.excludedTypes.includes(type)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      excludedTypes: e.target.checked
                        ? draft.excludedTypes.filter((t) => t !== type)
                        : [...draft.excludedTypes, type],
                    })
                  }
                />
                {type}
              </label>
            ))}
          </div>
          <label>
            {t("project_graph.lens_name")} {" "}
            <input
              value={lensName}
              onChange={(e) => setLensName(e.target.value)}
              placeholder={t("project_graph.lens_name_placeholder")}
            />
          </label>
          <button
            disabled={!lensName.trim() || draft.lenses.length >= 30}
            onClick={saveLens}
          >
            {t("project_graph.save_current_lens")}
          </button>
          <ul>
            {draft.lenses.map((l) => (
              <li key={l.id}>
                {l.name}
                {lensMatches(draft, l) ? ` · ${t("project_graph.current")}` : ""}{" "}
                <button
                  aria-label={t("project_graph.remove_lens", { name: l.name })}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      lenses: draft.lenses.filter((x) => x.id !== l.id),
                      lensId: draft.lensId === l.id ? null : draft.lensId,
                    })
                  }
                >
                  {t("project_graph.remove")}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>{t("project_graph.stable_areas")}</h3>
          <p>
            {t("project_graph.stable_areas_description")}
          </p>
          <ul className="pg-area-rule-list">
            {registry.map((r) => (
              <li key={r.id}>
                <label>
                  <input
                    aria-label={t("project_graph.show_area", { name: r.label })}
                    type="checkbox"
                    disabled={r.id === "unassigned"}
                    checked={!r.hidden}
                    onChange={(e) =>
                      onRegistry(
                        registry.map((x) =>
                          x.id === r.id
                            ? { ...x, hidden: !e.target.checked }
                            : x
                        )
                      )
                    }
                  />
                  <input
                    aria-label={t("project_graph.area_name", { name: r.label })}
                    value={r.label}
                    onChange={(e) =>
                      onRegistry(
                        registry.map((x) =>
                          x.id === r.id ? { ...x, label: e.target.value } : x
                        )
                      )
                    }
                  />
                </label>
                <small>
                  {[
                    ...(r.tags ?? []).map((tag) => t("project_graph.tag_rule", { tag })),
                    ...(r.paths ?? []).map((path) => t("project_graph.path_rule", { path })),
                    ...(r.anchorIds ?? []).map(
                      (id) => nodes.find((n) => n.id === id)?.label ?? id
                    ),
                  ].join(" · ") || t("project_graph.outside_configured_areas")}
                </small>
                {r.id !== "unassigned" && (
                  <details>
                    <summary>{t("project_graph.edit_membership_rules")}</summary>
                    <label>
                      {t('project_graph.tags_comma_separated')}
                      <input
                        defaultValue={r.tags?.join(", ") ?? ""}
                        onBlur={(e) =>
                          onRegistry(
                            registry.map((x) =>
                              x.id === r.id
                                ? {
                                    ...x,
                                    tags: e.target.value
                                      .split(",")
                                      .map((t) => t.trim().toLowerCase())
                                      .filter(Boolean),
                                  }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                    <label>
                      {t('project_graph.paths_comma_separated')}
                      <input
                        defaultValue={r.paths?.join(", ") ?? ""}
                        onBlur={(e) =>
                          onRegistry(
                            registry.map((x) =>
                              x.id === r.id
                                ? {
                                    ...x,
                                    paths: e.target.value
                                      .split(",")
                                      .map((t) => t.trim().replace(/\/+$/, ""))
                                      .filter(Boolean),
                                  }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                    {r.anchorIds?.map((id) => (
                      <button
                        key={id}
                        onClick={() =>
                          onRegistry(
                            registry.map((x) =>
                              x.id === r.id
                                ? {
                                    ...x,
                                    anchorIds: x.anchorIds?.filter(
                                      (a) => a !== id
                                    ),
                                  }
                                : x
                            )
                          )
                        }
                      >
                        {t("project_graph.remove_anchor", {
                          name: nodes.find((n) => n.id === id)?.label ?? id,
                        })}
                      </button>
                    ))}
                  </details>
                )}
              </li>
            ))}
          </ul>
          <label>
            {t("project_graph.new_area_name")} {" "}
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label>
            {t("project_graph.membership_rule")} {" "}
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as typeof kind);
                setRule("");
              }}
            >
              <option value="tag">{t("project_graph.topic_tag")}</option>
              <option value="path">{t("project_graph.path_prefix")}</option>
              <option value="anchor">{t("project_graph.record_and_neighbors")}</option>
            </select>
          </label>
          {kind === "anchor" ? (
            <>
              <label>
                {t("project_graph.find_anchor")} {" "}
                <input
                  value={anchorSearch}
                  onChange={(e) => setAnchorSearch(e.target.value)}
                />
              </label>
              <label>
                {t("project_graph.anchor_record")} {" "}
                <select value={rule} onChange={(e) => setRule(e.target.value)}>
                  <option value="">{t("project_graph.select_record")}</option>
                  {anchors.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label} · {n.type}
                    </option>
                  ))}
                </select>
              </label>
              <small>
                {t("project_graph.showing_matching_records")}
              </small>
            </>
          ) : (
            <label>
              {kind === "tag" ? t("project_graph.topic_tag") : t("project_graph.path_prefix")}
              <input value={rule} onChange={(e) => setRule(e.target.value)} />
            </label>
          )}
          <button
            disabled={!label.trim() || !rule.trim() || registry.length >= 200}
            onClick={() => {
              onRegistry(
                addAreaRule(registry, {
                  id: `area:${Date.now()}`,
                  label: label.trim().slice(0, 80),
                  ...(kind === "tag"
                    ? { tags: [rule.trim().toLowerCase()] }
                    : kind === "path"
                    ? { paths: [rule.trim().replace(/\/+$/, "")] }
                    : { anchorIds: [rule] }),
                })
              );
              setLabel("");
              setRule("");
            }}
          >
            {t("project_graph.add_area")}
          </button>
          <p>
            {t("project_graph.area_edits_save_immediately")}
          </p>
        </section>
      </div>
      <footer>
        <button
          onClick={() => {
            onChange(draft);
            onClose();
          }}
        >
          {t("project_graph.apply_settings")}
        </button>
        <span>
          {t("project_graph.settings_refresh_note")}
        </span>
      </footer>
    </section>
  );
}
