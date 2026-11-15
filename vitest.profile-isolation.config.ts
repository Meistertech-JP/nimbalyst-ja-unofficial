import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  environment: 'node',
  include: [
    'packages/electron/src/main/__tests__/bootstrapProfile.test.ts',
    'packages/electron/src/main/__tests__/profileBoundary.test.ts',
    'packages/electron/src/main/__tests__/instancePolicy.test.ts',
    'packages/electron/src/main/database/__tests__/pgliteProfileDeletion.test.ts',
    'packages/electron/src/main/database/__tests__/persistedProfileReferences.test.ts',
    'packages/electron/src/main/shellCommand/__tests__/launchTarget.test.ts',
  ],
  setupFiles: [], globalSetup: [],
} });
