import { useState } from "react";
import type { PanelHostProps } from "@nimbalyst/extension-sdk";
import { useTranslation } from "@nimbalyst/i18n/react";
import { ProjectGraphPanel } from "../components/ProjectGraphPanel";
import { PrototypeLab } from "./PrototypeLab";
import "./prototype-shell.css";

export function ProjectGraphExperience({ host }: PanelHostProps) {
  const { t } = useTranslation('extensions');
  const [legacy, setLegacy] = useState(false);
  const [visitedLegacy, setVisitedLegacy] = useState(false);
  return (
    <div className="pg-experience">
      <div className="pg-experience-switch">
      <strong>{t('project_graph.project_understanding')}</strong>
        <span>
          {legacy
            ? t('project_graph.advanced_legacy')
            : t('project_graph.views_list')}
        </span>
        <button
          aria-pressed={legacy}
          onClick={() => {
            setVisitedLegacy(true);
            setLegacy((v) => !v);
          }}
        >
          {legacy ? t('project_graph.return_to_views') : t('project_graph.advanced_action')}
        </button>
      </div>
      <div className="pg-experience-content">
        <div className="pg-experience-page" hidden={legacy}>
          <PrototypeLab host={host} />
        </div>
        {visitedLegacy && (
          <div className="pg-experience-page" hidden={!legacy}>
            <ProjectGraphPanel host={host} active={legacy} />
          </div>
        )}
      </div>
    </div>
  );
}
