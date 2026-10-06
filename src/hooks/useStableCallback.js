import { useCallback, useInsertionEffect, useRef } from 'react';

/**
 * Returns a function with a stable identity that always calls the latest `fn`.
 * Lets memoized children receive handlers without re-rendering on every parent render.
 */
export function useStableCallback(fn) {
  const ref = useRef(fn);
  useInsertionEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args) => ref.current(...args), []);
}
