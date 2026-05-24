import { useEffect, useMemo, useRef } from "react";

import { AccountPanel } from "./components/AccountPanel";
import { AccountManagerPanel } from "./components/AccountManagerPanel";
import { CompactUsageList } from "./components/CompactUsageList";
import { CreditsCard } from "./components/CreditsCard";
import { LimitCard } from "./components/LimitCard";
import { LoadingOverview } from "./components/LoadingOverview";
import { MultiAccountUsagePanel } from "./components/MultiAccountUsagePanel";
import { SnapshotHeader } from "./components/SnapshotHeader";
import { StorageCachePanel } from "./components/StorageCachePanel";
import { StatusBanner } from "./components/StatusBanner";
import { useAccountManager } from "./hooks/useAccountManager";
import { useCodexUsage } from "./hooks/useCodexUsage";
import { useMultiAccountUsage } from "./hooks/useMultiAccountUsage";
import { useStorageCache } from "./hooks/useStorageCache";
import "./App.css";

function App() {
  const { snapshot, error, isLoading, isRefreshing, now, refresh } =
    useCodexUsage();
  const multiAccountUsage = useMultiAccountUsage();
  const storageCache = useStorageCache();
  const accountManager = useAccountManager(async () => {
    await Promise.all([
      refresh(),
      multiAccountUsage.refresh(),
      storageCache.refresh(),
    ]);
  });
  const syncedSessionKeyRef = useRef<string | null>(null);

  const activeSessionKey = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    return [
      snapshot.account.safeUser,
      snapshot.account.email ?? "",
      snapshot.account.accountLabel,
    ].join("::");
  }, [snapshot]);

  useEffect(() => {
    if (activeSessionKey === syncedSessionKeyRef.current) {
      return;
    }

    syncedSessionKeyRef.current = activeSessionKey;
    void Promise.all([
      accountManager.refresh(),
      multiAccountUsage.refresh(),
      storageCache.refresh(),
    ]);
  }, [activeSessionKey, accountManager, multiAccountUsage, storageCache]);

  return (
    <main className="app-shell">
      <div className="app-shell__glow app-shell__glow--one" />
      <div className="app-shell__glow app-shell__glow--two" />

      <section className="dashboard">
        {snapshot ? (
          <SnapshotHeader
            account={snapshot.account}
            fetchedAt={snapshot.fetchedAt}
            now={now}
            planType={snapshot.planType}
            isRefreshing={isRefreshing}
            onRefresh={() => void refresh()}
          />
        ) : (
          <header className="hero">
            <div className="hero__copy">
              <p className="eyebrow">OAuth usage monitor</p>
              <h1>Codex Monitor</h1>
              <p className="hero__lede">
                A compact dashboard for the Codex usage endpoint.
              </p>
            </div>
          </header>
        )}

        {error && snapshot ? (
          <StatusBanner
            title="Latest refresh failed"
            message={error}
            tone="error"
          />
        ) : null}

        {snapshot ? (
          <>
            <section className="overview-layout">
              <CompactUsageList snapshot={snapshot} now={now} />

              <div className="detail-column">
                <AccountPanel account={snapshot.account} now={now} />
                <CreditsCard credits={snapshot.credits} />

                <section className="metrics-grid">
                  <LimitCard
                    limit={snapshot.fiveHourLimit}
                    now={now}
                    tone="amber"
                  />
                  <LimitCard
                    limit={snapshot.weeklyLimit}
                    now={now}
                    tone="teal"
                  />
                </section>
              </div>
            </section>
          </>
        ) : isLoading ? (
          <LoadingOverview />
        ) : (
          <StatusBanner
            title="Codex usage unavailable"
            message={
              error ??
              "Make sure `codex` is logged in so `~/.codex/auth.json` is available."
            }
            tone="neutral"
          />
        )}

        <MultiAccountUsagePanel
          state={multiAccountUsage.state}
          error={multiAccountUsage.error}
          isLoading={multiAccountUsage.isLoading}
          isRefreshing={multiAccountUsage.isRefreshing}
          now={now}
          onRefresh={() => void multiAccountUsage.refresh()}
        />

        <AccountManagerPanel
          manager={accountManager.manager}
          isLoading={accountManager.isLoading}
          busyAction={accountManager.busyAction}
          message={accountManager.message}
          error={accountManager.error}
          onOpenLogin={() => void accountManager.openLogin()}
          onImportCurrent={() => void accountManager.importCurrent()}
          onLogout={() => void accountManager.logout()}
          onSwitch={(profileId) => void accountManager.switchProfile(profileId)}
          onRemove={(profileId) => void accountManager.removeProfile(profileId)}
        />

        <StorageCachePanel
          state={storageCache.state}
          isLoading={storageCache.isLoading}
          busyAction={storageCache.busyAction}
          message={storageCache.message}
          error={storageCache.error}
          onRefresh={() => void storageCache.refresh()}
          onClear={() => {
            void (async () => {
              await storageCache.clear();
              await Promise.all([
                refresh(),
                multiAccountUsage.refresh(),
                accountManager.refresh(),
                storageCache.refresh(),
              ]);
            })();
          }}
        />
      </section>
    </main>
  );
}

export default App;
