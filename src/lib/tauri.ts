import { invoke } from "@tauri-apps/api/core";

import type {
  AccountManagerState,
  AccountSnapshot,
  CodexUsageSnapshot,
  MultiAccountUsageState,
  StorageCacheState,
} from "../types/codex";

const TAURI_COMMAND_TIMEOUT_MS = 30_000;

export function getCodexUsageSnapshot() {
  return invokeOrPreview("get_codex_usage_snapshot", getPreviewSnapshot);
}

export function getAccountManagerState() {
  return invokeOrPreview("get_account_manager_state", getPreviewAccountManager);
}

export function getMultiAccountUsage() {
  return invokeOrPreview("get_multi_account_usage", getPreviewMultiAccountUsage);
}

export function importCurrentAccount() {
  return invokeOrPreview("import_current_account", getPreviewAccountManager);
}

export function getStorageCacheState() {
  return invokeOrPreview("get_storage_cache_state", getPreviewStorageCache);
}

export function clearLocalCache() {
  return invokeOrPreview("clear_local_cache", getPreviewStorageCache);
}

export function switchAccountProfile(profileId: string) {
  return invokeOrPreview("switch_account_profile", getPreviewAccountManager, {
    profileId,
  });
}

export function removeAccountProfile(profileId: string) {
  return invokeOrPreview("remove_account_profile", getPreviewAccountManager, {
    profileId,
  });
}

export function logoutCodexSession() {
  return invokeOrPreview("logout_codex_session", getPreviewAccountManager);
}

export function openCodexLogin() {
  return invokeOrPreview(
    "open_codex_login",
    () => "Codex login can only be opened from the Tauri desktop app.",
  );
}

function invokeOrPreview<T>(
  command: string,
  preview: () => T,
  args?: Record<string, unknown>,
) {
  if (isTauriRuntime()) {
    return invokeWithTimeout<T>(command, args);
  }

  if (import.meta.env.DEV) {
    return Promise.resolve(preview());
  }

  return Promise.reject(
    new Error("This Codex monitor must be opened from the Tauri desktop app."),
  );
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function invokeWithTimeout<T>(command: string, args?: Record<string, unknown>) {
  return Promise.race([
    invoke<T>(command, args),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(
          new Error(
            `Tauri command \`${command}\` timed out. Check your Codex login and network connection, then refresh.`,
          ),
        );
      }, TAURI_COMMAND_TIMEOUT_MS);
    }),
  ]);
}

function getPreviewAccount(): AccountSnapshot {
  return {
    displayName: "Preview User",
    safeUser: "codex-preview",
    email: "preview@example.com",
    maskedEmail: "p*****w@example.com",
    emailVerified: true,
    authTime: Math.round(Date.now() / 1000) - 86_400,
    accountLabel: "preview@example.com",
  };
}

function getPreviewSnapshot(): CodexUsageSnapshot {
  const now = Math.round(Date.now() / 1000);
  const account = getPreviewAccount();

  return {
    planType: "preview",
    source: "browser-preview",
    fetchedAt: now,
    account,
    credits: {
      hasCredits: true,
      unlimited: false,
      balance: 14.25,
      approxLocalMessages: 180,
      approxCloudMessages: 42,
    },
    fiveHourLimit: {
      label: "5h limit",
      usedPercent: 37,
      remainingPercent: 63,
      limitWindowSeconds: 18_000,
      resetAt: now + 7_200,
      resetAfterSeconds: 7_200,
      allowed: true,
      limitReached: false,
    },
    weeklyLimit: {
      label: "Weekly limit",
      usedPercent: 68,
      remainingPercent: 32,
      limitWindowSeconds: 604_800,
      resetAt: now + 260_000,
      resetAfterSeconds: 260_000,
      allowed: true,
      limitReached: false,
    },
  };
}

function getPreviewAccountManager(): AccountManagerState {
  return {
    activeProfileId: "preview",
    profiles: [
      {
        id: "preview",
        updatedAt: Math.round(Date.now() / 1000),
        isActive: true,
        account: getPreviewAccount(),
      },
    ],
  };
}

function getPreviewMultiAccountUsage(): MultiAccountUsageState {
  const snapshot = getPreviewSnapshot();

  return {
    fetchedAt: snapshot.fetchedAt,
    items: [
      {
        profileId: "preview",
        isActive: true,
        account: snapshot.account,
        snapshot,
        error: null,
      },
    ],
  };
}

function getPreviewStorageCache(): StorageCacheState {
  return {
    appStoragePath: "Browser preview",
    profilesPath: "Browser preview",
    authPath: "~/.codex/auth.json",
    currentAuthExists: false,
    activeSessionDetected: true,
    stateFileExists: false,
    storedProfiles: 1,
    inactiveProfiles: 0,
    totalFiles: 0,
    totalBytes: 0,
    entries: [],
  };
}
