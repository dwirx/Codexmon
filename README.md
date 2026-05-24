# Codex Monitor

Codex Monitor is a Tauri desktop app for tracking Codex usage from the local
OAuth session used by the `codex` CLI. It reads the active `auth.json`,
refreshes tokens when needed, calls the same usage endpoint used by Codex, and
adds a local multi-account manager on top.

## Features

- Live Codex usage dashboard for:
  - Credits
  - 5-hour usage window
  - Weekly usage window
- Multi-account usage board for:
  - Comparing credits across saved accounts
  - Comparing 5-hour usage across saved accounts
  - Comparing weekly usage across saved accounts
  - Seeing saved-account fetch errors without switching first
- Account identity panel showing:
  - Email
  - Safe user label
  - Account label
  - Auth time
- Local account vault for:
  - Opening the Codex login flow
  - Importing the current logged-in session on demand
  - Switching between saved accounts
  - Logging out the active session
  - Removing saved local account profiles
- Local storage and cache tools for:
  - Viewing the app storage directory and tracked cache files
  - Inspecting cache size, file count, and saved profile count
  - Clearing the local vault cache without deleting the live Codex auth file

## Stack

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4
- Desktop shell: Tauri 2
- Backend: Rust + `reqwest`

## How It Works

### Usage data

The app reads the active Codex OAuth session from:

- `~/.codex/auth.json`
- or `$CODEX_HOME/auth.json`

It then calls:

- `https://chatgpt.com/backend-api/wham/usage`

If the access token is stale, the backend refreshes it using the refresh token
before fetching usage.

### Multi-account model

Codex CLI itself works with one active `auth.json` at a time. This app adds
multi-account support by storing extra account snapshots in a local vault and
swapping the active `auth.json` when you switch accounts.

For usage comparison, the app can also read each saved account profile
directly. That means you can see usage for multiple saved accounts in one
screen without switching them one by one.

Saved profiles are stored under the local app data directory:

- Windows: `%LOCALAPPDATA%\\codex-monitor\\profiles`

The active profile id is stored separately in:

- `%LOCALAPPDATA%\\codex-monitor\\state.json`

The current Codex CLI login remains in:

- `~/.codex/auth.json`

Clearing the app cache only removes the local monitor vault files. It does not
delete the live Codex auth file, so your active CLI login remains safe.

## Login, Import, Switch, Logout

### Login a new account

1. Open the app.
2. Click `Open Codex Login`.
3. The app first preserves the currently active Codex session into the local
   vault, so your previous account is not lost.
4. Complete the external `codex login --device-auth` flow.
5. Return to the app. The active session is auto-detected and synced into the
   local vault on refresh, or you can still click `Import Current Session`
   immediately.

This means logging into a new account does not delete the previous one, as long
as the app was the one that started the login flow.

### Switch accounts

1. Save/import multiple accounts first.
2. Click `Switch` on any stored account.
3. Before switching, the app also preserves the currently active session if it
   has not been saved yet.
4. The app writes the selected account back to the active Codex `auth.json`.
5. The dashboard refreshes using the newly active account.

### View usage for multiple accounts

The app auto-detects the current active Codex session and also reads saved
profiles from the local vault. The `All account usage` panel fetches usage for
each available profile directly from its stored OAuth session.

This allows you to compare:

- Credits
- 5-hour limit usage
- Weekly limit usage

without changing the currently active Codex account.

### Logout

Click `Logout Active` to run `codex logout` for the current session. Saved
profiles remain in the local vault unless you explicitly remove them. The app
also preserves the current session into the vault before logout when possible.

### Storage and cache

The `Local vault storage` panel shows:

- the app storage path
- the profiles directory
- the active Codex auth path
- tracked cache files, sizes, and timestamps

`Clear Local Cache` removes the app's local vault files and resets the cached
profile list. If a live Codex session is still logged in, the app preserves
that active session so you do not get logged out accidentally.

## Development

Install dependencies:

```powershell
bun install
```

Run the desktop app:

```powershell
bun run tauri dev
```

Frontend-only dev server:

```powershell
bun run dev
```

Build production assets:

```powershell
bun run build
bun run tauri build
```

Backend check:

```powershell
cd src-tauri
cargo check
```

## Project Structure

```text
src/
  components/          React UI modules
  hooks/               Data and state hooks
  lib/                 Formatting and Tauri command helpers
  types/               Shared frontend types

src-tauri/src/codex/
  auth.rs              OAuth auth.json loading and token refresh
  client.rs            Usage API fetch + snapshot mapping
  profiles.rs          Multi-account storage and switching
  models.rs            Tauri response models
  mod.rs               Command wiring
```

## Notes

- The app relies on a working local `codex` installation.
- `Open Codex Login` launches the CLI device-auth flow in an external terminal.
- Opening a new login preserves the currently active account before the CLI
  login flow starts.
- The app auto-detects the current CLI session for the account vault and usage
  board, then auto-syncs it into the local vault after a successful usage
  refresh.
- `Import Current Session` is still available when you want to save the current
  CLI account immediately, without waiting for the next refresh cycle.
