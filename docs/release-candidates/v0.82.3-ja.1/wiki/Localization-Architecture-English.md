# Localization architecture

[日本語](Localization-Architecture.md) · [Home](Home-English.md)

This documents the v0.82.3-ja.1 candidate based on upstream v0.82.3. Resources reside in `packages/i18n/src/resources/en` and `ja`, with 27 namespaces and 14,794 keys per language.

## Shared resources and hosts

`@nimbalyst/i18n` uses i18next and react-i18next. `/locale` exports language-selection policy without resources, `/core` creates resource-backed instances, `/react` connects React, and `/resources` exports dictionaries. The default namespace is common and fallback is English.

Main and renderer use separate instances. Main's `createMainI18nController` subscribes to persisted `app.uiLanguage` and rebuilds native menus after changing language. Renderer `UiLanguageProvider` resolves the setting and system locale, updates i18next and `document.documentElement.lang`; the host owns persistence.

Separately mounted editor roots do not inherit parent React context automatically. `createTranslatedRoot` supplies the live instance. Components call `useTranslation` at their top level. Titles, aria-labels, placeholders, and tooltips are included. User documents, model names, identifiers, and external service responses are not mechanically translated.

## On-demand loading

docs-ui creation/rename dialogs and destination construction load when requested. Deep exports avoid bringing form dependencies back into the initial graph through a large barrel. `DialogLoadBoundary` handles loading failures inside the dialog. Electron Main retains static imports.

The candidate's initial docs-ui size is 89,138 gzip bytes against a 92,000-byte budget. All seven existing budgets remain enforced. Creating a separate chunk alone does not establish reduced initial transfer.

## Added translations and audits

Existing resources now cover team-recovery stages, blockers and diagnostics export, Tracker post-recovery conflicts, uncertain Codex ownership, and the default pasted-image label. Main recovery helpers translate locally authored guidance, not arbitrary messages from the server.

Checks cover key parity, empty translations, interpolation, and resolvable static references. The 105 direct Main-helper references, 27 finite ownership keys, and 42 tracker field, column, publication, sync-state, and action references are also checked. Complete runtime tracing of 672 dynamic candidates and 412 unresolved lexical scopes remains incomplete. Candidate counts are not missing-key counts, and matching dictionaries do not establish complete UI translation. Session time text, aria-labels, and tooltips follow the display language while retaining minute-level idle updates.
