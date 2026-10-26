# Development safety

These guidelines preserve reusable lessons without publishing private session transcripts, approval histories or incident diaries. Root and package-specific instructions remain authoritative for a particular change.

## Protect shared work

Inspect HEAD, the working tree and the index before editing or committing. Existing dirty files, staged changes, stashes and conflict resolutions may belong to concurrent work. Do not reset, restore, stash or unstage them without explicit authorization. For a clean-baseline comparison, use a separate checkout or worktree rather than temporarily reverting the shared tree.

Review the exact staged diff before a commit. A bare commit can include unrelated files already staged by someone else. Use an explicit reviewed file list and preserve unrelated index entries. Never commit local plans, raw logs, approval records or private profiles. Repository rules may exclude a path even if Git currently tracks it.

## Verify the relevant product path

Typechecks and an individual build do not prove the complete release pipeline. Run the builds and tests appropriate to the changed packages, native modules, extensions and final distribution. Distinguish source-level tests, development E2E and ordinary packaged-product observations.

An IPC call with no receiving handler can indicate abandoned code or an incomplete migration. Trace the caller, registration, owning service and persistence path before adding a new handler. Remove obsolete paths only after their ownership and use are understood; do not maintain two competing sources of truth to hide a broken transition.

## Keep changes bounded

Do not reconstruct intermediate file states or split history based on an ambiguous instruction. Clarify consequential choices before mutating shared work. Authorization for one Git action does not authorize unrelated staging, history rewriting or publication.

When moving a component between packages, inspect the destination's import, styling and build conventions. Copying JSX alone does not preserve correct integration. Extension-specific stylesheets and shared-runtime Tailwind scanning can have different constraints.

## Keep private records private

Store individual session notes, raw failure evidence and approvals outside the public candidate. Publish concise, general technical guidance with the affected version and verification limits. Do not copy personal feedback or conversation excerpts into source documentation as evidence of quality.
