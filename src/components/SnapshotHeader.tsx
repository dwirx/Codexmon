import {
  formatAccountIdentity,
  formatAccountStatus,
  formatInitials,
  formatPlan,
  formatRelativeUpdate,
  formatSafeUser,
} from "../lib/format";
import type { AccountSnapshot } from "../types/codex";

type SnapshotHeaderProps = {
  account: AccountSnapshot;
  fetchedAt: number;
  now: number;
  planType: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function SnapshotHeader({
  account,
  fetchedAt,
  now,
  planType,
  isRefreshing,
  onRefresh,
}: SnapshotHeaderProps) {
  return (
    <header className="hero">
      <div className="hero__copy">
        <p className="eyebrow">OAuth usage monitor</p>
        <h1>Codex Monitor</h1>
        <p className="hero__lede">
          Monitor your Codex credits, 5-hour window, and weekly window from the
          same OAuth endpoint used by the official tooling.
        </p>
      </div>

      <div className="hero__aside">
        <div className="account-chip">
          <div className="account-chip__avatar">{formatInitials(account)}</div>
          <div className="account-chip__text">
            <strong>{formatSafeUser(account)}</strong>
            <span>
              {formatAccountIdentity(account)} • {formatAccountStatus(account)}
            </span>
          </div>
        </div>

        <div className="hero__meta">
          <span className="pill">{formatPlan(planType)}</span>
          <span className="pill pill--muted">{formatRelativeUpdate(fetchedAt, now)}</span>
          <span className="pill pill--muted">source oauth</span>
        </div>

        <button className="refresh-button" type="button" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </header>
  );
}
