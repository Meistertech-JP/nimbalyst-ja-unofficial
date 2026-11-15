[日本語](Compatibility-and-Limitations) | English

# Compatibility and Limitations

v0.84.0-ja.1 is an unofficial Japanese edition for Windows x64. Upstream v0.84.0 is a prerelease. This edition's regular GitHub Release and Latest designation is not upstream certification or a stability guarantee.

## Important limitations

- **The Windows full test run still has 108 failures.** This is not an all-tests-passing build. The count alone does not make every failure a new major regression or a harmless environmental difference.
- **High CPU use with long Markdown remains unresolved.**
- **Files are unsigned and updates are manual.** Official automatic updates and update checks are disabled. Check provenance and checksums without disabling protections.
- **Wiki publishing and team features require a compatible server and access.** Live sync/collaboration servers, real organizations and old/new server interoperability are unverified.
- Running alongside the official app, or using one profile from different versions at the same time, is unsupported. Downgrades are unverified too.

## What was and was not checked

Dedicated environments covered regular Windows startup, language switching and retention after restart, fresh installation and retention of settings, documents and displayed Tracker data during upgrades. Production email sign-in was also checked, not every distribution's new sign-in, Google authentication or server-side session revocation.

Some dictation labels remain English. Matching translation keys does not establish complete screen, dynamic-text or screen-reader coverage. Real microphone/API use, all DPI settings, external screen readers, Wiki context under load and general resolution of terminal-resource retention are also unverified or unresolved. Untested areas are not confirmed defects or vulnerabilities.

[Testing and Verification](Testing-and-Verification-English) retains exact populations, environments, PASS/FAIL/SKIP/NOT RUN and history. [Detailed known limitations](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/main/docs/KNOWN_LIMITATIONS_v0.84.0-ja.1.md#english) covers profile boundaries, authentication and other technical scope.

## Documentation versus distribution files

These pages and main's documents have been revised after publication. The published tag and Source ZIP retain their original documents; Windows downloads and checksums are unchanged. Editorial revisions do not establish implementation changes or new product-test success.

[Windows installation and updates](Windows-Installation-English) · [Troubleshooting](Troubleshooting-English)
