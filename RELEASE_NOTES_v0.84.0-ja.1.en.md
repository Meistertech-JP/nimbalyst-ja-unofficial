# v0.84.0-ja.1: Organize conversations and work with Git in the app

This unofficial Japanese edition for Windows x64 brings upstream v0.83.0 and v0.84.0 changes to users of v0.82.8-ja.1. The [Release page](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1) provides an unsigned installer, Portable ZIP, corresponding source and checksums.

## Group related conversations with Workstreams

When a piece of work uses several AI sessions, choose New Workstream… in Agent Mode to create a named folder, then Move to Workstream… to collect existing conversations. These folders are called Workstreams. They organize conversations by task; they do not establish an agent management relationship.

## Deliver queued follow-ups together

You can send follow-up instructions from the input field while an agent is working. Ordinary queued messages with the same document context now arrive together in the next turn, with their authors identified, rather than each requiring a separate turn. Slash commands and messages with different document contexts still receive separate turns. Sessions using the Claude Code CLI path continue to process queued messages individually.

## Choose branches from the Git panel

Click the current branch name above the Git panel’s Log to switch to an existing branch, check out a remote-only branch, or create a new one. The commit menu's Create Branch action also now opens a name-entry form. Review your current changes before switching branches.

## Propose a commit for a folder

Ask an agent for a commit proposal covering a folder rather than listing every file individually. Its changed files are expanded into the proposal for review, so you can check the scope and diff before approving. A fix also prevents folder proposals from pausing auto-commit because another session has already committed those edits.

## Preserve Markdown structure

Nested lists beneath numbered items now keep their indentation when saved for use in other Markdown tools. They retain their own starting number even beneath a two-digit parent item: for example, a child list written as `1.` under item 10 still starts at 1.

Agent edits near a comment on part of bold text or inline code also no longer produce the broken Markdown addressed by this fix. Your normal editing and saving workflow stays the same.

## Publish a local Wiki for team review

Configure a destination with `nim wiki publish --init`, then use `nim wiki publish` to copy a local Wiki into a team project, with a Commenter role for review. It requires an updated sync server and appropriate access. Downloading the Windows app alone does not set up the CLI or server.

Local files remain the source of truth: this is one-way publishing, not a public website or two-way synchronization. It concerns the application's Local Wiki and Team Wiki, not this project's GitHub Wiki. Live server connections and interoperability with older servers remain unverified.

## Other improvements

- Claude Fable 5.2 is available in the model selector, alongside previous-generation Fable 5.1 and 5. Availability also depends on the service and account.
- When a subfolder reaches the file tree's 200-entry display limit, it now shows how many entries are hidden.
- SQLite backups continue rotating after the database has shrunk.
- Retention cleanup now handles aged tool-output images and duplicate data, and correctly visits outputs that reach their retention limit later.

## Changes in the Japanese edition

New interface text has been localized. Japanese, English and System display-language options remain available, and this edition keeps its settings and data separate from the official app.

Explicitly supplied profile locations are checked consistently across restart and second-instance launches. A conflicting location stops startup instead of silently writing elsewhere. Windows file/path handling has also been corrected. These changes are not a safety guarantee for every host or link race.

## Before updating

Upstream v0.84.0 is a GitHub prerelease. This edition is published as a regular GitHub Release and Latest, not as an upstream-certified or stability-guaranteed build.

**The Windows full test run has 108 unresolved failures, and high CPU use with long Markdown remains unresolved.** Files are unsigned, updates are manual, and team features require a compatible server. Read the [known limitations](docs/KNOWN_LIMITATIONS_v0.84.0-ja.1.md#english) before use.

Save your work, quit the app and follow the [Windows update guide](docs/WINDOWS_JA_UNOFFICIAL.md#english). Extract a ZIP update completely into a new folder. Downgrades are unverified.

## Learn more

- [Getting started and feature entry points](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Getting-Started-English)
- [Testing and Verification](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/wiki/Testing-and-Verification-English): exact counts, native observations and untested areas.
- Upstream notes: [v0.83.0](https://github.com/nimbalyst/nimbalyst/releases/tag/v0.83.0) / [v0.84.0](https://github.com/nimbalyst/nimbalyst/releases/tag/v0.84.0).

[日本語](RELEASE_NOTES_v0.84.0-ja.1.md) · [MIT License](LICENSE)
