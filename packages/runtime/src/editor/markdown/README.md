# Markdown Transformer Architecture

## Overview

The markdown system combines core transformers with transformers contributed by enabled editor extensions.

## Structure

### Core Transformers (`core-transformers.ts`)
These transformers are always included and handle standard markdown syntax:
- **Horizontal Rules** (`---`, `***`, `___`)
- **Headings** (via Lexical's ELEMENT_TRANSFORMERS)
- **Lists** (ordered and unordered)
- **Blockquotes**
- **Code blocks** and inline code
- **Text formatting** (bold, italic, strikethrough)
- **Links** (standard markdown links)
- **Check lists** (`- [ ]` and `- [x]`)

### Plugin Transformers
These transformers require specific plugins to be loaded:
- **TABLE_TRANSFORMER** - Markdown tables (requires TablePlugin)
- **IMAGE_TRANSFORMER** - Image syntax (requires ImagesPlugin)
- **EMOJI_TRANSFORMER** - `:emoji:` syntax (requires EmojisPlugin)
- **COLLAPSIBLE_TRANSFORMER** - Collapsible sections (requires CollapsiblePlugin)
- **ExcalidrawTransform** - Diagrams (requires ExcalidrawPlugin)

## Supported entry points

All Nimbalyst code converts between markdown and Lexical state through the
**Enhanced** wrappers; do not call `$convertFromMarkdownString` /
`$convertToMarkdownString` from `@lexical/markdown` directly. The wrappers
extract YAML frontmatter, normalize 2-/3-/4-space list indents to a consistent
target before import, encode literal `*`/`_` as HTML numeric character
references on export so upstream's CommonMark importer can re-import them
losslessly, and collapse upstream's TabNodes back to plain `\t` text so the
diff plugin's tree matcher does not have to know about TabNodes.

```ts
import {
  $convertFromEnhancedMarkdownString,
  $convertToEnhancedMarkdownString,
  $convertNodeToEnhancedMarkdownString,
  $convertSelectionToEnhancedMarkdownString,
  getEditorTransformers,
} from '@nimbalyst/runtime/editor';

// Full-document import (frontmatter + normalization)
$convertFromEnhancedMarkdownString(content, getEditorTransformers());

// Full-document export (frontmatter, NCR encoding, diff-aware traversal)
$convertToEnhancedMarkdownString(getEditorTransformers(), {
  shouldPreserveNewLines: true,
});

// Single-node export (e.g. for diff matching, tracker cells)
$convertNodeToEnhancedMarkdownString(getEditorTransformers(), node, true);

// Selection export (e.g. clipboard / "send selection to AI")
$convertSelectionToEnhancedMarkdownString(getEditorTransformers(), selection, true);
```

The electron renderer enforces this with an eslint rule
(`no-restricted-imports` in `packages/electron/eslint.config.mjs`) that blocks
named imports of `$convertFromMarkdownString` and `$convertToMarkdownString`
from `@lexical/markdown`. Streaming AI imports go through
`MarkdownStreamProcessor` which is already a thin wrapper over the same entry
points.

For the deeper rationale (why the `&#42;` encoding is needed, what stays
forked, and what to re-audit on each upstream bump) see
[`FORKED_MARKDOWN_IMPORT.md`](./FORKED_MARKDOWN_IMPORT.md).

## Extension-Based Transformer Collection

Extensions publish their `markdownTransformers` through `setExtensionContributions` in `../extensions/extensionContributionsStore.ts`. `getEditorTransformers()` reads `getAllExtensionTransformers()` and puts the extension transformers before `CORE_TRANSFORMERS`. There is no exported `PLUGIN_TRANSFORMERS` list to edit in `markdown/index.ts`.

For an explicitly selected transformer set outside the main editor, the existing `createTransformers(pluginTransformers)` helper combines that array with the core transformers. This helper does not load or register an extension by itself. See the [editor-extension guide](../extensions/README.md) for registration and editor composition.

## Adding New Transformers

### For Core Markdown Features
Add to `core-transformers.ts` if the feature is:
- Part of standard markdown spec
- Essential for basic editing
- Doesn't require a plugin

### For Plugin Features
1. Create transformer in the plugin directory: `plugins/[PluginName]/[Name]Transformer.ts`
2. Export from plugin's index file
3. Publish its transformer through the owning extension's `setExtensionContributions` call
4. Include the owning extension in the editor's extension graph or renderer extension bridge, as described in the editor-extension guide

## Transformer Order

Order matters! More specific transformers should come before general ones:
1. Plugin transformers (more specific)
2. Core transformers (general markdown)

This ensures plugin-specific syntax takes precedence over generic markdown patterns.
