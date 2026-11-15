import { app } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";

// Resolve existing ancestors too: a not-yet-created settings file can live
// underneath a junction. Never create directories merely to validate a path.
function physicalPath(input: string): string {
  let current = path.resolve(input);
  const missing: string[] = [];
  for (;;) {
    try {
      return path.resolve(
        fs.realpathSync.native(current),
        ...missing.reverse()
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

/** Inspect storage descendants before backend selection or recovery reads. */
export function assertIsolatedDatabasePaths(root: string): void {
  if (!process.env.NIMBALYST_USER_DATA_DIR) return;
  assertIsolatedProfilePath(root);
  const visit = (target: string): void => {
    assertIsolatedProfilePath(target);
    const stat = fs.lstatSync(target);
    // Do not follow even internal DB links: a second link below their target
    // could otherwise evade traversal, or form a cycle.
    if (stat.isSymbolicLink()) throw new Error('Linked isolated database storage is not supported');
    if (!stat.isDirectory() && stat.nlink > 1) throw new Error('Hard-linked isolated database storage is not supported');
    if (stat.isDirectory()) for (const name of fs.readdirSync(target)) visit(path.join(target, name));
  };
  try {
    let names: string[];
    try { names = fs.readdirSync(root); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    for (const name of names) {
      const target = path.join(root, name);
      assertIsolatedProfilePath(target);
      if (/^(?:pglite|sqlite|db-backups|database-|\.?recovery|\.?cutover|\.displaced-|\.pre-restore-)/i.test(name)) visit(target);
    }
  } catch (error) {
    console.error('[ProfileIsolation] Database storage boundary check failed; startup aborted');
    process.exit(1);
    throw error;
  }
}

/** Fail before opening settings/database data if isolation has drifted. */
export function assertIsolatedProfilePath(target: string): void {
  const configured = process.env.NIMBALYST_USER_DATA_DIR;
  if (!configured) return;
  try {
    const expected = path.resolve(configured);
    const actual = path.resolve(app.getPath("userData"));
    if (
      actual !== expected ||
      physicalPath(actual) !== physicalPath(expected)
    ) {
      throw new Error("Isolation profile mismatch");
    }
    if (
      !inside(expected, path.resolve(target)) ||
      !inside(physicalPath(expected), physicalPath(target))
    ) {
      throw new Error("Storage path escapes the isolation profile");
    }
  } catch (error) {
    // Callers may catch ordinary settings/DB errors and fall back. Isolation
    // failures must never take that route or touch another profile.
    console.error(
      "[ProfileIsolation] Storage boundary check failed; startup aborted"
    );
    process.exit(1);
    throw error; // Unit-test exit stubs must still observe a hard failure.
  }
}
