import { useState, useCallback } from "react";

/**
 * Like useState but persists value to sessionStorage so it survives page refreshes.
 */
export function usePersistedState<T>(key: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {}
    return defaultValue;
  });

  const setPersistedState = useCallback((val: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof val === "function" ? (val as (prev: T) => T)(prev) : val;
      try { sessionStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  return [state, setPersistedState];
}
