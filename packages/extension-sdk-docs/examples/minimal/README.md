# Minimal Extension Example

This is the simplest possible Nimbalyst extension. It registers a custom editor for `.minimal` files.

## Structure

```
minimal/
  manifest.json      # Extension metadata
  package.json       # npm dependencies
  tsconfig.json      # TypeScript config
  vite.config.ts     # Build config
  src/
    index.ts         # Entry point
    MinimalEditor.tsx # Editor component
```

## Usage

1. In this monorepo, install dependencies from the repository root with `pnpm install`.
2. Build the SDK with `pnpm --filter @nimbalyst/extension-sdk run build`, then the example with `pnpm --filter minimal-extension run build`, from that root.
3. Install this example through the extension development tools using its folder path.
4. Create a `.minimal` file to test

The checked-in `package.json` uses `@nimbalyst/extension-sdk: workspace:*`. For a standalone copy outside this workspace, first replace that dependency with a compatible published SDK version or an explicit local `file:` dependency, then install and build in the copied folder. `npm install` cannot resolve the unchanged workspace dependency outside the monorepo. See the [getting started guide](../../getting-started.md).

## Key Concepts

### manifest.json

Defines what your extension contributes:
- `customEditors` - Maps file patterns to components
- `component` value must match an export in `components`

### index.ts

Entry point that exports:
- `components` - Object mapping names to React components
- `activate()` - Called when extension loads
- `deactivate()` - Called when extension unloads

### MinimalEditor.tsx

Custom editor component that:
- Receives `host` via `EditorHostProps`
- Calls `host.loadContent()` on mount
- Calls `host.setDirty(true)` when the user edits
- Saves through `host.onSaveRequested()` / `host.saveContent()`

## Customizing

To adapt this example:

1. Change `id` in manifest.json to your unique ID
2. Update `filePatterns` for your file type
3. Rename component and update manifest `component` field
4. Add your editor logic to the component
