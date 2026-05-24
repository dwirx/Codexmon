import {
  formatAccountEmail,
  formatCompactResetStamp,
  formatCreditsValue,
  formatPercent,
  formatRelativeUpdate,
  formatSafeUser,
} from "../lib/format";
import type { MultiAccountUsageState } from "../types/codex";

type MultiAccountUsagePanelProps = {
  state: MultiAccountUsageState | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  now: number;
  onRefresh: () => void;
};

export function MultiAccountUsagePanel({
  state,
  error,
  isLoading,
  isRefreshing,
  now,
  onRefresh,
}: MultiAccountUsagePanelProps) {
  return (
    <section className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <p className="manager-panel__eyebrow">Usage board</p>
          <h2 className="manager-panel__title">All account usage</h2>
          <p className="manager-panel__subtitle">
            The current active session is auto-detected, and saved profiles are
            fetched directly so you can compare multiple accounts without
            switching one by one.
          </p>
        </div>

        <div className="manager-panel__actions">
          <button
            className="manager-button manager-button--primary"
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh All Usage"}
          </button>
        </div>
      </div>

      {error ? <p className="manager-panel__error">{error}</p> : null}

      {isLoading ? (
        <div className="panel-skeleton-list">
          {Array.from({ length: 2 }).map((_, index) => (
            <article className="loading-list__item loading-list__item--panel" key={index}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="skeleton skeleton--line w-36" />
                  <div className="mt-3 skeleton skeleton--line-sm w-56 max-w-full" />
                  <div className="mt-2 skeleton skeleton--line-sm w-24" />
                </div>
                <div className="grid flex-1 gap-3 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((__, metricIndex) => (
                    <div className="loading-list__item" key={metricIndex}>
                      <div className="skeleton skeleton--line-sm w-16" />
                      <div className="mt-3 skeleton skeleton--line w-20" />
                      <div className="mt-3 skeleton h-2.5 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : state && state.items.length > 0 ? (
        <div className="grid gap-3">
          {state.items.map((item) => (
            <article
              className="rounded-3xl border border-white/14 bg-white/10 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.18)]"
              key={item.profileId}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-semibold text-stone-100 sm:text-base">
                      {formatSafeUser(item.account)}
                    </strong>
                    {item.isActive ? (
                      <span className="rounded-full border border-amber-200/20 bg-amber-300/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-50">
                        Active
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 break-words text-sm leading-6 text-stone-50">
                    {formatAccountEmail(item.account)}
                  </p>
                  <p className="mt-1 text-xs text-stone-200">
                    {item.snapshot
                      ? formatRelativeUpdate(item.snapshot.fetchedAt, now)
                      : "Latest fetch failed"}
                  </p>
                </div>

                {item.snapshot ? (
                  <div className="grid flex-1 gap-3 md:grid-cols-3">
                    <MetricCell
                      label="Credits"
                      value={formatCreditsValue(item.snapshot.credits)}
                      meta={
                        item.snapshot.credits.unlimited
                          ? "Unlimited"
                          : item.snapshot.credits.hasCredits
                            ? "Balance"
                            : "Unavailable"
                      }
                    />
                    <UsageCell
                      label="5h"
                      percent={item.snapshot.fiveHourLimit.usedPercent}
                      reset={formatCompactResetStamp(item.snapshot.fiveHourLimit, now)}
                      tone="amber"
                    />
                    <UsageCell
                      label="Weekly"
                      percent={item.snapshot.weeklyLimit.usedPercent}
                      reset={formatCompactResetStamp(item.snapshot.weeklyLimit, now)}
                      tone="teal"
                    />
                  </div>
                ) : (
                  <div className="flex-1 rounded-2xl border border-rose-200/24 bg-rose-950/48 p-4 text-sm leading-6 text-rose-50">
                    {item.error ?? "Unable to fetch usage for this saved account."}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="manager-panel__empty">
          No Codex sessions are available yet. Sign in with Codex or save at
          least one profile to compare usage here.
        </p>
      )}
    </section>
  );
}

type MetricCellProps = {
  label: string;
  value: string;
  meta: string;
};

function MetricCell({ label, value, meta }: MetricCellProps) {
  return (
    <div className="rounded-2xl border border-white/14 bg-white/10 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-300">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-stone-50">
        {value}
      </p>
      <p className="mt-1 text-xs text-stone-200">{meta}</p>
    </div>
  );
}

type UsageCellProps = {
  label: string;
  percent: number;
  reset: string;
  tone: "amber" | "teal";
};

function UsageCell({ label, percent, reset, tone }: UsageCellProps) {
  const fillClass =
    tone === "teal"
      ? "bg-gradient-to-r from-teal-500 to-teal-200"
      : "bg-gradient-to-r from-amber-400 to-amber-200";

  return (
    <div className="rounded-2xl border border-white/14 bg-white/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-300">
          {label}
        </p>
        <p className="text-sm font-semibold text-stone-50">
          {formatPercent(percent)}
        </p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${fillClass}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-stone-200">{reset}</p>
    </div>
  );
}
