[日本語](Getting-Started) | English

# Getting Started

Nimbalyst combines file editing, AI conversations and task management in one workspace. This guide introduces the unofficial v0.84.0-ja.1 edition and its new workflows.

## Your first three steps

1. Get the Windows x64 installer or Portable ZIP from the [Release page](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1) and follow the [installation guide](Windows-Installation-English).
2. Choose a mode on the welcome screen and review the terms and privacy policy. Start with the tutorial or open a working folder as a project.
3. Configure and authenticate an agent when you want to use it; you can defer this step initially. Check the provider's account terms and pricing.

Choose a document from the file list to edit it. Before asking an AI to make changes, check the open project and selected files. A separate practice folder or the tutorial lets you explore without changing original documents.

See [Display Language](Display-Language-English) for Japanese/English settings. Nimbalyst sign-in is separate from Claude, Codex and other agent authentication; see [Account and Authentication](Account-and-Authentication-English).

## Use the new features

### Group related conversations

Switch to Agent Mode, open the session list's create menu and choose New Workstream…. Use Move to Workstream… in an existing session's menu to add it.

A Workstream is a named folder for conversations. Sessions within it can use shared editor tabs for related files. It is not a Git worktree and does not establish an agent management relationship.

### Send follow-ups while an agent works

Send a message from the input field while an agent is busy to queue it. Supported paths combine consecutive ordinary messages with compatible document context into the next turn, preserving order and author labels.

Commands and messages with different context remain separate. The Claude Code CLI path handles messages individually. Interrupt and send now interrupts the current turn and advances the queue; it does not move the clicked row ahead of earlier messages.

### Switch branches in the Git panel

Click the current branch name above the Git panel's Log and choose a branch or create one. Remote-only branches are supported too. This is separate from the filter that changes which branches the Log displays.

Read the current-change and active-session notices before switching. The operation does not automatically stash, discard or force-overwrite uncommitted changes; Git may refuse it. A branch in use by another worktree instead offers a way to open the relevant session.

### Include a folder in a commit proposal

Ask the agent for a proposal covering the folder's changes. The confirmation view lists its changed files; select folders or individual files, review the diff, then approve. Creating a proposal does not immediately commit.

The proposal is rejected for ignored folders, folders without changes, nested Git repositories, or more than 2,000 expanded files. Ignored files within an otherwise eligible folder are excluded. Files edited only by other sessions are initially unselected. Check the selection and scope yourself.

### Edit nested Markdown lists

Edit lists beneath numbered items and save as usual. Export now accounts for the width of the parent marker, helping other Markdown tools retain the hierarchy. A child list keeps its own starting number beneath a two-digit parent: a list written as `1.` under item 10 still starts at 1. This is not a guarantee for every Markdown dialect.

### Publish a local Wiki for team review

In an environment with the CLI installed, configure the destination with `nim wiki publish --init`, then use `nim wiki publish`. Use `nim wiki publish --dry-run` to preview the operation. Pages marked `export: false` and their descendants are excluded.

Your local files remain the source of truth. Publishing goes one way to the team project; pages whose bodies were edited on the team side are reported rather than silently overwritten. You need a compatible server, team sign-in and access. The Windows distribution alone does not set up the CLI or server, and live server connections have not been verified. This is not a public website, two-way synchronization or an update to this GitHub Wiki.

## Before use

Upstream v0.84.0 is a prerelease. This edition is unsigned and updated manually; Windows full-suite failures and long-Markdown high CPU use remain unresolved. Read [Compatibility and Limitations](Compatibility-and-Limitations-English).

[Release notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/main/RELEASE_NOTES_v0.84.0-ja.1.en.md) · [Troubleshooting](Troubleshooting-English) · [Detailed verification](Testing-and-Verification-English)
