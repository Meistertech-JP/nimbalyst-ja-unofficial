[日本語](Translation-and-Contributing) | English

# Translation and Contributing

Report display and Windows-distribution issues for this fork through [Issues](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/issues), and submit proposed changes through [Pull Requests](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/pulls). Distinguish reports to this fork from questions or pull requests directed to upstream.

## Reporting issues and keeping changes focused

A missing-translation report should include the version, display language, screen name, steps, and actual English text. Remove email addresses, usernames, authentication URLs, and personal documents from screenshots. Explain the purpose and impact of substantial feature changes in an Issue before implementing them.

Keep each change focused on one coherent purpose. Even a wording-only change requires checking key scope and rendering paths. Changes that delete upstream features for translation or alter the meaning of internal, non-UI identifiers are not accepted.

## Keys and interpolation

Resources are in `packages/i18n/src/resources/en` and `ja`. Prefer an existing namespace and key when they already express the same meaning. For new meanings, add English and Japanese together, keeping key hierarchies, interpolation variables, plural forms, and other structural details aligned. Do not translate variable names such as `{{name}}` into Japanese.

For dynamic keys, check possible values and fallbacks. If static checks cannot resolve a concatenated string, change the screen's state and test the actual display. Matching key counts and passing type checks alone do not establish complete UI coverage.

Call React Hooks at the top level of components. Do not place `useTranslation` inside callbacks or `map`; pass the required translation function instead. Check JSX braces, aria-labels, titles, placeholders, tooltips, portals, toasts, and native dialogs as well.

## What not to translate

Do not replace brand names, model IDs, API identifiers, protocol values, file paths, Git references, user-entered values, or external-service data without considering context. Do not break commands by translating fixed literals entered into them. When a description and an execution value use the same string, consider separating their responsibilities.

## Verification and pull requests

Follow [Building from Source](Building-from-Source-English) and run type checks, i18n resource tests, and regression tests for the changed area. Exercise screen changes in Japanese and English, checking language switching, long labels, modals, and tooltips. Measure bundle size when changing initial imports.

Describe the purpose, scope, commands run, results, and unverified areas in the pull request. The upstream-derived [CONTRIBUTING.md](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.82.1-ja.1/CONTRIBUTING.md) contains guidance on the DCO, licensing, and dependency updates. Do not interpret it as establishing upstream maintainers or authority to issue signed official releases within this unofficial fork. Do not attach private keys, credentials, or personal profiles.

[Localization Architecture](Localization-Architecture-English), [Testing and Verification](Testing-and-Verification-English), and [Following Upstream](Following-Upstream-English).
