// The release decision behind /publish-npm: what to do given local and npm versions.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { decide } from '../npm-publish-status.mjs';

test('a group publishes only when it changed, and never with mismatched or older versions', () => {
  assert.equal(decide({ localVersions: ['0.1.0', '0.1.0'], published: '0.1.0', changed: false }).status, 'up to date');
  assert.equal(decide({ localVersions: ['0.1.0', '0.1.0'], published: '0.1.0', changed: true }).status, 'bump+publish');
  assert.equal(decide({ localVersions: ['0.1.1', '0.1.1'], published: '0.1.0', changed: true }).status, 'publish (already bumped)');
  // Numeric, not lexical: 0.10.0 is newer than 0.9.0.
  assert.equal(decide({ localVersions: ['0.10.0'], published: '0.9.0', changed: false }).status, 'publish (already bumped)');
  assert.equal(decide({ localVersions: ['0.1.0'], published: '0.2.0', changed: true }).status, 'LOCAL BEHIND NPM');
  assert.equal(decide({ localVersions: ['0.1.1', '0.1.0'], published: '0.1.0', changed: true }).status, 'VERSIONS DIFFER');
  assert.equal(decide({ localVersions: ['0.1.0'], published: null, changed: true }).status, 'never published');
});

function wikiWebBuildJobs(workflow) {
  const jobs = workflow.split(/\r?\n {2}(?=[a-z-]+:\r?\n)/).slice(1);
  return jobs.filter((job) => job.includes('@nimbalyst/wiki-web run build'));
}

function assertWikiWebBuildCheckouts(workflow) {
  const building = wikiWebBuildJobs(workflow);
  assert.equal(building.length, 2);
  for (const job of building) {
    const name = job.slice(0, job.indexOf(':'));
    assert.match(job, /repository: nimbalyst\/nimbalyst-mindmap/, `${name} checks out the mind map extension`);
    assert.match(job, /NIMBALYST_EXTENSION_CHECKOUTS:/, `${name} points the build at the checkouts`);
  }
}

// The 0.3.0 publish failed after a green dry run: only the verify job checked
// out the mind map extension, and the publish job rebuilds wiki-web on its own runner.
test('every publish-cli job that builds wiki-web has the mind map checkout', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/publish-cli.yml', import.meta.url), 'utf8');
  assertWikiWebBuildCheckouts(workflow);
});

test('LF and CRLF publish workflows preserve every build-job safety check', () => {
  const job = (name, checkout = true, environment = true) => [
    `  ${name}:`,
    '    steps:',
    ...(checkout ? ['      - uses: actions/checkout@v4', '        with:', '          repository: nimbalyst/nimbalyst-mindmap'] : []),
    '      - run: pnpm --filter @nimbalyst/wiki-web run build',
    ...(environment ? ['        env:', '          NIMBALYST_EXTENSION_CHECKOUTS: extensions'] : []),
  ].join('\n');
  const workflow = (...jobs) => ['name: publish-cli', 'jobs:', ...jobs, ''].join('\n');
  for (const newline of ['\n', '\r\n']) {
    const withNewline = (text) => text.replaceAll('\n', newline);
    const valid = withNewline(workflow(job('verify'), job('publish'), '  unrelated:\n    steps:\n      - run: pnpm typecheck'));
    assert.deepEqual(wikiWebBuildJobs(valid).map((entry) => entry.slice(0, entry.indexOf(':'))), ['verify', 'publish']);
    assertWikiWebBuildCheckouts(valid);
    for (const name of ['verify', 'publish']) {
      const missingCheckout = withNewline(workflow(job('verify', name !== 'verify'), job('publish', name !== 'publish')));
      assert.throws(() => assertWikiWebBuildCheckouts(missingCheckout), new RegExp(`${name} checks out the mind map extension`));
      const missingEnvironment = withNewline(workflow(job('verify', true, name !== 'verify'), job('publish', true, name !== 'publish')));
      assert.throws(() => assertWikiWebBuildCheckouts(missingEnvironment), new RegExp(`${name} points the build at the checkouts`));
    }
    assert.throws(() => assertWikiWebBuildCheckouts(withNewline(workflow(job('verify')))), /1 !== 2/);
  }
});
