// @vitest-environment node
/**
 * The page tree tool core runs in the desktop renderer and in the collab
 * worker's remote Pages tools, so its module graph, including the lazily
 * loaded tree planner, must not reach React, Jotai or a `.tsx` module.
 */
import { build } from 'esbuild';
import { expect, it } from 'vitest';

// Keep this browser-typed package free of Node ambient types. Esbuild accepts
// forward slashes, including drive-qualified and UNC absolute paths.
function fileUrlPath(url: URL): string {
  const pathname = decodeURIComponent(url.pathname);
  return url.hostname ? `//${url.hostname}${pathname}` : pathname.replace(/^\/(?=[A-Za-z]:\/)/, '');
}
const docsDir = fileUrlPath(new URL('..', import.meta.url));
const FORBIDDEN = /(\.tsx$|\.css$|node_modules\/(react|react-dom|jotai|jotai-family)\/)/;

it.each([
  ['file:///tmp/work%20tree/docs/', '/tmp/work tree/docs/'],
  ['file:///F:/work%20tree/docs/', 'F:/work tree/docs/'],
  ['file://server/share/work%20tree/docs/', '//server/share/work tree/docs/'],
])('converts the probe directory URL %s without platform-specific globals', (url, expected) => {
  expect(fileUrlPath(new URL(url))).toBe(expected);
});

it('bundles with no React, Jotai or component module in its graph', async () => {
  const result = await build({
    absWorkingDir: docsDir,
    entryPoints: ['pageTreeToolCore.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    splitting: true,
    outdir: 'out',
    mainFields: ['module', 'main'],
    conditions: ['import', 'default'],
    metafile: true,
    logLevel: 'silent',
  });
  const inputs = Object.keys(result.metafile.inputs);
  expect(inputs.some((input) => input.endsWith('collabPageTree.ts'))).toBe(true);
  expect(inputs.filter((input) => FORBIDDEN.test(input))).toEqual([]);
});
