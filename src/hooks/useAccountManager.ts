import { useEffect, useEffectEvent, useMemo, useState } from "react";

import {
  getAccountManagerState,
  importCurrentAccount,
  logoutCodexSession,
  openCodexLogin,
  removeAccountProfile,
  switchAccountProfile,
} from "../lib/tauri";
import type { AccountManagerState } from "../types/codex";

type SessionChangeHandler = () => Promise<void> | void;

export function useAccountManager(onSessionChange: SessionChangeHandler) {
  const [manager, setManager] = useState<AccountManagerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadManager = useEffectEvent(async () => {
    try {
      const nextManager = await getAccountManagerState();
      setManager(nextManager);
      setError(null);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    void loadManager();
  }, [loadManager]);

  const openLogin = useEffectEvent(async () => {
    setBusyAction("login");
    setMessage(null);
    setError(null);
    try {
      const nextMessage = await openCodexLogin();
      const nextManager = await getAccountManagerState();
      setManager(nextManager);
      setMessage(nextMessage);
      setError(null);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  });

  const importCurrent = useEffectEvent(async () => {
    setBusyAction("import");
    setMessage(null);
    setError(null);
    try {
      const nextManager = await importCurrentAccount();
      setManager(nextManager);
      setMessage("Current Codex session imported into the account list.");
      setError(null);
      await onSessionChange();
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  });

  const switchProfile = useEffectEvent(async (profileId: string) => {
    setBusyAction(`switch:${profileId}`);
    setMessage(null);
    setError(null);
    try {
      const nextManager = await switchAccountProfile(profileId);
      setManager(nextManager);
      setMessage("Active Codex account switched successfully.");
      setError(null);
      await onSessionChange();
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  });

  const removeProfile = useEffectEvent(async (profileId: string) => {
    setBusyAction(`remove:${profileId}`);
    setMessage(null);
    setError(null);
    try {
      const nextManager = await removeAccountProfile(profileId);
      setManager(nextManager);
      setMessage("Stored account removed from the local profile vault.");
      setError(null);
      await onSessionChange();
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  });

  const logout = useEffectEvent(async () => {
    setBusyAction("logout");
    setMessage(null);
    setError(null);
    try {
      const nextManager = await logoutCodexSession();
      setManager(nextManager);
      setMessage("Active Codex session logged out.");
      setError(null);
      await onSessionChange();
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  });

  const api = useMemo(
    () => ({
      manager,
      error,
      message,
      isLoading,
      busyAction,
      refresh: () => loadManager(),
      openLogin: () => openLogin(),
      importCurrent: () => importCurrent(),
      switchProfile: (profileId: string) => switchProfile(profileId),
      removeProfile: (profileId: string) => removeProfile(profileId),
      logout: () => logout(),
    }),
    [
      busyAction,
      error,
      importCurrent,
      isLoading,
      loadManager,
      logout,
      manager,
      message,
      openLogin,
      removeProfile,
      switchProfile,
    ],
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

  return "Unable to update the Codex account manager.";
}
