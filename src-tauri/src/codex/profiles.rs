use std::{fs, path::PathBuf, process::Command};

use chrono::Utc;
use futures::future::join_all;
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::codex::{
    auth::{
        credentials_from_auth_file, load_credentials, refresh_credentials_without_persist,
        resolve_current_auth_path, write_auth_file, AuthFile, StoredCredentials,
    },
    client::fetch_snapshot,
    error::{AppError, AppResult},
    models::{
        AccountManagerState, AccountProfile, AccountSnapshot, CodexUsageSnapshot,
        MultiAccountUsageItem, MultiAccountUsageState, StorageCacheEntry, StorageCacheState,
    },
};

const APP_STORAGE_DIR: &str = "codex-monitor";
const PROFILES_DIR: &str = "profiles";
const STATE_FILE_NAME: &str = "state.json";

#[derive(Debug, Serialize, Deserialize, Default)]
struct ProfilesState {
    active_profile_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct StoredProfile {
    id: String,
    updated_at: i64,
    account: AccountSnapshot,
    auth_file: AuthFile,
}

pub fn get_account_manager_state() -> AppResult<AccountManagerState> {
    sync_current_session_state()?;
    build_manager_state()
}

pub async fn get_multi_account_usage_state(client: &Client) -> AppResult<MultiAccountUsageState> {
    sync_current_session_state()?;
    ensure_storage_layout()?;
    let state = load_state()?;
    let current_auth_path = resolve_current_auth_path()?;
    let active_profile_id = state.active_profile_id.clone();
    let tasks = load_all_profiles()?.into_iter().map(|stored| {
        let client = client.clone();
        let current_auth_path = current_auth_path.clone();
        let active_profile_id = active_profile_id.clone();

        async move {
            let mut stored = stored;
            let is_active = active_profile_id.as_deref() == Some(stored.id.as_str());
            let account = stored.account.clone();

            match fetch_usage_for_profile(
                &client,
                &mut stored,
                is_active,
                current_auth_path.as_path(),
            )
            .await
            {
                Ok(snapshot) => MultiAccountUsageItem {
                    profile_id: stored.id.clone(),
                    is_active,
                    account: snapshot.account.clone(),
                    snapshot: Some(snapshot),
                    error: None,
                },
                Err(error) => MultiAccountUsageItem {
                    profile_id: stored.id.clone(),
                    is_active,
                    account,
                    snapshot: None,
                    error: Some(error.to_string()),
                },
            }
        }
    });

    let mut items = join_all(tasks).await;

    sort_multi_account_items(&mut items);

    Ok(MultiAccountUsageState {
        fetched_at: Utc::now().timestamp(),
        items,
    })
}

pub fn capture_current_account() -> AppResult<AccountManagerState> {
    let credentials = load_credentials()?;
    let state = upsert_profile_from_credentials(&credentials, true)?;
    Ok(state)
}

pub fn get_storage_cache_state() -> AppResult<StorageCacheState> {
    build_storage_cache_state()
}

pub fn clear_local_cache() -> AppResult<StorageCacheState> {
    match load_credentials() {
        Ok(credentials) => {
            wipe_local_storage()?;
            let _ = upsert_profile_from_credentials(&credentials, true)?;
        }
        Err(error) if is_inactive_session_error(&error) => {
            wipe_local_storage()?;
        }
        Err(error) => return Err(error),
    }

    build_storage_cache_state()
}

pub fn switch_account(profile_id: &str) -> AppResult<AccountManagerState> {
    preserve_current_session(false)?;
    let stored = load_profile(profile_id)?;
    let auth_path = resolve_current_auth_path()?;
    write_auth_file(&auth_path, &stored.auth_file)?;

    let mut state = load_state()?;
    state.active_profile_id = Some(profile_id.to_string());
    save_state(&state)?;

    build_manager_state()
}

pub fn remove_account(profile_id: &str) -> AppResult<AccountManagerState> {
    let path = profile_path(profile_id)?;
    if path.exists() {
        fs::remove_file(path)?;
    }

    let mut state = load_state()?;
    if state.active_profile_id.as_deref() == Some(profile_id) {
        state.active_profile_id = None;
        save_state(&state)?;
    }

    build_manager_state()
}

pub fn logout_active_session() -> AppResult<AccountManagerState> {
    preserve_current_session(false)?;
    let status = Command::new("codex").arg("logout").status()?;
    if !status.success() {
        return Err(AppError::Api(String::from("Codex logout command failed.")));
    }

    let mut state = load_state()?;
    state.active_profile_id = None;
    save_state(&state)?;

    build_manager_state()
}

pub fn start_login_flow() -> AppResult<String> {
    preserve_current_session(true)?;

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", "cmd", "/K", "codex login --device-auth"])
            .spawn()?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("osascript")
            .args([
                "-e",
                "tell application \"Terminal\" to do script \"codex login --device-auth\"",
            ])
            .spawn()?;
    }

    #[cfg(target_os = "linux")]
    {
        let command =
            "x-terminal-emulator -e codex login --device-auth || gnome-terminal -- codex login --device-auth || konsole -e codex login --device-auth";
        Command::new("sh").args(["-lc", command]).spawn()?;
    }

    Ok(String::from(
        "Codex login flow opened. The previous active session was preserved locally before login. Complete login there, then click Import Current Session.",
    ))
}

pub fn sync_active_profile(credentials: &StoredCredentials) -> AppResult<()> {
    let _ = upsert_profile_from_credentials(credentials, true)?;
    Ok(())
}

fn build_manager_state() -> AppResult<AccountManagerState> {
    ensure_storage_layout()?;
    let state = load_state()?;
    let mut profiles = Vec::new();

    for stored in load_all_profiles()? {
        profiles.push(AccountProfile {
            id: stored.id.clone(),
            updated_at: stored.updated_at,
            is_active: state.active_profile_id.as_deref() == Some(stored.id.as_str()),
            account: stored.account,
        });
    }

    sort_account_profiles(&mut profiles);

    Ok(AccountManagerState {
        active_profile_id: state.active_profile_id,
        profiles,
    })
}

fn build_storage_cache_state() -> AppResult<StorageCacheState> {
    ensure_storage_layout()?;
    let app_storage = manager_root()?;
    let profiles_storage = profiles_dir()?;
    let state_storage = state_path()?;
    let auth_storage = resolve_current_auth_path()?;
    let manager_state = build_manager_state()?;
    let mut entries = collect_storage_entries(&profiles_storage, &state_storage)?;

    entries.sort_by(|left, right| left.path.cmp(&right.path));

    Ok(StorageCacheState {
        app_storage_path: app_storage.display().to_string(),
        profiles_path: profiles_storage.display().to_string(),
        auth_path: auth_storage.display().to_string(),
        current_auth_exists: auth_storage.exists(),
        active_session_detected: load_credentials().is_ok(),
        state_file_exists: state_storage.exists(),
        stored_profiles: manager_state.profiles.len(),
        inactive_profiles: manager_state
            .profiles
            .iter()
            .filter(|profile| !profile.is_active)
            .count(),
        total_files: entries.len(),
        total_bytes: entries.iter().map(|entry| entry.size_bytes).sum(),
        entries,
    })
}

fn upsert_profile_from_credentials(
    credentials: &StoredCredentials,
    set_active: bool,
) -> AppResult<AccountManagerState> {
    let profile_id = make_profile_id(credentials);
    let stored = stored_profile_from_credentials(credentials, profile_id.clone());
    save_profile(&stored)?;

    if set_active {
        let mut state = load_state()?;
        state.active_profile_id = Some(profile_id);
        save_state(&state)?;
    }

    build_manager_state()
}

fn preserve_current_session(set_active: bool) -> AppResult<()> {
    let Ok(credentials) = load_credentials() else {
        return Ok(());
    };

    let _ = upsert_profile_from_credentials(&credentials, set_active)?;
    Ok(())
}

fn stored_profile_from_credentials(credentials: &StoredCredentials, id: String) -> StoredProfile {
    let identity = credentials.account_identity();

    StoredProfile {
        id,
        updated_at: Utc::now().timestamp(),
        account: AccountSnapshot {
            display_name: identity.display_name,
            safe_user: identity.safe_user,
            email: identity.email,
            masked_email: identity.masked_email,
            email_verified: identity.email_verified,
            auth_time: identity.auth_time,
            account_label: identity.account_label,
        },
        auth_file: credentials.auth_file().clone(),
    }
}

fn load_profile(profile_id: &str) -> AppResult<StoredProfile> {
    let path = profile_path(profile_id)?;
    if !path.exists() {
        return Err(AppError::Io(format!(
            "Stored profile `{profile_id}` not found."
        )));
    }

    let contents = fs::read_to_string(path)?;
    let stored: StoredProfile = serde_json::from_str(&contents)?;
    Ok(stored)
}

fn save_profile(profile: &StoredProfile) -> AppResult<()> {
    ensure_storage_layout()?;
    let path = profile_path(&profile.id)?;
    let body = serde_json::to_string_pretty(profile)?;
    fs::write(path, body)?;
    Ok(())
}

fn load_all_profiles() -> AppResult<Vec<StoredProfile>> {
    let mut profiles = Vec::new();

    for entry in fs::read_dir(profiles_dir()?)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }

        let Ok(contents) = fs::read_to_string(&path) else {
            continue;
        };
        let Ok(stored) = serde_json::from_str::<StoredProfile>(&contents) else {
            continue;
        };

        if stored.id.trim().is_empty() {
            continue;
        }

        profiles.push(stored);
    }

    profiles.sort_by(|left, right| {
        account_sort_key(&left.account, &left.id).cmp(&account_sort_key(&right.account, &right.id))
    });

    Ok(profiles)
}

fn sync_current_session_state() -> AppResult<()> {
    match load_credentials() {
        Ok(credentials) => {
            let _ = upsert_profile_from_credentials(&credentials, true)?;
            Ok(())
        }
        Err(error) if is_inactive_session_error(&error) => {
            clear_active_profile_id()?;
            Ok(())
        }
        Err(error) => Err(error),
    }
}

fn is_inactive_session_error(error: &AppError) -> bool {
    matches!(
        error,
        AppError::AuthFileMissing(_)
            | AppError::UnsupportedAuthMode(_)
            | AppError::InvalidAuthFile(_)
            | AppError::MissingTokens
    )
}

fn clear_active_profile_id() -> AppResult<()> {
    let mut state = load_state()?;
    if state.active_profile_id.is_some() {
        state.active_profile_id = None;
        save_state(&state)?;
    }

    Ok(())
}

fn wipe_local_storage() -> AppResult<()> {
    let profiles = profiles_dir()?;
    if profiles.exists() {
        fs::remove_dir_all(&profiles)?;
    }

    let state = state_path()?;
    if state.exists() {
        fs::remove_file(state)?;
    }

    ensure_storage_layout()?;
    Ok(())
}

fn sort_account_profiles(profiles: &mut [AccountProfile]) {
    profiles.sort_by(|left, right| {
        right.is_active.cmp(&left.is_active).then_with(|| {
            account_sort_key(&left.account, &left.id)
                .cmp(&account_sort_key(&right.account, &right.id))
        })
    });
}

fn sort_multi_account_items(items: &mut [MultiAccountUsageItem]) {
    items.sort_by(|left, right| {
        right.is_active.cmp(&left.is_active).then_with(|| {
            account_sort_key(&left.account, &left.profile_id)
                .cmp(&account_sort_key(&right.account, &right.profile_id))
        })
    });
}

fn account_sort_key(account: &AccountSnapshot, fallback_id: &str) -> String {
    let primary = account
        .email
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(account.account_label.as_str());

    format!(
        "{}::{}::{}",
        primary.to_ascii_lowercase(),
        account.safe_user.to_ascii_lowercase(),
        fallback_id.to_ascii_lowercase()
    )
}

async fn fetch_usage_for_profile(
    client: &Client,
    stored: &mut StoredProfile,
    is_active: bool,
    current_auth_path: &std::path::Path,
) -> AppResult<CodexUsageSnapshot> {
    let virtual_auth_path = profile_path(&stored.id)?;
    let mut credentials = credentials_from_auth_file(virtual_auth_path, stored.auth_file.clone())?;

    if credentials.needs_refresh() {
        credentials =
            refresh_profile_credentials(client, stored, credentials, is_active, current_auth_path)
                .await?;
    }

    match fetch_snapshot(client, &credentials).await {
        Ok(snapshot) => {
            persist_profile_snapshot(
                stored,
                &credentials,
                &snapshot,
                is_active,
                current_auth_path,
            )?;
            Ok(snapshot)
        }
        Err(AppError::Unauthorized) => {
            let refreshed = refresh_profile_credentials(
                client,
                stored,
                credentials,
                is_active,
                current_auth_path,
            )
            .await?;
            let snapshot = fetch_snapshot(client, &refreshed).await?;
            persist_profile_snapshot(stored, &refreshed, &snapshot, is_active, current_auth_path)?;
            Ok(snapshot)
        }
        Err(error) => Err(error),
    }
}

async fn refresh_profile_credentials(
    client: &Client,
    stored: &mut StoredProfile,
    credentials: StoredCredentials,
    is_active: bool,
    current_auth_path: &std::path::Path,
) -> AppResult<StoredCredentials> {
    let refreshed = refresh_credentials_without_persist(client, credentials).await?;
    stored.auth_file = refreshed.auth_file().clone();
    stored.account = refreshed_account_snapshot(&refreshed);
    stored.updated_at = Utc::now().timestamp();
    save_profile(stored)?;

    if is_active {
        write_auth_file(current_auth_path, refreshed.auth_file())?;
    }

    Ok(refreshed)
}

fn persist_profile_snapshot(
    stored: &mut StoredProfile,
    credentials: &StoredCredentials,
    snapshot: &CodexUsageSnapshot,
    is_active: bool,
    current_auth_path: &std::path::Path,
) -> AppResult<()> {
    stored.auth_file = credentials.auth_file().clone();
    stored.account = snapshot.account.clone();
    stored.updated_at = Utc::now().timestamp();
    save_profile(stored)?;

    if is_active {
        write_auth_file(current_auth_path, credentials.auth_file())?;
    }

    Ok(())
}

fn refreshed_account_snapshot(credentials: &StoredCredentials) -> AccountSnapshot {
    let identity = credentials.account_identity();

    AccountSnapshot {
        display_name: identity.display_name,
        safe_user: identity.safe_user,
        email: identity.email,
        masked_email: identity.masked_email,
        email_verified: identity.email_verified,
        auth_time: identity.auth_time,
        account_label: identity.account_label,
    }
}

fn make_profile_id(credentials: &StoredCredentials) -> String {
    let identity = credentials.account_identity();
    let raw = identity
        .email
        .or_else(|| credentials.account_id.clone())
        .unwrap_or_else(|| identity.safe_user);

    sanitize_identifier(&raw)
}

fn sanitize_identifier(value: &str) -> String {
    let normalized = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>();

    let sanitized = normalized.trim_matches('-').to_string();
    if sanitized.is_empty() {
        String::from("codex-profile")
    } else {
        sanitized
    }
}

fn ensure_storage_layout() -> AppResult<()> {
    fs::create_dir_all(profiles_dir()?)?;
    Ok(())
}

fn collect_storage_entries(
    profiles_storage: &std::path::Path,
    state_storage: &std::path::Path,
) -> AppResult<Vec<StorageCacheEntry>> {
    let mut entries = Vec::new();

    if profiles_storage.exists() {
        for entry in fs::read_dir(profiles_storage)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|value| value.to_str()) != Some("json") {
                continue;
            }

            let metadata = entry.metadata()?;
            entries.push(StorageCacheEntry {
                name: path
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or("profile.json")
                    .to_string(),
                kind: String::from("profile"),
                path: path.display().to_string(),
                size_bytes: metadata.len(),
                updated_at: file_timestamp(&metadata),
            });
        }
    }

    if state_storage.exists() {
        let metadata = fs::metadata(state_storage)?;
        entries.push(StorageCacheEntry {
            name: state_storage
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or(STATE_FILE_NAME)
                .to_string(),
            kind: String::from("state"),
            path: state_storage.display().to_string(),
            size_bytes: metadata.len(),
            updated_at: file_timestamp(&metadata),
        });
    }

    Ok(entries)
}

fn file_timestamp(metadata: &fs::Metadata) -> Option<i64> {
    metadata
        .modified()
        .ok()
        .map(chrono::DateTime::<Utc>::from)
        .map(|timestamp| timestamp.timestamp())
}

fn manager_root() -> AppResult<PathBuf> {
    let local = dirs::data_local_dir().ok_or(AppError::HomeDirectoryMissing)?;
    Ok(local.join(APP_STORAGE_DIR))
}

fn profiles_dir() -> AppResult<PathBuf> {
    Ok(manager_root()?.join(PROFILES_DIR))
}

fn state_path() -> AppResult<PathBuf> {
    Ok(manager_root()?.join(STATE_FILE_NAME))
}

fn profile_path(profile_id: &str) -> AppResult<PathBuf> {
    Ok(profiles_dir()?.join(format!("{profile_id}.json")))
}

fn load_state() -> AppResult<ProfilesState> {
    ensure_storage_layout()?;
    let path = state_path()?;
    if !path.exists() {
        return Ok(ProfilesState::default());
    }

    let contents = fs::read_to_string(path)?;
    let state = serde_json::from_str(&contents).unwrap_or_default();
    Ok(state)
}

fn save_state(state: &ProfilesState) -> AppResult<()> {
    ensure_storage_layout()?;
    let body = serde_json::to_string_pretty(state)?;
    fs::write(state_path()?, body)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_account(email: Option<&str>, safe_user: &str, label: &str) -> AccountSnapshot {
        AccountSnapshot {
            display_name: String::from("Codex User"),
            safe_user: safe_user.to_string(),
            email: email.map(String::from),
            masked_email: None,
            email_verified: true,
            auth_time: None,
            account_label: label.to_string(),
        }
    }

    #[test]
    fn sorts_account_profiles_with_active_first_and_stable_identity_order() {
        let mut profiles = vec![
            AccountProfile {
                id: String::from("zeta"),
                updated_at: 10,
                is_active: false,
                account: make_account(Some("zeta@example.com"), "user-z", "zeta"),
            },
            AccountProfile {
                id: String::from("beta"),
                updated_at: 999,
                is_active: false,
                account: make_account(Some("beta@example.com"), "user-b", "beta"),
            },
            AccountProfile {
                id: String::from("active"),
                updated_at: 1,
                is_active: true,
                account: make_account(Some("omega@example.com"), "user-o", "omega"),
            },
        ];

        sort_account_profiles(&mut profiles);

        let ordered_ids = profiles
            .iter()
            .map(|profile| profile.id.as_str())
            .collect::<Vec<_>>();

        assert_eq!(ordered_ids, vec!["active", "beta", "zeta"]);
    }

    #[test]
    fn sorts_usage_items_with_active_first_and_stable_identity_order() {
        let mut items = vec![
            MultiAccountUsageItem {
                profile_id: String::from("bravo"),
                is_active: false,
                account: make_account(Some("bravo@example.com"), "user-b", "bravo"),
                snapshot: None,
                error: None,
            },
            MultiAccountUsageItem {
                profile_id: String::from("alpha"),
                is_active: false,
                account: make_account(Some("alpha@example.com"), "user-a", "alpha"),
                snapshot: None,
                error: None,
            },
            MultiAccountUsageItem {
                profile_id: String::from("current"),
                is_active: true,
                account: make_account(Some("zulu@example.com"), "user-z", "zulu"),
                snapshot: None,
                error: None,
            },
        ];

        sort_multi_account_items(&mut items);

        let ordered_ids = items
            .iter()
            .map(|item| item.profile_id.as_str())
            .collect::<Vec<_>>();

        assert_eq!(ordered_ids, vec!["current", "alpha", "bravo"]);
    }

    #[test]
    fn sanitize_identifier_replaces_non_alphanumeric_characters() {
        assert_eq!(
            sanitize_identifier("User.Name+1@example.com"),
            "user-name-1-example-com"
        );
    }

    #[test]
    fn sanitize_identifier_falls_back_when_value_has_no_safe_characters() {
        assert_eq!(sanitize_identifier("..."), "codex-profile");
    }

    #[test]
    fn file_timestamp_reads_existing_metadata() {
        let metadata = fs::metadata(".").expect("metadata");
        let timestamp = file_timestamp(&metadata);

        assert!(timestamp.is_some());
    }
}
