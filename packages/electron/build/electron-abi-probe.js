'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CLEANUP_RETRIES = 24;
const CLEANUP_RETRY_DELAY_MS = 250;

function sha256FileSync(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead;
    while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function waitSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removeProbeExecutable(filePath, options = {}) {
  const remove = options.remove || ((target) => fs.rmSync(target));
  const wait = options.wait || waitSync;
  let lastError;

  for (let attempt = 0; attempt <= CLEANUP_RETRIES; attempt++) {
    try {
      remove(filePath);
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES'].includes(error.code) || attempt === CLEANUP_RETRIES) {
        throw new Error(
          `Could not remove temporary Electron ABI probe executable after ${attempt + 1} attempt(s): ${filePath}: ${error.message}`,
          { cause: error },
        );
      }
      wait(CLEANUP_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

function withElectronAbiProbeExecutable(electronExecutable, runProbe, options = {}) {
  const platform = options.platform || process.platform;
  if (platform !== 'win32') return runProbe(electronExecutable);

  // Windows can keep a just-exited executable image mapped briefly after
  // spawnSync reports completion. electron-builder later truncates/writes the
  // packaged EXE for PE metadata, which fails with EBUSY while that mapping is
  // held. Never execute the PE-edit target itself during ABI validation.
  // Keep the copy beside Electron so Windows DLL, ICU, locale, and resources
  // lookup use the exact same directories as the packaged executable.
  const probeExecutable = path.join(
    path.dirname(electronExecutable),
    `.${path.basename(electronExecutable, path.extname(electronExecutable))}` +
      `.abi-probe-${process.pid}-${crypto.randomBytes(6).toString('hex')}${path.extname(electronExecutable)}`,
  );
  fs.copyFileSync(electronExecutable, probeExecutable, fs.constants.COPYFILE_EXCL);

  try {
    const sourceHash = sha256FileSync(electronExecutable);
    const probeHash = sha256FileSync(probeExecutable);
    if (probeHash !== sourceHash) {
      throw new Error(
        `Temporary Electron ABI probe executable hash mismatch: source=${sourceHash} copy=${probeHash}`,
      );
    }
    return runProbe(probeExecutable);
  } finally {
    removeProbeExecutable(probeExecutable, options.cleanup);
  }
}

module.exports = {
  sha256FileSync,
  removeProbeExecutable,
  withElectronAbiProbeExecutable,
};
