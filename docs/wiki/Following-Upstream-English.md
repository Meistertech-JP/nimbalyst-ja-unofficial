[日本語](Following-Upstream) | English

# Following Upstream Nimbalyst

v0.82.3-ja.1 is based on fixed upstream v0.82.3 commit [`84dcc00f3cd0abbb36eafc6bfad9389f960076db`](https://github.com/nimbalyst/nimbalyst/commit/84dcc00f3cd0abbb36eafc6bfad9389f960076db). The previous v0.82.1-ja.1 baseline was `583ae0244dae266667be579733d6c571fd74e037`. Integration preserved both histories and incorporated 17 commits affecting 144 files. The fork does not automatically track the latest upstream main.

## Establishing a fixed starting point

Preserve the published tag's source, distributions, hashes, and verification records. Do not reset or stash a development worktree with changes to reuse it; create an independent working branch and worktree. At the start, check upstream's default branch and actual HEAD, and record that SHA as the baseline for the integration.

```text
fixed upstream ── additional upstream commits ── fixed integration target
      └─ Japanese fork ── published ja.3 ── integration development branch
```

Preserve history; do not represent integration by force-pushing or moving published tags. Also verify that the Japanese edition's previous main remains an ancestor.

## Classifying changes

Classify differences between the old and new upstream revisions into features, UI, shared resources, dependencies, builds, authentication, and platforms. Read upstream's structure rather than mechanically overwriting it with old fork patches. Do not resolve conflicts by deleting new upstream features.

The items to preserve extend beyond existing Japanese keys and their UI connections:

- This edition's Windows identifiers, product name, installation path, and separate profile
- Disabling retrieval, application, and checking of official updates
- Localhost authentication and the policy of not claiming Windows's `nimbalyst://` handler
- Encrypted credential storage, restoration, and protection against logout races
- Worker placement, SQLite startup, bundled resources, and licenses
- docs-ui lazy-loading boundaries and size limits, and live i18n instances for independent React roots

An authentication conflict is not resolved merely because its screen is translated. Recheck that sign-in is not reflected before storage succeeds, that there is no plaintext fallback or stale update response, and that diagnostic logs do not contain authentication values.

## Translation and verification

Classify display strings in new UI and prefer existing keys. Add new keys in both English and Japanese with matching interpolation variables. Distinguish fixed UI from types, comments, model IDs, and user-entered values. Check the current workspace structure and run type checks; do not treat retaining the older count of 38 as the objective.

Verify related unit tests, resource consistency, missing references, sizes for all 7 entries, Windows packages, language switching, and persistence after restart. If authentication or startup paths change, add runtime checks appropriate to the impact. Compare new failures against the fixed upstream baseline rather than automatically grouping them with the four old Windows fixture failures.

Generate a source-candidate ZIP from the final commit and verify every file's hash, the archive file inventory, and restored contents. Preserve distributions together with their corresponding commits. Development-branch verification and publication of a stable release are separate decisions.

[Verification results](Testing-and-Verification-English) distinguish the published tag from development commits. See also [Localization Architecture](Localization-Architecture-English), [Building from Source](Building-from-Source-English), and [Translation and Contributing](Translation-and-Contributing-English).
