import * as fs from 'node:fs';
import { join } from 'node:path';

interface RendererDiagnostic {
  timestamp: string;
  level: string;
  source: string;
  message: string;
}

interface DiagnosticOptions {
  userDataPath: () => string;
  production: boolean;
  enabled?: () => boolean;
  now?: () => string;
  onError: (message: string, error: unknown) => void;
}

/** Direct diagnostic files, separate from the ordinary electron-log transport. */
export function createRendererDiagnosticLog(options: DiagnosticOptions) {
  const enabled = () => options.enabled?.() ?? true;
  function rotate(directory: string, baseName: string, sessions: number): void {
    const oldest = join(directory, `${baseName}.${sessions - 1}.log`);
    if (fs.existsSync(oldest)) fs.unlinkSync(oldest);
    for (let index = sessions - 2; index >= 1; index--) {
      const current = join(directory, `${baseName}.${index}.log`);
      if (fs.existsSync(current)) fs.renameSync(current, join(directory, `${baseName}.${index + 1}.log`));
    }
    const current = join(directory, `${baseName}.log`);
    if (fs.existsSync(current)) fs.renameSync(current, join(directory, `${baseName}.1.log`));
  }

  return {
    initialize(): void {
      if (!enabled()) return;
      const root = options.userDataPath();
      try { rotate(join(root, 'logs'), 'main', 3); }
      catch (error) { options.onError('Failed to rotate main log', error); }
      if (!options.production) {
        try { rotate(root, 'nimbalyst-debug', 5); }
        catch (error) { options.onError('Failed to rotate debug logs', error); }
      }
      try {
        const timestamp = options.now?.() ?? new Date().toISOString();
        const file = join(root, 'nimbalyst-debug.log');
        if (options.production) fs.appendFileSync(file, `\n=== App Started ${timestamp} ===\n`);
        else fs.writeFileSync(file, `=== Debug Log Started ${timestamp} ===\n`);
      } catch (error) { options.onError('Failed to initialize debug log', error); }
    },

    renderer(data: RendererDiagnostic): void {
      if (!enabled()) return;
      if (options.production && !['error', 'warn'].includes(data.level)) return;
      const entry = `[${data.timestamp}] [${data.level.toUpperCase()}] [${data.source}] ${data.message}\n`;
      try { fs.appendFileSync(join(options.userDataPath(), 'nimbalyst-debug.log'), entry); }
      catch { /* Diagnostic IO must not fail application work. */ }
    },

    append(file: string, entry: string): void {
      if (!enabled()) return;
      fs.appendFileSync(file, entry);
    },
  };
}
