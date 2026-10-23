import { app } from 'electron';
import * as os from 'os';
import * as path from 'path';

// This side-effect module must be imported before settings, SDKs and index.
// Statements in bootstrap.ts itself run after its static dependencies, too late
// to protect import-time profile reads or inherited provider credentials.
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;

app.setName('Nimbalyst 日本語版（非公式）');

const customUserDataDir = process.env.NIMBALYST_USER_DATA_DIR
  || process.argv.find(arg => arg.startsWith('--user-data-dir='))?.substring('--user-data-dir='.length);

if (customUserDataDir) {
  app.setPath('userData', customUserDataDir);
  app.setPath('appData', path.dirname(customUserDataDir));
} else {
  app.setPath('userData', path.join(app.getPath('appData'), 'Nimbalyst 日本語版（非公式）'));
}

// Test-only isolation for flows that intentionally create content under the
// operating-system Documents directory (for example, the tutorial project).
// Requiring a custom userData profile and its sibling workspace prevents this
// override from redirecting a normal user's Documents folder.
const testDocumentsDir = process.env.NIMBALYST_TEST_DOCUMENTS_DIR;
if (testDocumentsDir) {
  if (!customUserDataDir) {
    throw new Error('NIMBALYST_TEST_DOCUMENTS_DIR requires NIMBALYST_USER_DATA_DIR');
  }

  const expectedTestDocumentsDir = path.resolve(
    path.dirname(path.resolve(customUserDataDir)),
    'workspace'
  );
  const configuredTestDocumentsDir = path.resolve(testDocumentsDir);
  const tempRoot = path.resolve(os.tmpdir());
  const profileRelativeToTemp = path.relative(tempRoot, path.resolve(customUserDataDir));
  const documentsRelativeToTemp = path.relative(tempRoot, configuredTestDocumentsDir);
  const isInsideTemp = (relativePath: string) => relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath);

  if (
    configuredTestDocumentsDir !== expectedTestDocumentsDir
    || !isInsideTemp(profileRelativeToTemp)
    || !isInsideTemp(documentsRelativeToTemp)
  ) {
    throw new Error('NIMBALYST_TEST_DOCUMENTS_DIR must be the isolated profile workspace');
  }

  app.setPath('documents', configuredTestDocumentsDir);
}
