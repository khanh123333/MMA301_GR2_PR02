import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';

type Result<T> = { key: string; path: string; data: T | null; error: string | null };

/** Loads `path`, or nothing while it is null (e.g. a guest on an auth-only route). */
export function useFetch<T>(path: string | null) {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const key = path && `${path}#${nonce}`;

  useEffect(() => {
    if (!path || !key) return;
    let active = true;
    api<T>(path)
      .then((data) => active && setResult({ key, path, data, error: null }))
      .catch((err: Error) => active && setResult({ key, path, data: null, error: err.message }));
    return () => {
      active = false;
    };
  }, [key, path]);

  return {
    // Keep showing the old data during a reload of the same path
    data: result?.path === path ? result.data : null,
    error: result?.key === key ? (result?.error ?? null) : null,
    loading: !!key && result?.key !== key,
    reload: useCallback(() => setNonce((n) => n + 1), []),
  };
}
