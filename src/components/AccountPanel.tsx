import {
  formatAccountEmail,
  formatAccountStatus,
  formatAuthAge,
  formatAuthTime,
  formatSafeUser,
} from "../lib/format";
import type { AccountSnapshot } from "../types/codex";

type AccountPanelProps = {
  account: AccountSnapshot;
  now: number;
};

export function AccountPanel({ account, now }: AccountPanelProps) {
  return (
    <section className="account-panel">
      <div className="account-panel__header">
        <div>
          <p className="account-panel__eyebrow">Session</p>
          <h2 className="account-panel__title">Account details</h2>
        </div>
        <span className="account-panel__badge">
          {account.emailVerified ? "Verified" : "Unverified"}
        </span>
      </div>

      <dl className="account-panel__grid">
        <div className="account-panel__item account-panel__item--wide">
          <dt>Email</dt>
          <dd>{formatAccountEmail(account)}</dd>
        </div>
        <div className="account-panel__item">
          <dt>Safe user</dt>
          <dd>{formatSafeUser(account)}</dd>
        </div>
        <div className="account-panel__item">
          <dt>Account</dt>
          <dd>{account.accountLabel}</dd>
        </div>
        <div className="account-panel__item account-panel__item--wide">
          <dt>Auth time</dt>
          <dd>{formatAuthTime(account.authTime)}</dd>
          <p>{formatAuthAge(account.authTime, now)}</p>
        </div>
        <div className="account-panel__item account-panel__item--wide">
          <dt>Session state</dt>
          <dd>{formatAccountStatus(account)}</dd>
        </div>
      </dl>
    </section>
  );
}
