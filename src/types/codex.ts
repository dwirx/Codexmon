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
