import React from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import { HeaderIconButton } from '@nimbalyst/collab-client/docs-ui/EditorHeaderBar';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import { usePageInfoPanelOpen } from './pageInfoPanelState';

/** The header button that opens and closes Page info. */
export function PageInfoToggleButton() {
  const { t } = useTranslation('editor');
  const [open, setOpen] = usePageInfoPanelOpen();
  return (
    <HeaderIconButton label={t('page_info.title')} active={open} onClick={() => setOpen(!open)} testId="editor-header-page-info">
      <MaterialSymbol icon="info" size={16} />
    </HeaderIconButton>
  );
}
