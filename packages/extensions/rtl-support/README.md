# RTL Support — Nimbalyst Extension

> Automatic Right-to-Left (RTL) text direction detection for agent transcripts, user prompts, and markdown content.
> **Resolves [issue #237](https://github.com/nimbalyst/nimbalyst/issues/237).**

## What it does

When prompting agents in RTL languages (Persian, Arabic, Hebrew, etc.), responses were rendered left-to-right, hurting readability. This extension solves it automatically:

- 🎯 **Automatic detection** of dominant text direction per block
- 🔀 **Per-block** — mixed messages (e.g. Persian text + English code) handled correctly
- 🛡️ **Code blocks protected** — always stay LTR
- ⌨️ **Input fields** — RTL applied to user input as they type
- 🔤 **Inline detection** (optional) — isolates RTL runs within LTR paragraphs
- ⚙️ **Settings panel** — configure without editing JSON
- 🎹 **Keyboard shortcut** — `Ctrl+Shift+R` / `Cmd+Shift+R` to toggle
- 🌐 Supports: Persian, Arabic, Hebrew, Syriac, Thaana, NKo, and more

## Architecture (official Nimbalyst APIs)

| Component | Role |
|-----------|------|
| `detection.ts` | Unicode RTL-range detection algorithm (configurable threshold) |
| `rehypeRtlDetect.ts` | rehype plugin (fallback for standard react-markdown) |
| `RtlTranscriptHost.tsx` | hostComponent — registers the transcript rehype contribution |
| `inputRtl.ts` | Applies RTL to user input fields (textarea, contenteditable) |
| `RtlSettingsPanel.tsx` | Settings UI panel inside Nimbalyst Settings |
| `settings.ts` + `index.ts` | Settings management + activate/deactivate + runtime API |

**Key technical insight:** Direction is applied in the rehype tree and forwarded through Nimbalyst's styled markdown components. This preserves the host's typography, spacing, and table layout while adding `dir` and RTL classes to the rendered DOM.

## Installation

```bash
cd packages/extensions/rtl-support
pnpm install
pnpm run build
```

Then copy the folder to the running application's `userData/extensions` directory. Do not install this edition's extension into the official application's profile. A custom `NIMBALYST_USER_DATA_DIR` changes the profile root.

| OS | Path |
|----|------|
| Windows — unofficial Japanese edition | `%APPDATA%\Nimbalyst 日本語版（非公式）\extensions\` |
| macOS — upstream development profile example | `~/Library/Application Support/@nimbalyst/electron/extensions/` |
| Linux — upstream development profile example | `~/.config/@nimbalyst/electron/extensions/` |

The macOS/Linux paths are inherited upstream examples, not verified release locations for this Windows edition. Confirm the active application's userData path first.

Restart Nimbalyst. See [INSTALL.md](./INSTALL.md) for detailed methods.

## Settings

Available via **Settings → RTL Support** panel, or configuration keys:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `true` | Master on/off |
| `mode` | `auto` \| `rtl` \| `ltr` | `auto` | Auto-detect or force direction |
| `threshold` | number (0..1) | `0.3` | Min RTL ratio for RTL detection |
| `perBlock` | boolean | `true` | Per-block vs per-message |
| `inputRtl` | boolean | `true` | Apply RTL to input fields |
| `inlineDetect` | boolean | `false` | Inline RTL isolation |
| `debug` | boolean | `false` | Console debug logging |

## Runtime API

After activation, an API is available on `globalThis.nimbalystRtlSupport`:

```typescript
window.nimbalystRtlSupport.toggle();
window.nimbalystRtlSupport.updateSettings({ threshold: 0.4 });
window.nimbalystRtlSupport.getSettings();
window.nimbalystRtlSupport.reset();
```

## Verification

Tested on live Nimbalyst: 93 RTL blocks, 88 table cells, 4 tables processed correctly. `direction: rtl` and `text-align: right` confirmed via `getComputedStyle`. 15 unit tests passing.

## Development

```bash
pnpm run build      # build
pnpm run typecheck  # type-check
# for fast iteration, use the extension_reload MCP tool:
# extension_reload(extensionId, path)
```

## License

MIT
