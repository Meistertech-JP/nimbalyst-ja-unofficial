[日本語](Localization-Architecture) | English

# Localization Architecture

## v0.84.0-ja.1

Upstream v0.84.0 is a GitHub prerelease. This unofficial edition is distributed as a regular GitHub Release and Latest; this is not upstream certification or a stability guarantee. `v0.84.0-ja.1` still contains a SemVer prerelease identifier; GitHub classification does not change that meaning.

See [Testing and Verification](Testing-and-Verification-English) for regular-product language/restart checks and all 39 typechecks/seven size limits.


This page describes [v0.84.0-ja.1](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1), based on fixed upstream v0.84.0 commit [`dc5a0ef938cf495a0667d797f871d09d0c44246f`](https://github.com/nimbalyst/nimbalyst/commit/dc5a0ef938cf495a0667d797f871d09d0c44246f). It includes Japanese UI for upstream updates.

## Shared resources and host responsibilities

Shared resources contain 27 namespaces and 15,557 keys per language, with zero key or interpolation differences. One single-space value is an intentional shared formatting separator. The 489 dynamic-call candidates and 211 unresolved namespace scopes are not counts of missing translations or defects. This is not complete UI, dynamic-path or accessibility coverage; some dictation buttons still have English labels. User documents, AI answers and external responses are not automatically translated. Resources live in `packages/i18n/src/resources/en` and `ja`. `common` is the default namespace, `en` the fallback, and `createI18nInstance` creates an instance per host. Main and Renderer share resources and language policy, not an in-process JavaScript object across processes.

`@nimbalyst/i18n/locale` provides locale policy without resources, `/core` creates instances with resources, and `/react` connects them to React. Code that only needs language policy should not import the full resource set. This boundary prevents unnecessary initial dependencies.

```text
app.uiLanguage (persisted setting)
  ├─ Main: createMainI18nController → changeLanguage → rebuild menus
  └─ Renderer: UiLanguageProvider → I18nextProvider → localized UI
                                      └─ same instance for independent editor roots
```

Main-process control is implemented in [mainI18n.ts](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.84.0-ja.1/packages/electron/src/main/i18n/mainI18n.ts). It subscribes to `app.uiLanguage` and invokes the menu-update callback after a language change. It checks the change revision and disposal state to avoid updates from stale asynchronous completions. Menus, notifications, and native dialogs use their respective namespaces. The Electron Main rule requiring static imports remains in effect.

In Renderer, [UiLanguageProvider](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.84.0-ja.1/packages/i18n/src/react.tsx) resolves the setting received from its host against the system locale, then updates `changeLanguage` and `document.documentElement.lang`. Persistence belongs to the host's settings mechanism, not the Provider itself. Propagating a setting and subscribing to it in the UI are separate responsibilities.

## React and independent roots

Components obtain the display translation function `t` through `useTranslation`. Hooks must be called only at the top level of React components, never inside callbacks, `useEffect` bodies, or `map` callbacks. When passing a translation function to another function, check its namespace requirements and the scope of `t`. Titles, aria-labels, placeholders, and tooltips are also display strings.

Editors within tabs may render through a separate `createRoot`, which does not automatically inherit Context from the parent React tree. [createTranslatedRoot](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.84.0-ja.1/packages/electron/src/renderer/components/TabContent/translatedRoot.tsx) wraps that root in `I18nextProvider`.

Passing the language snapshot held by react-i18next 17's `useTranslation().i18n` to an independent root can leave an open editor's input guidance in the previous language after a setting change. In v0.81.7-ja.3, `TabContent` obtains the live instance through `useContext(I18nContext)`. A regression test creates an independent root from a host and changes its language to verify this behavior.

## On-demand loading in docs-ui (introduced in v0.81.7-ja.3)

The sizes and product-screen observations in this section were recorded for the v0.81.7-ja.3 change. The lazy-loading implementation is retained in v0.82.7-ja.1; the historical sizes are not measurements of the current build. All seven existing bundle-budget checks passed for this release. See [Testing and Verification](Testing-and-Verification-English).

Before the fix, docs-ui's initial size was 92,295 gzip bytes, exceeding the 92,000-byte limit by 295 bytes. Static references to the creation and rename dialogs brought their forms and dependencies, including destination-tree construction, into the initial graph. Forms not required for the initial screen were moved behind a boundary that evaluates them only when the corresponding operation is invoked.

[CollabSidebar](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.84.0-ja.1/packages/collab-client/src/docs-ui/CollabSidebar.tsx) loads `CollabCreateItemDialog` and `InputModal` through `React.lazy`. Destination construction remains on the creation-form side, and another consumer uses the deep export `@nimbalyst/collab-client/docs-ui/CollabCreateItemDialog`. This avoids references that pull dependencies back into the initial graph through a large barrel export. Type-only imports and runtime imports are also distinguished.

Creating a delayed chunk alone does not reduce initial transfer if it is always requested immediately after startup. This change loads on demand and does not mount a form until its dialog is opened. `DialogLoadBoundary` catches failures and displays a translated error and a Close action inside the dialog. It does not replace the entire workspace with an error screen.

The final size is 89,138 gzip bytes, a reduction of 3,157 bytes. This differs from the intermediate value of 88,811 before the error boundary was added. The limit, gzip calculation, and translation keys were not changed to pass the check. The final build was verified for form display and, with chunk requests blocked, for the error notification and preservation of the sidebar after closing the dialog.

## Static consistency versus runtime behavior

Key counts, interpolation parity, and checks for statically resolvable references validate the structure of translation resources. They do not prove complete runtime coverage of dynamic keys, external components, existing data, or external errors. Brand names and model IDs are not treated as translation targets by default.

Resource checks for finite keys are distinct from complete runtime coverage of dynamic references. Matching keys, interpolation and empty-translation checks do not establish complete UI translation. Consult measurements for the same source commit and build output for exact bundle sizes.

Related pages: [Building from Source](Building-from-Source-English), [Testing and Verification](Testing-and-Verification-English), [Following Upstream](Following-Upstream-English), and [Translation and Contributing](Translation-and-Contributing-English).
