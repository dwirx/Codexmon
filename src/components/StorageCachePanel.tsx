import {
  formatBytes,
  formatOptionalTimestamp,
} from "../lib/format";
import type { StorageCacheState } from "../types/codex";

type StorageCachePanelProps = {
  state: StorageCacheState | null;
  isLoading: boolean;
  busyAction: string | null;
  message: string | null;
  error: string | null;
  onRefresh: () => void;
  onClear: () => void;
};

export function StorageCachePanel({
  state,
  isLoading,
  busyAction,
  message,
  error,
  onRefresh,
  onClear,
}: StorageCachePanelProps) {
  return (
    <section className="manager-panel storage-panel">
      <div className="manager-panel__header">
        <div>
          <p className="manager-panel__eyebrow">Storage & cache</p>
          <h2 className="manager-panel__title">Local vault storage</h2>
          <p className="manager-panel__subtitle">
            Inspect the app cache and clear local vault files safely. This does
            not delete your live Codex OAuth login in <code>~/.codex/auth.json</code>.
          </p>
        </div>
        <div className="manager-panel__actions">
          <button className="manager-button" type="button" onClick={onRefresh}>
            Refresh Storage
          </button>
          <button
            className="manager-button manager-button--danger"
            type="button"
            onClick={onClear}
            disabled={busyAction === "clear"}
          >
            {busyAction === "clear" ? "Clearing..." : "Clear Local Cache"}
          </button>
        </div>
      </div>

      {message ? <p className="manager-panel__message">{message}</p> : null}
      {error ? <p className="manager-panel__error">{error}</p> : null}

      {isLoading ? (
        <div className="panel-skeleton-list">
          {Array.from({ length: 2 }).map((_, index) => (
            <article className="loading-list__item loading-list__item--panel" key={index}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((__, statIndex) => (
                  <div className="loading-list__item" key={statIndex}>
                    <div className="skeleton skeleton--line-sm w-20" />
                    <div className="mt-3 skeleton skeleton--line w-24" />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : state ? (
        <div className="storage-panel__content">
          <div className="storage-panel__stats">
            <StorageStat label="Cache size" value={formatBytes(state.totalBytes)} />
            <StorageStat label="Tracked files" value={String(state.totalFiles)} />
            <StorageStat label="Stored profiles" value={String(state.storedProfiles)} />
            <StorageStat
              label="Current session"
              value={state.activeSessionDetected ? "Detected" : "Unavailable"}
            />
          </div>

          <dl className="storage-panel__paths">
            <div className="storage-panel__path">
              <dt>App storage</dt>
              <dd>{state.appStoragePath}</dd>
            </div>
            <div className="storage-panel__path">
              <dt>Profiles dir</dt>
              <dd>{state.profilesPath}</dd>
            </div>
            <div className="storage-panel__path">
              <dt>Codex auth</dt>
              <dd>{state.authPath}</dd>
              <p>
                {state.currentAuthExists
                  ? "The current Codex auth file exists and stays untouched when cache is cleared."
                  : "The current Codex auth file is not present right now."}
              </p>
            </div>
            <div className="storage-panel__path">
              <dt>Vault state</dt>
              <dd>
                {state.stateFileExists
                  ? `${state.inactiveProfiles} inactive profile(s) cached`
                  : "No local state file"}
              </dd>
            </div>
          </dl>

          {state.entries.length > 0 ? (
            <div className="storage-panel__entries">
              {state.entries.map((entry) => (
                <article className="storage-panel__entry" key={entry.path}>
                  <div className="storage-panel__entry-head">
                    <div>
                      <p className="storage-panel__entry-kind">{entry.kind}</p>
                      <strong>{entry.name}</strong>
                    </div>
                    <span>{formatBytes(entry.sizeBytes)}</span>
                  </div>
                  <p className="storage-panel__entry-path">{entry.path}</p>
                  <p className="storage-panel__entry-meta">
                    Updated {formatOptionalTimestamp(entry.updatedAt)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="manager-panel__empty">
              No local cache files are stored yet. The app will create them when
              it preserves or refreshes Codex sessions.
            </p>
          )}
        </div>
      ) : (
        <p className="manager-panel__empty">
          Storage details are not available yet.
        </p>
      )}
    </section>
  );
}

type StorageStatProps = {
  label: string;
  value: string;
};

function StorageStat({ label, value }: StorageStatProps) {
  return (
    <div className="storage-panel__stat">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
