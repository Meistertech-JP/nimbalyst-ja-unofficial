/**
 * Data Model Toolbar
 *
 * Toolbar component with view mode selector, add entity button, export dropdown, and stats display.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import { LayoutControls } from '../layout/LayoutControls';
import { MaterialSymbol, copyToClipboard } from '@nimbalyst/extension-sdk';
import type { DataModelStoreApi } from '../store';
import type { EntityViewMode } from '../types';
import { exportSchema, getAvailableFormats, type ExportFormat } from '../export-service';
import type { EditorHost } from '@nimbalyst/extension-sdk';

interface DataModelToolbarProps {
  store: DataModelStoreApi;
  onScreenshot?: () => void;
  isCapturing?: boolean;
  host?: EditorHost;
}

const VIEW_MODES: { value: EntityViewMode }[] = [
  { value: 'compact' },
  { value: 'standard' },
  { value: 'full' },
];

export function DataModelToolbar({ store, onScreenshot, isCapturing, host }: DataModelToolbarProps) {
  const { t } = useTranslation('extensions');
  const state = store.getState();
  const { entities, relationships, entityViewMode, database } = state;

  // Export state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('sql');
  const [exportedCode, setExportedCode] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleAddEntity = () => {
    // Find a position that doesn't overlap with existing entities
    const positions = entities.map((e) => e.position);
    let x = 100;
    let y = 100;

    // Simple grid-based positioning
    const gridSize = 300;
    const cols = 4;
    const existingPositions = new Set(positions.map((p) => `${Math.round(p.x / gridSize)},${Math.round(p.y / gridSize)}`));

    for (let i = 0; i < 100; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const key = `${col},${row}`;
      if (!existingPositions.has(key)) {
        x = col * gridSize + 100;
        y = row * gridSize + 100;
        break;
      }
    }

    store.getState().addEntity({
      name: `Entity${entities.length + 1}`,
      fields: [
        {
          id: `field-${Date.now()}`,
          name: 'id',
          dataType: 'uuid',
          isPrimaryKey: true,
          isNullable: false,
        },
      ],
      position: { x, y },
    });
  };

  const handleViewModeChange = (mode: EntityViewMode) => {
    store.getState().setEntityViewMode(mode);
  };

  // Export handlers
  const handleExportFormatSelect = useCallback((format: ExportFormat) => {
    setExportFormat(format);

    const code = exportSchema({
      database,
      format,
      entities,
      relationships,
    });

    setExportedCode(code);
    setShowExportDialog(true);
  }, [database, entities, relationships]);

  const handleExportFormatChange = (format: ExportFormat) => {
    setExportFormat(format);

    const code = exportSchema({
      database,
      format,
      entities,
      relationships,
    });

    setExportedCode(code);
  };

  const handleCopyExport = async () => {
    try {
      await copyToClipboard(exportedCode);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownloadExport = () => {
    const blob = new Blob([exportedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    // Determine file extension based on format
    let extension = 'txt';
    switch (exportFormat) {
      case 'sql':
        extension = 'sql';
        break;
      case 'json-schema':
      case 'json':
        extension = 'json';
        break;
      case 'dbml':
        extension = 'dbml';
        break;
      case 'mongoose':
        extension = 'ts';
        break;
      case 'mongodb-indexes':
        extension = 'js';
        break;
    }

    a.href = url;
    a.download = `schema.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const availableFormats = getAvailableFormats(database);

  return (
    <>
      <div className="datamodel-toolbar">
        <div className="datamodel-toolbar-left">
          <button
            className="datamodel-toolbar-button datamodel-toolbar-button-primary"
            onClick={handleAddEntity}
          >
            + {t('datamodellm_ui.add_entity')}
          </button>
          <LayoutControls store={store} />
          <button
            className="datamodel-toolbar-button datamodel-toolbar-icon-button"
            onClick={onScreenshot}
            title={t('datamodellm_ui.capture_screenshot')}
            aria-label={t('datamodellm_ui.capture_screenshot')}
            disabled={!onScreenshot || isCapturing}
            aria-busy={isCapturing}
          >
            <MaterialSymbol icon="photo_camera" size={18} />
          </button>
        </div>

        <div className="datamodel-toolbar-center">
          <span className="datamodel-toolbar-label">{t('datamodellm_ui.view')}</span>
          <div className="datamodel-view-mode-group">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.value}
                className={`datamodel-view-mode-button ${entityViewMode === mode.value ? 'active' : ''}`}
                onClick={() => handleViewModeChange(mode.value)}
              >
                {t(`datamodellm_ui.${mode.value}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="datamodel-toolbar-right">
          <span className="datamodel-toolbar-stats">
            {t('datamodellm_ui.entity_count', { count: entities.length })} · {t('datamodellm_ui.relationship_count', { count: relationships.length })}
          </span>

          {/* Export dropdown */}
          <button
            className="datamodel-toolbar-button datamodel-toolbar-icon-button"
            onClick={() => handleExportFormatSelect(exportFormat)}
            disabled={entities.length === 0}
            title={t('datamodellm_ui.export_schema')}
          >
            <MaterialSymbol icon="download" size={18} />
          </button>

          {/* Source mode toggle */}
          {host?.supportsSourceMode && (
            <button
              className="datamodel-toolbar-button"
              onClick={() => host.toggleSourceMode?.()}
              title={t('datamodellm_ui.view_prisma_source')}
            >
              {t('datamodellm_ui.view_source')}
            </button>
          )}
        </div>
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="datamodel-export-overlay" onClick={() => setShowExportDialog(false)}>
          <div className="datamodel-export-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="datamodel-export-dialog-header">
              <h2>{t('datamodellm_ui.export_schema_title')}</h2>
              <button
                className="datamodel-export-dialog-close"
                onClick={() => setShowExportDialog(false)}
                aria-label={t('datamodellm_ui.close_export_dialog')}
              >
                <MaterialSymbol icon="close" size={20} />
              </button>
            </div>

            <div className="datamodel-export-dialog-format">
              <label>{t('datamodellm_ui.format')}</label>
              <select
                value={exportFormat}
                onChange={(e) => handleExportFormatChange(e.target.value as ExportFormat)}
              >
                {availableFormats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="datamodel-export-dialog-content">
              <div className="datamodel-export-dialog-content-header">
                <label>{t('datamodellm_ui.generated_code')}</label>
                <div className="datamodel-export-dialog-actions">
                  <button
                    className="datamodel-export-dialog-action"
                    onClick={handleCopyExport}
                  >
                    <MaterialSymbol icon={copyFeedback ? 'check' : 'content_copy'} size={16} />
                    {copyFeedback ? t('datamodellm_ui.copied') : t('datamodellm_ui.copy')}
                  </button>
                  <button
                    className="datamodel-export-dialog-action"
                    onClick={handleDownloadExport}
                  >
                    <MaterialSymbol icon="download" size={16} />
                    {t('datamodellm_ui.download')}
                  </button>
                </div>
              </div>
              <pre className="datamodel-export-dialog-code">{exportedCode}</pre>
            </div>

            <div className="datamodel-export-dialog-footer">
              <button
                className="datamodel-export-dialog-button"
                onClick={() => setShowExportDialog(false)}
              >
                {t('datamodellm_ui.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
