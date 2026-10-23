/**
 * Worker-thread diagnostics must fail closed unless the main process explicitly
 * allows file logging. Worker threads cannot read electron-store themselves.
 */
export function isWorkerFileLoggingEnabled(value: unknown): value is true {
  return value === true;
}
