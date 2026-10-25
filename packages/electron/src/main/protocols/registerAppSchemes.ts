import { protocol } from 'electron';
import { getNimAssetScheme } from './nimAssetProtocol';
import { getNimPreviewScheme } from './nimPreviewProtocol';
import { getCollabAssetScheme } from './collabAssetProtocol';

/** Register renderer URL privileges before Electron becomes ready. */
export function registerAppSchemes(): void {
  // Electron replaces the scheme list on repeated calls; only the final
  // scheme would support fetch, even though earlier image URLs still render.
  protocol.registerSchemesAsPrivileged([
    getNimAssetScheme(),
    getNimPreviewScheme(),
    getCollabAssetScheme(),
  ]);
}
