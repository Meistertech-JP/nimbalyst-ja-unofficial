import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function outgoingPublicationObjects(input) {
  const objects = new Set();
  for (const line of input.split(/\r?\n/).filter(line => line.trim())) {
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 4 || !/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(fields[1]) || !/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(fields[3])) {
      throw new Error('Malformed pre-push ref record');
    }
    if (!/^0+$/.test(fields[1])) objects.add(fields[1].toLowerCase());
  }
  return [...objects];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const objects = outgoingPublicationObjects(readFileSync(0, 'utf8'));
    const checkedCommits = new Set();
    for (const object of objects) {
      // Peel annotated tags and reject targets that do not identify a commit.
      // Do not substitute the checked-out HEAD for a different outgoing object.
      const commit = execFileSync('git', ['rev-parse', '--verify', `${object}^{commit}`], { encoding: 'utf8' }).trim();
      if (checkedCommits.has(commit)) continue;
      checkedCommits.add(commit);
      const result = spawnSync(process.execPath, [fileURLToPath(new URL('./check-publication-content.mjs', import.meta.url)), '--ref', commit], { stdio: 'inherit' });
      if (result.error) throw result.error;
      if (result.status !== 0) {
        process.exitCode = result.status ?? 1;
        break;
      }
    }
    if (!process.exitCode) console.log(`[publication-push] Checked ${checkedCommits.size} distinct outgoing commit trees.`);
  } catch (error) {
    console.error(`[publication-push] ${error.message}`);
    process.exitCode = 1;
  }
}
