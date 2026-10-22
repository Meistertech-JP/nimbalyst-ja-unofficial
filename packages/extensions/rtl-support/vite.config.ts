import { defineConfig } from 'vite';
import { createExtensionConfig, mergeExtensionConfig } from '@nimbalyst/extension-sdk/vite';

const baseConfig = createExtensionConfig({
  entry: './src/index.ts',
});

export default defineConfig(mergeExtensionConfig(baseConfig, {
  build: {
    rollupOptions: {
      external: [...(baseConfig.build?.rollupOptions?.external ?? []), '@nimbalyst/i18n/react'],
    },
  },
}));
