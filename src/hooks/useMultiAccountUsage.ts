import {
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { waitForMinimumSpinner } from "../lib/refresh";
import { getMultiAccountUsage } from "../lib/tauri";
import type { MultiAccountUsageState } from "../types/codex";
import { useDocumentVisibility } from "./useDocumentVisibility";

const POLL_INTERVAL_MS = 120_000;

type RefreshMode = "initial" | "manual" | "background";

export function useMultiAccountUsage() {
  const [state, setState] = useState<MultiAccountUsageState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isVisible = useDocumentVisibility();
  const inFlightRef = useRef(false);
  const queuedManualRefreshRef = useRef(false);
  const latestRequestIdRef = useRef(0);
  const appliedRequestIdRef = useRef(0);
  const skipVisibilityRefreshRef = useRef(true);

  const refresh = useEffectEvent(async (mode: RefreshMode) => {
    if (inFlightRef.current) {
      if (mode === "manual") {
        queuedManualRefreshRef.current = true;
        setIsRefreshing(true);
      }
      return;
    }

    inFlightRef.current = true;
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    const showSpinner = mode !== "background";
    const spinnerStartedAt = showSpinner ? performance.now() : null;

    if (mode === "initial") {
      setIsLoading(true);
    }

    if (showSpinner) {
      setIsRefreshing(true);
    }

    try {
      const nextState = await getMultiAccountUsage();
      if (requestId >= appliedRequestIdRef.current) {
        appliedRequestIdRef.current = requestId;
        startTransition(() => {
          setState(nextState);
          setError(null);
        });
      }
    } catch (nextError) {
      if (requestId >= appliedRequestIdRef.current) {
        appliedRequestIdRef.current = requestId;
        setError(toErrorMessage(nextError));
      }
    } finally {
      inFlightRef.current = false;
      const shouldRunQueuedManual = queuedManualRefreshRef.current;
      if (mode === "initial") {
        setIsLoading(false);
      }
      if (showSpinner && !shouldRunQueuedManual) {
        await waitForMinimumSpinner(spinnerStartedAt);
        setIsRefreshing(false);
      }
      if (shouldRunQueuedManual) {
        queuedManualRefreshRef.current = false;
        void refresh("manual");
      }
    }
  });

  useEffect(() => {
    void refresh("initial");
  }, [refresh]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timer = window.setInterval(() => {
      void refresh("background");
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [isVisible, refresh]);

  useEffect(() => {
    if (skipVisibilityRefreshRef.current) {
      skipVisibilityRefreshRef.current = false;
      return;
    }

    if (isVisible) {
      void refresh("background");
    }
  }, [isVisible, refresh]);

  return useMemo(
    () => ({
      state,
      error,
      isLoading,
      isRefreshing,
      refresh: () => refresh("manual"),
    }),
    [error, isLoading, isRefreshing, refresh, state],
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

  return "Unable to load saved account usage.";
}
