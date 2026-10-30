[日本語](Display-Language) | English

# Display Language

The display-language choices are Japanese, English and System. The current v0.82.4-ja.1 ordinary Windows product was checked for switching both ways, persistence of explicit `en` and `ja` settings after restart, and Japanese resolved from System on a ja-JP host. This is not an exhaustive test of other OS languages or every screen configuration. [Testing and Verification](Testing-and-Verification-English) records earlier versions separately.

In v0.82.3-ja.1, English was observed in Settings, menus, Project Manager and Workspace and remained selected after restart. With System selected, Japanese appeared in the Renderer and native menus and remained after a normal Ctrl+Q shutdown and restart. Persistence of an explicit `ja` setting was not checked on that version. The auxiliary-error warning passed English and Japanese DOM tests, but was not observed in the ordinary product. These results and the v0.82.1-ja.1 observations below are historical.

Open application settings and select the display language under Advanced in the App section. In the English interface, the path is Application Settings → Advanced. The choices are Japanese, English, and the system setting.

## What the system setting means

The persisted `uiLanguage` value is one of `system`, `en`, or `ja`. With `system`, a system locale beginning with `ja` selects Japanese; other locales select English. This setting does not provide translations for every other language.

Supported screens and the application menu update after a change. v0.82.4-ja.1 was checked for settings, menus and Tracker-reference language changes and restart persistence. Observations from v0.82.3-ja.1 and v0.82.1-ja.1 remain historical for those versions. External screen-reader output remains unverified.

The same live i18n instance is also passed to independent React roots. See [Localization Architecture](Localization-Architecture-English) for the implementation.

## Separate from the agent language

`preferredAgentLanguage` instructs an AI agent about its response language. `uiLanguage` controls the application's own display language. Changing one does not make it equivalent to the other, nor does it guarantee that an external service will respond in the requested language.

Changing the display language does not automatically translate or rewrite:

- Files, page names, documents, and previous conversations written by you or collaborators
- Responses and error details returned by external services
- Brand names, model IDs, API identifiers, Git references, or protocol values
- Tutorials that have already been created or edited

A new tutorial follows the display language at creation time. Existing content is not overwritten to match the language. If English remains, use [Troubleshooting](Troubleshooting-English) to distinguish UI from content. Runtime verification of every screen has not been completed.
