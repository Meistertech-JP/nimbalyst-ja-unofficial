import i18next from 'i18next';
import { describe, expect, it } from 'vitest';
import { getSharedDocumentTypeDisplayLabel, resolveSharedDocumentTypePresentation } from '../sharedDocumentTypeMetadata';
import type { CollaborativeDocumentTypeCatalog, CollaborativeDocumentTypeDescriptor } from '../../services/CollaborativeDocumentTypeCatalog';

function catalogWith(descriptor?: Partial<CollaborativeDocumentTypeDescriptor>, available = true): CollaborativeDocumentTypeCatalog {
  return { resolveMetadata: () => ({ state: descriptor && available ? 'ready' : 'unsupported', descriptor, reason: 'Raw codec diagnostic' }) } as unknown as CollaborativeDocumentTypeCatalog;
}

const document = { title: 'User file.custom', documentType: 'user-type', metadataVersion: 2 as const, fileExtension: '.custom', editorId: 'com.example.custom' };

describe('shared document type display labels', () => {
  it.each([
    { decryptFailed: true, stable: 'Locked document', japanese: 'ロックされたドキュメント' },
    { decryptFailed: false, stable: 'Unsupported document', japanese: '未対応のドキュメント' },
  ])('translates $stable only at the display boundary', ({ decryptFailed, stable, japanese }) => {
    const presentation = resolveSharedDocumentTypePresentation({ ...document, decryptFailed }, catalogWith());
    expect(getSharedDocumentTypeDisplayLabel(presentation, i18next.getFixedT('ja'))).toBe(japanese);
    expect(getSharedDocumentTypeDisplayLabel(presentation, i18next.getFixedT('en'))).toBe(stable);
    expect(presentation.typeLabel).toBe(stable);
    expect(presentation.metadata).toEqual({ metadataVersion: 2, fileExtension: '.custom', editorId: 'com.example.custom', source: 'v2' });
    expect(presentation.icon).toBe('lock');
  });

  it.each([true, false])('preserves extension-provided labels even when they match a built-in fallback (available: %s)', (available) => {
    const presentation = resolveSharedDocumentTypePresentation(document, catalogWith({ displayName: 'Unsupported document', icon: 'extension' }, available));
    expect(getSharedDocumentTypeDisplayLabel(presentation, i18next.getFixedT('ja'))).toBe('Unsupported document');
    expect(presentation.displayLabelKey).toBeUndefined();
    expect(presentation.typeLabel).toBe('Unsupported document');
  });
});
