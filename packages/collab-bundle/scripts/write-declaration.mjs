import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Update a generated declaration only when rewriting changed its contents.
 * Changed files are written beside the destination and renamed into place so
 * a failed write never truncates the declaration emitted by TypeScript.
 */
export function writeDeclarationIfChanged(filePath, current, rewritten) {
  if (current === rewritten) return false;

  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );

  try {
    fs.writeFileSync(temporaryPath, rewritten, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporaryPath, filePath);
    return true;
  } catch (error) {
    try {
      fs.rmSync(temporaryPath, { force: true });
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `Failed to replace declaration and clean up temporary file for ${filePath}`,
      );
    }
    throw error;
  }
}
