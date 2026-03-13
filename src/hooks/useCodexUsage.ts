import {
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { getCodexUsageSnapshot } from "../lib/tauri";
import type { CodexUsageSnapshot } from "../types/codex";

const POLL_INTERVAL_MS = 60_000;
const CLOCK_INTERVAL_MS = 10_000;

type RefreshMode = "initial" | "manual" | "background";

export function useCodexUsage() {
  const [snapshot, setSnapshot] = useState<CodexUsageSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const isInFlightRef = useRef(false);
  const queuedManualRefreshRef = useRef(false);
  const latestRequestIdRef = useRef(0);
  const appliedRequestIdRef = useRef(0);

  const loadSnapshot = useEffectEvent(async (mode: RefreshMode) => {
    if (isInFlightRef.current) {
      if (mode === "manual") {
        queuedManualRefreshRef.current = true;
        setIsRefreshing(true);
      }
      return;
    }

    isInFlightRef.current = true;
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    const isInitial = mode === "initial";
    const shouldSpinRefresh = mode !== "background" || snapshot === null;

    if (isInitial) {
      setIsLoading(true);
    }

    if (shouldSpinRefresh) {
      setIsRefreshing(true);
    }

    try {
      const nextSnapshot = await getCodexUsageSnapshot();

      if (requestId >= appliedRequestIdRef.current) {
        appliedRequestIdRef.current = requestId;
        startTransition(() => {
          setSnapshot(nextSnapshot);
          setError(null);
          setNow(Date.now());
        });
      }
    } catch (nextError) {
      if (requestId >= appliedRequestIdRef.current) {
        appliedRequestIdRef.current = requestId;
        setError(toErrorMessage(nextError));
      }
    } finally {
      isInFlightRef.current = false;

      if (isInitial) {
        setIsLoading(false);
      }

      if (shouldSpinRefresh) {
        setIsRefreshing(false);
      }

      if (queuedManualRefreshRef.current) {
        queuedManualRefreshRef.current = false;
        void loadSnapshot("manual");
      }
    }
  });

  useEffect(() => {
    void loadSnapshot("initial");

    const pollTimer = window.setInterval(() => {
      void loadSnapshot("background");
    }, POLL_INTERVAL_MS);

    const clockTimer = window.setInterval(() => {
      setNow(Date.now());
    }, CLOCK_INTERVAL_MS);

    return () => {
      window.clearInterval(pollTimer);
      window.clearInterval(clockTimer);
    };
  }, [loadSnapshot]);

  const api = useMemo(
    () => ({
      snapshot,
      error,
      isLoading,
      isRefreshing,
      now,
      refresh: () => loadSnapshot("manual"),
    }),
    [error, isLoading, isRefreshing, loadSnapshot, now, snapshot],
  );

  return api;
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

  return "Unable to load the current Codex usage snapshot.";
}
