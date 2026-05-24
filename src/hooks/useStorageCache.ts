import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { clearLocalCache, getStorageCacheState } from "../lib/tauri";
import type { StorageCacheState } from "../types/codex";

export function useStorageCache() {
  const [state, setState] = useState<StorageCacheState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadState = useEffectEvent(async () => {
    try {
      const nextState = await getStorageCacheState();
      setState(nextState);
      setError(null);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const clear = useEffectEvent(async () => {
    setBusyAction("clear");
    setMessage(null);
    setError(null);

    try {
      const nextState = await clearLocalCache();
      setState(nextState);
      setError(null);
      setMessage(
        nextState.activeSessionDetected
          ? "Local cache cleared. The current Codex session was kept."
          : "Local cache cleared. The app storage vault is now empty.",
      );
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  });

  return useMemo(
    () => ({
      state,
      error,
      message,
      isLoading,
      busyAction,
      refresh: () => loadState(),
      clear: () => clear(),
    }),
    [busyAction, clear, error, isLoading, loadState, message, state],
  );
}

function toErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Unable to inspect local storage and cache.";
}
