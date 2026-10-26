[日本語](Compatibility-and-Limitations) | English

# Compatibility and Limitations

## v0.82.3-ja.1

This unsigned Windows x64 edition is based on upstream v0.82.3 commit `84dcc00f3cd0abbb36eafc6bfad9389f960076db`. Each language contains 27 namespaces and 14,795 keys. The 672 dynamic candidates, 412 unresolved scopes and 378 JSX English candidates are not defect counts and do not establish complete runtime coverage.

The ordinary product displayed English in Settings, menus, Project Manager and Workspace, and retained English after restart. With the display-language setting set to System, Japanese appeared in the Renderer and native menus and remained after normal Ctrl+Q shutdown and restart. Persistence of an explicit `ja` value has not been checked. The changed auxiliary-error warning passed English and Japanese DOM tests but has not been observed in the ordinary product. Authentication, NSIS installation, upgrade and removal were not exercised on this build; related source inputs were unchanged, which is not a substitute for runtime checks. Google sign-in, special recovery, server revocation, upgrading an authenticated older profile, effective access by another Windows user, external screen readers, all DPI configurations and complete WSL coverage remain unverified.

Legacy-encryption team recovery requires the updated sync server and compatible editing clients. Existing mocks, DOM, unit and integration tests were evaluated; real-organization form display, recovery initiation, server state transitions, independent-client readback, production team-data integrity and resumed synchronization remain unverified. No real or dummy organization was created or registered, and no production recovery was performed for verification.

An earlier Codex request succeeded while its automatic session-metadata reminder reported a provider capacity error. Regression tests identified and fixed auxiliary-error propagation and RPC subscription cleanup. The tests preserve the main response/completion path and verify the warning in English and Japanese DOM tests; its display in the ordinary product has not been checked. Whether the earlier provider-reported capacity incident used the same path remains unknown, and provider capacity limits themselves are not changed. All seven bundle budgets passed after the fix. Three Windows fixture-creation EPERM failures remain unpassed; rejection behavior that could not run is still unverified. Older results below are historical and apply only to their stated versions.

## v0.82.1-ja.1

This unsigned stable release targets Windows x64 and is based on upstream v0.82.1 commit `583ae0244dae266667be579733d6c571fd74e037`. Its identifiers, storage paths, manual-update policy and localhost authentication follow the table below.

The ordinary product build was checked for language persistence, production email sign-in, encrypted-state restoration, local sign-out, clean installation, upgrade from v0.81.7-ja.3 and ordinary uninstall. Resources contain 27 namespaces and 14,608 keys per language. Complete runtime coverage of 653 dynamic candidates, 382 unresolved scopes and every screen remains unverified, as do Google sign-in, special recovery paths, server-side revocation, effective NTFS access, external screen readers and all DPI/device configurations.

Verification does not cover every Windows version, DPI setting, security product or machine configuration.

## Separation from the official edition

| Item | Policy for this edition |
| --- | --- |
| Application identifier | `jp.meistertech.nimbalyst.ja.unofficial` |
| Product name | Nimbalyst 日本語版（非公式） |
| Default installation path | `%LOCALAPPDATA%\Programs\nimbalyst-ja-unofficial` |
| Default user-data path | `%APPDATA%\Nimbalyst 日本語版（非公式）` |
| Official updates | Automatic retrieval, application, and manual checks are disabled |
| Windows URL registration | Does not claim the default `nimbalyst://` handler |
| Authentication | Localhost callback with an instance-specific nonce |

Separation does not guarantee compatibility with simultaneous use of the official edition. Running both editions alongside each other is not supported. This edition is configured not to move or delete existing official-edition data. Non-authentication `nimbalyst://` links may open in the application already registered for that protocol.

## Historical v0.81.7-ja.3 observations

The v0.81.7-ja.3 verification record distinguishes an earlier product build used for authentication and installation from the final distribution. The earlier build was tested for production email authentication, encrypted storage, account restoration, ordinary logout and NSIS upgrade/uninstall. The final distribution was checked for startup, Japanese/English switching and restart persistence, local Wiki creation, renaming and destination display, load-failure notifications with the screen preserved, and normal shutdown. NSIS and production authentication were not repeated with the final package. See the [release notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/v0.81.7-ja.3/RELEASE_NOTES_v0.81.7-ja.3.md).

Google authentication, some Stytch recovery paths, service-side session invalidation, and NTFS effective access covering other users and groups are unverified. An unverified area is not a confirmed malfunction or vulnerability.

## Translation and platforms

Matching 14,608 keys per language across 27 namespaces does not prove complete translation on every screen. The 653 dynamic candidates and 382 unresolved scopes are not missing-key or defect counts.

English may remain in user documents, external-service responses, technical identifiers, existing notifications, and older collaboration data. The disabled administrator-installation option in NSIS has an English note. Complete display verification covering unvisited screens, tooltips, accessibility labels, and Browser/Embed hosts has not been performed.

macOS, Linux, Android, and iOS distributions and behavior on actual devices are outside the verification scope of this Windows release. Successful GitHub Actions builds and behavior on actual devices are distinct results.

The four Windows environment-dependent tests and post-publication CI failures are recorded in [Testing and Verification](Testing-and-Verification-English). See [Troubleshooting](Troubleshooting-English) for handling problems and [Windows Installation](Windows-Installation-English) for distribution signing and verification.
