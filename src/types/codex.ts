export type CodexUsageSnapshot = {
  planType: string | null;
  source: string;
  fetchedAt: number;
  account: AccountSnapshot;
  credits: CreditsSnapshot;
  fiveHourLimit: LimitSnapshot;
  weeklyLimit: LimitSnapshot;
};

export type AccountSnapshot = {
  displayName: string;
  safeUser: string;
  email: string | null;
  maskedEmail: string | null;
  emailVerified: boolean;
  authTime: number | null;
  accountLabel: string;
};

export type AccountProfile = {
  id: string;
  updatedAt: number;
  isActive: boolean;
  account: AccountSnapshot;
};

export type AccountManagerState = {
  activeProfileId: string | null;
  profiles: AccountProfile[];
};

export type MultiAccountUsageItem = {
  profileId: string;
  isActive: boolean;
  account: AccountSnapshot;
  snapshot: CodexUsageSnapshot | null;
  error: string | null;
};

export type MultiAccountUsageState = {
  fetchedAt: number;
  items: MultiAccountUsageItem[];
};

export type StorageCacheEntry = {
  name: string;
  kind: string;
  path: string;
  sizeBytes: number;
  updatedAt: number | null;
};

export type StorageCacheState = {
  appStoragePath: string;
  profilesPath: string;
  authPath: string;
  currentAuthExists: boolean;
  activeSessionDetected: boolean;
  stateFileExists: boolean;
  storedProfiles: number;
  inactiveProfiles: number;
  totalFiles: number;
  totalBytes: number;
  entries: StorageCacheEntry[];
};

export type CreditsSnapshot = {
  hasCredits: boolean;
  unlimited: boolean;
  balance: number | null;
  approxLocalMessages: number | null;
  approxCloudMessages: number | null;
};

export type LimitSnapshot = {
  label: string;
  usedPercent: number;
  remainingPercent: number;
  limitWindowSeconds: number;
  resetAt: number | null;
  resetAfterSeconds: number | null;
  allowed: boolean;
  limitReached: boolean;
};
