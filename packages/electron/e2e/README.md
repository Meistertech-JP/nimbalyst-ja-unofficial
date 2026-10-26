# E2E Test Suite

## Directory Structure

- **`core/`** - Critical smoke tests (app launch, files, editing, saving)
- **`editors/`**, **`files/`** - Editor and file-operation scenarios
- **`ai/`** - AI provider integration (Claude Code CLI)
- **`backup/`** - Old test backups

## Test Helpers (`helpers.ts`)

Central configuration and utilities:

- **`TEST_TIMEOUTS`** - Centralized timeout values in `helpers.ts`. Import the constants rather than copying timeout values from documentation.

- **`launchElectronApp(options)`** - Launch app with workspace
- **`createTempWorkspace()`** - Create temp test workspace
- **`waitForAppReady(page)`** - Wait for app to fully load
- **`waitForEditor(page)`** - Wait for editor component
- **`getKeyboardShortcut(key)`** - Cross-platform shortcuts

## Running Tests

From `packages/electron`, run one spec per invocation:

```bash
pnpm exec playwright test e2e/i18n.spec.ts

# The same single spec with Playwright UI
pnpm exec playwright test e2e/i18n.spec.ts --ui
```

Do not run Electron E2E invocations in parallel. Check the isolated profile and development-server prerequisites in the [E2E guide](../../../docs/E2E_TESTING.md) before launching.

## Test Rules

1. **Never remove failing tests** - Fix them
2. **Never skip/disable tests** - Fix the underlying issue
3. **Use centralized timeouts** - Import from `TEST_TIMEOUTS`
4. **Core tests must pass** - These protect basic functionality
5. **AI tests may fail** - External dependencies (skip if unavailable)
