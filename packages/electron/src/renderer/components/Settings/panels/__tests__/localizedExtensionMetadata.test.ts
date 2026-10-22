import { describe, expect, it } from 'vitest';
import { getLocalizedExtensionMetadata } from '../localizedExtensionMetadata';

describe('getLocalizedExtensionMetadata', () => {
  it('uses localized metadata for the built-in RTL support extension', () => {
    const metadata = getLocalizedExtensionMetadata(
      'com.nimbalyst.rtl-support',
      { name: 'RTL Support', description: 'English manifest description' },
      (key) => ({
        'rtl_support.extension_name': 'RTLサポート',
        'rtl_support.extension_description': '右から左に書くテキストを自動検出します。',
      })[key] ?? key,
    );

    expect(metadata).toEqual({
      name: 'RTLサポート',
      description: '右から左に書くテキストを自動検出します。',
    });
  });

  it('preserves manifest metadata for other extensions', () => {
    const metadata = getLocalizedExtensionMetadata(
      'com.example.extension',
      { name: 'Example Extension', description: 'Example description' },
      (key) => key,
    );

    expect(metadata).toEqual({ name: 'Example Extension', description: 'Example description' });
  });
});
