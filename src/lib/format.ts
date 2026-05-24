import type {
  AccountSnapshot,
  CreditsSnapshot,
  LimitSnapshot,
} from "../types/codex";

const creditsFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});
const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatPlan(planType: string | null) {
  if (!planType) {
    return "Unknown plan";
  }

  return planType
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatAccountIdentity(account: AccountSnapshot) {
  return account.maskedEmail ?? account.accountLabel;
}

export function formatAccountStatus(account: AccountSnapshot) {
  return account.emailVerified ? "verified OAuth session" : "OAuth session";
}

export function formatAccountEmail(account: AccountSnapshot) {
  return account.email ?? account.maskedEmail ?? account.accountLabel;
}

export function formatSafeUser(account: AccountSnapshot) {
  return account.safeUser;
}

export function formatAuthTime(authTime: number | null) {
  if (!authTime) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(authTime * 1000);
}

export function formatAuthAge(authTime: number | null, now: number) {
  if (!authTime) {
    return "Token did not expose auth time";
  }

  const diffSeconds = Math.max(0, Math.round(now / 1000) - authTime);
  const days = Math.floor(diffSeconds / 86_400);
  const hours = Math.floor((diffSeconds % 86_400) / 3_600);
  const minutes = Math.floor((diffSeconds % 3_600) / 60);

  if (days > 0) {
    return `Signed in ${days}d ${hours}h ago`;
  }

  if (hours > 0) {
    return `Signed in ${hours}h ${minutes}m ago`;
  }

  if (minutes > 0) {
    return `Signed in ${minutes}m ago`;
  }

  return "Signed in just now";
}

export function formatInitials(account: AccountSnapshot) {
  const source = account.displayName.trim();
  if (!source) {
    return "CU";
  }

  const letters = source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return letters || source.slice(0, 2).toUpperCase();
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatCreditsValue(credits: CreditsSnapshot) {
  if (credits.unlimited) {
    return "Unlimited";
  }

  if (!credits.hasCredits) {
    return "Unavailable";
  }

  if (typeof credits.balance === "number") {
    return creditsFormatter.format(credits.balance);
  }

  return "0";
}

export function formatCreditsMeta(credits: CreditsSnapshot) {
  if (credits.unlimited) {
    return "No credit cap detected on this account.";
  }

  const details = [
    typeof credits.approxLocalMessages === "number"
      ? `~${credits.approxLocalMessages} local msgs`
      : null,
    typeof credits.approxCloudMessages === "number"
      ? `~${credits.approxCloudMessages} cloud msgs`
      : null,
  ].filter(Boolean);

  return details.length > 0
    ? details.join(" • ")
    : "Prepaid balance from the Codex usage endpoint.";
}

export function formatCreditsRowMeta(credits: CreditsSnapshot) {
  if (credits.unlimited) {
    return "No cap";
  }

  if (typeof credits.approxCloudMessages === "number") {
    return `~${compactNumberFormatter.format(credits.approxCloudMessages)} cloud`;
  }

  if (typeof credits.approxLocalMessages === "number") {
    return `~${compactNumberFormatter.format(credits.approxLocalMessages)} local`;
  }

  return credits.hasCredits ? "Balance" : "Unavailable";
}

export function formatRelativeUpdate(fetchedAt: number, now: number) {
  const diffSeconds = Math.max(0, Math.round(now / 1000) - fetchedAt);

  if (diffSeconds < 10) {
    return "updated just now";
  }

  if (diffSeconds < 60) {
    return `updated ${diffSeconds}s ago`;
  }

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) {
    return `updated ${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `updated ${hours}h ago`;
}

export function formatResetText(limit: LimitSnapshot, now: number) {
  const secondsRemaining = getSecondsRemaining(limit, now);

  if (secondsRemaining === null) {
    return "Reset time unavailable";
  }

  if (secondsRemaining <= 0) {
    return "Resetting now";
  }

  const days = Math.floor(secondsRemaining / 86_400);
  const hours = Math.floor((secondsRemaining % 86_400) / 3_600);
  const minutes = Math.floor((secondsRemaining % 3_600) / 60);

  if (days > 0) {
    return `Resets in ${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `Resets in ${hours}h ${minutes}m`;
  }

  return `Resets in ${Math.max(1, minutes)}m`;
}

export function formatResetAt(limit: LimitSnapshot) {
  if (!limit.resetAt) {
    return "No timestamp";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(limit.resetAt * 1000);
}

export function formatCompactResetStamp(limit: LimitSnapshot, now: number) {
  if (!limit.resetAt) {
    return "No reset";
  }

  const resetDate = new Date(limit.resetAt * 1000);
  const currentDate = new Date(now);

  if (isSameCalendarDay(resetDate, currentDate)) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(resetDate);
  }

  if (resetDate.getFullYear() === currentDate.getFullYear()) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(resetDate);
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(resetDate);
}

export function formatWindowSpan(seconds: number) {
  if (seconds >= 604_800) {
    return "7 day window";
  }

  if (seconds >= 18_000) {
    return "5 hour window";
  }

  const hours = Math.round(seconds / 3_600);
  return `${hours} hour window`;
}

export function formatLimitStatus(limit: LimitSnapshot) {
  if (limit.limitReached) {
    return "Reached";
  }

  if (!limit.allowed) {
    return "Blocked";
  }

  if (limit.usedPercent >= 85) {
    return "High";
  }

  return "Open";
}

export function formatEstimate(value: number | null) {
  if (typeof value !== "number") {
    return "N/A";
  }

  return compactNumberFormatter.format(value);
}

export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const digits = size >= 100 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(digits)} ${units[unitIndex]}`;
}

export function formatOptionalTimestamp(value: number | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value * 1000);
}

function getSecondsRemaining(limit: LimitSnapshot, now: number) {
  if (typeof limit.resetAt === "number") {
    return Math.max(0, Math.round(limit.resetAt - now / 1000));
  }

  if (typeof limit.resetAfterSeconds === "number") {
    return limit.resetAfterSeconds;
  }

  return null;
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
