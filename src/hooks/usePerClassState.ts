import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Persisted state scoped by a key (e.g. classId).
 * When `scope` changes, value is re-read from localStorage for that scope.
 * Storage key format: `${baseKey}::${scope}`.
 */
export function usePerClassState<T>(
  baseKey: string,
  scope: string | null | undefined,
  defaultValue: T,
): [T, (val: T | ((prev: T) => T)) => void] {
  const read = (s: string | null | undefined): T => {
    if (!s) return defaultValue;
    try {
      const raw = localStorage.getItem(`${baseKey}::${s}`);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {}
    return defaultValue;
  };

  const [state, setState] = useState<T>(() => read(scope));
  const scopeRef = useRef(scope);

  useEffect(() => {
    if (scopeRef.current !== scope) {
      scopeRef.current = scope;
      setState(read(scope));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const setPersisted = useCallback(
    (val: T | ((prev: T) => T)) => {
      setState(prev => {
        const next = typeof val === "function" ? (val as (p: T) => T)(prev) : val;
        if (scope) {
          try { localStorage.setItem(`${baseKey}::${scope}`, JSON.stringify(next)); } catch {}
        }
        return next;
      });
    },
    [baseKey, scope],
  );

  return [state, setPersisted];
}
