[日本語](Localization-Architecture) | English

# Localization Architecture

This page describes [v0.82.3-ja.1](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.1), based on fixed upstream v0.82.3 commit `84dcc00f3cd0abbb36eafc6bfad9389f960076db`. Recovery panels, Tracker, session times and input/attachment guidance use the same i18n structure.

## Shared resources and host responsibilities

Translation resources are in `packages/i18n/src/resources/en` and `ja`, with 27 namespaces and 14,795 keys in each language. `common` is the default namespace and `en` is the fallback language. `createI18nInstance` creates an i18next instance for each host. Main and Renderer do not share the same in-process object; they use shared resources and locale-resolution policies.

`@nimbalyst/i18n/locale` provides locale policy without resources, `/core` creates instances with resources, and `/react` connects them to React. Code that only needs language policy should not import the full resource set. This boundary prevents unnecessary initial dependencies.

```text
app.uiLanguage (persisted setting)
  ├─ Main: createMainI18nController → changeLanguage → rebuild menus
  └─ Renderer: UiLanguageProvider → I18nextProvider → localized UI
                                      └─ same instance for independent editor roots
```

Main-process control is implemented in [mainI18n.ts](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.3-ja.1/packages/electron/src/main/i18n/mainI18n.ts). It subscribes to `app.uiLanguage` and invokes the menu-update callback after a language change. It checks the change revision and disposal state to avoid updates from stale asynchronous completions. Menus, notifications, and native dialogs use their respective namespaces. The Electron Main rule requiring static imports remains in effect.

In Renderer, [UiLanguageProvider](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.3-ja.1/packages/i18n/src/react.tsx) resolves the setting received from its host against the system locale, then updates `changeLanguage` and `document.documentElement.lang`. Persistence belongs to the host's settings mechanism, not the Provider itself. Propagating a setting and subscribing to it in the UI are separate responsibilities.

## React and independent roots

Components obtain the display translation function `t` through `useTranslation`. Hooks must be called only at the top level of React components, never inside callbacks, `useEffect` bodies, or `map` callbacks. When passing a translation function to another function, check its namespace requirements and the scope of `t`. Titles, aria-labels, placeholders, and tooltips are also display strings.

Editors within tabs may render through a separate `createRoot`, which does not automatically inherit Context from the parent React tree. [createTranslatedRoot](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.3-ja.1/packages/electron/src/renderer/components/TabContent/translatedRoot.tsx) wraps that root in `I18nextProvider`.

Passing the language snapshot held by react-i18next 17's `useTranslation().i18n` to an independent root can leave an open editor's input guidance in the previous language after a setting change. In v0.81.7-ja.3, `TabContent` obtains the live instance through `useContext(I18nContext)`. A regression test creates an independent root from a host and changes its language to verify this behavior.

## On-demand loading in docs-ui (introduced in v0.81.7-ja.3)

The sizes and product-screen observations in this section were recorded for the v0.81.7-ja.3 change. The lazy-loading implementation is retained in v0.82.3-ja.1; the historical sizes are not measurements of the current build.

Before the fix, docs-ui's initial size was 92,295 gzip bytes, exceeding the 92,000-byte limit by 295 bytes. Static references to the creation and rename dialogs brought their forms and dependencies, including destination-tree construction, into the initial graph. Forms not required for the initial screen were moved behind a boundary that evaluates them only when the corresponding operation is invoked.

[CollabSidebar](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.3-ja.1/packages/collab-client/src/docs-ui/CollabSidebar.tsx) loads `CollabCreateItemDialog` and `InputModal` through `React.lazy`. Destination construction remains on the creation-form side, and another consumer uses the deep export `@nimbalyst/collab-client/docs-ui/CollabCreateItemDialog`. This avoids references that pull dependencies back into the initial graph through a large barrel export. Type-only imports and runtime imports are also distinguished.

Creating a delayed chunk alone does not reduce initial transfer if it is always requested immediately after startup. This change loads on demand and does not mount a form until its dialog is opened. `DialogLoadBoundary` catches failures and displays a translated error and a Close action inside the dialog. It does not replace the entire workspace with an error screen.

The final size is 89,138 gzip bytes, a reduction of 3,157 bytes. This differs from the intermediate value of 88,811 before the error boundary was added. The limit, gzip calculation, and translation keys were not changed to pass the check. The final build was verified for form display and, with chunk requests blocked, for the error notification and preservation of the sidebar after closing the dialog.

## Static consistency versus runtime behavior

Key counts, interpolation parity, and checks for statically resolvable references validate the structure of translation resources. They do not prove complete runtime coverage of dynamic keys, external components, existing data, or external errors. Brand names and model IDs are not treated as translation targets by default.

The 672 dynamic candidates, 412 unresolved scopes and 378 JSX English candidates are not missing-key counts. All 42 finite Tracker references resolve in both languages. The seven existing bundle budgets passed after the product fix. Consult measurements for the same source commit and build output for exact sizes.

Related pages: [Building from Source](Building-from-Source-English), [Testing and Verification](Testing-and-Verification-English), [Following Upstream](Following-Upstream-English), and [Translation and Contributing](Translation-and-Contributing-English).
