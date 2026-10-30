[日本語](Getting-Started) | English

# Getting Started

Nimbalyst is a desktop application that brings file editing, work with AI agents, session management, and trackers together in one workspace. Its editing features cover code, diagrams, tables, and other formats as well as Markdown. These are features of upstream Nimbalyst.

The Unofficial Japanese Edition is a fork that adds Japanese desktop UI and a display-language setting. Beyond localization, distribution changes include separate Windows application identifiers and storage locations, disabled official updates, and localhost authentication. It is not endorsed or supported by Nimbalyst, Inc.

## Choosing a distribution

Download the unsigned Windows x64 edition based on upstream v0.82.4 from the [v0.82.4-ja.1 release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.4-ja.1). It provides NSIS, portable ZIP, matching source and SHA256SUMS.txt. The installer provides Windows app-list entries and shortcuts; the portable ZIP runs from its extracted directory. The ZIP edition does not store settings next to the EXE. See the release notes for the package contents and verification scope.

See [Windows Installation and Updates](Windows-Installation-English) for filenames, checksum verification, and placement instructions. The older v0.81.7-ja.2 was a source-only prerelease and differs from the current Windows distributions.

## First launch

The initial guidance offers operating modes and access to the tutorial. Read the terms and privacy policy before deciding whether to accept them. If an agent setup screen appears, it also offers an option to configure agents later. To use an agent, you must satisfy its provider's authentication requirements and terms of use.

Choose the display language under Advanced in application settings. Japanese, English, and the system setting are supported. See [Display Language](Display-Language-English). A new tutorial uses the display language selected when it is created, but changing languages does not rewrite existing documents or conversations.

Signing in to a Nimbalyst account is separate from authenticating agents such as Claude or Codex. Nimbalyst email authentication is described in [Account and Authentication](Account-and-Authentication-English).

## Files and projects

Open a working folder as a project and select documents from its file list. When asking an AI to make changes, check the target project and files as well. For an initial trial, a dedicated folder or tutorial can be used without changing original documents.

Local Wiki and Team Wiki are in-app features. This GitHub Wiki documents usage and development of the distributed edition; its storage and purpose differ from the application's Wiki.

For startup, display, or sign-in problems, see [Troubleshooting](Troubleshooting-English). For the verification scope, see [Compatibility and Limitations](Compatibility-and-Limitations-English).
