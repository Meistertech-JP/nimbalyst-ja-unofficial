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
