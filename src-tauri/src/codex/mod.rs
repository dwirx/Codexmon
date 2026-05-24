mod auth;
mod client;
mod error;
mod models;
mod profiles;

use std::time::Duration;

use reqwest::Client;

use self::{
    auth::{load_credentials, refresh_credentials},
    client::fetch_snapshot,
    error::{AppError, AppResult},
    models::{AccountManagerState, CodexUsageSnapshot, MultiAccountUsageState, StorageCacheState},
    profiles::{
        capture_current_account, clear_local_cache as reset_local_cache,
        get_account_manager_state as load_account_manager_state, get_multi_account_usage_state,
        get_storage_cache_state as load_storage_cache_state, logout_active_session, remove_account,
        start_login_flow, switch_account, sync_active_profile,
    },
};

const REQUEST_TIMEOUT_SECONDS: u64 = 15;
const CONNECT_TIMEOUT_SECONDS: u64 = 8;

#[tauri::command]
pub async fn get_codex_usage_snapshot() -> Result<CodexUsageSnapshot, String> {
    fetch_codex_usage_snapshot()
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_account_manager_state() -> Result<AccountManagerState, String> {
    load_account_manager_state().map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn get_multi_account_usage() -> Result<MultiAccountUsageState, String> {
    let client = build_http_client().map_err(|error| error.to_string())?;

    get_multi_account_usage_state(&client)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn import_current_account() -> Result<AccountManagerState, String> {
    capture_current_account().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_storage_cache_state() -> Result<StorageCacheState, String> {
    load_storage_cache_state().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn clear_local_cache() -> Result<StorageCacheState, String> {
    reset_local_cache().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn switch_account_profile(profile_id: String) -> Result<AccountManagerState, String> {
    switch_account(&profile_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn remove_account_profile(profile_id: String) -> Result<AccountManagerState, String> {
    remove_account(&profile_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn logout_codex_session() -> Result<AccountManagerState, String> {
    logout_active_session().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn open_codex_login() -> Result<String, String> {
    start_login_flow().map_err(|error| error.to_string())
}

async fn fetch_codex_usage_snapshot() -> AppResult<CodexUsageSnapshot> {
    let client = build_http_client()?;
    let mut credentials = load_credentials()?;

    if credentials.needs_refresh() {
        credentials = refresh_credentials(&client, credentials).await?;
    }

    match fetch_snapshot(&client, &credentials).await {
        Ok(snapshot) => {
            sync_active_profile(&credentials)?;
            Ok(snapshot)
        }
        Err(AppError::Unauthorized) => {
            let refreshed = refresh_credentials(&client, credentials).await?;
            let snapshot = fetch_snapshot(&client, &refreshed).await?;
            sync_active_profile(&refreshed)?;
            Ok(snapshot)
        }
        Err(error) => Err(error),
    }
}

fn build_http_client() -> AppResult<Client> {
    Ok(Client::builder()
        .user_agent("codex-cli")
        .connect_timeout(Duration::from_secs(CONNECT_TIMEOUT_SECONDS))
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECONDS))
        .build()?)
}
