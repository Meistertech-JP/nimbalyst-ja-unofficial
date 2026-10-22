import type { ExtensionManifest } from '@nimbalyst/runtime';

const RTL_SUPPORT_EXTENSION_ID = 'com.nimbalyst.rtl-support';

type Translate = (key: string) => string;

export function getLocalizedExtensionMetadata(
  extensionId: string,
  manifest: Pick<ExtensionManifest, 'name' | 'description'>,
  t: Translate,
): Pick<ExtensionManifest, 'name' | 'description'> {
  if (extensionId === RTL_SUPPORT_EXTENSION_ID) {
    return {
      name: t('rtl_support.extension_name'),
      description: t('rtl_support.extension_description'),
    };
  }

  return { name: manifest.name, description: manifest.description };
}
