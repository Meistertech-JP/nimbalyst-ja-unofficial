const fs = require('fs');
const path = require('path');
const { sha256FileSync } = require('./electron-abi-probe.js');

function locations(resourcesDir, platform, arch) {
  const binary = platform === 'win32' ? 'claude.exe' : 'claude';
  return {
    legacy: path.join(resourcesDir, 'app.asar.unpacked/node_modules/@anthropic-ai', `claude-agent-sdk-${platform}-${arch}`, binary),
    destination: path.join(resourcesDir, 'claude-runtime', `${platform}-${arch}`, binary),
    manifest: path.join(resourcesDir, 'app.asar.unpacked/node_modules/@anthropic-ai/claude-agent-sdk/manifest.json'),
  };
}

function validateClaudeRuntime(resourcesDir, platform, arch) {
  const { legacy, destination, manifest } = locations(resourcesDir, platform, arch);
  const stat = fs.lstatSync(destination);
  // Windows does not expose POSIX execute bits through stat/chmod. Only enforce
  // the packaged mode bit on hosts that can represent it; native macOS/Linux
  // packaging still validates the executable permission.
  if (!stat.isFile() || stat.size === 0 || (process.platform !== 'win32' && platform !== 'win32' && !(stat.mode & 0o111))) {
    throw new Error(`Invalid packaged Claude executable: ${destination}`);
  }
  if (fs.existsSync(legacy)) throw new Error(`#1476: packaged Claude executable remains at ${legacy}`);
  const entry = JSON.parse(fs.readFileSync(manifest, 'utf8'))?.platforms?.[`${platform}-${arch}`];
  if (!entry || entry.binary !== path.basename(destination) || !Number.isSafeInteger(entry.size) || entry.size <= 0 || typeof entry.checksum !== 'string' || !/^[a-f\d]{64}$/i.test(entry.checksum)) {
    throw new Error(`Missing or invalid Claude recovery manifest for ${platform}-${arch}`);
  }
  return destination;
}

/** #1476: afterPack runs before signing; retain one executable outside the npm classifier. */
function relocateClaudeRuntime(resourcesDir, platform, arch) {
  const { legacy, destination, manifest } = locations(resourcesDir, platform, arch);
  // Windows copies this executable directly outside ASAR. Moving a declared
  // unpacked file after the header/PE integrity resource is generated leaves
  // an archive entry pointing at a missing file. Do not mutate that header.
  if (platform === 'win32' && !fs.existsSync(legacy)) {
    validateClaudeRuntime(resourcesDir, platform, arch);
    const entry = JSON.parse(fs.readFileSync(manifest, 'utf8')).platforms[`${platform}-${arch}`];
    if (fs.statSync(destination).size !== entry.size || sha256FileSync(destination) !== entry.checksum.toLowerCase()) {
      throw new Error(`Packaged Claude executable does not match its recovery manifest: ${destination}`);
    }
    return destination;
  }
  const stat = fs.lstatSync(legacy);
  if (!stat.isFile() || !stat.size) throw new Error(`Invalid Claude source executable: ${legacy}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.linkSync(legacy, destination);
  fs.unlinkSync(legacy);
  return validateClaudeRuntime(resourcesDir, platform, arch);
}

module.exports = { relocateClaudeRuntime, validateClaudeRuntime, locations };
