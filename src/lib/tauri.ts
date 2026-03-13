import { invoke } from "@tauri-apps/api/core";

import type { CodexUsageSnapshot } from "../types/codex";

export function getCodexUsageSnapshot() {
  return invoke<CodexUsageSnapshot>("get_codex_usage_snapshot");
}
