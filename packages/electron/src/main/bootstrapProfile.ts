import { app } from "electron";
import * as os from "os";
import * as path from "path";

// This side-effect module must be imported before settings, SDKs and index.
// Statements in bootstrap.ts itself run after its static dependencies, too late
// to protect import-time profile reads or inherited provider credentials.
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;

try {
  configureProfile();
} catch (error) {
  // This module runs before settings, databases and the application graph.
  // Throwing alone leaves Electron's startup-error dialog/process alive.
  // No data services exist yet to flush; abort instead of falling back.
  console.error("[Bootstrap] Profile initialization failed; startup aborted");
  process.exit(1);
  throw error; // Keeps fail-closed semantics when exit is stubbed in unit tests.
}

function configureProfile(): void {
  app.setName("Nimbalyst 日本語版（非公式）");

  // Resolve once, before any settings/DB imports. Canonicalize CLI spelling so
  // its value cannot also be interpreted as a workspace to open.
  const cliProfiles: string[] = [];
  const remainingArgs: string[] = [];
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--user-data-dir" || arg.startsWith("--user-data-dir=")) {
      const value =
        arg === "--user-data-dir"
          ? process.argv[++i]
          : arg.slice("--user-data-dir=".length);
      if (!value || value.startsWith("--") || !path.isAbsolute(value)) {
        throw new Error("Isolation profile must be an absolute path");
      }
      cliProfiles.push(path.resolve(value));
    } else remainingArgs.push(arg);
  }
  const envProfile = process.env.NIMBALYST_USER_DATA_DIR;
  if (
    envProfile !== undefined &&
    (!envProfile || !path.isAbsolute(envProfile))
  ) {
    throw new Error("Isolation profile must be an absolute path");
  }
  const customUserDataDir = envProfile
    ? path.resolve(envProfile)
    : cliProfiles[0];
  if (cliProfiles.some((profile) => path.relative(profile, customUserDataDir!) !== '')) {
    throw new Error("Conflicting isolation profile arguments");
  }

  if (customUserDataDir) {
    // Inherited by app.relaunch() and spawned child processes, and used by the
    // single-instance policy. CLI and environment launches must agree.
    process.env.NIMBALYST_USER_DATA_DIR = customUserDataDir;
    process.argv = [...remainingArgs, `--user-data-dir=${customUserDataDir}`];
    app.setPath("userData", customUserDataDir);
    app.setPath("appData", path.dirname(customUserDataDir));
    if (path.resolve(app.getPath("userData")) !== customUserDataDir) {
      throw new Error("Isolation profile was not retained by Electron");
    }
    const databaseOverride = process.env.NIMBALYST_USER_DATA_PATH;
    if (databaseOverride) {
      const relative = path.relative(
        customUserDataDir,
        path.resolve(databaseOverride)
      );
      if (
        relative === ".." ||
        relative.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relative)
      ) {
        throw new Error("Database path escapes the isolation profile");
      }
    }
  } else {
    app.setPath(
      "userData",
      path.join(app.getPath("appData"), "Nimbalyst 日本語版（非公式）")
    );
  }

  // Test-only isolation for flows that intentionally create content under the
  // operating-system Documents directory (for example, the tutorial project).
  // Requiring a custom userData profile and its sibling workspace prevents this
  // override from redirecting a normal user's Documents folder.
  const testDocumentsDir = process.env.NIMBALYST_TEST_DOCUMENTS_DIR;
  if (testDocumentsDir) {
    if (!customUserDataDir) {
      throw new Error(
        "NIMBALYST_TEST_DOCUMENTS_DIR requires NIMBALYST_USER_DATA_DIR"
      );
    }

    const expectedTestDocumentsDir = path.resolve(
      path.dirname(path.resolve(customUserDataDir)),
      "workspace"
    );
    const configuredTestDocumentsDir = path.resolve(testDocumentsDir);
    const tempRoot = path.resolve(os.tmpdir());
    const profileRelativeToTemp = path.relative(
      tempRoot,
      path.resolve(customUserDataDir)
    );
    const documentsRelativeToTemp = path.relative(
      tempRoot,
      configuredTestDocumentsDir
    );
    const isInsideTemp = (relativePath: string) =>
      relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath);

    if (
      configuredTestDocumentsDir !== expectedTestDocumentsDir ||
      !isInsideTemp(profileRelativeToTemp) ||
      !isInsideTemp(documentsRelativeToTemp)
    ) {
      throw new Error(
        "NIMBALYST_TEST_DOCUMENTS_DIR must be the isolated profile workspace"
      );
    }

    app.setPath("documents", configuredTestDocumentsDir);
  }
}
