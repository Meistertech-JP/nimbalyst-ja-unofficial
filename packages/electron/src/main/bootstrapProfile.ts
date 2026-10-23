import { app } from 'electron';
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
