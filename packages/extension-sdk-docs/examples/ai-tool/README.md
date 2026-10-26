# Word Stats Extension Example

An AI-tool-only extension that adds text analysis capabilities without a custom editor.

## What It Does

Provides three AI tools that Claude can use to analyze text documents:

- **wordstats.count** - Word, character, sentence, and paragraph counts
- **wordstats.frequency** - Most frequently used words
- **wordstats.readability** - Flesch-Kincaid grade level and reading ease

## Structure

```
ai-tool/
  manifest.json      # Extension metadata (no customEditors)
  package.json       # Dependencies
  tsconfig.json      # TypeScript config
  vite.config.ts     # Build config
  src/
    index.ts         # Tools and lifecycle hooks
```

## Key Differences from Custom Editor

1. **No React dependency** - Pure TypeScript
2. **Empty components export** - `export const components = {}`
3. **No UI** - Tools work on any open text file
4. **Simpler permissions** - Only `ai: true` needed

## Usage

1. In this monorepo, install dependencies from the repository root with `pnpm install`.
2. Build the SDK with `pnpm --filter @nimbalyst/extension-sdk run build`, then the example with `pnpm --filter word-stats-extension run build`, from that root. Install the example through the extension development tools using its folder path.
3. Open any text or markdown file
4. Ask Claude:
   - "How many words are in this document?"
   - "What are the most common words?"
   - "What's the reading level of this text?"

The checked-in package uses `@nimbalyst/extension-sdk: workspace:*`. A standalone copy outside the monorepo must replace that dependency with a compatible published SDK version or an explicit local `file:` dependency before installing and building. Do not run `npm install` against the unchanged workspace dependency outside this repository. See the [getting started guide](../../getting-started.md).

## Example Tool Response

```json
{
  "words": 1234,
  "characters": 6543,
  "sentences": 89,
  "paragraphs": 12,
  "filePath": "/path/to/document.md"
}
```

## Customizing

To add your own analysis tools:

1. Add the tool name to `manifest.json` contributions
2. Define the tool in the `aiTools` array
3. Implement the handler with your analysis logic

### Tool Template

```typescript
{
  name: 'myext.my_tool',
  description: 'What this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      // Define parameters here
    },
  },
  handler: async (args, context) => {
    if (!context.activeFilePath) {
      return { success: false, error: 'No active file is open' };
    }

    const content = await context.extensionContext.services.filesystem.readFile(
      context.activeFilePath
    );

    // Your analysis logic here using content

    return {
      success: true,
      data: {
        // Results for Claude
      },
    };
  },
}
```
