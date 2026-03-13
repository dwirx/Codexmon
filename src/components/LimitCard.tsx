import {
  formatLimitStatus,
  formatPercent,
  formatResetAt,
  formatResetText,
  formatWindowSpan,
} from "../lib/format";
import type { LimitSnapshot } from "../types/codex";

type LimitCardProps = {
  limit: LimitSnapshot;
  now: number;
  tone: "amber" | "teal";
};

export function LimitCard({ limit, now, tone }: LimitCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__topline">
        <p className="metric-card__label">{limit.label}</p>
        <span className="metric-card__badge">{formatLimitStatus(limit)}</span>
      </div>

      <div className="metric-card__headline">
        <span className="metric-card__value">{formatPercent(limit.usedPercent)}</span>
        <span className="metric-card__unit">used</span>
      </div>

      <div className="metric-card__bar">
        <div
          className="metric-card__fill"
          style={{ width: `${Math.max(0, Math.min(100, limit.usedPercent))}%` }}
        />
      </div>

      <p className="metric-card__meta">{formatResetText(limit, now)}</p>
      <dl className="metric-card__details">
        <div>
          <dt>Remaining</dt>
          <dd>{formatPercent(limit.remainingPercent)}</dd>
        </div>
        <div>
          <dt>Resets</dt>
          <dd>{formatResetAt(limit)}</dd>
        </div>
        <div>
          <dt>Window</dt>
          <dd>{formatWindowSpan(limit.limitWindowSeconds)}</dd>
        </div>
      </dl>
      <p className="metric-card__subtle">
        {limit.allowed ? "Requests still allowed." : "Requests currently blocked."}
      </p>
    </article>
  );
}
