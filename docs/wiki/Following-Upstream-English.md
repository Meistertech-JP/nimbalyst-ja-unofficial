[日本語](Following-Upstream) | English

# Following Upstream Nimbalyst

## v0.84.0-ja.1

Integrates upstream v0.83.0 and v0.84.0 changes since v0.82.8: Claude Fable 5.2 selection, batched queue delivery, Git-panel branch switching, Workstreams, folder-scoped commit proposals, nested Markdown list preservation, hidden-entry counts, Wiki publishing, SQLite backups and tool-output retention. Edition-specific changes add Japanese UI text and fix explicit profile boundaries and Windows file/path handling. Integration does not establish live verification of every feature.

See the [Release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1) and [verification record](Testing-and-Verification-English). Earlier version baselines below are retained history.


`v0.82.8-ja.1` integrates official upstream tag `v0.82.8` at fixed commit `ab9da8f121e4e6fddebc523ced671863e8892ff6`. It does not automatically follow the moving upstream main branch. Its verification is recorded separately from earlier releases in [Testing and Verification](Testing-and-Verification-English).

The [v0.82.7-ja.1 release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.7-ja.1) is based on fixed upstream v0.82.7 commit [`826adb4f93dbe86db35b76ce2502a3a33abe0489`](https://github.com/nimbalyst/nimbalyst/commit/826adb4f93dbe86db35b76ce2502a3a33abe0489). It incorporates upstream changes since the previous v0.82.4-ja.1 release while preserving both histories and edition-specific behavior. The fork does not automatically track the latest upstream main.

## Establishing a fixed starting point

The fixed upstream target is v0.84.0 at `dc5a0ef938cf495a0667d797f871d09d0c44246f`. Upstream v0.84.0 is a GitHub prerelease. This unofficial edition is distributed as a regular GitHub Release and Latest; this is not upstream certification or a stability guarantee. `v0.84.0-ja.1` still contains a SemVer prerelease identifier; GitHub classification does not change that meaning. Later upstream main changes are not included.

Preserve the published tag's source, distributions, hashes, and verification records. Do not reset or stash a development worktree with changes to reuse it; create an independent working branch and worktree. Verify the selected upstream tag, tag object and referenced commit and record that fixed baseline. Do not silently expand the target to a newer upstream main during the work.

```text
fixed upstream ── additional upstream commits ── fixed integration target
      └─ Japanese fork ── published v0.82.7-ja.1 ── integration development branch
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

Classify display strings in new UI and prefer existing keys. Add new keys in both English and Japanese with matching interpolation variables. Distinguish fixed UI from types, comments, model IDs, and user-entered values. Check the current workspace structure and run type checks. v0.82.7-ja.1 has a checked result for 39 workspace typechecks; retaining the older count of 38 is not the objective.

Verify related unit tests, resource consistency, missing references, sizes for all 7 entries, Windows packages, language switching, and persistence after restart. If authentication or startup paths change, add runtime checks appropriate to the impact. Compare new failures against the fixed upstream baseline rather than automatically grouping them with the four old Windows fixture failures.

Generate a source-candidate ZIP from the final commit and verify every file's hash, the archive file inventory, and restored contents. Preserve distributions together with their corresponding commits. Development-branch verification and publication of a stable release are separate decisions.

[Verification results](Testing-and-Verification-English) distinguish the published tag from development commits. See also [Localization Architecture](Localization-Architecture-English), [Building from Source](Building-from-Source-English), and [Translation and Contributing](Translation-and-Contributing-English).
