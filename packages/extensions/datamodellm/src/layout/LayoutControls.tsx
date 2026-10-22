import { useStore } from 'zustand';
import { useTranslation } from '@nimbalyst/i18n/react';
import { MaterialSymbol } from '@nimbalyst/extension-sdk';
import type { DataModelStoreApi } from '../store';
import { layoutController } from './controller';
import type { Direction } from './geometry';
export function LayoutControls({ store }: { store: DataModelStoreApi }) {
  const { t } = useTranslation('extensions');
  const controller = layoutController(store);
  const { busy, direction, setDirection, run } = useStore(controller.state);
  return (
    <div className="datamodel-layout-controls">
      <button
        className="datamodel-toolbar-button datamodel-toolbar-icon-button"
        onClick={() => void run()}
        title={busy ? t('datamodellm_ui.auto_layout_busy') : t('datamodellm_ui.auto_layout')}
        aria-label={t('datamodellm_ui.auto_layout')}
        aria-busy={busy}
        disabled={busy || store.getState().entities.length === 0}
      >
        <MaterialSymbol
          icon={busy ? 'hourglass_empty' : 'grid_view'}
          size={18}
        />
      </button>
      <select
        className="datamodel-layout-direction datamodel-toolbar-button"
        aria-label={t('datamodellm_ui.layout_direction')}
        value={direction}
        disabled={busy}
        onChange={(event) => setDirection(event.target.value as Direction)}
      >
        <option value="automatic">{t('datamodellm_ui.automatic')}</option>
        <option value="horizontal">{t('datamodellm_ui.horizontal')}</option>
        <option value="vertical">{t('datamodellm_ui.vertical')}</option>
      </select>
    </div>
  );
}
