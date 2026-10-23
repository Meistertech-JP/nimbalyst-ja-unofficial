import { app } from "electron";
import * as path from "path";
import { getPackageRoot } from "../../utils/appPaths";
import { getMainI18n } from "../../i18n/mainI18n";

/**
 * Resolve the tutorial template without touching app paths at module load time.
 *
 * Dev must go through getPackageRoot(), not app.getAppPath(): under the vite
 * dev build getAppPath() points at `out/main` (or `out2/main` for dev:user2),
 * so joining `resources/` onto it resolves to a directory that does not exist
 * and "Start tutorial" fails before it copies anything.
 */
export function getTutorialTemplateDirectory(
  language = getMainI18n()?.resolvedLanguage ?? getMainI18n()?.language ?? "en"
): string {
  const directory = language.toLowerCase().split(/[-_]/)[0] === "ja"
    ? "tutorial-project-ja"
    : "tutorial-project";
  if (app.isPackaged) {
    return path.join(process.resourcesPath, directory);
  }

  return path.join(getPackageRoot(), "resources", directory);
}
