import { describe, expect, it } from 'vitest';
import { isWorkerFileLoggingEnabled } from '../workerLoggingPolicy';

describe('worker file-logging policy', () => {
  it('allows worker diagnostic files only when the main process explicitly enables file logging', () => {
    expect(isWorkerFileLoggingEnabled(true)).toBe(true);
    for (const disabledOrUnknown of [false, undefined, null, 1, 'true', {}]) {
      expect(isWorkerFileLoggingEnabled(disabledOrUnknown)).toBe(false);
    }
  });
});
