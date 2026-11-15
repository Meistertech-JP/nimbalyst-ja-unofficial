import * as fs from 'node:fs';
import * as path from 'node:path';

/** Resolve existing ancestors without creating anything or opening file data. */
export function physicalProfilePath(input: string): string {
  let current = path.resolve(input);
  const missing: string[] = [];
  for (;;) {
    try { return path.resolve(fs.realpathSync.native(current), ...missing.reverse()); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.push(path.basename(current)); current = parent;
    }
  }
}
function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/** Worker-safe: do not import Electron into recovery/control-file readers. */
export function assertDatabaseReference(root: string, target: string): void {
  const profile = process.env.NIMBALYST_USER_DATA_DIR;
  if (!profile) return;
  try {
    if (!path.isAbsolute(target) || !inside(path.resolve(profile), path.resolve(root))
      || !inside(physicalProfilePath(profile), physicalProfilePath(root))
      || !inside(path.resolve(root), path.resolve(target))
      || !inside(physicalProfilePath(root), physicalProfilePath(target))) {
      throw new Error('Persisted database reference escapes the active root');
    }
    try {
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && stat.nlink > 1)) throw new Error('Linked database reference rejected');
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  } catch (error) {
    console.error('[ProfileIsolation] Persisted database reference rejected; startup aborted');
    process.exit(1);
    throw error;
  }
}

export function assertPersistedDatabaseReferences(root: string, value: unknown, key = ''): void {
  if (!process.env.NIMBALYST_USER_DATA_DIR) return;
  if (typeof value === 'string') {
    if (/(?:path|dir|root)$/i.test(key) || path.isAbsolute(value)) assertDatabaseReference(root, value);
  } else if (Array.isArray(value)) {
    for (const item of value) assertPersistedDatabaseReferences(root, item, key);
  } else if (value && typeof value === 'object') {
    for (const [name, item] of Object.entries(value)) assertPersistedDatabaseReferences(root, item, name);
  }
}
