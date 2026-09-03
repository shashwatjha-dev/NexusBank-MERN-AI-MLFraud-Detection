import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal data-fetching hook.
 *   const { data, loading, error, refetch } = useApi(() => svc.list(), [dep]);
 */
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const cancelledRef = useRef(false);

  const run = useCallback(async () => {
    cancelledRef.current = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      if (!cancelledRef.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (!cancelledRef.current) setState({ data: null, loading: false, error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => { cancelledRef.current = true; };
  }, [run]);

  return { ...state, refetch: run };
}