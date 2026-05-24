import {
  formatAccountEmail,
  formatAccountStatus,
  formatAuthTime,
  formatInitials,
  formatSafeUser,
} from "../lib/format";
import type { AccountManagerState } from "../types/codex";

type AccountManagerPanelProps = {
  manager: AccountManagerState | null;
  isLoading: boolean;
  busyAction: string | null;
  message: string | null;
  error: string | null;
  onOpenLogin: () => void;
  onImportCurrent: () => void;
  onLogout: () => void;
  onSwitch: (profileId: string) => void;
  onRemove: (profileId: string) => void;
};

export function AccountManagerPanel({
  manager,
  isLoading,
  busyAction,
  message,
  error,
  onOpenLogin,
  onImportCurrent,
  onLogout,
  onSwitch,
  onRemove,
}: AccountManagerPanelProps) {
  return (
    <section className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <p className="manager-panel__eyebrow">Account vault</p>
          <h2 className="manager-panel__title">Login, switch, and logout</h2>
          <p className="manager-panel__subtitle">
            The current active session is auto-detected and preserved in the
            local vault, so opening a new login does not make previous accounts
            disappear.
          </p>
        </div>
        <div className="manager-panel__actions">
          <button
            className="manager-button manager-button--primary"
            type="button"
            onClick={onOpenLogin}
            disabled={busyAction === "login"}
          >
            {busyAction === "login" ? "Opening..." : "Open Codex Login"}
          </button>
          <button
            className="manager-button"
            type="button"
            onClick={onImportCurrent}
            disabled={busyAction === "import"}
          >
            {busyAction === "import" ? "Importing..." : "Import Current Session"}
          </button>
          <button
            className="manager-button manager-button--danger"
            type="button"
            onClick={onLogout}
            disabled={busyAction === "logout"}
          >
            {busyAction === "logout" ? "Logging out..." : "Logout Active"}
          </button>
        </div>
      </div>

      {message ? <p className="manager-panel__message">{message}</p> : null}
      {error ? <p className="manager-panel__error">{error}</p> : null}

      {isLoading ? (
        <div className="panel-skeleton-list">
          {Array.from({ length: 2 }).map((_, index) => (
            <article className="loading-list__item loading-list__item--panel" key={index}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="skeleton h-11 w-11 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="skeleton skeleton--line w-36" />
                    <div className="mt-3 skeleton skeleton--line-sm w-56 max-w-full" />
                    <div className="mt-2 skeleton skeleton--line-sm w-44 max-w-full" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="skeleton h-10 w-24 rounded-full" />
                  <div className="skeleton h-10 w-24 rounded-full" />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : manager && manager.profiles.length > 0 ? (
        <div className="account-list">
          {manager.profiles.map((profile) => (
            <article
              className={`account-list__item ${profile.isActive ? "account-list__item--active" : ""}`}
              key={profile.id}
            >
              <div className="account-list__identity">
                <div className="account-list__avatar">
                  {formatInitials(profile.account)}
                </div>
                <div className="account-list__copy">
                  <div className="account-list__title-row">
                    <strong>{formatSafeUser(profile.account)}</strong>
                    {profile.isActive ? (
                      <span className="account-list__badge">Active</span>
                    ) : null}
                  </div>
                  <p>{formatAccountEmail(profile.account)}</p>
                  <span>
                    {profile.account.accountLabel} • {formatAuthTime(profile.account.authTime)} •{" "}
                    {formatAccountStatus(profile.account)}
                  </span>
                </div>
              </div>

              <div className="account-list__buttons">
                <button
                  className="manager-button"
                  type="button"
                  onClick={() => onSwitch(profile.id)}
                  disabled={profile.isActive || busyAction === `switch:${profile.id}`}
                >
                  {busyAction === `switch:${profile.id}` ? "Switching..." : "Switch"}
                </button>
                <button
                  className="manager-button manager-button--danger"
                  type="button"
                  onClick={() => onRemove(profile.id)}
                  disabled={busyAction === `remove:${profile.id}`}
                >
                  {busyAction === `remove:${profile.id}` ? "Removing..." : "Remove"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="manager-panel__empty">
          No Codex accounts are available yet. Use Open Codex Login, finish the
          CLI flow, and the active session will appear automatically here.
        </p>
      )}
    </section>
  );
}
