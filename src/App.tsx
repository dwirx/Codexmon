import { AccountPanel } from "./components/AccountPanel";
import { CompactUsageList } from "./components/CompactUsageList";
import { CreditsCard } from "./components/CreditsCard";
import { LimitCard } from "./components/LimitCard";
import { SnapshotHeader } from "./components/SnapshotHeader";
import { StatusBanner } from "./components/StatusBanner";
import { useCodexUsage } from "./hooks/useCodexUsage";
import "./App.css";

function App() {
  const { snapshot, error, isLoading, isRefreshing, now, refresh } =
    useCodexUsage();

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
        ) : (
          <StatusBanner
            title={isLoading ? "Loading Codex usage" : "Codex usage unavailable"}
            message={
              error ??
              "Make sure `codex` is logged in so `~/.codex/auth.json` is available."
            }
            tone="neutral"
          />
        )}
      </section>
    </main>
  );
}

export default App;
