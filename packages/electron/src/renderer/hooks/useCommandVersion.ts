import { useCallback, useRef } from 'react';

/** A mounted consumer ignores historical requests and claims each new version once. */
export function useCommandVersion(initialVersion: number) {
  const consumed = useRef(initialVersion);
  return useCallback((version: number): boolean => {
    if (version === consumed.current) return false;
    consumed.current = version;
    return true;
  }, []);
}
