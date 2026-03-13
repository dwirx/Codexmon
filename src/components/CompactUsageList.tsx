import {
  formatCompactResetStamp,
  formatCreditsRowMeta,
  formatCreditsValue,
  formatPercent,
} from "../lib/format";
import type { CodexUsageSnapshot } from "../types/codex";

type CompactUsageListProps = {
  snapshot: CodexUsageSnapshot;
  now: number;
};

export function CompactUsageList({ snapshot, now }: CompactUsageListProps) {
  const rows = [
    {
      label: "Credits",
      value: formatCreditsValue(snapshot.credits),
      meta: formatCreditsRowMeta(snapshot.credits),
      progress: null,
      tone: "credits",
    },
    {
      label: "5h",
      value: formatPercent(snapshot.fiveHourLimit.usedPercent),
      meta: formatCompactResetStamp(snapshot.fiveHourLimit, now),
      progress: snapshot.fiveHourLimit.usedPercent,
      tone: "amber",
    },
    {
      label: "Weekly",
      value: formatPercent(snapshot.weeklyLimit.usedPercent),
      meta: formatCompactResetStamp(snapshot.weeklyLimit, now),
      progress: snapshot.weeklyLimit.usedPercent,
      tone: "teal",
    },
  ] as const;

  return (
    <section className="summary-panel">
      <div className="summary-panel__header">
        <div>
          <p className="summary-panel__eyebrow">Quick glance</p>
          <h2 className="summary-panel__title">Monitor strip</h2>
        </div>
        <p className="summary-panel__caption">
          Ringkas seperti menu bar, tapi tetap sinkron dengan data OAuth live.
        </p>
      </div>

      <div className="summary-list">
        {rows.map((row) => (
          <article className={`summary-row summary-row--${row.tone}`} key={row.label}>
            <div className="summary-row__main">
              <div className="summary-row__label-wrap">
                <span className="summary-row__dot" />
                <span className="summary-row__label">{row.label}</span>
              </div>
              <span className="summary-row__value">{row.value}</span>
              <span className="summary-row__meta">{row.meta}</span>
            </div>

            {typeof row.progress === "number" ? (
              <div className="summary-row__track">
                <div
                  className="summary-row__fill"
                  style={{ width: `${Math.max(0, Math.min(100, row.progress))}%` }}
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
