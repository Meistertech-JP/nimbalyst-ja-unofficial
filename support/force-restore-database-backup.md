# Force Restore Database from Backup

When a user's Nimbalyst database is in a bad state, they can manually restore from the most recent verified backup.

Before changing files, identify the exact application edition, Windows account, active profile and storage engine. Quit that application completely and preserve a separate copy of the whole profile and backup. The unofficial Windows edition defaults to `%APPDATA%\Nimbalyst 日本語版（非公式）`; it does not use the official/development profile below. If `NIMBALYST_USER_DATA_DIR` was explicitly configured, use that confirmed directory instead. Do not try restoration against another edition's data.

## Step 0: find out which storage engine the install is using

**Do this first.** Nimbalyst runs on one of two storage engines, each with its own database and its own backups. Restoring the wrong engine's backup will not recover anything, and can overwrite a good database with an empty one.

Check the flag file:

```bash
cat "<app data>/database-backend.json"
```

Or read the first line the database layer logs at startup, in `<app data>/logs/main.log`:

```
[Database] Backend selector resolved to 'sqlite' (reason: flag-file-sqlite)
```

`<app data>` is:

| Platform | Path |
| --- | --- |
| macOS | `~/Library/Application Support/@nimbalyst/electron` |
| Unofficial Japanese edition on Windows | `%APPDATA%\Nimbalyst 日本語版（非公式）` |
| Upstream/development Windows reference | `%APPDATA%\@nimbalyst\electron` |
| Linux | `~/.config/@nimbalyst/electron` |

Then follow the matching section below. If the two engines disagree, or the flag names an engine whose folder does not exist, go to [When the flag file is wrong](#when-the-flag-file-is-wrong).

## Background

Both engines keep three rolling backups, created every 4 hours and verified before being stored.

| Engine | Live database | Backups |
| --- | --- | --- |
| SQLite | `sqlite-db/nimbalyst.sqlite` | `sqlite-db.backups/nimbalyst.backup-{current,previous,oldest}.sqlite` |
| PGLite | `pglite-db/` | `db-backups/pglite-db.backup-{current,previous,oldest}` |

A PGLite install may also have a `pglite-db.backup-<timestamp>` folder sitting directly in the app data folder. That is a database an older build renamed aside when it failed to open; it is usually the user's real data and is worth checking before anything else.

## Restoring on SQLite

```bash
# 1. Quit Nimbalyst completely (Cmd+Q on macOS)

# 2. Navigate to the app data folder (see the table above)
cd ~/Library/Application\ Support/@nimbalyst/electron

# 3. Move the bad database aside, including its WAL/SHM siblings
mkdir -p sqlite-db.bad && mv sqlite-db/nimbalyst.sqlite* sqlite-db.bad/

# 4. Copy the most recent backup into place
cp sqlite-db.backups/nimbalyst.backup-current.sqlite sqlite-db/nimbalyst.sqlite

# 5. Start Nimbalyst
```

Use `nimbalyst.backup-previous.sqlite` or `nimbalyst.backup-oldest.sqlite` if the most recent one is also bad.

On Windows, after quitting the application and confirming its profile, use PowerShell. The default below is for the unofficial Japanese edition; change it only to an explicitly verified custom profile. Stop if a previous recovery directory already exists, rather than mixing recovery attempts.

```powershell
$profilePath = Join-Path $env:APPDATA 'Nimbalyst 日本語版（非公式）'
Set-Location -LiteralPath $profilePath
if (!(Test-Path -LiteralPath 'sqlite-db.backups\nimbalyst.backup-current.sqlite' -PathType Leaf)) { throw 'Backup not found' }
if (Test-Path -LiteralPath 'sqlite-db.bad') { throw 'Preserve the existing recovery directory before continuing' }
New-Item -ItemType Directory -Path 'sqlite-db.bad'
foreach ($databaseFile in @('nimbalyst.sqlite', 'nimbalyst.sqlite-wal', 'nimbalyst.sqlite-shm')) {
    $databasePath = Join-Path 'sqlite-db' $databaseFile
    if (Test-Path -LiteralPath $databasePath) { Move-Item -LiteralPath $databasePath -Destination 'sqlite-db.bad' }
}
Copy-Item -LiteralPath 'sqlite-db.backups\nimbalyst.backup-current.sqlite' -Destination 'sqlite-db\nimbalyst.sqlite'
```

## Restoring on PGLite

```bash
# 1. Quit Nimbalyst completely (Cmd+Q on macOS)

# 2. Navigate to the app data folder (see the table above)
cd ~/Library/Application\ Support/@nimbalyst/electron

# 3. Rename the bad database (preserves it just in case)
mv pglite-db pglite-db.bad

# 4. Copy the most recent backup into place
cp -r db-backups/pglite-db.backup-current pglite-db

# 5. Start Nimbalyst
```

Use `pglite-db.backup-previous` or `pglite-db.backup-oldest` if the most recent one is also bad.

On Windows, after quitting the application and confirming its profile:

```powershell
$profilePath = Join-Path $env:APPDATA 'Nimbalyst 日本語版（非公式）'
Set-Location -LiteralPath $profilePath
if (!(Test-Path -LiteralPath 'db-backups\pglite-db.backup-current' -PathType Container)) { throw 'Backup not found' }
if (Test-Path -LiteralPath 'pglite-db.bad') { throw 'Preserve the existing recovery directory before continuing' }
Rename-Item -LiteralPath 'pglite-db' -NewName 'pglite-db.bad'
Copy-Item -LiteralPath 'db-backups\pglite-db.backup-current' -Destination 'pglite-db' -Recurse
```

## When the flag file is wrong

Some 0.74.0 and 0.74.1 builds wrote `"backend": "pglite"` into `database-backend.json` on installs that were actually running on SQLite. On the next launch the app opened PGLite, created an empty database, and came up looking normal with every session missing. The real data was never touched — it is still in `sqlite-db/`.

The fingerprint, from `logs/main.log`:

```
[Database] Backend selector resolved to 'pglite' (reason: existing-pglite-migration-due)
[PGLite] initialize() called - starting fresh initialization
[autoMigrate] skipping (flag-disabled)
```

**Do not restore a PGLite backup in this case.** `db-backups/pglite-db.backup-current` will be a backup of the empty database — around 30 MB — and copying it over anything is pure loss. Check sizes before you act: `du -sh sqlite-db pglite-db db-backups/* 2>/dev/null`.

Nimbalyst 0.74.4 and later detect this at startup and correct the flag automatically, so upgrading is the fix. To repair it by hand on an older build, quit the app and point the flag at the engine that actually holds the data:

```json
{ "backend": "sqlite", "setAt": "2026-01-01T00:00:00.000Z", "setBy": "user-migration", "forceMigrationFlag": false }
```

The next launch will log `flag-file-sqlite` and open the real database.

## What Gets Restored

The database backup contains:
- AI chat sessions and conversation history
- Document edit history (for the History sidebar)
- Session metadata and preferences

**Not affected by database issues:**
- Your actual document files (these are stored on disk separately)
- Application settings
- Workspace configurations

## Cleanup

Once you've confirmed the restore worked, you can delete the bad database:

```bash
rm -rf pglite-db.bad sqlite-db.bad
```
