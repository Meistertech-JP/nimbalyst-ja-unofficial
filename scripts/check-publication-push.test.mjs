import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { outgoingPublicationObjects } from './check-publication-push.mjs';

const zero = '0'.repeat(40);
test('outgoing publication inventory deduplicates objects and skips deletions', () => {
  const sha = 'a'.repeat(40);
  assert.deepEqual(outgoingPublicationObjects(`refs/heads/x ${sha} refs/heads/main ${zero}\nrefs/tags/v1 ${sha} refs/tags/v1 ${zero}\n(delete) ${zero} refs/heads/old ${sha}\n`), [sha]);
  assert.deepEqual(outgoingPublicationObjects(''), []);
  assert.throws(() => outgoingPublicationObjects('refs/heads/main HEAD refs/heads/main '+zero), /Malformed/);
});

test('the exact outgoing tree is checked even when HEAD differs; annotated tags are peeled', () => {
  const dir = mkdtempSync(join(tmpdir(), 'publication-push-fixture-'));
  const env = { ...process.env };
  for (const name of Object.keys(env)) if (name.startsWith('GIT_')) delete env[name];
  const git = (...args) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8', stdio: 'pipe' }).trim();
  const commit = message => git('-c','user.name=Publication Fixture','-c','user.email=fixture@example.com','-c','core.hooksPath=/dev/null','commit','--quiet','-m',message);
  const run = object => spawnSync(process.execPath, [fileURLToPath(new URL('./check-publication-push.mjs', import.meta.url))], { cwd: dir, env, encoding: 'utf8', input: `refs/heads/source ${object} refs/heads/main ${zero}\n` });
  try {
    git('init','--quiet');
    writeFileSync(join(dir,'README.md'),'# Public guide\n');
    git('add','README.md'); commit('clean fixture');
    const clean = git('rev-parse','HEAD');
    writeFileSync(join(dir,'R17_PRIVATE_REPORT.md'),'private fixture\n');
    git('add','R17_PRIVATE_REPORT.md'); commit('private fixture');
    const bad = git('rev-parse','HEAD');
    const cleanWhileHeadBad = run(clean);
    assert.ifError(cleanWhileHeadBad.error);
    assert.equal(cleanWhileHeadBad.status,0,cleanWhileHeadBad.stderr);
    git('rm','--quiet','R17_PRIVATE_REPORT.md'); commit('clean again');
    const badWhileHeadClean = run(bad);
    assert.ifError(badWhileHeadClean.error);
    assert.equal(badWhileHeadClean.status,1);
    assert.match(badWhileHeadClean.stdout,/internal-round-record/);
    git('-c','user.name=Publication Fixture','-c','user.email=fixture@example.com','tag','-a','fixture-tag','-m','fixture');
    assert.equal(run(git('rev-parse','fixture-tag')).status,0);
    // A non-commit object cannot bypass tree inspection.
    assert.notEqual(run(git('rev-parse','HEAD:README.md')).status,0);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
