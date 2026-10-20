import { useState, useEffect } from 'react';
import { useRuntimeTranslation } from '../../../ui/RuntimeTranslation';

export interface BoardConfig {
  entityTypeId?: string;
  entityTypeName?: string;
  statusPropertyId?: string;
  statusPropertyName?: string;
  filter?: string;
  visibleFields?: {
    owner: boolean;
    dueDate: boolean;
    priority: boolean;
    description: boolean;
  };
}

interface BoardConfigDialogProps {
  visible: boolean;
  onHide: () => void;
  onSelect: (config: BoardConfig) => void;
  initialConfig?: BoardConfig;
}

export function BoardConfigDialog({ visible, onHide, onSelect, initialConfig }: BoardConfigDialogProps) {
  const { t } = useRuntimeTranslation();
  const [visibleFields, setVisibleFields] = useState({
    owner: initialConfig?.visibleFields?.owner ?? true,
    dueDate: initialConfig?.visibleFields?.dueDate ?? true,
    priority: initialConfig?.visibleFields?.priority ?? true,
    description: initialConfig?.visibleFields?.description ?? false,
  });

  // Update state when dialog reopens with different initial config
  useEffect(() => {
    if (visible) {
      setVisibleFields({
        owner: initialConfig?.visibleFields?.owner ?? true,
        dueDate: initialConfig?.visibleFields?.dueDate ?? true,
        priority: initialConfig?.visibleFields?.priority ?? true,
        description: initialConfig?.visibleFields?.description ?? false,
      });
    }
  }, [visible, initialConfig]);

  if (!visible) return null;

  const handleSave = () => {
    const config: BoardConfig = {
      ...initialConfig,
      visibleFields
    };
    onSelect(config);
    onHide();
  };

  const handleFieldToggle = (field: keyof typeof visibleFields) => {
    setVisibleFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="board-config-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div className="board-config-dialog bg-[var(--nim-bg-secondary)] p-6 rounded-lg min-w-[400px] max-w-[500px] shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
        <h3 className="board-config-title m-0 mb-5 text-lg font-semibold text-[var(--nim-text)]">{t('editor:kanban.configuration', 'Board Configuration')}</h3>

        <div className="board-config-section mb-5">
          <label className="board-config-label block mb-2 font-medium text-sm text-[var(--nim-text)]">
            {t('editor:kanban.visible_fields', 'Visible Card Fields:')}
          </label>

          <div className="board-config-fields flex flex-col gap-2">
            {[
              { key: 'owner', icon: 'person', label: t('tracker:columns.owner', 'Owner'), desc: t('editor:kanban.show_owner', 'Show card owner') },
              { key: 'dueDate', icon: 'calendar_today', label: t('tracker:columns.dueDate', 'Due Date'), desc: t('editor:kanban.show_due_dates', 'Show due dates') },
              { key: 'priority', icon: 'priority_high', label: t('tracker:columns.priority', 'Priority'), desc: t('editor:kanban.show_priority', 'Show priority indicators') },
              { key: 'description', icon: 'description', label: t('aichat:tracker_tool.description', 'Description'), desc: t('editor:kanban.show_description', 'Show description field') }
            ].map(({ key, icon, label, desc }) => (
              <label
                key={key}
                className={`board-config-field-option flex items-center gap-2 p-2 cursor-pointer rounded transition-colors ${
                  visibleFields[key as keyof typeof visibleFields]
                    ? 'bg-[var(--nim-bg-active)]'
                    : 'bg-transparent hover:bg-[var(--nim-bg-hover)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={visibleFields[key as keyof typeof visibleFields]}
                  onChange={() => handleFieldToggle(key as keyof typeof visibleFields)}
                  className="board-config-field-checkbox m-0 cursor-pointer"
                />
                <div className="board-config-field-info flex-1">
                  <div className="board-config-field-label text-sm font-medium text-[var(--nim-text)] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg text-[var(--nim-text-muted)]">{icon}</span>
                    {label}
                  </div>
                  <div className="board-config-field-desc text-xs text-[var(--nim-text-muted)] mt-0.5">{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="board-config-actions mt-6 flex gap-3 justify-end border-t border-[var(--nim-border)] pt-4">
          <button
            onClick={onHide}
            className="board-config-button board-config-button-cancel py-2 px-4 rounded cursor-pointer text-sm transition-all font-inherit border border-[var(--nim-border)] bg-[var(--nim-bg-tertiary)] text-[var(--nim-text)] hover:bg-[var(--nim-bg-hover)]"
          >
            {t('common:cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            className="board-config-button board-config-button-save py-2 px-4 rounded cursor-pointer text-sm transition-all font-inherit border border-[var(--nim-primary)] bg-[var(--nim-primary)] text-white hover:bg-[var(--nim-primary-hover)]"
          >
            {t('editor:kanban.save_configuration', 'Save Configuration')}
          </button>
        </div>
      </div>
    </div>
  );
}
