/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useApi — generic data-fetching hook
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(satellitesApi.getAll, { search });
 *
 * - Re-fetches automatically whenever `params` changes (debounced 300ms).
 * - Exposes `refetch()` for manual refresh after mutations.
 */
export function useApi(apiFn, params = {}, options = {}) {
  const { debounce = 300 } = options;
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const timerRef = useRef(null);
  const paramsKey = JSON.stringify(params);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn(params);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFn, paramsKey]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetch_, debounce);
    return () => clearTimeout(timerRef.current);
  }, [fetch_, debounce]);

  return { data, loading, error, refetch: fetch_ };
}

/**
 * useMutation — wraps create/update/delete calls
 *
 * Usage:
 *   const { mutate, loading, error } = useMutation(satellitesApi.create, onSuccess);
 *   await mutate(formData);
 */
export function useMutation(apiFn, onSuccess) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn(...args);
      if (onSuccess) onSuccess(result);
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [apiFn, onSuccess]);

  return { mutate, loading, error };
}
