import {
  formatCreditsMeta,
  formatCreditsValue,
  formatEstimate,
} from "../lib/format";
import type { CreditsSnapshot } from "../types/codex";

type CreditsCardProps = {
  credits: CreditsSnapshot;
};

export function CreditsCard({ credits }: CreditsCardProps) {
  return (
    <article className="metric-card metric-card--credits">
      <div className="metric-card__topline">
        <p className="metric-card__label">Credits</p>
        <span className="metric-card__badge">
          {credits.unlimited ? "Unlimited" : credits.hasCredits ? "Metered" : "Unavailable"}
        </span>
      </div>

      <div className="metric-card__headline">
        <span className="metric-card__value">{formatCreditsValue(credits)}</span>
        {!credits.unlimited && credits.hasCredits ? (
          <span className="metric-card__unit">remaining</span>
        ) : null}
      </div>

      <p className="metric-card__meta">{formatCreditsMeta(credits)}</p>
      <dl className="metric-card__details">
        <div>
          <dt>Local</dt>
          <dd>{formatEstimate(credits.approxLocalMessages)}</dd>
        </div>
        <div>
          <dt>Cloud</dt>
          <dd>{formatEstimate(credits.approxCloudMessages)}</dd>
        </div>
        <div>
          <dt>Access</dt>
          <dd>{credits.hasCredits || credits.unlimited ? "Active" : "Unknown"}</dd>
        </div>
      </dl>
      <div className="metric-card__bar metric-card__bar--solid" />
    </article>
  );
}
