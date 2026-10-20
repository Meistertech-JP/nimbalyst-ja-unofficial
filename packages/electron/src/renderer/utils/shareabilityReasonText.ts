import type { TFunction } from 'i18next';
import type { CollaborativeShareabilityReasonMetadata } from '../services/CollaborativeDocumentTypeCatalog';

export function getShareabilityReasonText(
  t: TFunction,
  reason: CollaborativeShareabilityReasonMetadata,
): string {
  switch (reason.code) {
    case 'no_registered_type':
      return t('files:shareability.no_registered_type', reason.params);
    case 'no_editor_owner':
      return t('files:shareability.no_editor_owner', reason.params);
    case 'metadata_unavailable': {
      const { documentType, editorId, suffix } = reason.params;
      if (editorId && suffix) {
        return t('files:shareability.metadata_unavailable_for_editor_suffix', {
          documentType,
          editorId,
          suffix,
        });
      }
      if (editorId) {
        return t('files:shareability.metadata_unavailable_for_editor', {
          documentType,
          editorId,
        });
      }
      if (suffix) {
        return t('files:shareability.metadata_unavailable_for_suffix', {
          documentType,
          suffix,
        });
      }
      return t('files:shareability.metadata_unavailable', { documentType });
    }
    case 'conflicting_editors':
      return t('files:shareability.conflicting_editors', reason.params);
    case 'conflicting_codecs_for_editor':
      return t('files:shareability.conflicting_codecs_for_editor', reason.params);
    case 'conflicting_codecs_for_suffix':
      return t('files:shareability.conflicting_codecs_for_suffix', reason.params);
    case 'missing_custom_editor':
      return t('files:shareability.missing_custom_editor', {
        ...reason.params,
        extension: reason.params.extension ?? t('files:shareability.unknown_extension'),
      });
    case 'missing_editor_component':
      return t('files:shareability.missing_editor_component', {
        ...reason.params,
        extension: reason.params.extension ?? t('files:shareability.unknown_extension'),
        component: reason.params.component ?? t('files:shareability.unknown_component'),
      });
    case 'missing_collab_binding':
      return t('files:shareability.missing_collab_binding', {
        ...reason.params,
        extension: reason.params.extension ?? t('files:shareability.unknown_extension'),
      });
    case 'monaco_binding_unavailable':
      return t('files:shareability.monaco_binding_unavailable', reason.params);
    case 'no_collab_editor':
      return t('files:shareability.no_collab_editor', reason.params);
    case 'no_collab_codec':
      return t('files:shareability.no_collab_codec', reason.params);
    case 'codec_suffix_unsupported':
      return t('files:shareability.codec_suffix_unsupported', reason.params);
    case 'codec_seed_export_missing':
      return t('files:shareability.codec_seed_export_missing', reason.params);
  }
}
